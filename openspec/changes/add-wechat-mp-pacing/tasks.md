# add-wechat-mp-pacing 任务

## 1. OpenSpec

- [x] 1.1 新增 proposal、design、tasks 和 spec delta。
- [ ] 1.2 运行 OpenSpec strict validate。当前环境缺少 `openspec` CLI，`npm run openspec:validate -- add-wechat-mp-pacing --strict` 返回 `openspec: command not found`。

## 2. 后端

- [x] 2.1 新增 pacing 配置归一化和等待辅助函数。
- [x] 2.2 在批量账号采集之间执行 55-120 秒默认随机等待。
- [x] 2.3 在多页文章列表自动翻页之间执行 `pagePause`。
- [x] 2.4 在批量正文抓取之间执行 `contentDelayRange`。
- [x] 2.5 保持单账号和单正文请求兼容原有响应。

## 3. 前端

- [x] 3.1 在微信 MP 管理页新增折叠的采集节奏高级配置。
- [x] 3.2 预填账号间隔 55/120 秒。
- [x] 3.3 同步中文和英文专业提示文案。

## 4. 验证

- [x] 4.1 运行 `node --test server/tests/wechat-mp-admin-service.test.js`。
- [x] 4.2 运行 `npm run lint`。
- [x] 4.3 运行 `npm run build`。
- [x] 4.4 运行或说明 OpenSpec strict validate 状态。当前环境缺少 `openspec` CLI。
