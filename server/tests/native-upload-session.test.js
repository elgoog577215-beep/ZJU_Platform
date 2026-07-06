process.env.SECRET_KEY = process.env.SECRET_KEY || 'native-upload-session-test-secret';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  completeNativeUploadSession,
  createNativeUploadSession,
  failNativeUploadSession,
  getNativeUploadSession,
  verifyNativeUploadToken,
} = require('../src/services/nativeUploadSessionService');

test('native upload session can be completed by its signed token', () => {
  const created = createNativeUploadSession(101, {
    field: 'file',
    accept: 'image/*',
  });

  assert.ok(created.sessionId);
  assert.ok(created.uploadToken);

  const pending = getNativeUploadSession(101, created.sessionId);
  assert.equal(pending.status, 'pending');

  const tokenSession = verifyNativeUploadToken(created.uploadToken);
  assert.equal(tokenSession.id, created.sessionId);
  assert.equal(tokenSession.userId, 101);

  const completed = completeNativeUploadSession(created.uploadToken, {
    fileUrl: '/uploads/images/example.jpg',
    name: 'example.jpg',
    size: 1234,
    mime: 'image/jpeg',
  });

  assert.equal(completed.status, 'uploaded');
  assert.equal(completed.result.fileUrl, '/uploads/images/example.jpg');
  assert.equal(completed.result.name, 'example.jpg');
  assert.throws(
    () => verifyNativeUploadToken(created.uploadToken),
    /already completed/
  );
});

test('native upload session status is scoped to the owning user', () => {
  const created = createNativeUploadSession(202);

  assert.throws(
    () => getNativeUploadSession(303, created.sessionId),
    (error) => error.errorCode === 'NATIVE_UPLOAD_SESSION_NOT_FOUND'
  );
});

test('native upload token rejects tampering', () => {
  const created = createNativeUploadSession(404);
  const tampered = `${created.uploadToken.slice(0, -2)}xx`;

  assert.throws(
    () => verifyNativeUploadToken(tampered),
    (error) => error.errorCode === 'NATIVE_UPLOAD_TOKEN_INVALID'
  );
});

test('native upload session can be canceled once while pending', () => {
  const created = createNativeUploadSession(505);
  const canceled = failNativeUploadSession(created.uploadToken, 'NATIVE_UPLOAD_CANCELED');

  assert.equal(canceled.status, 'failed');
  assert.equal(canceled.error, 'NATIVE_UPLOAD_CANCELED');
  assert.throws(
    () => verifyNativeUploadToken(created.uploadToken),
    (error) => error.errorCode === 'NATIVE_UPLOAD_SESSION_COMPLETED'
  );
});
