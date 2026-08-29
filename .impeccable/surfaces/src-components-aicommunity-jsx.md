---
version: 1
slug: "src-components-aicommunity-jsx"
primary_target: "src/components/AICommunity.jsx"
related_targets: ["src/components/CommunityLibraryHub.jsx", "src/components/CommunityPosts.jsx"]
---

# AI 社区知识汇流台

- Scope / mode：`/articles` 公开 Web/PWA 表面，Read + Operate；桌面与移动共享信息顺序。
- Audience / job：学生进入学习社区后，先在新生、期末、AI 学习和讨论区四类任务中完成一次明确选择，再直接使用真实内容。
- Action / proof：桌面首屏先显示由四路汇聚徽记、紧凑中英文字形和信号轨道组成的“学习社区”科技字标，再显示四个大型功能入口；选择后同一组入口通过共享布局动画收缩为半透明顶部栏目，返回位于左侧，页面自己的搜索与发布入口承接后续操作。
- Direction：继承拓浙 AI 生态昼夜主题、深海蓝和靛蓝强调色，用不对称的 12 栏知识汇流台承载四个入口；每个入口采用与任务含义对应的路径、试卷扫描、模型网络和汇流图形。期末资料库只显示课程资料，AI 学习库在教程之后提供独立 AI 资源库，不复制内容真源。
- Memorable moment：四个信号端点在字标徽记中汇聚到知识核心，紧接着在下方展开为四个真实入口；选择后入口原位收拢为“左侧返回 + 四栏目 + 必要操作”的轻透命令栏，移动端保持紧凑入口和真实内容顺序。
- Constraints：不复制内容真源；legacy 深链优先；支持 `prefers-reduced-motion`；工作态不重复页面已有搜索，也不提供跨栏目“发起讨论/提问”捷径；白天背景只在 AI 社区作用域提高清晰度；状态必须显示外部链接缺失、加载、空结果、登录要求和返回方式。
- Unresolved：真实 `VITE_AI_COMMUNITY_FRESHMAN_IMA_URL` 待运营方提供。
