## 基线记录

记录时间：2026-05-25

## 代码结构基线

- `server/src/utils/eventAssistant.js` 当前扫描到 107 个顶层常量/函数。
- 关键职责集中位置：
  - 用户画像：`loadUserEventProfile`，约第 896 行。
  - 本地评分：`scoreEvent`，约第 1040 行。
  - 候选排序：`rankCandidates`，约第 1185 行。
  - AI 候选池：`buildAiCandidatePool`，约第 1444 行。
  - 模型重排：`rerankCandidatesWithModel`，约第 2040 行。
  - AI 推荐响应：`buildAiRecommendationResponse`，约第 2123 行。
  - 主链路：`runUnifiedEventAssistantTurn`，约第 2509 行。
  - 运行记录：`recordEventAssistantRun`，约第 2705 行。
  - 推荐反馈：`recordEventAssistantFeedback`，约第 2779 行。

结论：当前文件同时承担意图、召回、排序、画像、解释、遥测、反馈和响应组装职责，符合本 change 中“需要拆分服务边界”的判断。

## 验证基线

已运行：

```bash
npm --prefix server run check:ai-assistant
node server/scripts/verify_event_assistant.js
```

结果：

- `check:ai-assistant` 通过，输出 `ok: true`。
- `verify_event_assistant.js` 通过，覆盖 no-upcoming empty、same-day date-only upcoming、pending/deleted 排除、scope expansion 排序。
- `verify_event_assistant.js` 跳过了一个备份 DB 场景：`C:\Users\Administrator\Desktop\拓途浙享\backups\db_20260319_030001.sqlite` 不存在。这是脚本既有跳过路径，不是本轮改动造成。

## 编码基线

已用 Node 按 UTF-8 读取以下文件：

- `server/src/utils/eventAssistant.js`
- `server/src/services/eventIntelligenceService.js`
- `server/src/services/eventAiProfileService.js`
- `src/components/EventAssistantPanel.jsx`
- `src/components/MobileEventAssistantFullscreen.jsx`
- 本 change 下的 `proposal.md`、`design.md`、`tasks.md`、`spec.md`

检查结果：

- replacement character 数量均为 0。
- 文件均包含中文字符。
- 终端中的乱码来自 PowerShell 输出编码显示，不代表文件内容损坏。
