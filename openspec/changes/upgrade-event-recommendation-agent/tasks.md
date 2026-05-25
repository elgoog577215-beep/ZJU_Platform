# 实施任务

## 1. OpenSpec

- [x] 1.1 写入 proposal、design、tasks 和 capability spec。
- [x] 1.2 运行 `openspec validate upgrade-event-recommendation-agent --strict`。

## 2. 后端推荐链路

- [x] 2.1 统一 `runEventAssistantTurn` 到 AI 协同主链路，保留测试注入能力。
- [x] 2.2 扩展意图解析契约，加入 hard constraints 和更明确的日期/组织字段。
- [x] 2.3 强化候选池召回和硬约束评分，避免模型忽略显式条件。
- [x] 2.4 强化模型重排提示词、输出校验和 fallback response。
- [x] 2.5 记录更完整的 AI task、fallback、ranking basis 和 uncertainty telemetry。

## 3. 前端解释质量

- [x] 3.1 在活动推荐面板展示排序依据和不确定项。
- [x] 3.2 优化模型状态文案，区分“已参与排序”和“已降级兜底”。

## 4. 评测与压力测试

- [x] 4.1 更新 `check:ai-runtime` 或新增定向评测，覆盖强制 AI 协同和硬约束排序。
- [x] 4.2 更新压力测试，覆盖澄清、非法 ID、模型失败和 fallback。
- [x] 4.3 运行 `check:ai-runtime`、`check:ai-assistant`、`check:ai-agents`。

## 5. 二次检查

- [x] 5.1 检查 Markdown 正文是否为中文。
- [x] 5.2 检查没有硬编码外部模型 API key。
- [x] 5.3 检查 git diff，确认未混入无关改动。
