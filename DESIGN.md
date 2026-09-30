# 视觉设计入口

本文件供设计工具定位当前视觉依据。页面职责、开放范围和交互规则维护在[产品蓝图](docs/产品蓝图.md#交互设计)，不在这里复制；具体颜色、字号和断点从下列共享样式读取，避免手写 token 表与代码长期漂移。

## 共同依据

保留现有 Logo、全站导航、账号与日夜主题。用户确认的首要要求是整齐：网格、对齐、字阶和间距清楚，背景与图像不干扰主要操作。沿用已确认页面的构图，局部修改不自动扩大为全站重设计。

主题从 [SettingsContext](src/context/SettingsContext.jsx) 与 [index.css](src/index.css) 进入；正文、控件、焦点、加载/空/失败状态均需可读。中英文、键盘及减少动态效果采用全站规则。视觉判断以真实页面为准，静态样式或构建通过不能替代查看。

## 各表面的参考

| 表面           | 当前应保留的方向                                                                         | 具体实现入口                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首页网址导航   | 白天浅底与绿色强调；夜间复用全站夜景背景与深色链接表面；保持紧凑字号、分类网格与账号编辑 | [navigation.css](src/features/navigation/navigation.css)                                                                                              |
| 活动与生态介绍 | 保留现有共享主题；About 保留首屏双栏、统计栏及四屏内容结构                               | [Events](src/components/Events.jsx)、[About](src/components/About.jsx)                                                                                |
| 学习社区       | 四入口、冰蓝线性图形与共享日夜主题；选择后收为顶部栏目，操作属于当前专题                 | [AICommunity](src/components/AICommunity.jsx)、[CommunityLibraryHub](src/components/CommunityLibraryHub.jsx)                                          |
| 支持方名录     | 四类入口进入真实支持方详情，保持已有连续动效、查询与返回                                 | [EcosystemPartnerDirectory](src/components/EcosystemPartnerDirectory.jsx)                                                                             |
| 浙客松         | 两届共用第一届的直角青蓝主题与全站框架，四个二级 tab、无左栏、页内报名                   | [赛事设计](docs/功能设计/浙客松.md#交互设计)、[共享样式](src/components/HackathonShared.css)、[Workspace 样式](src/components/HackathonWorkspace.css) |

手机是否开放某页面先查蓝图，不以旧移动稿恢复已关闭入口。新的完整视觉方向需用户明确确认后更新对应设计，旧独立 X 主题、项目广场与历史表面评审不再作为约束。
