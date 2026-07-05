# Tuotu ZJU WeChat Mini Program WebView Shell

## Goal

This directory contains the phase-one hybrid mini program shell. It uses `web-view` to load the existing website and keeps native pages available for diagnostics, login, subscriptions, and future WeChat API integration.

Default web entry:

```text
https://tuotuzju.com/events?miniapp=1&utm_source=wechat_miniprogram
```

## Import

1. Open WeChat DevTools.
2. Import an existing project.
3. Select this directory: `wechat-miniprogram/`.
4. The local debugging config uses the WeChat DevTools test mini program AppID. Replace it with the official mini program AppID before production upload.

## Before Production Release

- The mini program owner must be an eligible organization account for `web-view`.
- `https://tuotuzju.com` must be configured in the WeChat business domain allowlist.
- Deploy the WeChat domain verification file to the website root when required by the WeChat admin console.
- Do not commit `AppSecret`, upload keys, private subscription templates, or other credentials.

## Route Policy

Allowed routes include events, articles, projects, hackathon, about, profiles, media, gallery, and videos.

Blocked routes include admin, downloads, API, uploads, and app package paths. Blocked routes fall back to the default events entry.

## Next Native Bridges

- WeChat login: `wx.login` -> backend `code2Session` -> one-time web ticket.
- Subscription messages: native page calls `wx.requestSubscribeMessage`, then records opt-in state on the backend.
- Share: mini program page owns default share config; the website can later pass share context through a bridge-safe channel.
