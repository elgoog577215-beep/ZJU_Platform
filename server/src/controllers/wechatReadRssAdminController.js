const wechatReadRssAdminService = require("../services/wechatReadRssAdminService");

const toHttpStatus = (error) => {
    if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 600) {
        return error.status;
    }
    return 502;
};

const sendError = (res, error, fallback) =>
    res.status(toHttpStatus(error)).json({
        error: error?.code || "WEWE_RSS_ADMIN_ERROR",
        message: error?.message || fallback,
    });

const getOverview = async (_req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.getOverview());
    } catch (error) {
        return sendError(res, error, "获取 WeWe RSS 管理状态失败");
    }
};

const startLogin = async (_req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.startLogin());
    } catch (error) {
        return sendError(res, error, "启动微信读书登录失败");
    }
};

const getLoginStatus = async (req, res) => {
    try {
        return res.json(
            await wechatReadRssAdminService.getLoginStatus(req.query?.id || req.query?.uuid)
        );
    } catch (error) {
        return sendError(res, error, "获取微信读书登录状态失败");
    }
};

const cancelLogin = async (req, res) => {
    try {
        return res.json(
            wechatReadRssAdminService.cancelLogin(req.body?.id || req.body?.uuid || req.query?.id)
        );
    } catch (error) {
        return sendError(res, error, "取消微信读书登录失败");
    }
};

const listAccounts = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.listAccounts({ limit: req.query?.limit }));
    } catch (error) {
        return sendError(res, error, "获取微信读书账号失败");
    }
};

const updateAccount = async (req, res) => {
    try {
        const account = await wechatReadRssAdminService.updateAccount(
            req.params.id,
            req.body || {}
        );
        return res.json({ account });
    } catch (error) {
        return sendError(res, error, "更新微信读书账号失败");
    }
};

const deleteAccount = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.deleteAccount(req.params.id));
    } catch (error) {
        return sendError(res, error, "删除微信读书账号失败");
    }
};

const listFeeds = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.listFeeds({ limit: req.query?.limit }));
    } catch (error) {
        return sendError(res, error, "获取微信读书订阅源失败");
    }
};

const discoverFeed = async (req, res) => {
    try {
        return res.json(
            await wechatReadRssAdminService.discoverFeed(req.body?.wxs_link || req.body?.wxsLink)
        );
    } catch (error) {
        return sendError(res, error, "解析公众号订阅源失败");
    }
};

const addFeed = async (req, res) => {
    try {
        const feed = await wechatReadRssAdminService.addFeed(req.body || {});
        return res.json({ feed });
    } catch (error) {
        return sendError(res, error, "添加微信读书订阅源失败");
    }
};

const updateFeed = async (req, res) => {
    try {
        const feed = await wechatReadRssAdminService.updateFeed(req.params.id, req.body || {});
        return res.json({ feed });
    } catch (error) {
        return sendError(res, error, "更新微信读书订阅源失败");
    }
};

const deleteFeed = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.deleteFeed(req.params.id));
    } catch (error) {
        return sendError(res, error, "删除微信读书订阅源失败");
    }
};

const refreshFeed = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.refreshFeed(req.params.id));
    } catch (error) {
        return sendError(res, error, "更新微信读书订阅源文章失败");
    }
};

const refreshAllFeeds = async (_req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.refreshAllFeeds());
    } catch (error) {
        return sendError(res, error, "更新全部微信读书订阅源失败");
    }
};

const getRefreshStatus = async (_req, res) => {
    try {
        return res.json({ running: await wechatReadRssAdminService.getRefreshStatus() });
    } catch (error) {
        return sendError(res, error, "获取微信读书更新状态失败");
    }
};

const listArticles = async (req, res) => {
    try {
        return res.json(
            await wechatReadRssAdminService.listArticles({
                mpId: req.params.id || req.query?.mp_id || req.query?.mpId,
                limit: req.query?.limit,
                cursor: req.query?.cursor,
            })
        );
    } catch (error) {
        return sendError(res, error, "获取微信读书文章失败");
    }
};

const deleteArticle = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.deleteArticle(req.params.id));
    } catch (error) {
        return sendError(res, error, "删除微信读书文章失败");
    }
};

const startHistory = async (req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.startHistory(req.params.id));
    } catch (error) {
        return sendError(res, error, "启动历史文章同步失败");
    }
};

const cancelHistory = async (_req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.cancelHistory());
    } catch (error) {
        return sendError(res, error, "停止历史文章同步失败");
    }
};

const getHistoryStatus = async (_req, res) => {
    try {
        return res.json(await wechatReadRssAdminService.getHistoryStatus());
    } catch (error) {
        return sendError(res, error, "获取历史文章同步状态失败");
    }
};

module.exports = {
    addFeed,
    cancelHistory,
    cancelLogin,
    deleteAccount,
    deleteArticle,
    deleteFeed,
    discoverFeed,
    getHistoryStatus,
    getLoginStatus,
    getOverview,
    getRefreshStatus,
    listAccounts,
    listArticles,
    listFeeds,
    refreshAllFeeds,
    refreshFeed,
    startHistory,
    startLogin,
    updateAccount,
    updateFeed,
};
