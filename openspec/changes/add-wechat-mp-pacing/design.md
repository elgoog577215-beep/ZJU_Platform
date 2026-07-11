# add-wechat-mp-pacing 设计

## 后端节奏模型

新增统一 pacing 配置归一化：

- `queryDelayRangeSeconds`：公众号账号之间的随机等待范围。空值默认继承 `[55, 120]`。
- `pagePauseSeconds`：同一公众号自动翻页之间的固定等待。空值默认 `3`。
- `contentDelayRangeSeconds`：批量正文抓取之间的随机等待范围。空值默认 `[3, 8]`。

所有等待都在服务端执行。前端传参只作为配置输入，不作为可信节流机制。

## 接口行为

- `POST /api/admin/wechat-mp/articles` 保持原有单账号行为，同时接受 pacing 参数。
- 当请求体提供 `accounts` 数组时，后端按账号顺序批量获取文章，并在相邻账号之间执行 `queryDelayRangeSeconds`。
- 当 `max_pages > 1` 且仍需继续翻页时，后端在下一页请求前执行 `pagePauseSeconds`。
- `POST /api/admin/wechat-mp/article-content` 保持原有单正文行为，同时接受 `articles` 或 `urls` 数组用于批量正文抓取，并在相邻正文之间执行 `contentDelayRangeSeconds`。

## 前端体验

采集节奏属于高级项。管理页默认折叠显示，展开后预填：

- 账号间隔最小秒：55
- 账号间隔最大秒：120
- 翻页间隔秒：空值，后端默认 3
- 正文间隔秒：空值，后端默认 3-8

提示文案强调这些参数影响登录态稳定和平台访问节奏；清空账号间隔时后端仍使用 55-120 秒默认值。

## 测试策略

单测使用可注入 `random` 和 `sleep`，验证等待计算与调用参数，不真实等待。现有微信 MP 服务层测试继续覆盖安全边界、文章解析和凭据脱敏。
