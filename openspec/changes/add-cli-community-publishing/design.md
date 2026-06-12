# 设计：CLI 社区投稿

## 架构

CLI 只作为现有平台的投稿客户端，不新增独立内容系统。

```text
本地文件或教程文件夹
  -> zju preview / zju publish
  -> /api/auth/login 获取 token
  -> /api/cli/import 解析预览
  -> /api/cli/publish 发布投稿
  -> articles 或 news 表
  -> 现有审核与用户中心投稿状态
```

## 栏目映射

- `tech`：技术分享，写入 `articles`，`category = 'tech'`，默认 `status = 'pending'`。
- `news`：新闻热点，写入 `news`，默认 `status = 'pending'`，必须带 `source_url`。

管理员账号可通过 `--status approved|pending|draft` 指定状态；普通账号指定 `approved` 时仍会被服务端降级为 `pending`。

## 文件格式

服务端解析层支持：

- `.md` / `.markdown`：保留标题、段落、列表、引用、代码块。
- `.doc` / `.docx`：抽取正文，按段落转内容块。
- `.pdf`：抽取可读文本，扫描版 PDF 只返回不可导入提示。
- `.txt`：按纯文本段落导入。
- `.html` / `.htm`：去除脚本和样式，抽取标题、段落、列表和引用。
- 文件夹：CLI 查找 `README.md`、`README.markdown`、`index.md` 或 `tutorial.md` 作为入口文件。

不能解析的文件不作为正文上传；未来可作为附件能力扩展。

## 认证

CLI 使用账号密码调用 `/api/auth/login`，保存返回 token 到本机配置文件。后续请求使用 `Authorization: Bearer <token>`。

不把密码保存到配置文件；也不要求用户每次 publish 都传密码。

## 命令

```bash
zju login --server https://tuotuzj.com --username alice
zju whoami
zju preview ./tutorial.md --channel tech
zju publish ./tutorial.md --channel tech --tags "AI,教程"
zju publish ./news.pdf --channel news --source-url https://example.com/a
zju status --mine
zju logout
```

## 错误处理

- 未登录：CLI 提示先运行 `zju login`。
- 未选择栏目：CLI 拒绝发布，并提示 `--channel tech|news`。
- 新闻无来源链接：CLI 和服务端都拒绝。
- 文件不可解析：服务端返回 422，CLI 输出原因。
- 上传过大或格式危险：上传中间件返回 400/413。

## 验证

- Node 语法检查覆盖新增 CLI 和后端控制器。
- 后端导入工具用临时 Markdown、TXT、HTML 文件做解析烟测。
- 如本地服务可启动，使用真实登录 token 调用 `/api/cli/import` 和 `/api/cli/publish` 验证待审核投稿。
