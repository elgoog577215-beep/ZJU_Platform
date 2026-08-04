# 项目认知入口规范

## Purpose

保证开发者与 AI Agent 能从少量、职责明确且可随代码更新的文档理解拓途浙享，而不是依赖一份重复产品、状态、架构和历史的静态大概览。

## Requirements

### Requirement: 仓库提供人类与 AI 的分工入口

系统 SHALL 在仓库根目录提供 `README.md` 与 `AGENTS.md`：README 面向人类开发者，AGENTS 面向 AI Agent。

#### Scenario: 人类开发者首次拉取仓库

- **WHEN** 开发者打开根 `README.md`
- **THEN** 能理解产品定位、文档入口、技术栈、安装、启动、测试、仓库结构和部署边界
- **AND** 不需要先阅读 AI 行为规则或历史决策日志

#### Scenario: AI Agent 首次进入仓库

- **WHEN** Agent 读取根 `AGENTS.md`
- **THEN** 能确定事实优先级、默认阅读顺序、执行与验证规则、文档职责、隐私边界和 Git 收束方式

### Requirement: 当前事实按职责拆分

系统 SHALL 使用以下当前真源，并禁止建立重复概览：

- `docs/产品蓝图.md`：产品定义、生态闭环、领域边界和长期建设顺序。
- `docs/产品状态.md`：当前成熟度、活动 OpenSpec、缺口、风险和主攻位置。
- `docs/系统架构.md`：当前代码结构、数据真源、运行链、兼容和部署边界。
- `docs/开发禁区.md`：跨任务仍有效的禁止做法。

#### Scenario: 当前实现发生变化

- **WHEN** 代码、数据合同、部署或产品成熟度发生实质变化
- **THEN** 变更只更新对应职责的当前真源
- **AND** 不在本 spec、历史归档或第二份综合文档中复制同一状态

### Requirement: 历史材料不得覆盖当前事实

历史决策、操作指南、旧计划、归档 OpenSpec 和本地 AI memory SHALL 只提供追溯或专项操作依据。

#### Scenario: 历史文档与当前代码冲突

- **WHEN** 历史材料中的路径、状态、架构或下一步与当前对象不一致
- **THEN** 开发者或 Agent 回到当前文档、正式 OpenSpec、代码、schema 和运行结果核验
- **AND** 不直接按历史材料实施

### Requirement: 公开文档遵守隐私边界

公开仓库中的认知文档 MUST NOT 包含商业内部材料、密钥、用户数据、数据库内容、上传文件、会话记录或本地 AI memory。

#### Scenario: 文档体系更新并推送

- **WHEN** 开发者提交文档变更
- **THEN** 提交前检查敏感路径、忽略文件、链接、Markdown 渲染和 OpenSpec 有效性
