## 1. 目标契约与基线

- [x] 1.1 验证 OpenSpec 变更结构，确认 proposal、design、spec、tasks 都能被 strict validate 识别。
- [x] 1.2 读取当前活动推荐响应、反馈记录和运行摘要链路，确认新增字段只追加不破坏兼容。

## 2. 后端机会匹配契约

- [x] 2.1 新增机会匹配构建逻辑，输出匹配项、缺失项、不确定项、决策提示和反馈学习状态。
- [x] 2.2 将机会匹配结构挂到每条推荐，并把首位推荐的对比解释限制在候选事实与排序信号内。
- [x] 2.3 扩展 `reasoningTrace`，记录机会匹配阶段、硬约束诊断、规则补齐数量和反馈学习摘要。
- [x] 2.4 扩展运行摘要 `ai_assistant_runs.summary_json`，记录机会匹配阶段、硬约束均值、缺失项数量、规则补齐数量和反馈学习是否使用。

## 3. 反馈学习

- [x] 3.1 从 `event_recommendation_feedback.reason` 中解析有限负反馈原因，兼容旧自由文本。
- [x] 3.2 将负反馈原因纳入用户画像 action evidence，并在排序中体现类别、活动和原因级惩罚。
- [x] 3.3 在推荐解释和机会匹配结构中标记负反馈学习是否参与排序。

## 4. 前端展示

- [x] 4.1 在活动推荐卡片中展示机会匹配摘要，优先呈现匹配项、缺失项和决策提示。
- [x] 4.2 保持桌面助手和移动端全屏助手兼容旧响应，避免空字段破坏 UI。

## 5. 自动化评测

- [x] 5.1 扩展 golden eval，断言中文真实问法返回机会匹配结构。
- [x] 5.2 扩展 golden eval，断言负反馈原因影响排序并在解释中可见。
- [x] 5.3 扩展 golden eval，断言运行摘要写入机会匹配指标。
- [x] 5.4 扩展或复用 e2e，验证前端展示机会匹配摘要与原反馈流程。

## 6. 验证与收束

- [x] 6.1 运行 `openspec validate evolve-event-recommendation-opportunity-system --strict`。
- [x] 6.2 运行 `npm --prefix server run eval:ai-golden`、`node server/scripts/verify_event_assistant.js` 和 `npm --prefix server run check:ai-runtime`。
- [x] 6.3 运行 `npm run lint -- --quiet`、`npm run build` 和活动助手 e2e。
- [x] 6.4 检查 git diff，确认没有混入数据库、密钥、构建产物或无关改动。
