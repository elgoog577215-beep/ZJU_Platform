## 1. 底座规则

- [x] 1.1 创建 OpenSpec change。
- [x] 1.2 增加平台底座架构说明。
- [x] 1.3 增加 `src/app`、`src/features`、`src/shared` 底座入口文件。

## 2. 后端底座

- [x] 2.1 将可复用 migration helper 移入 migration 基础设施。
- [x] 2.2 移除 tag 和 profile-card controller 中的 schema 创建/变更逻辑。
- [x] 2.3 将 Express 错误响应统一为 `{ error, code?, details? }`。
- [x] 2.4 增加 migration 幂等、controller schema 策略、错误形状和标签更新的聚焦回归检查。

## 3. 前端底座

- [x] 3.1 限制 axios 自动重试默认只用于 GET。
- [x] 3.2 将 login/register token 默认存储切到 `sessionStorage`。
- [x] 3.3 增加共享 body portal overlay 组件。
- [x] 3.4 将一条既有高风险 modal 路径迁移到共享 portal。

## 4. AI/Search 底座

- [x] 4.1 从 `callJson` 中拆出 AI JSON runtime response assembly。
- [x] 4.2 记录 `resource_search_index.vector_json` 的轻量词元索引语义。

## 5. 验证与收束

- [x] 5.1 运行聚焦 node 测试。
- [x] 5.2 按需使用本机可靠运行路径运行前端 build。
- [x] 5.3 校验 OpenSpec。
- [x] 5.4 校验通过后归档本 change。
