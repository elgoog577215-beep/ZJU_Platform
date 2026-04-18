## ADDED Requirements

### Requirement: new_content Notification Type

`notifications.type` SHALL 接受新值 `'new_content'`，用于标识被关注作者发布新资源时触发的通知。

- `content` 列按 `follow-new-content-notifications` capability 的 `Notification Content Format` 规范填充
- `data` JSON 列 MUST 包含 `related_resource_type`（`photo` | `music` | `video` | `article` | `news` | `event`）和 `related_resource_id`
- 通知 MUST 通过既有的 `createNotification(userId, type, content, resourceId, resourceType)` helper 写入，保持 `Notification Content Single Source` 要求不变（仅使用 `content` 列）
- `normalizeNotificationRow` 兼容 `new_content` type，无需特殊分支

#### Scenario: fan-out writes new_content notification

- **GIVEN** 作者 B 发 article（id=42）触发 fan-out 给粉丝 C
- **WHEN** `createNotification(C.id, 'new_content', 'B 发布了新文章《X》', 42, 'article')` 执行
- **THEN** `notifications` 表新行 `type='new_content'`, `content='B 发布了新文章《X》'`, `data` JSON 解析后 `related_resource_type='article'`, `related_resource_id=42`

#### Scenario: Legacy notification types unaffected

- **GIVEN** 既有的 favorite / comment / follow / moderation 通知逻辑
- **WHEN** 本次 change 部署
- **THEN** 这些 type 的行为保持不变，`normalizeNotificationRow` 输出对这些 type 的字段结构与本轮 change 前一致

### Requirement: new_content Frontend Routing

`NotificationCenter.jsx` 的 `buildNotificationTargetPath` SHALL 支持 `new_content` type 的路由映射，根据 `related_resource_type` 跳转到对应的资源详情位置：

| related_resource_type | 跳转路径 |
|---|---|
| `article` | `/articles?id={id}` |
| `photo` | `/gallery?id={id}` |
| `music` | `/music?id={id}` |
| `video` | `/videos?id={id}` |
| `event` | `/events?id={id}` |
| `news` | `/news?id={id}` 或等价路径 |

未识别的 `related_resource_type` SHALL fallback 到通知列表（不 navigate），并在 console 打 warning。

#### Scenario: Click new_content article notification

- **GIVEN** 粉丝 C 的通知列表里有 `{ type:'new_content', related_resource_type:'article', related_resource_id:42 }`
- **WHEN** C 点击该通知项
- **THEN** `buildNotificationTargetPath` 返回 `/articles?id=42`，前端 navigate 过去

#### Scenario: Unknown resource type falls back gracefully

- **GIVEN** 通知 `{ type:'new_content', related_resource_type:'unknown_type', related_resource_id:99 }`（脏数据）
- **WHEN** 用户点击
- **THEN** 不 navigate；console.warn 提示未识别的资源类型；通知自身 MAY 被标记为已读
