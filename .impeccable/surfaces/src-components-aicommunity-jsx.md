---
version: 1
slug: "src-components-aicommunity-jsx"
primary_target: "src/components/AICommunity.jsx"
related_targets: ["src/components/CommunityLibraryHub.jsx", "src/components/CommunityPosts.jsx"]
---

# AI 社区递进式 Dock

- Scope / mode：`/articles` 公开 Web/PWA 表面，Read + Operate；桌面与移动共享信息顺序。
- Audience / job：学生进入 AI 社区后，先在新生、期末、AI 学习和社区共建四类任务中完成一次明确选择，再直接使用真实内容。
- Action / proof：初始首屏只有四个大型功能入口；选择后同一组入口通过共享布局动画收缩为顶部栏目，搜索、上传、提问等操作随当前任务出现，浏览器返回恢复入口态。
- Direction：继承拓浙 AI 生态昼夜主题、深海蓝和靛蓝强调色，使用圆角微光 Dock 与功能化抽象图形；拒绝全品类信息流、解释性 Hero、空统计和另造内容真源。
- Memorable moment：四张功能卡原位收拢为同一条顶部选择栏，真实内容随后进入，用户始终保有稳定的空间记忆。
- Constraints：不复制内容真源；legacy 深链优先；支持 `prefers-reduced-motion`；状态必须显示外部链接缺失、加载、空结果、登录要求和返回方式；移动底栏不得遮挡主要行动。
- Unresolved：真实 `VITE_AI_COMMUNITY_FRESHMAN_IMA_URL` 待运营方提供。
