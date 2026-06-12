# AI 社区 CLI 投稿使用教程

本文适合两类读者：

- 人类用户：照着命令登录、预览、上传教程或新闻。
- AI agent：按“机器可执行流程”读取目标、参数、命令和验收结果。

## 一句话说明

`zju` CLI 可以把本地文件上传到拓途浙享 AI 社区，目前支持两个栏目：

- `tech`：技术分享，适合教程、经验帖、工具使用说明。
- `news`：新闻热点，适合带来源链接的 AI 新闻、行业动态、校园相关资讯。

普通用户上传后会进入审核；管理员可以直接发布或指定状态。

## 前置条件

使用前请确认：

- 你有平台账号和密码。
- 服务器已经部署了包含 CLI 投稿接口的新版后端。
- 服务器地址可以访问，例如 `https://tuotuzj.com`。
- 新闻热点必须有原始来源链接。

## 支持的文件

可以直接上传：

```text
.md
.markdown
.doc
.docx
.pdf
.txt
.html
.htm
```

也可以上传一个教程文件夹。CLI 会自动寻找以下入口文件：

```text
README.md
README.markdown
index.md
tutorial.md
```

如果 PDF 是扫描版，没有可抽取文字，系统会提示不可导入。

## 第一步：查看帮助

在项目根目录运行：

```bash
node ./bin/zju.js help
```

如果已经通过 npm link 或包安装，也可以运行：

```bash
zju help
```

## 第二步：登录

推荐方式：

```bash
zju login --server https://tuotuzj.com --username 你的用户名
```

CLI 会提示输入密码。密码不会保存到本地配置文件；CLI 只保存登录后拿到的 token。

也可以用环境变量登录，适合 AI agent 或自动化脚本：

```bash
ZJU_SERVER=https://tuotuzj.com \
ZJU_USERNAME=你的用户名 \
ZJU_PASSWORD=你的密码 \
zju login
```

登录后确认身份：

```bash
zju whoami
```

## 第三步：预览

预览不会创建投稿，只会让服务器解析文件并返回标题、摘要、字数、内容块和正文预览。

技术分享预览：

```bash
zju preview ./tutorial.md --channel tech
```

新闻热点预览：

```bash
zju preview ./news.pdf --channel news --source-url https://example.com/news
```

如果预览标题不合适，发布时可以手动指定标题。

## 第四步：发布技术分享

最简单命令：

```bash
zju publish ./tutorial.md --channel tech
```

推荐带标签：

```bash
zju publish ./tutorial.md --channel tech --tags "AI,教程,Cursor"
```

手动指定标题和摘要：

```bash
zju publish ./tutorial.md \
  --channel tech \
  --title "Cursor 入门教程" \
  --excerpt "从安装到完成第一个 AI 编程任务" \
  --tags "Cursor,AI编程,教程"
```

上传教程文件夹：

```bash
zju publish ./my-course-folder --channel tech --tags "AI,课程"
```

## 第五步：发布新闻热点

新闻热点必须提供来源链接：

```bash
zju publish ./news.md \
  --channel news \
  --source-url https://example.com/original-news
```

可以补充来源名称：

```bash
zju publish ./news.md \
  --channel news \
  --source-url https://example.com/original-news \
  --source-name "Example News"
```

如果缺少 `--source-url`，CLI 会拒绝发布。

## 第六步：查看投稿状态

查看全部投稿：

```bash
zju status
```

只看技术分享：

```bash
zju status --channel tech
```

只看新闻热点：

```bash
zju status --channel news
```

只看待审核：

```bash
zju status --status pending
```

状态含义：

```text
draft      草稿
pending    待审核
approved   已发布
rejected   已驳回
```

## 第七步：退出登录

```bash
zju logout
```

这会删除本地保存的 token。

## 常见问题

### 1. 提示“还没有登录”

先运行：

```bash
zju login --server https://tuotuzj.com --username 你的用户名
```

### 2. 新闻热点提示必须提供 source-url

新闻热点必须可追溯来源，请补上：

```bash
--source-url https://example.com/original-news
```

### 3. 上传后为什么不是立即发布

普通用户上传后默认进入 `pending`，需要管理员审核。这是正常行为。

### 4. 文件夹上传失败

确认文件夹里至少有一个入口文件：

```text
README.md
README.markdown
index.md
tutorial.md
```

### 5. PDF 没有解析出正文

可能是扫描版 PDF。当前 CLI 只支持可抽取文本的 PDF，不做 OCR。

## 给 AI agent 的机器可执行流程

### 目标

将本地文件发布到 AI 社区的 `tech` 或 `news` 栏目。

### 必填输入

```yaml
server: 平台服务器地址
username: 平台用户名
password: 平台密码
file_path: 本地文件或教程文件夹路径
channel: tech 或 news
```

当 `channel = news` 时，还必须提供：

```yaml
source_url: 新闻原始来源链接
```

### 可选输入

```yaml
title: 自定义标题
excerpt: 自定义摘要
tags: 逗号分隔标签，仅技术分享常用
source_name: 新闻来源名称
status: draft、pending、approved；普通用户传 approved 仍会被服务端改成 pending
```

### 执行步骤

1. 登录：

```bash
ZJU_SERVER="$server" ZJU_USERNAME="$username" ZJU_PASSWORD="$password" zju login
```

2. 预览：

```bash
zju preview "$file_path" --channel "$channel"
```

如果是新闻：

```bash
zju preview "$file_path" --channel news --source-url "$source_url"
```

3. 发布技术分享：

```bash
zju publish "$file_path" --channel tech --tags "$tags"
```

4. 发布新闻热点：

```bash
zju publish "$file_path" --channel news --source-url "$source_url"
```

5. 验证投稿状态：

```bash
zju status --channel "$channel"
```

### 成功判定

命令输出包含：

```text
发布成功，已提交到平台。
状态: pending
链接: https://...
```

管理员直接发布时，状态可以是：

```text
状态: approved
```

### 失败处理

- 出现 `还没有登录`：重新执行登录。
- 出现 `新闻热点必须提供 --source-url`：补充来源链接。
- 出现 `Document does not contain importable text`：换成可抽取文本的文件。
- 出现 `Invalid channel`：只允许 `tech` 或 `news`。
- 出现 401：账号密码错误或 token 失效，重新登录。

## 推荐示例

技术分享：

```bash
zju publish ./cursor-guide.md \
  --channel tech \
  --title "Cursor 入门教程" \
  --tags "Cursor,AI编程,教程"
```

新闻热点：

```bash
zju publish ./ai-news.md \
  --channel news \
  --source-url https://example.com/ai-news \
  --source-name "Example News"
```
