const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { authenticateToken, optionalAuth, isAdmin } = require("../middleware/auth");
const { isPlatformAdmin } = require("../utils/userPermissions");
const { createLotteryService } = require("../services/lotteryService");
const rateLimit = require("express-rate-limit");
const service = createLotteryService();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
});
const router = express.Router();
router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});
const route = (fn) => async (req, res, next) => {
    try {
        await fn(req, res);
    } catch (e) {
        next(e);
    }
};
const limited = rateLimit({
    windowMs: 60 * 1000,
    limit: 12,
    keyGenerator: (req) => `lottery:${req.user.id}`,
});
router.get(
    "/admin",
    authenticateToken,
    isAdmin,
    route(async (_req, res) => res.json(await service.list(true)))
);
router.post(
    "/admin",
    authenticateToken,
    isAdmin,
    route(async (req, res) => res.status(201).json(await service.save(null, req.body, req.user.id)))
);
router.get(
    "/admin/:id",
    authenticateToken,
    isAdmin,
    route(async (req, res) => res.json(await service.detail(req.params.id, req.user.id, true)))
);
router.put(
    "/admin/:id",
    authenticateToken,
    isAdmin,
    route(async (req, res) => res.json(await service.save(req.params.id, req.body, req.user.id)))
);
router.post(
    "/admin/:id/publish",
    authenticateToken,
    isAdmin,
    route(async (req, res) =>
        res.json(await service.publish(req.params.id, req.user.id, req.body.version))
    )
);
router.post(
    "/admin/:id/cancel",
    authenticateToken,
    isAdmin,
    route(async (req, res) =>
        res.json(await service.cancel(req.params.id, req.user.id, req.body.reason))
    )
);
router.get(
    "/admin/:id/entries",
    authenticateToken,
    isAdmin,
    route(async (req, res) => {
        const page = Number(req.query.page || 1);
        if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
            return res.status(400).json({ error: "invalid_fields" });
        res.json(await service.entries(req.params.id, page));
    })
);
router.post(
    "/admin/:id/entries/:entryId/review",
    authenticateToken,
    isAdmin,
    route(async (req, res) =>
        res.json(
            await service.review(
                req.params.id,
                req.params.entryId,
                req.user.id,
                req.body.status,
                req.body.note
            )
        )
    )
);
router.post(
    "/admin/:id/entries/:entryId/fulfill",
    authenticateToken,
    isAdmin,
    route(async (req, res) =>
        res.json(await service.fulfill(req.params.id, req.params.entryId, req.user.id))
    )
);
router.get(
    "/admin/:id/audit",
    authenticateToken,
    isAdmin,
    route(async (req, res) => res.json(await service.audit(req.params.id)))
);
router.get(
    "/",
    route(async (_req, res) => res.json(await service.list()))
);
router.get(
    "/:id",
    optionalAuth,
    route(async (req, res) => res.json(await service.detail(req.params.id, req.user?.id)))
);
router.get(
    "/:id/entries/:entryId/proof",
    authenticateToken,
    route(async (req, res) => {
        const proof = await service.proof(
            req.params.id,
            req.params.entryId,
            req.user.id,
            isPlatformAdmin(req.user)
        );
        res.set({ "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff" }).send(proof);
    })
);
router.post(
    "/:id/entries",
    authenticateToken,
    limited,
    upload.single("proof"),
    route(async (req, res) => {
        let proof = null;
        if (req.file) {
            try {
                proof = await sharp(req.file.buffer, {
                    limitInputPixels: 20000000,
                    animated: false,
                })
                    .rotate()
                    .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
            } catch {
                return res.status(400).json({ error: "invalid_image" });
            }
        }
        res.json(
            await service.enter(req.params.id, req.user.id, { note: req.body.note || "", proof })
        );
    })
);
router.post(
    "/:id/claim",
    authenticateToken,
    limited,
    route(async (req, res) =>
        res.json(await service.claim(req.params.id, req.user.id, req.body.text))
    )
);
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: "invalid_image" });
    if (err.code && err.status) return res.status(err.status).json({ error: err.code });
    console.error("[Lottery]", err.message);
    res.status(500).json({ error: "unavailable" });
});
module.exports = router;
