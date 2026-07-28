Page({
    data: {
        eventId: "",
    },

    onLoad(options) {
        const params = options || {};
        this.setData({
            eventId: params.eventId || "",
        });
    },

    openHome() {
        wx.reLaunch({
            url: "/pages/webview/index",
        });
    },
});
