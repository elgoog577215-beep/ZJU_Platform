---
version: 1
slug: "src-components-aicommunity-jsx"
primary_target: "src/components/AICommunity.jsx"
related_targets: ["src/components/CommunityLibraryHub.jsx", "src/components/CommunityPosts.jsx"]
---

# AI 社区资料库入口

- Scope / mode：`/articles` 公开 Web/PWA 表面，Read + Operate；桌面与移动共享信息顺序。
- Audience / job：学生进入 AI 社区后，需要立即判断自己要解决新生、期末还是 AI 学习问题，并进入真实可用的资料承载页。
- Action / proof：首屏只显示三个长期资料库；新生库标明 ima 外部承载和链接状态，期末与 AI 学习复用站内真实内容，共建入口进入既有投稿与讨论链。
- Direction：继承拓浙 AI 生态昼夜主题和靛蓝强调色，使用非对称编辑书架和大型专题字样；拒绝全品类信息流、十二个空章节和同尺寸图标卡片首页。
- Memorable moment：新生主专题与期末、AI 两个专题在一个首屏构成三库全景，用户无需理解“学习区/资源区/讨论区”即可行动。
- Constraints：不复制内容真源；legacy 深链优先；状态必须显示外部、站内、缺失原因和返回方式；移动底栏不得遮挡主要行动。
- Unresolved：真实 `VITE_AI_COMMUNITY_FRESHMAN_IMA_URL` 待运营方提供。
