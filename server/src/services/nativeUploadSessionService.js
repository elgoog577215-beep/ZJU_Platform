const crypto = require('crypto');

const SESSION_TTL_MS = 10 * 60 * 1000;
const TOKEN_SEPARATOR = '.';
const sessions = new Map();

const getSecret = () => {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    throw new Error('SECRET_KEY environment variable is required for native upload sessions');
  }
  return secret;
};

const base64url = (value) => Buffer.from(value).toString('base64url');

const sign = (payload) =>
  crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const pruneExpiredSessions = () => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAtMs <= now) {
      sessions.delete(sessionId);
    }
  }
};

const signUploadToken = (payload) => {
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}${TOKEN_SEPARATOR}${sign(encodedPayload)}`;
};

const parseUploadToken = (token) => {
  const [encodedPayload, signature, extra] = String(token || '').split(TOKEN_SEPARATOR);
  if (!encodedPayload || !signature || extra !== undefined) {
    const error = new Error('Invalid native upload token');
    error.statusCode = 401;
    error.errorCode = 'NATIVE_UPLOAD_TOKEN_INVALID';
    throw error;
  }

  if (!safeEqual(sign(encodedPayload), signature)) {
    const error = new Error('Invalid native upload token');
    error.statusCode = 401;
    error.errorCode = 'NATIVE_UPLOAD_TOKEN_INVALID';
    throw error;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('Invalid native upload token');
    error.statusCode = 401;
    error.errorCode = 'NATIVE_UPLOAD_TOKEN_INVALID';
    throw error;
  }
};

const createNativeUploadSession = (userId, options = {}) => {
  pruneExpiredSessions();

  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const expiresAtMs = now + SESSION_TTL_MS;
  const session = {
    id: sessionId,
    userId: Number(userId),
    field: options.field === 'cover' ? 'cover' : 'file',
    accept: String(options.accept || '*/*').slice(0, 64),
    status: 'pending',
    result: null,
    error: null,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  };

  sessions.set(sessionId, session);

  return {
    sessionId,
    uploadToken: signUploadToken({
      sid: sessionId,
      uid: session.userId,
      exp: Math.floor(expiresAtMs / 1000),
    }),
    expiresAt: session.expiresAt,
    expiresIn: Math.floor(SESSION_TTL_MS / 1000),
  };
};

const getNativeUploadSession = (userId, sessionId) => {
  pruneExpiredSessions();

  const session = sessions.get(String(sessionId || ''));
  if (!session || session.userId !== Number(userId)) {
    const error = new Error('Native upload session not found');
    error.statusCode = 404;
    error.errorCode = 'NATIVE_UPLOAD_SESSION_NOT_FOUND';
    throw error;
  }

  return {
    sessionId: session.id,
    status: session.status,
    result: session.result,
    error: session.error,
    expiresAt: session.expiresAt,
  };
};

const verifyNativeUploadToken = (token) => {
  pruneExpiredSessions();

  const payload = parseUploadToken(token);
  if (!payload?.sid || !payload?.uid || !payload?.exp) {
    const error = new Error('Invalid native upload token');
    error.statusCode = 401;
    error.errorCode = 'NATIVE_UPLOAD_TOKEN_INVALID';
    throw error;
  }

  if (payload.exp * 1000 <= Date.now()) {
    const error = new Error('Native upload session expired');
    error.statusCode = 410;
    error.errorCode = 'NATIVE_UPLOAD_SESSION_EXPIRED';
    throw error;
  }

  const session = sessions.get(String(payload.sid));
  if (!session || session.userId !== Number(payload.uid)) {
    const error = new Error('Native upload session not found');
    error.statusCode = 404;
    error.errorCode = 'NATIVE_UPLOAD_SESSION_NOT_FOUND';
    throw error;
  }

  if (session.status !== 'pending') {
    const error = new Error('Native upload session already completed');
    error.statusCode = 409;
    error.errorCode = 'NATIVE_UPLOAD_SESSION_COMPLETED';
    throw error;
  }

  return session;
};

const completeNativeUploadSession = (token, result) => {
  const session = verifyNativeUploadToken(token);
  session.status = 'uploaded';
  session.result = {
    fileUrl: result.fileUrl || null,
    coverUrl: result.coverUrl || null,
    name: result.name || '',
    size: Number(result.size || 0),
    mime: result.mime || '',
  };
  session.error = null;
  session.uploadedAt = new Date().toISOString();
  return getNativeUploadSession(session.userId, session.id);
};

const failNativeUploadSession = (token, message) => {
  const session = verifyNativeUploadToken(token);
  session.status = 'failed';
  session.error = String(message || 'Native upload failed').slice(0, 200);
  return getNativeUploadSession(session.userId, session.id);
};

module.exports = {
  SESSION_TTL_MS,
  createNativeUploadSession,
  getNativeUploadSession,
  verifyNativeUploadToken,
  completeNativeUploadSession,
  failNativeUploadSession,
};
