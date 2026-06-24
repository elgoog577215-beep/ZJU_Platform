## 1. 现状基线与安全边界

- [x] 1.1 梳理 `eventAssistant.js` 中现有函数职责，标记可迁移到意图、召回、排序、画像、解释、遥测和响应组装服务的代码块。
- [x] 1.2 运行现有活动推荐验证脚本，记录当前推荐、clarify、fallback、画像和遥测基线。
- [x] 1.3 检查关键中文 prompt、UI 文案和 OpenSpec 文件编码，确认浏览器展示与模型输入不受乱码影响。

## 2. 后端服务拆分

- [x] 2.1 新增活动推荐服务目录，建立 `EventIntentService`、`EventRetrievalService`、`EventRankingService`、`EventProfileService`、`EventExplanationService`、`EventAssistantTelemetryService` 和 `EventAssistantResponseBuilder` 的模块骨架。
- [x] 2.2 将意图解析和本地标准库归一逻辑迁移到 `EventIntentService`，保持模型注入测试能力。
- [x] 2.3 将活动加载、生命周期分组、候选池选择和历史 fallback 策略迁移到 `EventRetrievalService`。
- [x] 2.4 将本地评分、硬约束保护、历史惩罚、负反馈惩罚和排序信号生成迁移到 `EventRankingService`。
- [x] 2.5 将用户显式偏好、行为信号、对话记忆和反馈证据聚合到 `EventProfileService`。
- [x] 2.6 将模型解释、template fallback 解释、澄清问题和不确定项生成迁移到 `EventExplanationService`。
- [x] 2.7 保留 `eventAssistant.js` 作为兼容门面，并确保 `runEventAssistantTurn` 对外签名不变。

## 3. 推荐质量与响应契约

- [x] 3.1 实现确定性评分结构，覆盖生命周期、硬约束、主题分类、画像、行为、负反馈、热度新鲜度、多样性和历史活动惩罚。
- [x] 3.2 确保模型重排只能使用候选池内活动 ID，并在非法输出时安全丢弃或 fallback。
- [x] 3.3 扩展 `reasoningTrace`，稳定输出 `rankingBasis`、`uncertainty`、画像信号、fallback 状态和主要评分依据。
- [x] 3.4 确保历史活动只在未来/进行中活动不足时作为明确标记的 fallback 线索。
- [x] 3.5 复核响应 JSON 与现有前端兼容，避免破坏推荐卡片、clarify、empty 和 feedback 流程。

## 4. 前端体验收束

- [x] 4.1 调整 `EventAssistantPanel.jsx` 的信息层级，突出输入、理解、推荐、纠错四段主流程。
- [x] 4.2 将模型状态、fallback warning、历史活动标签和不确定项展示为辅助信息，避免压过推荐主内容。
- [x] 4.3 为负反馈增加有限原因选项，并兼容旧的 up/down 提交。
- [x] 4.4 验证移动端全屏助手具备输入、推荐、打开详情、反馈、empty 和 fallback 展示能力。

## 5. 自动化评测

- [x] 5.1 新增或扩展活动推荐 golden eval，覆盖至少 20 条固定校园活动查询和显式硬约束断言。
- [x] 5.2 扩展 fallback eval，覆盖模型超时、非法 JSON、候选池外 ID、空响应和模型解释失败。
- [x] 5.3 扩展画像与反馈评测，验证显式偏好、行为信号和负反馈会影响排序且可解释。
- [x] 5.4 扩展前端 smoke test，覆盖桌面助手、移动端全屏助手、推荐卡片、打开详情、反馈和 empty/fallback 状态。

## 6. 验证与收束

- [x] 6.1 运行活动推荐相关脚本，至少包含 `verify_event_assistant`、golden eval、stress eval 或对应 npm script。
- [x] 6.2 运行前端 lint/build 或项目当前等价检查，确认 UI 改动可构建。
- [x] 6.3 运行 `openspec validate harden-event-recommendation-assistant --strict`。
- [x] 6.4 对比本轮结果与基线，记录推荐质量、fallback、画像、反馈和 UI 主流程是否达标。
- [x] 6.5 检查 git diff，确认没有混入数据库、密钥、生成产物或无关改动。
