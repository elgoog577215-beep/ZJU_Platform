const { WEB_ORIGIN } = require("./utils/webview");

App({
    globalData: {
        webOrigin: WEB_ORIGIN,
    },

    onLaunch() {
        console.info("[tuotuzju-miniprogram] app launch");
    },
});
