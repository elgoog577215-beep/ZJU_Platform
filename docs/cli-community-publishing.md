# AI 社区 CLI 投稿说明

## 能做什么

CLI 用于把本地教程或新闻材料上传到 AI 社区，当前支持两个栏目：

- `tech`：技术分享，进入文章内容池。
- `news`：新闻热点，进入新闻内容池，必须提供来源链接。

普通账号提交后默认进入待审核状态；管理员账号可以按现有权限指定 `approved`、`pending` 或 `draft`。

## 安装与调用

在项目根目录可以直接运行：

```bash
node ./bin/zju.js help
```

如果通过 npm link 或包安装，会得到两个等价命令：

```bash
zju help
zju-community help
```

## 登录

```bash
zju login --server https://tuotuzj.com --username alice
```

CLI 会调用平台现有的 `/api/auth/login`，用账号密码换取 token。密码不会写入本地配置文件，后续上传使用 token。

也可以用环境变量：

```bash
ZJU_SERVER=https://tuotuzj.com
ZJU_USERNAME=alice
ZJU_PASSWORD=你的密码
zju login
```

## 预览

```bash
zju preview ./tutorial.md --channel tech
zju preview ./news.pdf --channel news --source-url https://example.com/news
```

预览只解析文件，不创建投稿。

## 发布

发布技术分享：

```bash
zju publish ./tutorial.md --channel tech --tags "AI,教程,Cursor"
```

发布新闻热点：

```bash
zju publish ./news.pdf --channel news --source-url https://example.com/news
```

上传教程文件夹时，CLI 会依次查找：

```text
README.md
README.markdown
index.md
tutorial.md
```

## 查看状态

```bash
zju status
zju status --channel tech
zju status --channel news --status pending
```

## 支持格式

- `.md`
- `.markdown`
- `.doc`
- `.docx`
- `.pdf`
- `.txt`
- `.html`
- `.htm`

扫描版 PDF 如果没有可抽取文本，会返回不可导入提示。

## 服务器开放要求

服务器需要允许以下接口从公网或校园网访问：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/cli/import`
- `POST /api/cli/publish`
- `GET /api/cli/submissions`

反向代理需要保留 `Authorization` 请求头，并允许 multipart 上传。Nginx 示例：

```nginx
client_max_body_size 25m;

location /api/ {
  proxy_pass http://127.0.0.1:5181/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Authorization $http_authorization;
}
```

后端也需要保证：

- `SECRET_KEY` 已配置。
- `UPLOAD_DIR` 可写。
- `MAX_FILE_SIZE` 不小于计划支持的单文件大小。
- HTTPS 证书有效，避免账号密码在明文链路上传输。

## 权限边界

CLI 不开放匿名上传，不保存密码，不绕过审核。普通用户即使传 `--status approved`，服务端也会归一为 `pending`。
