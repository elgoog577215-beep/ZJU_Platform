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
from urllib.parse import quote

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
    soup = BeautifulSoup(raw, "html.parser")
    root = soup.select_one("#js_content, .rich_media_content")
    if root is None:
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

    def save(self):
        self.state["heartbeat_at"] = stamp()
        write_json(ROOT / "status.json", self.state)

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
            state.update(last_success_at=stamp(), failures=0, error="", next_check=time.time() + INTERVAL)
        except Exception as exc:
            # Do not log request objects, cookies, or untrusted response bodies.
            code = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
            state["failures"] = state.get("failures", 0) + 1
            state.update(error=code[:100], last_error_at=stamp(),
                         next_check=time.time() + min(21600, INTERVAL * 2 ** min(state["failures"] - 1, 4)))
            if code in {"auth_missing", "api_-2012", "api_-2010", "http_401", "http_403", "http_429", "api_200013"}:
                self.state["global_pause_until"] = time.time() + (3600 if "429" in code or "200013" in code else 1800)
                if code in {"auth_missing", "api_-2012", "api_-2010", "http_401"}:
                    self.state["auth_required"] = True
            print(json.dumps({"mp_id": mp_id, "phase": phase, "error": code[:100]}), flush=True)
        self.save()

    def body_step(self, mp_id, feed, article):
        try:
            raw = self.request("/web/mp/content", {"reviewId": article["id"]}, as_json=False)
            body = parse_body(raw)
            name = hashlib.sha256(article["id"].encode()).hexdigest() + ".json"
            write_json(ROOT / "bodies" / name, body)
            article.update(body_file=name, content_status="ready", published_at=body["published_at"], fetched_at=stamp())
            print(json.dumps({"mp_id": mp_id, "title": article["title"], "status": "ready",
                              "text_chars": len(body["content_text"]), "images": len(body["images"])}), flush=True)
        except Exception as exc:
            code = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
            article["body_failures"] = article.get("body_failures", 0) + 1
            article.update(body_error=code[:100], body_next_retry=time.time() + min(21600, 900 * 2 ** min(article["body_failures"], 4)))
            if code in {"http_401", "http_403", "http_429"}:
                self.state["global_pause_until"] = time.time() + 1800
            print(json.dumps({"mp_id": mp_id, "phase": "body", "error": code[:100]}), flush=True)
        write_json(ROOT / (mp_id + ".json"), feed)
        self.save()

    def run(self, once=False):
        visited = set()
        while True:
            accounts = read_json(MANIFEST, [])
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
