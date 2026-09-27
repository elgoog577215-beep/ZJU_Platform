const { getDb } = require("../config/db");
const service = require("../services/wechatWereadAdminService");
const ingest = require("../services/wechatMpScheduledIngestService");
const handle = (work) => async (req, res) => {
    try {
        res.json(await work(req));
    } catch (error) {
        // Axios errors can contain the upstream password and token; never serialize or log them.
        res.status(error.status || 503).json({
            error: /^WEREAD_[A-Z_]+$/.test(error.code || "") ? error.code : "WEREAD_UNAVAILABLE",
        });
    }
};
exports.overview = handle(async () => service.getOverview(await getDb()));
exports.control = handle(async (req) => service.updateControl(req.body || {}));
exports.startLogin = handle(() => service.startLogin());
exports.loginStatus = handle(() => service.loginStatus());
exports.importNow = handle(async (req) => {
    const db = await getDb();
    return ingest.startWechatMpIngestRun(db, { userId: req.user.id, sourceTypes: ["weread_mp"] });
});

exports.articles = handle(async (req) =>
    service.getSourceArticles(await getDb(), req.params.id, req.query.page || 1)
);
