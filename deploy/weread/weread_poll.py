"""Persistent, paced latest-cover polling. No MP backend calls or paid APIs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import time
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit

import requests
import yaml
from bs4 import BeautifulSoup

ROOT = Path(os.environ.get("WEREAD_CACHE_DIR", "/app/data/weread-live"))
AUTH = Path(os.environ.get("WEREAD_AUTH_FILE", "/app/data/wx.lic"))
MANIFEST = Path(os.environ.get("WEREAD_MANIFEST", "/app/data/weread-accounts.json"))
INTERVAL = max(900, int(os.environ.get("WEREAD_POLL_SECONDS", "900")))
GAP = max(10, int(os.environ.get("WEREAD_REQUEST_GAP", "10")))


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
    return "https://mp.weixin.qq.com/s/" + quote(token, safe="~")


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
        raise ValueError("article_body_missing")
    # Only explicit article metadata is a publication time; never substitute polling time.
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
            "publication_time_source": "article_ct" if published else "unknown"}


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
        url = article_link(mp_id, article["id"])
        time.sleep(max(0, self.last_request + GAP - time.monotonic()))
        self.last_request = time.monotonic()
        with requests.get(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://mp.weixin.qq.com/"},
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
        try:
            try:
                raw = self.request("/web/mp/content", {"reviewId": article["id"]}, as_json=False)
                body = parse_body(raw)
                article["body_source"] = "weread"
            except ValueError as exc:
                article["weread_error"] = str(exc)[:100]
                if str(exc) not in {"empty_response", "article_body_missing"}: raise
                try:
                    body = self.public_body(mp_id, article)
                    article["body_source"] = "public_article"
                except Exception as public_exc:
                    article["public_error"] = str(public_exc)[:100] if isinstance(public_exc, ValueError) else type(public_exc).__name__
                    raise

            name = hashlib.sha256(article["id"].encode()).hexdigest() + ".json"
            write_json(ROOT / "bodies" / name, body)
            article.update(body_file=name, content_status="ready", published_at=body["published_at"], fetched_at=stamp())
            article.update(body_error="", body_next_retry=0)
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
            self.save()
            if once: return
            time.sleep(5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    Poller().run(once=parser.parse_args().once)
