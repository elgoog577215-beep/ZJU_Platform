const { WEB_ORIGIN, DEFAULT_PATH, normalizePath } = require("../../utils/webview");

const LOGIN_COPY = {
    kicker: "WECHAT LOGIN",
    title: "微信账号登录",
    description:
        "使用已绑定的微信身份完成登录后，将自动回到拓途浙享网页，并复用网站账号与内容权限。",
    primaryButton: "微信一键登录",
    secondaryButton: "返回活动入口",
    loading: "登录中",
    genericError: "微信登录暂不可用，请稍后重试",
};

const BIND_COPY = {
    kicker: "WECHAT BINDING",
    title: "绑定微信账号",
    description: "将当前微信身份绑定到刚才登录的网站账号，绑定成功后即可使用微信一键登录。",
    primaryButton: "确认绑定微信",
    secondaryButton: "返回账号设置",
    loading: "绑定中",
    genericError: "微信绑定暂不可用，请稍后重试",
};

const ERROR_MESSAGES = {
    WECHAT_NOT_CONFIGURED: "微信登录暂未配置，请联系管理员完成小程序配置",
    WECHAT_NOT_BOUND: "请先使用网站账号登录，并在安全设置中绑定微信",
    WECHAT_ALREADY_BOUND: "该微信账号已经绑定到其他线上账号",
    WECHAT_USER_ALREADY_BOUND: "当前线上账号已经绑定了其他微信账号",
    WECHAT_BIND_TICKET_INVALID: "绑定凭证已失效，请返回网页重新发起绑定",
    WECHAT_BIND_RATE_LIMITED: "绑定尝试过于频繁，请稍后再试",
};

const appendQueryParam = (path, key, value) => {
    const [beforeHash, hash = ""] = String(path || DEFAULT_PATH).split("#");
    const [pathname, query = ""] = beforeHash.split("?");
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    const params = query
        ? query.split("&").filter((item) => item && item.split("=")[0] !== encodedKey)
        : [];
    params.push(`${encodedKey}=${encodedValue}`);
    const nextQuery = params.join("&");
    return `${pathname || DEFAULT_PATH}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
};

Page({
    data: {
        mode: "login",
        redirect: DEFAULT_PATH,
        ticket: "",
        copy: LOGIN_COPY,
        loading: false,
        error: "",
    },

    onLoad(options) {
        const params = options || {};
        const mode = params.mode === "bind" ? "bind" : "login";
        this.setData({
            mode,
            redirect: normalizePath(params.redirect || DEFAULT_PATH),
            ticket: String(params.ticket || ""),
            copy: mode === "bind" ? BIND_COPY : LOGIN_COPY,
        });
    },

    handleWechatLogin() {
        if (this.data.loading) return;

        this.setData({ loading: true, error: "" });
        wx.showLoading({ title: this.data.copy.loading, mask: true });

        wx.login({
            timeout: 10000,
            success: (result) => {
                if (!result.code) {
                    this.failLogin("未获取到微信登录凭证，请重试");
                    return;
                }
                this.exchangeLoginCode(result.code);
            },
            fail: () => {
                this.failLogin("微信登录授权失败，请重试");
            },
        });
    },

    exchangeLoginCode(code) {
        const app = getApp();
        const webOrigin = app.globalData?.webOrigin || WEB_ORIGIN;
        const isBindMode = this.data.mode === "bind";

        if (isBindMode && !this.data.ticket) {
            this.failLogin("绑定凭证缺失，请返回网页重新发起绑定");
            return;
        }

        wx.request({
            url: `${webOrigin}/api/auth/wechat-miniapp/${isBindMode ? "bind" : "login"}`,
            method: "POST",
            header: {
                "content-type": "application/json",
            },
            data: isBindMode ? { code, ticket: this.data.ticket } : { code },
            success: (response) => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    if (isBindMode) {
                        this.openWebViewWithBindResult("success");
                        return;
                    }

                    const token = response.data?.token;
                    if (token) {
                        this.openWebViewWithToken(token);
                        return;
                    }
                }

                const errorCode = response.data?.errorCode || response.data?.code;
                this.failLogin(
                    ERROR_MESSAGES[errorCode] || response.data?.error || this.data.copy.genericError
                );
            },
            fail: () => {
                this.failLogin("无法连接登录服务，请稍后重试");
            },
            complete: () => {
                wx.hideLoading();
            },
        });
    },

    openWebViewWithToken(token) {
        let targetPath = appendQueryParam(
            this.data.redirect || DEFAULT_PATH,
            "wechat_login_token",
            token
        );
        targetPath = appendQueryParam(targetPath, "miniapp", "1");

        wx.reLaunch({
            url: `/pages/webview/index?path=${encodeURIComponent(targetPath)}`,
            fail: () => {
                this.failLogin("登录成功，但返回网页失败，请重新打开小程序");
            },
        });
    },

    openWebViewWithBindResult(result) {
        let targetPath = appendQueryParam(
            this.data.redirect || DEFAULT_PATH,
            "wechat_bind",
            result
        );
        targetPath = appendQueryParam(targetPath, "miniapp", "1");

        wx.reLaunch({
            url: `/pages/webview/index?path=${encodeURIComponent(targetPath)}`,
            fail: () => {
                this.failLogin("绑定成功，但返回网页失败，请重新打开小程序");
            },
        });
    },

    failLogin(message) {
        wx.hideLoading();
        this.setData({
            loading: false,
            error: message,
        });
    },

    openHome() {
        const pages =
            typeof globalThis.getCurrentPages === "function" ? globalThis.getCurrentPages() : [];
        const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;
        const previousRoute = previousPage?.route || "";

        if (previousRoute === "pages/webview/index" || previousRoute === "pages/index/index") {
            wx.navigateBack({
                delta: 1,
                fail: () => {
                    this.openWebViewHome();
                },
            });
            return;
        }

        this.openWebViewHome();
    },

    openWebViewHome() {
        wx.reLaunch({
            url: `/pages/webview/index?path=${encodeURIComponent(this.data.redirect || DEFAULT_PATH)}`,
        });
    },
});
