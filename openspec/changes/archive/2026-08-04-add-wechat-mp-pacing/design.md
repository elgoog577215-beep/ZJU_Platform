# add-wechat-mp-pacing 设计

## 后端节奏模型

新增统一 pacing 配置归一化：

- `queryDelayRangeSeconds`：公众号账号之间的随机等待范围。空值默认继承 `[95, 125]`。
- `pagePauseRangeSeconds`：同一公众号自动翻页之间的随机等待范围。空值默认 `[10, 25]`。
- `contentDelayRangeSeconds`：批量正文抓取之间的随机等待范围。空值默认 `[10, 20]`。

所有等待都在服务端执行。前端传参只作为配置输入，不作为可信节流机制。

## 接口行为

- `POST /api/admin/wechat-mp/articles` 保持原有单账号行为，同时接受 pacing 参数。
- 当请求体提供 `accounts` 数组时，后端按账号顺序批量获取文章，并在相邻账号之间执行 `queryDelayRangeSeconds`。
- 当 `max_pages > 1` 且仍需继续翻页时，后端在下一页请求前按 `pagePauseRangeSeconds` 随机等待。
- `POST /api/admin/wechat-mp/article-content` 保持原有单正文行为，同时接受 `articles` 或 `urls` 数组用于批量正文抓取，并在相邻正文之间执行 `contentDelayRangeSeconds`。

## 前端体验

采集节奏属于高级项。手动采集页默认折叠显示，展开后以占位符提示后端默认值；定时采集设置页显示当前已保存的配置：

- 账号间隔最小秒：空值，placeholder 95，后端默认 95
- 账号间隔最大秒：空值，placeholder 125，后端默认 125
- 翻页间隔最小/最大秒：空值，placeholder 10/25，后端默认 10-25
- 正文间隔最小/最大秒：空值，placeholder 10/20，后端默认 10-20

提示文案使用直接警告口吻，提醒不了解参数作用的管理员保持默认，不要随意变更。

## 测试策略

单测使用可注入 `random` 和 `sleep`，验证等待计算与调用参数，不真实等待。现有微信 MP 服务层测试继续覆盖安全边界、文章解析和凭据脱敏。
