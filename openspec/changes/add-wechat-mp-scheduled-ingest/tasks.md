# add-wechat-mp-scheduled-ingest 任务

## 1. 规格与数据结构

- [x] 1.1 新增 OpenSpec proposal/design/tasks/spec。
- [x] 1.2 新增微信 MP 定时增量采集 schema。
- [x] 1.3 将 schema 接入后端 migration。

## 2. 后端能力

- [x] 2.1 新增定时增量采集服务。
- [x] 2.2 新增随机等待和分页暂停能力。
- [x] 2.3 新增管理员配置、账号、导入、任务和文章 API。
- [x] 2.4 后端启动时注册定时器，退出时停止。

## 3. 前端后台

- [x] 3.1 新增每日增量采集管理区。
- [x] 3.2 支持保存配置、上传账号列表、手动新增账号和删除账号。
- [x] 3.3 支持手动触发任务并展示运行记录和新增文章。
- [x] 3.4 同步中英文文案。

## 4. 验证

- [x] 4.1 新增后端服务测试。
- [x] 4.2 运行 `node --test server/tests/wechat-mp-scheduled-ingest-service.test.js`。
- [x] 4.3 运行 `npm run lint`。
- [x] 4.4 运行 `npm run build`。
- [x] 4.5 运行或记录 `npm run openspec:validate` 结果。当前环境缺少 `openspec` CLI，`npm run openspec:validate -- add-wechat-mp-scheduled-ingest --strict` 返回 `openspec: command not found`。
