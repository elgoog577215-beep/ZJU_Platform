// Public WeChat fetches must never become a general-purpose server-side proxy.
const ARTICLE_HOSTS = new Set(["mp.weixin.qq.com", "www.weixin.qq.com"]);

const normalizeWechatRequestUrl = (value, { asset = false } = {}) => {
    let url;
    try {
        const text = String(value || "").trim();
        url = new URL(text.startsWith("//") ? `https:${text}` : text);
    } catch {
        throw invalidUrl();
    }
    const trustedHost =
        ARTICLE_HOSTS.has(url.hostname) ||
        (asset && (url.hostname.endsWith(".qpic.cn") || url.hostname.endsWith(".qlogo.cn")));
    if (
        !trustedHost ||
        url.username ||
        url.password ||
        url.port ||
        !["http:", "https:"].includes(url.protocol)
    )
        throw invalidUrl();
    url.protocol = "https:";
    url.hash = "";
    return url.toString();
};

const invalidUrl = () =>
    Object.assign(new Error("Untrusted WeChat URL"), {
        status: 400,
        code: "WECHAT_URL_UNTRUSTED",
    });

const wechatRequestOptions = ({ asset = false } = {}) => ({
    maxRedirects: 5,
    maxContentLength: asset ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
    maxBodyLength: asset ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
    beforeRedirect: (options) => {
        // Check the actual destination before follow-redirects makes a connection.
        const destination = new URL(
            `${options.protocol}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path || "/"}`
        );
        if (options.auth || destination.protocol !== "https:") throw invalidUrl();
        normalizeWechatRequestUrl(destination.toString(), { asset });
    },
});

module.exports = { normalizeWechatRequestUrl, wechatRequestOptions };
