## 1. 模型角色路由

- [x] 1.1 调整 `getEnabledConfigs`，让 embedding 请求只返回显式 `role=embedding` 的数据库配置
- [x] 1.2 在没有 embedding 配置时返回 `AI_EMBEDDING_NOT_CONFIGURED`，并保证不会发起 provider 请求
- [x] 1.3 按生产实测将活动意图、重排和 v2 整轮截止线调整为有上限的自建模型时间预算
- [x] 1.4 为 Qwen3 结构化请求默认注入 `enable_thinking=false`，不影响其他 OpenAI 兼容模型
- [x] 1.5 将活动意图与重排改为流式优先，并按实测设置 25 秒整轮截止线

## 2. 自动验收

- [x] 2.1 扩展模型角色单测，覆盖聊天回退、embedding 隔离和环境变量边界
- [x] 2.2 运行相关后端测试、代码格式检查和 OpenSpec 验证
- [x] 2.3 增加 runtime 时间预算回归测试并重新运行相关验证
- [x] 2.4 增加 Qwen3/非 Qwen3 请求体测试并重新运行真实活动助手验收

## 3. 生产验收

- [x] 3.1 部署修复并重启生产后端，确认千问聊天配置保持健康
- [x] 3.2 从公网调用活动 AI 助手，确认真实路径完成且不再把聊天模型用于 `/embeddings`
