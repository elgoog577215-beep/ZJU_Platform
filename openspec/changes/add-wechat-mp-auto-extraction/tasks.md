# add-wechat-mp-auto-extraction 任务

## 1. 规格与数据结构

- [x] 1.1 新增 proposal、design、tasks 和 spec delta。
- [x] 1.2 尝试运行 OpenSpec strict validate；当前环境缺少 `openspec` CLI，命令返回 `openspec: command not found`。

## 2. 后端

- [x] 2.1 为设置、文章和运行记录增加自动提取字段及兼容迁移。
- [x] 2.2 将增量正文接入现有 `parseWithLLM` 和 AI 审计记录。
- [x] 2.3 保存成功结果，隔离失败，支持后续重试。
- [x] 2.4 在管理员 API 返回提取结果和状态。

## 3. 前端

- [x] 3.1 增加自动提取开关。
- [x] 3.2 展示增量文章的正文/提取状态。
- [x] 3.3 同步中文和英文文案。

## 4. 验证

- [x] 4.1 新增自动提取服务测试。
- [x] 4.2 运行相关后端测试。
- [x] 4.3 运行 lint 和 build。
