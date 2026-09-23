# 微信读书最新文章轮询

部署与切换步骤见 [微信公众号文章采集操作手册](../../docs/操作手册/微信公众号文章采集.md#微信读书最新文章缓存接入)。这里提供轮询进程和独立 Compose；扫码登录继续使用已有的 we-mp-rss 实例。

运行依赖：Python 3.11+、requests、PyYAML、beautifulsoup4。Compose 复用已验证的 `we-mp-rss-trial:d8feb6a` 镜像（上游源码 `rachelos/we-mp-rss@d8feb6a42c6773d7374e03c487d3ae3426084af8`）；新环境须先部署该授权服务并提供包含这些依赖的镜像，可通过 `WEREAD_COLLECTOR_IMAGE` 指定。此目录不包含授权服务本身或登录凭据。

```sh
# 在包含上述依赖的 Python 环境运行，不访问微信、不读取真实授权：
python -m unittest discover -s deploy/weread -p 'test_*.py'
```

- `WEREAD_AUTH_FILE`：默认 `/app/data/wx.lic`，读取其中的 `weread_data.cookie`。
- `WEREAD_MANIFEST`：默认 `/app/data/weread-accounts.json`，格式见 `accounts.example.json`。
- `WEREAD_CACHE_DIR`：默认 `/app/data/weread-live`，保存索引、正文和 `status.json`。
- `WEREAD_POLL_SECONDS`：每个来源的目标间隔，最少 900 秒。
- `WEREAD_REQUEST_GAP`：所有请求之间的最小间隔，最少 10 秒。

- `KUAISOU_KEY_FILE`：可选，宿主机上快搜 Web Search API Key 文件（权限 600），只读挂载到容器 `/run/secrets/kuaisou_key`。未配置时不做次条发现。
- `KUAISOU_CHECK_HOURS`：头条首次发现后第几小时用群发 `mid` 搜索同组次条，默认 `12,48`；`KUAISOU_DAILY_LIMIT` 为每日调用上限，默认 80（按北京时间计日）。

微信读书只返回每次群发的头条。正文页中的 `biz/mid/idx` 与 `og:title` 随正文保存；配置快搜后，采集器按 `mid` 搜索同一次群发的其他文章（仅保留 `__biz`、`mid` 一致且带 `sn`、`chksm` 的完整链接；缺少 `chksm` 的公开链接实测会跳转验证页），作为 `discovered_by=kuaisou` 的待抓正文加入同一公众号缓存，只经公开原文页抓取，正文就绪前不交给平台。早于此功能缓存的头条先按标题搜索一次取得 `mid`。搜索失败只暂停这一步（Key/余额类错误 6 小时，其他 30 分钟），不影响微信读书轮询；`status.json` 的 `kuaisou` 记录当日调用数、累计发现数和最近错误。2026-09-23 实测搜索引擎收录约四成次条，是补充而非完整性保证。

只启动一个轮询进程写入同一缓存目录。`--once` 处理当前到期来源及可重试正文后退出，仍遵守已保存的间隔、认证暂停和退避状态。

维护界面使用缓存目录内的 `control.json` 控制轮询，`status.json` 的 `worker_version=2` 和 `control_revision` 表示版本与已接收指令。更新脚本后重启 collector；主平台与采集器必须共享同一个可写缓存目录。应用不会直接修改 collector 的正文或运行状态文件。手动重试保持授权与限流暂停，命令 token 跨重启去重。
