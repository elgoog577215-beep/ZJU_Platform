const fs = require("fs");

const { getDb } = require("../config/db");
const {
    cancelLogin,
    fetchArticleContent,
    fetchArticleContents,
    fetchArticles,
    fetchArticlesForAccounts,
    getLoginStatus,
    getStatus,
    searchAccounts,
    startLogin,
    trustedWechatAssetUrl,
} = require("../services/wechatMpAdminService");
const { downloadWeChatImage, parseWithLLM } = require("../utils/wechat");
const { recordWechatParseRun } = require("../services/wechatParseAuditService");
const wechatMpScheduledIngestService = require("../services/wechatMpScheduledIngestService");
const { buildWechatMpResourcePayload } = require("../services/wechatMpResourcePayloadService");
const { resolveWechatImportDecision } = require("../utils/wechatActivityScreening");

const MAX_PARSE_CONTENT_CHARS = 200000;
const isLocalUploadUrl = (url) => String(url || "").startsWith("/uploads/");

const toHttpStatus = (error) => {
    if (Number.isInteger(error?.status)) return error.status;
    if (error?.code === "WECHAT_MP_AUTH_REQUIRED") return 401;
    if (error?.code === "PLAYWRIGHT_CHROMIUM_MISSING") return 503;
    return 500;
};

const sendError = (res, error, fallback = "微信 MP 操作失败") => {
    const status = toHttpStatus(error);
    return res.status(status).json({
        error: error?.code || "WECHAT_MP_ADMIN_ERROR",
        message: error?.message || fallback,
        runtime: error?.runtime || undefined,
    });
};

const buildWechatParseInput = (contentPayload = {}, article = {}) => {
    const sourceCoverImage = String(
        contentPayload.coverImage || contentPayload.cover || article.cover || ""
    ).trim();
    const hasTrustedCover =
        Boolean(trustedWechatAssetUrl(sourceCoverImage)) || isLocalUploadUrl(sourceCoverImage);
    const safeCoverImage = hasTrustedCover ? sourceCoverImage : "";

    return {
        title: String(contentPayload.title || article.title || "Untitled").slice(0, 500),
        author: String(
            contentPayload.author || article.account || article.author || "Unknown"
        ).slice(0, 300),
        content: String(contentPayload.contentText || contentPayload.content_text || "").trim(),
        coverImage: safeCoverImage,
    };
};

const summarizeWechatAnalysis = (parsed, status, errorCode = "") => ({
    status,
    errorCode: errorCode || null,
    task: parsed?.aiMeta?.task || "wechat_event_parse",
    provider: parsed?.aiMeta?.provider || null,
    model: parsed?.aiMeta?.model || null,
    category: parsed?.category || null,
    isActivityCandidate: parsed?.is_activity_candidate ?? null,
    activityConfidence: parsed?.activity_confidence ?? null,
    activityReason: parsed?.activity_reason || "",
});

const analyzeWechatImportContent = async ({
    db,
    contentPayload = {},
    article = {},
    userId = null,
} = {}) => {
    const scrapedData = buildWechatParseInput(contentPayload, article);
    if (!scrapedData.content) {
        return {
            parsed: null,
            analysis: summarizeWechatAnalysis(null, "skipped", "WECHAT_MP_EMPTY_CONTENT"),
        };
    }

    try {
        const parsed = await parseWithLLM(scrapedData, { db });
        if (!parsed || typeof parsed !== "object") {
            throw new Error("公众号文章信息提取返回为空");
        }

        if (!parsed.content) parsed.content = scrapedData.content;
        parsed.title = parsed.title || scrapedData.title || "Untitled";
        parsed.description = parsed.description || scrapedData.content.slice(0, 200);
        if (scrapedData.coverImage) parsed.coverImage = scrapedData.coverImage;

        await recordWechatParseRun(
            {
                status: "completed",
                userId,
                cacheHit: false,
                contentLength: scrapedData.content.length,
                modelUsed: true,
                provider: parsed.aiMeta?.provider,
                model: parsed.aiMeta?.model,
                runtimeTelemetry: parsed.aiMeta?.runtimeTelemetry,
                hasCoverImage: Boolean(parsed.coverImage),
                category: parsed.category,
                isCollegeNotice: parsed.is_college_notice,
                noticeType: parsed.notice_type,
                sourceCollege: parsed.source_college,
            },
            db
        );

        return {
            parsed,
            analysis: summarizeWechatAnalysis(parsed, "completed"),
        };
    } catch (error) {
        const errorCode = error?.code || error?.message || "WECHAT_MP_IMPORT_PARSE_FAILED";
        await recordWechatParseRun(
            {
                status: "failed",
                userId,
                contentLength: scrapedData.content.length,
                errorCode,
            },
            db
        );
        return {
            parsed: null,
            analysis: summarizeWechatAnalysis(null, "failed", errorCode),
        };
    }
};

const pacingFromBody = (body = {}) => ({
    query_delay_range:
        body.query_delay_range ?? body.queryDelayRange ?? body.query_delay_range_seconds,
    page_pause_range: body.page_pause_range ?? body.pagePauseRange ?? body.page_pause_range_seconds,
    page_pause_seconds: body.page_pause_seconds ?? body.pagePauseSeconds ?? body.page_pause,
    content_delay_range:
        body.content_delay_range ?? body.contentDelayRange ?? body.content_delay_range_seconds,
});

const getWechatMpStatus = async (_req, res) => {
    try {
        return res.json(await getStatus());
    } catch (error) {
        return sendError(res, error, "获取微信 MP 状态失败");
    }
};

const startWechatMpLogin = (req, res) => {
    try {
        const state = startLogin({
            waitSeconds: req.body?.wait_seconds,
        });
        return res.json(state);
    } catch (error) {
        return sendError(res, error, "启动微信 MP 登录失败");
    }
};

const getWechatMpLoginStatus = (_req, res) => {
    try {
        return res.json(getLoginStatus());
    } catch (error) {
        return sendError(res, error, "获取微信 MP 登录状态失败");
    }
};

const cancelWechatMpLogin = async (_req, res) => {
    try {
        const state = await cancelLogin();
        return res.json(state);
    } catch (error) {
        return sendError(res, error, "取消微信 MP 登录失败");
    }
};

const searchWechatMpAccounts = async (req, res) => {
    try {
        const result = await searchAccounts({
            query: req.body?.query,
            count: req.body?.count,
        });
        return res.json(result);
    } catch (error) {
        return sendError(res, error, "搜索公众号失败");
    }
};

const listWechatMpArticles = async (req, res) => {
    try {
        if (Array.isArray(req.body?.accounts) && req.body.accounts.length > 0) {
            const result = await fetchArticlesForAccounts({
                accounts: req.body.accounts,
                keyword: req.body?.keyword,
                count: req.body?.count,
                maxPages: req.body?.max_pages,
                allowFirst: req.body?.allow_first === true,
                pacing: pacingFromBody(req.body),
            });
            return res.json(result);
        }
        const result = await fetchArticles({
            accountName: req.body?.account_name,
            fakeid: req.body?.fakeid,
            keyword: req.body?.keyword,
            count: req.body?.count,
            maxPages: req.body?.max_pages,
            allowFirst: req.body?.allow_first === true,
            pacing: pacingFromBody(req.body),
        });
        return res.json(result);
    } catch (error) {
        return sendError(res, error, "获取公众号文章失败");
    }
};

const getWechatMpArticleContent = async (req, res) => {
    try {
        if (
            (Array.isArray(req.body?.articles) && req.body.articles.length > 0) ||
            (Array.isArray(req.body?.urls) && req.body.urls.length > 0)
        ) {
            const result = await fetchArticleContents({
                articles: req.body?.articles,
                urls: req.body?.urls,
                pacing: pacingFromBody(req.body),
            });
            return res.json(result);
        }
        const result = await fetchArticleContent({
            url: req.body?.url,
            article: req.body?.article || {},
            cover: req.body?.cover,
        });
        return res.json(result);
    } catch (error) {
        return sendError(res, error, "获取微信文章正文失败");
    }
};

const buildWechatMpImportPayload = async (req, res) => {
    let contentPayload = req.body?.content || null;
    try {
        const db = await getDb();
        if (!contentPayload?.contentText && !contentPayload?.content_text && req.body?.url) {
            contentPayload = await fetchArticleContent({ url: req.body.url });
        }
        const contentText = String(
            contentPayload?.contentText || contentPayload?.content_text || ""
        ).trim();
        if (!contentText) {
            return res.status(422).json({
                error: "WECHAT_MP_EMPTY_CONTENT",
                message: "请先获取文章正文后再导入",
            });
        }
        if (contentText.length > MAX_PARSE_CONTENT_CHARS) {
            return res.status(413).json({
                error: "WECHAT_MP_CONTENT_TOO_LARGE",
                message: "文章正文过长，请缩短到 20 万字符以内后重试",
            });
        }

        const analysis = await analyzeWechatImportContent({
            db,
            contentPayload,
            article: req.body?.article || {},
            userId: req.user?.id,
        });
        const importDecision = resolveWechatImportDecision({
            resourceType: req.body?.resource_type || req.body?.resourceType || "event",
            analysisStatus: analysis.analysis.status,
            parsed: analysis.parsed,
            requestedStatus: req.body?.status,
        });
        const result = buildWechatMpResourcePayload({
            resourceType: req.body?.resource_type || req.body?.resourceType || "event",
            article: req.body?.article || {},
            content: contentPayload,
            parsed: analysis.parsed,
            status: importDecision.status,
            rejectionReason: importDecision.rejectionReason,
        });
        return res.json({ ...result, analysis: analysis.analysis });
    } catch (error) {
        return sendError(res, error, "生成微信文章导入内容失败");
    }
};

const parseWechatMpArticle = async (req, res) => {
    let contentPayload = req.body?.content || null;
    try {
        if (!contentPayload?.contentText && req.body?.url) {
            contentPayload = await fetchArticleContent({ url: req.body.url });
        }
        const contentText = String(contentPayload?.contentText || "").trim();
        if (!contentText) {
            return res.status(422).json({
                error: "WECHAT_MP_EMPTY_CONTENT",
                message: "请先获取文章正文后再解析",
            });
        }
        if (contentText.length > MAX_PARSE_CONTENT_CHARS) {
            return res.status(413).json({
                error: "WECHAT_MP_CONTENT_TOO_LARGE",
                message: "文章正文过长，请缩短到 20 万字符以内后重试",
            });
        }

        const sourceCoverImage = String(
            contentPayload.coverImage || req.body?.article?.cover || ""
        ).trim();
        const safeCoverImage =
            trustedWechatAssetUrl(sourceCoverImage) || isLocalUploadUrl(sourceCoverImage)
                ? sourceCoverImage
                : "";

        const scrapedData = {
            title: String(contentPayload.title || req.body?.article?.title || "Untitled").slice(
                0,
                500
            ),
            author: String(contentPayload.author || req.body?.article?.account || "Unknown").slice(
                0,
                300
            ),
            content: contentText,
            coverImage: safeCoverImage,
        };
        const parsedData = await parseWithLLM(scrapedData);
        if (!parsedData) {
            await recordWechatParseRun({
                status: "failed",
                userId: req.user?.id,
                contentLength: scrapedData.content.length,
                errorCode: "LLM_EMPTY_RESULT",
            });
            return res.status(500).json({
                error: "LLM parsing failed",
                message:
                    "Failed to parse content with AI. Please try again or fill in the information manually.",
            });
        }

        if (!parsedData.content) parsedData.content = scrapedData.content;
        parsedData.title = parsedData.title || scrapedData.title || "Untitled";
        parsedData.description = parsedData.description || scrapedData.content.slice(0, 200);
        if (isLocalUploadUrl(scrapedData.coverImage)) {
            parsedData.coverImage = scrapedData.coverImage;
        } else if (scrapedData.coverImage) {
            try {
                parsedData.coverImage =
                    (await downloadWeChatImage(scrapedData.coverImage)) || scrapedData.coverImage;
            } catch {
                parsedData.coverImage = scrapedData.coverImage;
            }
        }

        await recordWechatParseRun({
            status: "completed",
            userId: req.user?.id,
            cacheHit: false,
            contentLength: scrapedData.content.length,
            modelUsed: true,
            provider: parsedData.aiMeta?.provider,
            model: parsedData.aiMeta?.model,
            runtimeTelemetry: parsedData.aiMeta?.runtimeTelemetry,
            hasCoverImage: Boolean(parsedData.coverImage),
            category: parsedData.category,
            isCollegeNotice: parsedData.is_college_notice,
            noticeType: parsedData.notice_type,
            sourceCollege: parsedData.source_college,
        });

        return res.json({
            parsed: parsedData,
            source: {
                title: scrapedData.title,
                author: scrapedData.author,
                contentLength: scrapedData.content.length,
            },
        });
    } catch (error) {
        await recordWechatParseRun({
            status: "failed",
            userId: req.user?.id,
            contentLength: contentPayload?.contentText?.length || 0,
            errorCode: error.code || error.message || "WECHAT_MP_PARSE_FAILED",
        });
        return sendError(res, error, "解析微信文章失败");
    }
};

const getWechatMpIngestOverview = async (_req, res) => {
    try {
        const db = await getDb();
        const [settings, accounts, runs, articles] = await Promise.all([
            wechatMpScheduledIngestService.getIngestSettings(db),
            wechatMpScheduledIngestService.listIngestAccounts(db),
            wechatMpScheduledIngestService.listIngestRuns(db, { limit: 10 }),
            wechatMpScheduledIngestService.listIngestArticles(db, { limit: 20 }),
        ]);
        return res.json({ settings, accounts, runs, articles });
    } catch (error) {
        return sendError(res, error, "获取微信 MP 定时采集状态失败");
    }
};

const getWechatMpIngestSettings = async (_req, res) => {
    try {
        const db = await getDb();
        const settings = await wechatMpScheduledIngestService.getIngestSettings(db);
        return res.json({ settings });
    } catch (error) {
        return sendError(res, error, "获取微信 MP 定时采集配置失败");
    }
};

const updateWechatMpIngestSettings = async (req, res) => {
    try {
        const db = await getDb();
        const settings = await wechatMpScheduledIngestService.updateIngestSettings(
            db,
            req.body || {}
        );
        return res.json({ settings });
    } catch (error) {
        return sendError(res, error, "保存微信 MP 定时采集配置失败");
    }
};

const listWechatMpIngestAccounts = async (_req, res) => {
    try {
        const db = await getDb();
        const accounts = await wechatMpScheduledIngestService.listIngestAccounts(db);
        return res.json({ accounts });
    } catch (error) {
        return sendError(res, error, "获取微信 MP 公众号列表失败");
    }
};

const upsertWechatMpIngestAccount = async (req, res) => {
    try {
        const db = await getDb();
        const account = await wechatMpScheduledIngestService.upsertIngestAccount(db, {
            ...req.body,
            id: req.params?.id || req.body?.id,
        });
        return res.json({ account });
    } catch (error) {
        return sendError(res, error, "保存微信 MP 公众号失败");
    }
};

const deleteWechatMpIngestAccount = async (req, res) => {
    try {
        const db = await getDb();
        const result = await wechatMpScheduledIngestService.deleteIngestAccount(db, req.params.id);
        return res.json(result);
    } catch (error) {
        return sendError(res, error, "删除微信 MP 公众号失败");
    }
};

const importWechatMpIngestAccounts = async (req, res) => {
    let uploadedPath = "";
    try {
        const db = await getDb();
        uploadedPath = req.file?.path || "";
        const result = await wechatMpScheduledIngestService.importIngestAccountsFromFile(
            db,
            req.file
        );
        return res.json(result);
    } catch (error) {
        return sendError(res, error, "导入微信 MP 公众号列表失败");
    } finally {
        if (uploadedPath) {
            fs.promises.unlink(uploadedPath).catch(() => {});
        }
    }
};

const startWechatMpIngestRun = async (req, res) => {
    try {
        const db = await getDb();
        const run = await wechatMpScheduledIngestService.startWechatMpIngestRun(db, {
            triggerType: "manual",
            userId: req.user?.id,
        });
        return res.status(202).json({ run });
    } catch (error) {
        return sendError(res, error, "启动微信 MP 增量采集失败");
    }
};

const listWechatMpIngestRuns = async (req, res) => {
    try {
        const db = await getDb();
        const runs = await wechatMpScheduledIngestService.listIngestRuns(db, {
            limit: req.query?.limit,
        });
        return res.json({ runs });
    } catch (error) {
        return sendError(res, error, "获取微信 MP 增量采集记录失败");
    }
};

const listWechatMpIngestArticles = async (req, res) => {
    try {
        const db = await getDb();
        const articles = await wechatMpScheduledIngestService.listIngestArticles(db, {
            limit: req.query?.limit,
        });
        return res.json({ articles });
    } catch (error) {
        return sendError(res, error, "获取微信 MP 增量文章失败");
    }
};

const extractWechatMpIngestArticle = async (req, res) => {
    try {
        const db = await getDb();
        const result = await wechatMpScheduledIngestService.extractIngestArticle(
            db,
            req.params.id,
            {
                userId: req.user?.id,
            }
        );
        return res.json(result);
    } catch (error) {
        return sendError(res, error, "提取微信 MP 文章信息失败");
    }
};

module.exports = {
    buildWechatMpImportPayload,
    cancelWechatMpLogin,
    deleteWechatMpIngestAccount,
    getWechatMpArticleContent,
    getWechatMpIngestOverview,
    getWechatMpIngestSettings,
    getWechatMpLoginStatus,
    getWechatMpStatus,
    extractWechatMpIngestArticle,
    importWechatMpIngestAccounts,
    listWechatMpIngestAccounts,
    listWechatMpIngestArticles,
    listWechatMpIngestRuns,
    listWechatMpArticles,
    parseWechatMpArticle,
    searchWechatMpAccounts,
    startWechatMpIngestRun,
    startWechatMpLogin,
    updateWechatMpIngestSettings,
    upsertWechatMpIngestAccount,
};
