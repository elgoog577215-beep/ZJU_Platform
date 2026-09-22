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

只启动一个轮询进程写入同一缓存目录。`--once` 处理当前到期来源及可重试正文后退出，仍遵守已保存的间隔、认证暂停和退避状态。

维护界面使用缓存目录内的 `control.json` 控制轮询，`status.json` 的 `worker_version=2` 和 `control_revision` 表示版本与已接收指令。更新脚本后重启 collector；主平台与采集器必须共享同一个可写缓存目录。应用不会直接修改 collector 的正文或运行状态文件。手动重试保持授权与限流暂停，命令 token 跨重启去重。
