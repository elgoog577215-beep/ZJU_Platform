const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_POSTER_BYTES = 6 * 1024 * 1024;
const POSTER_DIR = path.join(os.tmpdir(), "tuotuzju-native-posters");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const sessions = new Map();

const createHttpError = (message, statusCode, errorCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errorCode = errorCode;
    error.code = errorCode;
    return error;
};

const createSessionId = () =>
    typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");

const sanitizeFileName = (value) => {
    const base = String(value || "tuotuzju-poster.png")
        .trim()
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
        .replace(/\s+/g, "-")
        .slice(0, 80)
        .replace(/^\.+/, "")
        .replace(/^-+|-+$/g, "");

    const fileName = base || "tuotuzju-poster.png";
    return fileName.toLowerCase().endsWith(".png") ? fileName : `${fileName}.png`;
};

const removeFileQuietly = async (filePath) => {
    try {
        await fsp.unlink(filePath);
    } catch {
        // Best-effort cleanup only.
    }
};

const pruneExpiredPosterSessions = async () => {
    const now = Date.now();
    const removals = [];
    for (const [sessionId, session] of sessions.entries()) {
        if (session.expiresAtMs <= now) {
            sessions.delete(sessionId);
            removals.push(removeFileQuietly(session.filePath));
        }
    }
    await Promise.all(removals);
};

const decodePngDataUrl = (imageData) => {
    const match = /^data:image\/png;base64,([a-z0-9+/=\s]+)$/i.exec(String(imageData || ""));
    if (!match) {
        throw createHttpError(
            "Poster image must be a PNG data URL",
            400,
            "NATIVE_POSTER_INVALID_IMAGE"
        );
    }

    const base64 = match[1].replace(/\s/g, "");
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > MAX_POSTER_BYTES) {
        throw createHttpError("Poster image is too large", 413, "NATIVE_POSTER_IMAGE_TOO_LARGE");
    }

    if (
        buffer.length < PNG_SIGNATURE.length ||
        !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ) {
        throw createHttpError("Poster image is not a valid PNG", 400, "NATIVE_POSTER_INVALID_PNG");
    }

    return buffer;
};

const createNativePosterSession = async ({ imageData, fileName } = {}) => {
    await fsp.mkdir(POSTER_DIR, { recursive: true });
    await pruneExpiredPosterSessions();

    const buffer = decodePngDataUrl(imageData);
    const sessionId = createSessionId();
    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAtMs = Date.now() + SESSION_TTL_MS;
    const safeFileName = sanitizeFileName(fileName);
    const filePath = path.join(POSTER_DIR, `${sessionId}.png`);

    await fsp.writeFile(filePath, buffer, { flag: "wx" });

    const session = {
        sessionId,
        token,
        fileName: safeFileName,
        filePath,
        expiresAt: new Date(expiresAtMs).toISOString(),
        expiresAtMs,
    };

    sessions.set(sessionId, session);

    return {
        sessionId,
        token,
        fileName: safeFileName,
        expiresAt: session.expiresAt,
        expiresIn: Math.floor(SESSION_TTL_MS / 1000),
    };
};

const getNativePosterSession = async (sessionId, token) => {
    await pruneExpiredPosterSessions();

    const session = sessions.get(String(sessionId || ""));
    if (!session || session.token !== String(token || "")) {
        throw createHttpError(
            "Native poster session not found",
            404,
            "NATIVE_POSTER_SESSION_NOT_FOUND"
        );
    }

    if (!fs.existsSync(session.filePath)) {
        sessions.delete(session.sessionId);
        throw createHttpError("Native poster image expired", 410, "NATIVE_POSTER_SESSION_EXPIRED");
    }

    return session;
};

module.exports = {
    SESSION_TTL_MS,
    MAX_POSTER_BYTES,
    createNativePosterSession,
    getNativePosterSession,
    pruneExpiredPosterSessions,
    sanitizeFileName,
};
