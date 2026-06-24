# Docs 目录说明

`docs/` 只放项目长期有用的说明、记忆和交付材料。临时草稿、一次性截图和运行缓存不要放进来。

## 当前结构

- `ai-memory/`：Codex 项目记忆，包括错误经验、项目决策、工作流优化和规则实验报告。
- `guides/`：仍在使用的操作指南，例如 Android、iOS 和 CLI 投稿说明。
- `presentations/`：当前仍有展示价值的 PPT 成果。
- `archive/`：历史设计、旧计划、旧会话总结和旧 PPT。保留作查证，不作为当前执行入口。
- `ai-agent-operating-system.generated.md`：由脚本生成的 AI Agent 说明，更新来源是服务端 registry，不要手改生成段落。

## 新文档放置规则

- 新功能规格优先走 `openspec/changes/`，完成后归档到 `openspec/specs/`。
- 仍需人读的操作说明放 `docs/guides/`。
- Codex 可复用经验放 `docs/ai-memory/`。
- 只用于某轮讨论或已经被 OpenSpec 取代的材料放 `docs/archive/`。
