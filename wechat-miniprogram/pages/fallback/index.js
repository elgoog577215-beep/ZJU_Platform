Page({
    data: {
        reason: "load",
    },

    onLoad(options) {
        const params = options || {};
        this.setData({
            reason: params.reason || "load",
        });
    },

    openHome() {
        wx.reLaunch({
            url: "/pages/home/index",
        });
    },
});
