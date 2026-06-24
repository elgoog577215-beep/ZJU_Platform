# 设计：认证组织历史归属迁移

## 架构

本变更把“历史代录内容过渡到认证组织名下”拆成三个层次：

```text
认证组织主数据
  profiles + ecosystem_partners + profile_aliases
        ↓
候选扫描
  events.organizer / title / description / source_url / location
        ↓
管理员确认
  event_attribution_migration_logs + events.publisher_profile_id / organizer_profile_id
```

第一阶段只处理活动，因为当前问题主要来自官方账号代录社团组织活动。文章、新闻和社区内容可在后续沿用同一日志与候选模型扩展。

## 后端职责

- 提供认证组织候选扫描服务。
- 按组织 profile 聚合历史活动候选。
- 为每个候选返回匹配等级、置信度、证据文本和当前归属状态。
- 提供管理员确认接口，批量写入 `events.publisher_profile_id` 与 `events.organizer_profile_id`。
- 写入迁移日志，保留变更前后值、确认人、匹配证据和批次 ID。
- 不修改 `events.uploader_id`、`events.created_at`、审核状态和文件路径。

## 前端职责

- 在后台提供“组织归属迁移”入口。
- 支持选择认证组织、查看候选、按强/中/弱匹配筛选。
- 明确展示匹配依据和“不会覆盖上传人”的安全说明。
- 支持管理员确认强匹配候选。
- 展示应用结果和日志批次 ID。

## 数据模型

新增 `event_attribution_migration_logs`：

- `id`
- `batch_id`
- `event_id`
- `target_profile_id`
- `previous_publisher_profile_id`
- `previous_organizer_profile_id`
- `next_publisher_profile_id`
- `next_organizer_profile_id`
- `match_level`
- `confidence`
- `matched_by`
- `evidence`
- `status`
- `confirmed_by`
- `created_at`
- `reverted_at`

该表只记录迁移行为，不替代活动本身的当前归属字段。

## 匹配规则

- 强匹配：`events.organizer` 精确命中唯一组织别名，或来源账号唯一绑定组织。
- 中匹配：标题、描述、来源链接等文本出现组织标准名或别名。
- 弱匹配：地点、活动类型或模糊文本只能作为建议，不进入默认批量应用。

地点只提高证据说明，不单独把活动归到组织。

## 安全策略

- 候选扫描只读，不修改数据。
- 应用迁移必须是管理员接口。
- 应用迁移默认只接受明确传入的候选 ID 列表。
- 已有归属不同且不是目标组织时，候选标记为冲突，除非管理员显式允许覆盖，否则不写入。
- 所有写入记录日志，后续可基于日志实现回滚。

## 验证

- 服务级测试覆盖强匹配、中匹配、弱匹配和冲突。
- 服务级测试确认应用迁移不修改上传人。
- API 级或服务级测试确认日志写入完整。
- OpenSpec 校验通过。
- 前端构建通过。
