# 规格：CLI 社区投稿

## ADDED Requirements

### Requirement: CLI 必须通过账号登录投稿

CLI 上传内容时，MUST 先通过平台账号密码登录并取得 token。

#### Scenario: 用户登录后发布

- **Given** 用户拥有有效账号和密码
- **When** CLI 调用登录接口并取得 token
- **Then** 后续上传请求必须带 `Authorization: Bearer <token>`

#### Scenario: 未登录用户发布

- **Given** CLI 本地没有可用 token
- **When** 用户执行发布命令
- **Then** CLI 必须拒绝发布并提示先登录

### Requirement: CLI 发布必须选择栏目

CLI 发布内容时，MUST 明确选择 `tech` 或 `news`。

#### Scenario: 发布技术分享

- **Given** 用户选择 `--channel tech`
- **When** 用户发布可解析文件
- **Then** 服务端必须将内容写入文章内容池，并标记为技术分享

#### Scenario: 发布新闻热点

- **Given** 用户选择 `--channel news`
- **When** 用户发布可解析文件
- **Then** 服务端必须将内容写入新闻内容池

#### Scenario: 未选择栏目

- **Given** 用户未传 `--channel`
- **When** 用户执行发布命令
- **Then** CLI 必须拒绝请求，并提示可选栏目

### Requirement: 新闻热点必须保留来源

新闻热点投稿 MUST 携带可追溯的来源链接。

#### Scenario: 新闻没有来源链接

- **Given** 用户选择 `--channel news`
- **When** 请求没有 `source_url`
- **Then** CLI 和服务端都必须拒绝发布

### Requirement: 普通用户投稿不得绕过审核

普通用户通过 CLI 发布的内容 MUST 进入待审核状态。

#### Scenario: 普通用户请求直接发布

- **Given** 普通用户上传内容
- **When** 请求中传入 `status=approved`
- **Then** 服务端必须将状态归一为 `pending`

### Requirement: 支持常见教程文件格式

CLI 投稿 MUST 支持 Markdown、Word、PDF、TXT、HTML 和教程文件夹入口文件。

#### Scenario: 上传可解析文件

- **Given** 文件属于支持格式
- **When** 用户执行预览或发布
- **Then** 服务端必须返回标题、正文、内容块和解析元信息

#### Scenario: 上传不可解析文件

- **Given** 文件格式不支持或内容为空
- **When** 用户执行预览或发布
- **Then** 服务端必须返回明确错误，且不得创建投稿
