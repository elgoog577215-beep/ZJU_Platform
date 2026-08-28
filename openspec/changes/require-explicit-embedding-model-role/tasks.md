## 1. 模型角色路由

- [x] 1.1 调整 `getEnabledConfigs`，让 embedding 请求只返回显式 `role=embedding` 的数据库配置
- [x] 1.2 在没有 embedding 配置时返回 `AI_EMBEDDING_NOT_CONFIGURED`，并保证不会发起 provider 请求

## 2. 自动验收

- [x] 2.1 扩展模型角色单测，覆盖聊天回退、embedding 隔离和环境变量边界
- [x] 2.2 运行相关后端测试、代码格式检查和 OpenSpec 验证

## 3. 生产验收

- [ ] 3.1 部署修复并重启生产后端，确认千问聊天配置保持健康
- [ ] 3.2 从公网调用活动 AI 助手，确认真实路径完成且不再把聊天模型用于 `/embeddings`
