"""Persistent, paced latest-cover polling. No MP backend calls.

Optional: a Kuaisou search key finds the other articles of a push whose headline WeRead reported.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, quote, urlencode, urlsplit

import requests
import yaml
from bs4 import BeautifulSoup

ROOT = Path(os.environ.get("WEREAD_CACHE_DIR", "/app/data/weread-live"))
AUTH = Path(os.environ.get("WEREAD_AUTH_FILE", "/app/data/wx.lic"))
MANIFEST = Path(os.environ.get("WEREAD_MANIFEST", "/app/data/weread-accounts.json"))
INTERVAL = max(900, int(os.environ.get("WEREAD_POLL_SECONDS", "900")))
GAP = max(10, int(os.environ.get("WEREAD_REQUEST_GAP", "10")))
KUAISOU_KEY = Path(os.environ.get("KUAISOU_KEY_FILE", "/run/secrets/kuaisou_key"))
KUAISOU_URL = "https://platform.kuaisou.com/api/web-search"
# Search indexing lags publication by hours to days, so each headline is checked more than once.
KUAISOU_CHECK_HOURS = [float(h) for h in os.environ.get("KUAISOU_CHECK_HOURS", "12,48").split(",") if h.strip()]
KUAISOU_DAILY_LIMIT = int(os.environ.get("KUAISOU_DAILY_LIMIT", "80"))
CHINA = timezone(timedelta(hours=8))
PUBLIC_HEADERS = {
    # A bare Mozilla/5.0 consistently returned a verification redirect in live tests.
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://mp.weixin.qq.com/",
}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def stamp():
    return datetime.now(timezone.utc).isoformat()


def article_link(mp_id, review_id):
    prefix = mp_id + "_"
    if not review_id.startswith(prefix):
        raise ValueError("review_id_account_mismatch")
    token = review_id[len(prefix):]
    if not token or not re.fullmatch(r"[A-Za-z0-9_~=-]+", token):
        raise ValueError("invalid_review_id")
    # WeRead escapes the short-link token's underscore as '~'.
    return "https://mp.weixin.qq.com/s/" + quote(token.replace("~", "_"), safe="")


def mp_biz(mp_id):
    """WeRead's MP_WXS_<n> id is the decimal form of the article URL's __biz."""
    return base64.b64encode(mp_id[len("MP_WXS_"):].encode()).decode()


def message_identity(raw):
    found = {}
    for key, value in re.findall(r'\bvar\s+(biz|mid|idx)\s*=\s*"([^"]+)"\s*\|\|', raw):
        found.setdefault(key, value)
    if re.fullmatch(r"[A-Za-z0-9+/]+={0,2}", found.get("biz", "")) and found.get("mid", "").isdigit() \
            and found.get("idx", "").isdigit():
        return found
    return {}


def search_identity(url):
    """(biz, mid, idx, sn, chksm) of a long mp.weixin.qq.com article URL, else None.

    Without chksm the public page redirects to a captcha (verified 2026-09-23), so it is required.
    """
    parts = urlsplit(url or "")
    if parts.scheme != "https" or parts.hostname != "mp.weixin.qq.com" or parts.path != "/s":
        return None
    q = {k: v[0] for k, v in parse_qs(parts.query).items()}
    if not (q.get("__biz") and q.get("mid", "").isdigit() and q.get("idx", "").isdigit()
            and re.fullmatch(r"[0-9a-f]{32}", q.get("sn", "")) and re.fullmatch(r"[0-9a-f]{16,}", q.get("chksm", ""))):
        return None
    # Search results carry base64 unescaped, so parse_qs would turn "+" into a space.
    return q["__biz"].replace(" ", "+"), q["mid"], q["idx"], q["sn"], q["chksm"]


def title_key(text):
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", (text or "").lower())[:14]


def picture_message_root(soup, raw):
    """Read picture-message data without executing page JavaScript.

    Only direct picture entries count: nested watermark/share-cover URLs do not.
    """
    marker = re.search(r"\bpicture_page_info_list\s*:\s*\[", raw)
    if not marker or not re.search(r"\bitem_show_type\s*:\s*['\"]8['\"]", raw):
        return None
    depth, start, quoted, escaped, urls = 1, None, None, False, []
    for i in range(marker.end(), len(raw)):
        ch = raw[i]
        if quoted:
            if escaped: escaped = False
            elif ch == "\\": escaped = True
            elif ch == quoted: quoted = None
            continue
        if ch in "'\"": quoted = ch
        elif ch in "[{":
            if depth == 1 and ch == "{": start = i
            depth += 1
        elif ch in "]}":
            depth -= 1
            if depth == 1 and ch == "}" and start is not None:
                match = re.match(r"\{\s*cdn_url\s*:\s*(['\"])(.*?)\1", raw[start:i + 1], re.S)
                if match:
                    url = match[2].replace("\\/", "/").replace("&amp;", "&")
                    if url.startswith("http://"): url = "https://" + url[7:]
                    if urlsplit(url).scheme == "https" and urlsplit(url).hostname == "mmbiz.qpic.cn":
                        urls.append(url)
                start = None
            if depth == 0: break
    if depth != 0 or not urls: return None
    root = soup.new_tag("div")
    description = soup.select_one('meta[property="og:description"], meta[name="description"]')
    if description:
        text = description.get("content", "")
        text = re.sub(r"\\+x([0-9a-fA-F]{2})", lambda m: chr(int(m[1], 16)), text)
        text = text.replace("\\n", "\n")
        for line in text.splitlines():
            if line.strip():
                p = soup.new_tag("p"); p.string = line.strip(); root.append(p)
    for url in dict.fromkeys(urls):
        img = soup.new_tag("img", src=url); root.append(img)
    return root


def parse_body(raw):
    if not raw.strip():
        raise ValueError("empty_response")
    soup = BeautifulSoup(raw, "html.parser")
    root = soup.select_one("#js_content, .rich_media_content")
    if root is None:
        visible = soup.get_text(" ", strip=True)
        if any(x in visible for x in ["当前环境异常", "完成验证后", "访问过于频繁"]):
            raise ValueError("verification_required")
        if any(x in visible for x in ["内容已被发布者删除", "该内容已被删除", "此内容因违规无法查看"]):
            raise ValueError("article_unavailable")
        root = picture_message_root(soup, raw)
        if root is None: raise ValueError("article_body_missing")
    # Only explicit article metadata is a publication time; never substitute polling time.
    title = soup.select_one('meta[property="og:title"]')
    match = re.search(r'\b(?:var\s+)?ct\s*=\s*[\"\x27](\d{10})[\"\x27]', raw)
    published = datetime.fromtimestamp(int(match[1]), timezone.utc).isoformat() if match else ""
    for el in root.select("script, iframe, object, embed, form"):
        el.decompose()
    for el in root.find_all(True):
        for key in list(el.attrs):
            if key.lower().startswith("on"):
                del el.attrs[key]
    images = []
    for img in root.select("img"):
        src = img.get("data-src") or img.get("data-original") or img.get("src") or ""
        if src.startswith("//"):
            src = "https:" + src
        if src.startswith("https://"):
            img["src"] = src
            for key in ["data-src", "data-original", "srcset"]:
                img.attrs.pop(key, None)
            if src not in images:
                images.append(src)
    text = root.get_text("\n", strip=True)
    if not text and not images:
        raise ValueError("empty_article_body")
    return {"content_html": root.decode_contents(), "content_text": text,
            "images": images, "published_at": published,
            "publication_time_source": "article_ct" if published else "unknown",
            "msg": message_identity(raw), "title": title.get("content", "").strip() if title else ""}


class Poller:
    def __init__(self):
        ROOT.mkdir(parents=True, exist_ok=True)
        self.state = read_json(ROOT / "status.json", {"accounts": {}, "global_pause_until": 0})
        self.last_request = 0
        self.interval = INTERVAL
        self.control = {}

    def save(self):
        self.state["heartbeat_at"] = stamp()
        write_json(ROOT / "status.json", self.state)

    def apply_control(self):
        self.control = read_json(ROOT / "control.json", {})
        self.interval = max(900, min(21600, int(self.control.get("poll_seconds", INTERVAL))))
        if self.state.get("poll_seconds") != self.interval:
            for item in self.state["accounts"].values():
                if item.get("last_success_at") and not item.get("error"):
                    last = datetime.fromisoformat(item["last_success_at"]).timestamp()
                    item["next_check"] = last + self.interval
        self.state.update(worker_version=2, poll_seconds=self.interval,
                          control_revision=self.control.get("revision"),
                          paused=bool(self.control.get("paused")))
        tokens = self.state.setdefault("retry_tokens", {})
        for mp_id, settings in self.control.get("feeds", {}).items():
            if not re.fullmatch(r"MP_WXS_\d+", mp_id):
                continue
            token = settings.get("retry_token")
            if not token or tokens.get(mp_id) == token:
                continue
            self.state["accounts"].setdefault(mp_id, {})["next_check"] = 0
            feed_path = ROOT / (mp_id + ".json")
            feed = read_json(feed_path, {"articles": []})
            for article in feed["articles"]:
                if article.get("content_status") != "ready":
                    article["body_next_retry"] = 0
            if feed_path.exists():
                write_json(feed_path, feed)
            tokens[mp_id] = token
        self.save()

    def request(self, endpoint, params, as_json=True):
        time.sleep(max(0, self.last_request + GAP - time.monotonic()))
        auth = yaml.safe_load(AUTH.read_text()) or {}
        auth = auth.get("weread_data", {})
        if isinstance(auth, str):
            auth = json.loads(auth)
        cookie = auth.get("cookie", "")
        if not cookie:
            raise ValueError("auth_missing")
        headers = {"Cookie": cookie, "User-Agent": "Mozilla/5.0", "Referer": "https://weread.qq.com/",
                   "Origin": "https://weread.qq.com", "Accept": "application/json,text/html,*/*"}
        self.last_request = time.monotonic()
        with requests.get("https://weread.qq.com" + endpoint, params=params, headers=headers,
                          timeout=(10, 30), stream=True, allow_redirects=False) as response:
            if response.status_code != 200:
                raise ValueError("http_" + str(response.status_code))
            chunks = []; size = 0
            for chunk in response.iter_content(65536):
                size += len(chunk)
                if size > 6 * 1024 * 1024:
                    raise ValueError("response_too_large")
                chunks.append(chunk)
            raw = b"".join(chunks).decode("utf-8", errors="replace")
        if as_json:
            data = json.loads(raw)
            code = data.get("errCode", data.get("errcode", 0))
            if str(code or 0) != "0":
                raise ValueError("api_" + str(code))
            return data
        return raw

    def step(self, account):
        mp_id = account["mp_id"]
        if not re.fullmatch(r"MP_WXS_\d+", mp_id):
            raise ValueError("invalid_mp_id")
        state = self.state["accounts"].setdefault(mp_id, {})
        feed_path = ROOT / (mp_id + ".json")
        feed = read_json(feed_path, {"mp_id": mp_id, "name": account["name"], "articles": []})
        for saved in feed["articles"]:
            if not saved.get("discovered_by"):
                saved["link"] = article_link(mp_id, saved["id"])
        phase = "cover"
        try:
            cover = self.request("/api/mp/cover", {"bookId": mp_id})
            review_id = str(cover.get("reviewId") or "")
            if not review_id:
                raise ValueError("empty_cover")
            link = article_link(mp_id, review_id)
            feed["name"] = cover.get("name") or account["name"]
            feed["checked_at"] = stamp()
            if not any(a["id"] == review_id for a in feed["articles"]):
                feed["articles"].append({"id": review_id, "link": link, "title": cover.get("title") or "",
                    "cover": cover.get("pic") or "", "summary": cover.get("digest") or "",
                    "author": feed["name"], "observed_at": stamp(), "published_at": "",
                    "content_status": "pending", "body_failures": 0, "body_next_retry": 0})
            write_json(feed_path, feed)
            state.update(last_success_at=stamp(), failures=0, error="", next_check=time.time() + self.interval)
        except Exception as exc:
            # Do not log request objects, cookies, or untrusted response bodies.
            code = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
            state["failures"] = state.get("failures", 0) + 1
            state.update(error=code[:100], last_error_at=stamp(),
                         next_check=time.time() + min(21600, self.interval * 2 ** min(state["failures"] - 1, 4)))
            if code in {"auth_missing", "api_-2012", "api_-2010", "http_401", "http_403", "http_429", "api_200013"}:
                self.state["global_pause_until"] = time.time() + (3600 if "429" in code or "200013" in code else 1800)
                if code in {"auth_missing", "api_-2012", "api_-2010", "http_401"}:
                    self.state["auth_required"] = True
            print(json.dumps({"mp_id": mp_id, "phase": phase, "error": code[:100]}), flush=True)
        self.save()

    def public_body(self, mp_id, article):
        # A separate public request: never forward WeRead cookies or follow redirects.
        # Search-discovered pushes have no WeRead id; their link was rebuilt from validated parts.
        url = article["link"] if article.get("discovered_by") else article_link(mp_id, article["id"])
        time.sleep(max(0, self.last_request + GAP - time.monotonic()))
        self.last_request = time.monotonic()
        with requests.get(url, headers=PUBLIC_HEADERS,
                          timeout=(10, 30), stream=True, allow_redirects=False) as response:
            redirect = urlsplit(response.headers.get("Location", ""))
            if response.status_code in {301, 302, 303, 307, 308} and redirect.hostname == "mp.weixin.qq.com" and redirect.path == "/mp/wappoc_appmsgcaptcha":
                raise ValueError("verification_required")
            if response.status_code != 200:
                raise ValueError("http_" + str(response.status_code))
            chunks = []; size = 0
            for chunk in response.iter_content(65536):
                size += len(chunk)
                if size > 6 * 1024 * 1024: raise ValueError("response_too_large")
                chunks.append(chunk)
            return parse_body(b"".join(chunks).decode("utf-8", errors="replace"))

    def body_step(self, mp_id, feed, article):
        article["body_last_attempt_at"] = stamp()
        article["body_attempts"] = article.get("body_attempts", article.get("body_failures", 0)) + 1
        article.pop("public_error", None)
        article.pop("weread_error", None)
        def public():
            try:
                body = self.public_body(mp_id, article)
                article["body_source"] = "public_article"
                return body
            except Exception as public_exc:
                article["public_error"] = str(public_exc)[:100] if isinstance(public_exc, ValueError) else type(public_exc).__name__
                raise
        try:
            if article.get("discovered_by"):
                body = public()
            else:
                try:
                    raw = self.request("/web/mp/content", {"reviewId": article["id"]}, as_json=False)
                    body = parse_body(raw)
                    article["body_source"] = "weread"
                except ValueError as exc:
                    article["weread_error"] = str(exc)[:100]
                    if str(exc) not in {"empty_response", "article_body_missing"}: raise
                    body = public()

            name = hashlib.sha256(article["id"].encode()).hexdigest() + ".json"
            write_json(ROOT / "bodies" / name, body)
            article.update(body_file=name, content_status="ready", published_at=body["published_at"], fetched_at=stamp())
            article.update(body_error="", body_next_retry=0)
            if body.get("msg", {}).get("biz") == mp_biz(mp_id):
                article["msg"] = body["msg"]
            if article.get("discovered_by") and body.get("title"):
                article["title"] = body["title"]
            print(json.dumps({"mp_id": mp_id, "title": article["title"], "status": "ready",
                              "text_chars": len(body["content_text"]), "images": len(body["images"])}), flush=True)
        except Exception as exc:
            code = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
            article["body_failures"] = article.get("body_failures", 0) + 1
            article.update(body_error=code[:100], body_next_retry=time.time() + min(21600, 900 * 2 ** min(article["body_failures"], 4)))
            if code in {"http_401", "http_403", "http_429"}:
                self.state["global_pause_until"] = time.time() + 1800
                if code == "http_401" and not article.get("public_error"):
                    self.state["auth_required"] = True
            print(json.dumps({"mp_id": mp_id, "phase": "body", "error": code[:100]}), flush=True)
        write_json(ROOT / (mp_id + ".json"), feed)
        self.save()

    def kuaisou(self, query, count):
        usage = self.state.setdefault("kuaisou", {})
        today = datetime.now(CHINA).date().isoformat()
        if usage.get("day") != today:
            usage.update(day=today, calls=0)
        usage["calls"] += 1
        usage["total_calls"] = usage.get("total_calls", 0) + 1
        time.sleep(1)
        response = requests.post(KUAISOU_URL, json={"query": query, "count": count, "offset": 1},
                                 headers={"Authorization": "Bearer " + KUAISOU_KEY.read_text().strip(),
                                          "User-Agent": "Mozilla/5.0"}, timeout=(10, 30))
        if response.status_code != 200:
            raise ValueError("kuaisou_http_" + str(response.status_code))
        data = response.json()
        if data.get("code") != 200:
            raise ValueError("kuaisou_api_" + str(data.get("code")))
        try:
            return data["data"][0]["webPages"]["value"] or []
        except (KeyError, IndexError, TypeError):
            return []

    def sibling_job(self, accounts):
        """The next headline whose push should be searched for further articles, if any."""
        usage = self.state.get("kuaisou", {})
        if not KUAISOU_CHECK_HOURS or usage.get("pause_until", 0) > time.time() \
                or (usage.get("day") == datetime.now(CHINA).date().isoformat() and usage.get("calls", 0) >= KUAISOU_DAILY_LIMIT - 1):
            return None
        try:
            if not KUAISOU_KEY.read_text().strip():
                return None
        except OSError:
            return None
        now = time.time()
        for a in accounts:
            feed = read_json(ROOT / (a["mp_id"] + ".json"), {"articles": []})
            for article in feed["articles"]:
                done = article.get("sibling_checks_done", 0)
                if article.get("discovered_by") or article.get("content_status") != "ready" \
                        or done >= len(KUAISOU_CHECK_HOURS) or not article.get("observed_at"):
                    continue
                seen = datetime.fromisoformat(article["observed_at"]).timestamp()
                if now >= seen + KUAISOU_CHECK_HOURS[done] * 3600:
                    return a["mp_id"], feed, article
        return None

    def sibling_step(self, mp_id, feed, article):
        biz = mp_biz(mp_id)
        usage = self.state.setdefault("kuaisou", {})
        try:
            msg = article.get("msg") or {}
            if msg.get("biz") != biz:
                # Bodies cached before identity extraction: locate the headline by its title.
                key = title_key(article.get("title"))
                msg = {}
                for hit in self.kuaisou(article.get("title", "")[:60], 10):
                    ident = search_identity(hit.get("url"))
                    if ident and ident[0] == biz and key and title_key(hit.get("name")) == key:
                        msg = {"biz": biz, "mid": ident[1], "idx": ident[2]}
                        article["msg"] = msg
                        break
            added = 0
            if msg:
                known = {(x.get("msg") or {}).get("mid", "") + ":" + (x.get("msg") or {}).get("idx", "") for x in feed["articles"]}
                for hit in self.kuaisou(msg["mid"], 50):
                    ident = search_identity(hit.get("url"))
                    if not ident or ident[:2] != (biz, msg["mid"]) or ident[2] == msg["idx"] \
                            or ident[1] + ":" + ident[2] in known:
                        continue
                    known.add(ident[1] + ":" + ident[2])
                    link = "https://mp.weixin.qq.com/s?" + urlencode(
                        {"__biz": ident[0], "mid": ident[1], "idx": ident[2], "sn": ident[3], "chksm": ident[4]})
                    feed["articles"].append({"id": f"{mp_id}_m{ident[1]}_{ident[2]}", "link": link,
                        "title": (hit.get("name") or "").strip(), "cover": "", "summary": "",
                        "author": feed.get("name", ""), "observed_at": stamp(), "published_at": "",
                        "content_status": "pending", "body_failures": 0, "body_next_retry": 0,
                        "discovered_by": "kuaisou", "msg": {"biz": biz, "mid": ident[1], "idx": ident[2]}})
                    added += 1
            article["sibling_checks_done"] = article.get("sibling_checks_done", 0) + 1
            article["sibling_checked_at"] = stamp()
            article["siblings_found"] = article.get("siblings_found", 0) + added
            usage.update(error="", found=usage.get("found", 0) + added)
            write_json(ROOT / (mp_id + ".json"), feed)
            print(json.dumps({"mp_id": mp_id, "phase": "siblings", "mid": msg.get("mid", ""), "added": added}), flush=True)
        except Exception as exc:
            code = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
            # Search is optional: pause only this step (longer for key or balance problems).
            usage.update(error=code[:100], last_error_at=stamp(), pause_until=time.time() + (
                21600 if code.startswith(("kuaisou_http_4", "kuaisou_api_4")) else 1800))
            print(json.dumps({"mp_id": mp_id, "phase": "siblings", "error": code[:100]}), flush=True)
        self.save()

    def run(self, once=False):
        visited = set()
        while True:
            self.apply_control()
            accounts = [a for a in read_json(MANIFEST, [])
                        if not self.control.get("feeds", {}).get(a["mp_id"], {}).get("paused")]
            if self.state.get("paused"):
                if once: return
                time.sleep(5); continue
            auth_data = yaml.safe_load(AUTH.read_text()) or {}
            digest = hashlib.sha256(json.dumps(auth_data.get("weread_data", {}), sort_keys=True).encode()).hexdigest()
            previous_digest = self.state.get("auth_digest")
            if previous_digest and previous_digest != digest:
                self.state["global_pause_until"] = 0
                self.state["auth_required"] = False
                for item in self.state["accounts"].values():
                    item["next_check"] = 0
                self.state["auth_refreshed_at"] = stamp()
            self.state["auth_digest"] = digest
            if self.state.get("auth_required"):
                self.save()
                if once: return
                time.sleep(5); continue
            self.state.pop("error", None)
            if shutil.disk_usage(ROOT).free < 512 * 1024 * 1024:
                self.state["error"] = "disk_below_512MiB"; self.save()
                if once: return
                time.sleep(30); continue
            if self.state.get("global_pause_until", 0) > time.time():
                self.save()
                if once: return
                time.sleep(30); continue
            due = [a for a in accounts if (not once or a["mp_id"] not in visited)
                   and self.state["accounts"].get(a["mp_id"], {}).get("next_check", 0) <= time.time()]
            if due:
                account = min(due, key=lambda a: self.state["accounts"].get(a["mp_id"], {}).get("next_check", 0))
                self.step(account); visited.add(account["mp_id"])
                continue
            job = None
            for a in accounts:
                feed = read_json(ROOT / (a["mp_id"] + ".json"), {"articles": []})
                article = next((x for x in feed["articles"] if x.get("content_status") != "ready"
                                and x.get("body_next_retry", 0) <= time.time()), None)
                if article:
                    job = (a["mp_id"], feed, article); break
            if job:
                self.body_step(*job); continue
            job = self.sibling_job(accounts)
            if job:
                self.sibling_step(*job); continue
            self.save()
            if once: return
            time.sleep(5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    Poller().run(once=parser.parse_args().once)
