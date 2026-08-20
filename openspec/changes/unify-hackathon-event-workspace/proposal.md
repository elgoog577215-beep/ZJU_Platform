## Why

当前浙客松页面把历届赛事和页内视图都压进一条会随滚动消失的顶部控制栏，项目广场与赛事影像又分别维护自己的赛事选择器，导致用户切换赛事或页面后失去当前位置。现在需要把浙客松重构为稳定的赛事工作区，用同一赛事上下文串起报名、项目提交、图片直播和成果展示。

## What Changes

- 将 `/hackathon` 重构为统一赛事工作区：桌面左侧常驻历届赛事目录，主内容顶部常驻“赛事报名、项目作品、赛事影像、成果展示”四个环节。
- 四个环节保持稳定位置；未开放、进行中、已结束或暂无内容通过明确状态表达，不再隐藏栏目或切换整套导航骨架。
- 赛事选择和当前环节写入 URL。初次进入按赛事阶段选择默认环节；用户主动切换赛事时保留当前环节，浏览器前进、后退、刷新和分享均可恢复。
- 将赛事范围的项目广场与赛事影像嵌入浙客松工作区，复用现有 `project_cards`、`competition_works`、`photos`、`videos` 与赛事关联，不复制数据、不新增平行业务真源。
- `/projects`、`/media`、`/hackathon/showcase` 和 `/hackathon/works` 保留兼容入口，并导向或恢复对应赛事上下文；全站主导航不再将项目广场和影像库作为与浙客松并列的一级栏目。
- 全站桌面主导航收口为“活动集合、AI 社区、浙客松、生态介绍”；“下载 App”改为搜索与个人入口附近的独立行动按钮。
- 移动端将历届赛事目录收为赛事选择抽屉或弹层，四环节保持可横向浏览的稳定局部导航；不得引入双层横向赛事 Tab 或页面级横向溢出。

## Capabilities

### New Capabilities

- `hackathon-event-workspace`: 定义跨届赛事选择、四环节导航、URL 状态、桌面/移动响应式结构和兼容入口。

### Modified Capabilities

- `project-plaza`: 项目广场从全站一级入口调整为浙客松“项目作品”环节，同时保留独立路由兼容和长期项目能力。
- `media-library-categories`: 赛事影像从全站一级入口调整为浙客松“赛事影像”环节，同时保留通用媒体和旧路由兼容。

## Impact

- 前端：重构 `HackathonSeasonOne.jsx` 及赛事路由状态；为 `ProjectPlaza.jsx`、`ProjectPlazaSurface.jsx`、`MediaEventArchive.jsx` 增加嵌入模式；调整 `Navbar.jsx`、`MobileNavbar.jsx`、`App.jsx` 与中英文文案。
- 后端与数据：不新增表、不迁移数据；继续通过现有赛事模板、competition API、项目和影像关联读取正式真源。
- 兼容性：历史 `/projects`、`/media`、`/hackathon/showcase`、`/hackathon/works` 深链继续可用；已有分享链接和详情参数不得失效。
- 风险：嵌入现有整页组件可能产生重复赛事导航、嵌套滚动或 URL 参数冲突，实施时必须由外层工作区唯一拥有赛事选择，并为子视图使用独立参数命名。
- 回滚：保留独立页面组件与旧路由，必要时可恢复旧导航映射和原 `HackathonSeasonOne` 视图组合，不影响数据与用户资产。
