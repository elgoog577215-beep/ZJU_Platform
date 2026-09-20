const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const { randomUUID } = require("crypto");
const resourceController = require("./resourceController");
const { UPLOAD_CONFIG } = require("../middleware/upload");
const { cleanWeChatUrl } = require("../utils/wechatUrl");

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const textLimits = {
    title: 500,
    description: 5000,
    content: 200000,
    location: 500,
    tags: 2000,
    organizer: 500,
    target_audience: 1000,
    source_college: 500,
    notice_type: 100,
    category: 100,
    score: 200,
    volunteer_time: 200,
};
const allowed = new Set([
    ...Object.keys(textLimits),
    "link",
    "image",
    "date",
    "end_date",
    "status",
    "is_college_notice",
    "publisher_profile_id",
    "organizer_profile_id",
]);
const imageTypes = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif" };

const multipart = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1, fieldSize: 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const valid = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
        cb(valid ? null : invalid("Cover must be a JPEG, PNG, WebP or GIF image"), valid);
    },
}).single("cover");

const receive = (req, res, next) => {
    if (req.is("application/json")) return next();
    if (!req.is("multipart/form-data")) {
        return res.status(415).json({ error: "Use application/json or multipart/form-data" });
    }
    multipart(req, res, (error) => {
        if (!error) return next();
        return res
            .status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
            .json({ error: error.message });
    });
};

const normalizeDate = (value, field) => {
    if (value == null || value === "") return null;
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)
    ) {
        throw invalid(`${field} must be an ISO date or datetime`);
    }
    const day = value.slice(0, 10);
    const parsed = new Date(value);
    if (
        !Number.isFinite(parsed.getTime()) ||
        new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day
    ) {
        throw invalid(`${field} is not a valid date`);
    }
    return value;
};

function normalizePayload(input) {
    if (!input || Array.isArray(input) || typeof input !== "object")
        throw invalid("Payload must be an event object");
    for (const key of Object.keys(input))
        if (!allowed.has(key)) throw invalid(`Unknown event field: ${key}`);
    const result = {};
    for (const [key, limit] of Object.entries(textLimits)) {
        const value = input[key];
        if (value == null) continue;
        if (typeof value !== "string" || value.length > limit)
            throw invalid(`${key} must be text under ${limit} characters`);
        result[key] = value.trim();
    }
    if (!result.title || !result.description) throw invalid("title and description are required");
    if (typeof input.link !== "string") throw invalid("link must be a source URL");
    let url;
    try {
        url = new URL(input.link);
    } catch {
        throw invalid("link must be a source URL");
    }
    if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        input.link.length > 4096
    ) {
        throw invalid("link must be an HTTP(S) source URL without credentials");
    }
    result.link = cleanWeChatUrl(url.href);
    result.date = normalizeDate(input.date, "date");
    result.end_date = normalizeDate(input.end_date, "end_date");
    if (result.date && result.end_date && Date.parse(result.end_date) < Date.parse(result.date))
        throw invalid("end_date must not precede date");
    result.status = input.status ?? "pending";
    if (!["draft", "pending", "approved"].includes(result.status))
        throw invalid("status must be draft, pending or approved");
    for (const key of ["publisher_profile_id", "organizer_profile_id"]) {
        if (input[key] == null) continue;
        if (!Number.isSafeInteger(input[key]) || input[key] <= 0)
            throw invalid(`${key} must be a positive integer`);
        result[key] = input[key];
    }
    if (input.is_college_notice != null) {
        if (![true, false, 0, 1].includes(input.is_college_notice))
            throw invalid("is_college_notice must be a boolean");
        result.is_college_notice = input.is_college_notice;
    }
    if (input.image != null && input.image !== "") {
        if (
            typeof input.image !== "string" ||
            !/^\/uploads\/images\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|gif)$/i.test(input.image)
        ) {
            throw invalid(
                "image must be an existing /uploads/images/ path; remote images are not fetched"
            );
        }
        result.image = input.image;
    }
    return result;
}

const prepare = async (req, res, next) => {
    try {
        let input = req.body;
        if (req.is("multipart/form-data")) {
            if (Object.keys(req.body).some((key) => key !== "payload"))
                throw invalid("Multipart text field must be named payload");
            try {
                input = JSON.parse(req.body.payload);
            } catch {
                throw invalid("payload must contain valid JSON");
            }
        }
        req.body = normalizePayload(input);
        if (req.file && req.body.image) throw invalid("Provide either cover or image, not both");
        if (req.file) {
            let metadata;
            try {
                metadata = await sharp(req.file.buffer, { limitInputPixels: 40000000 }).metadata();
            } catch {
                throw invalid("Cover is not a readable image");
            }
            if (!imageTypes[metadata.format] || !metadata.width || !metadata.height)
                throw invalid("Unsupported cover image");
            req.structuredCoverExtension = imageTypes[metadata.format];
        } else if (req.body.image) {
            const file = path.join(
                UPLOAD_CONFIG.uploadDir,
                "images",
                path.basename(req.body.image)
            );
            const stat = await fs.stat(file).catch(() => null);
            if (!stat?.isFile()) throw invalid("The uploaded image does not exist");
        } else {
            throw invalid("A local cover upload or an existing image path is required");
        }
        next();
    } catch (error) {
        res.status(error.status || 400).json({ error: error.message });
    }
};

const saveCover = async (req) => {
    if (!req.file) return undefined;
    const name = `${Date.now()}-${randomUUID()}.${req.structuredCoverExtension}`;
    const file = path.join(UPLOAD_CONFIG.uploadDir, "images", name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    try {
        await fs.writeFile(file, req.file.buffer, { flag: "wx", mode: 0o644 });
    } catch (error) {
        if (error.code !== "EEXIST") await fs.unlink(file).catch(() => {});
        throw error;
    }
    req.body.image = `/uploads/images/${name}`;
    return () => fs.unlink(file);
};

const create = resourceController.createHandler("events", resourceController.fields.events, {
    beforeInsert: saveCover,
});
// Serialize same-source imports within the server process. The shared create handler
// performs the authoritative duplicate check before writing either cover or event.
const activeSources = new Map();
const submit = async (req, res, next) => {
    const source = req.body.link;
    const previous = activeSources.get(source) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
        release = resolve;
    });
    activeSources.set(source, current);
    await previous;
    try {
        await create(req, res, next);
    } finally {
        release();
        if (activeSources.get(source) === current) activeSources.delete(source);
    }
};

module.exports = { receive, prepare, submit, normalizePayload };
