## 1. 目标契约

- [x] 1.1 验证 OpenSpec 变更结构，确认 proposal、design、spec、tasks 能被 strict validate 识别。
- [x] 1.2 读取当前活动推荐响应、前端推荐卡片和运行摘要链路，确认新增字段只追加不破坏兼容。

## 2. 后端决策辅助

- [x] 2.1 新增 `decisionSupport` 构建逻辑，输出下一步动作、取舍点、适合理由、注意事项和补充偏好提示。
- [x] 2.2 将 `decisionSupport` 挂到每条推荐的 `opportunityMatch` 下，并限制文案只使用候选事实和诊断信号。
- [x] 2.3 扩展 `ai_assistant_runs.summary_json`，记录决策辅助覆盖数量、取舍点数量和注意事项数量。

## 3. 前端展示

- [x] 3.1 在活动推荐卡片展示下一步动作、关键取舍点和适合理由。
- [x] 3.2 保持桌面助手和移动端全屏助手兼容旧响应，避免缺少 `decisionSupport` 时破坏 UI。

## 4. 自动化评测

- [x] 4.1 扩展 golden eval，断言推荐结果包含结构化 `decisionSupport`。
- [x] 4.2 扩展 golden eval，断言运行摘要写入决策辅助指标。
- [x] 4.3 扩展活动助手 e2e，验证桌面和移动端能看到下一步动作，并保留反馈流程。

## 5. 验证与收束

- [x] 5.1 运行 `openspec validate advance-event-recommendation-decision-support --strict`。
- [x] 5.2 运行 `npm --prefix server run eval:ai-golden`、`node server/scripts/verify_event_assistant.js` 和 `npm --prefix server run check:ai-runtime`。
- [x] 5.3 运行 `npm --prefix server run bench:event-profiles` 和 `npm --prefix server run bench:event-assistant-startup`。
- [x] 5.4 运行 `npm run lint -- --quiet`、`npm run build` 和活动助手 e2e。
- [x] 5.5 检查 git diff，确认没有混入数据库、密钥、构建产物或无关改动。
