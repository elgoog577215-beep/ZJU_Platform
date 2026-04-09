## ADDED Requirements

### Requirement: 活动页提供自然语言推荐助手
活动页面 SHALL 提供一个 AI 助手入口，允许用户使用自然语言描述活动需求。助手在接收请求后 SHALL 仅返回以下三类结果之一：直接推荐、单轮澄清问题、或空结果提示。助手 MUST NOT 连续发起超过一轮的澄清。

#### Scenario: 清晰需求直接返回推荐
- **WHEN** 用户输入的需求已经足以筛选活动，例如包含明确主题、时间偏好或人群偏好
- **THEN** 助手 SHALL 直接返回推荐结果，而不额外追问

#### Scenario: 模糊需求触发单轮澄清
- **WHEN** 用户输入的需求过于模糊，无法稳定区分候选活动
- **THEN** 助手 SHALL 返回一个澄清问题
- **THEN** 澄清问题 SHALL 只占用一轮补充对话

#### Scenario: 澄清后必须结束在结果或空状态
- **WHEN** 用户已经回答过一次澄清问题并再次提交
- **THEN** 助手 SHALL 返回推荐结果或空结果提示
- **THEN** 助手 MUST NOT 再次要求第二轮澄清

### Requirement: 助手默认只在受限候选池内推荐 upcoming 活动
助手默认候选池 SHALL 只包含公开可见、未删除、且属于未开始范围的活动。系统 SHALL 在服务端完成候选池构建，而不是依赖前端当前列表或模型自行推断。对于只有日期、没有具体时间且日期等于当前本地日期的活动，系统 SHALL 将其视为默认候选池中的可推荐活动。

#### Scenario: 默认候选池仅包含公开 upcoming 活动
- **WHEN** 用户首次发起活动推荐请求
- **THEN** 系统 SHALL 仅使用 `status = approved` 且 `deleted_at IS NULL` 的活动构建默认候选池
- **THEN** 系统 SHALL 默认只在未开始活动中进行推荐

#### Scenario: 当日无具体时间的活动仍进入候选池
- **WHEN** 某活动只有日期、没有具体时间，且该日期等于当前本地日期
- **THEN** 系统 SHALL 将该活动视为默认候选池中的可推荐活动

#### Scenario: 默认候选池为空时返回明确空状态
- **WHEN** 当前没有符合默认候选池条件的活动
- **THEN** 助手 SHALL 明确告知当前暂无未开始活动
- **THEN** 系统 MUST NOT 在首次响应中自动扩大到进行中或历史活动

#### Scenario: 只有继续追问时才放宽范围
- **WHEN** 用户在收到“暂无未开始活动”后继续追问相关活动
- **THEN** 系统 SHALL 先放宽到进行中活动
- **THEN** 若仍无结果，系统 SHALL 再放宽到历史已结束活动

### Requirement: 助手只使用公开摘要字段并校验推荐结果
系统 SHALL 只向模型提供受控的活动摘要字段，包括 `id`、`title`、`description`、`date`、`end_date`、`location`、`tags`、`organizer`、`target_audience`、`score` 和 `volunteer_time`。系统 MUST NOT 将活动原始 `content` HTML 或其他未清洗富文本直接提供给模型。模型输出的活动 ID SHALL 由服务端基于当前候选池进行校验。

#### Scenario: 模型上下文不包含原始正文 HTML
- **WHEN** 系统为助手构建模型输入上下文
- **THEN** 上下文 SHALL 只包含受控摘要字段
- **THEN** 活动原始 `content` HTML MUST NOT 直接进入模型上下文

#### Scenario: 推荐结果必须来自当前候选池
- **WHEN** 模型返回推荐活动列表
- **THEN** 服务端 SHALL 校验每个活动 ID 是否属于当前候选池
- **THEN** 不属于候选池的活动 MUST NOT 出现在最终响应中

### Requirement: 推荐结果展示少量活动并可打开详情
当助手返回推荐结果时，系统 SHALL 优先展示 3-5 个推荐活动；当当前候选池不足 3 个活动时，系统 SHALL 返回全部可用候选，并为每个活动附带简短推荐理由。推荐结果 SHALL 与现有活动详情交互打通，使用户能够点击结果后查看活动详情。

#### Scenario: 推荐结果包含少量活动和短理由
- **WHEN** 助手成功返回推荐结果
- **THEN** 响应 SHALL 包含最多 5 个活动
- **THEN** 当候选池数量不少于 3 时，响应 SHALL 优先包含 3-5 个活动
- **THEN** 当候选池数量少于 3 时，响应 SHALL 返回全部可用候选
- **THEN** 每个活动 SHALL 附带一条简短推荐理由

#### Scenario: 用户可从推荐结果进入活动详情
- **WHEN** 用户点击推荐结果中的某个活动
- **THEN** 系统 SHALL 打开该活动的详情视图
