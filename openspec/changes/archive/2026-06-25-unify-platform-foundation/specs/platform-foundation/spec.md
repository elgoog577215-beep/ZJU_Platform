## ADDED Requirements

### Requirement: 平台底座边界必须显式化
系统 SHALL 记录并执行第一版平台底座边界，覆盖后端分层、迁移归属、API 重试安全、共享弹层 portal、AI runtime 响应组装和搜索索引能力表述。

#### Scenario: 开发者新增后端功能
- **WHEN** 新功能需要 schema 变更
- **THEN** schema 变更 SHALL 通过 migration 基础设施实现
- **AND** 请求处理器不得在运行时创建表或修改列

#### Scenario: 写请求出现临时失败
- **WHEN** 前端对 POST、PUT、PATCH 或 DELETE 收到网络错误或服务端错误
- **THEN** 共享 API client SHALL 不自动重试，除非调用方显式选择

#### Scenario: 移动端弹层需要覆盖整个应用
- **WHEN** 功能渲染全屏 modal 或 scrim
- **THEN** 该弹层 SHALL 使用共享 body-level portal 底座，而不是依赖可能被 transform 裁剪的路由容器

#### Scenario: AI runtime 返回结构化 JSON
- **WHEN** runtime 返回成功的 JSON 结果
- **THEN** 响应组装 SHALL 集中处理，使 telemetry、attempts、config、parsed content 和 provider metadata 使用同一种形状

#### Scenario: 搜索索引能力被描述
- **WHEN** 文档或代码描述 `resource_search_index.vector_json`
- **THEN** 除非已经接入真实 embedding provider，否则 SHALL 称其为轻量词元索引
