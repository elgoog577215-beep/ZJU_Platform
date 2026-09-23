import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import weread_poll
from weread_poll import article_link, parse_body


class ParserTests(unittest.TestCase):
    def test_persistent_dedup_and_auth_pause(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(weread_poll, "ROOT", Path(directory)):
            poller = weread_poll.Poller()
            account = {"mp_id": "MP_WXS_123", "name": "测试"}
            poller.request = lambda *args, **kwargs: {"reviewId": "MP_WXS_123_token", "title": "文章"}
            poller.step(account)
            poller.step(account)
            feed = weread_poll.read_json(Path(directory) / "MP_WXS_123.json", {})
            self.assertEqual(len(feed["articles"]), 1)
            self.assertEqual(feed["articles"][0]["content_status"], "pending")
            self.assertEqual(weread_poll.Poller().state["accounts"]["MP_WXS_123"]["failures"], 0)
            def fail(*args, **kwargs): raise ValueError("http_401")
            poller.request = fail
            poller.step(account)
            self.assertTrue(poller.state["auth_required"])
            self.assertEqual(weread_poll.read_json(Path(directory) / "MP_WXS_123.json", {})["articles"], feed["articles"])

    def test_controls_survive_restart_and_retry_does_not_bypass_auth_or_backoff(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(weread_poll, "ROOT", Path(directory)):
            root = Path(directory)
            weread_poll.write_json(root / "MP_WXS_123.json", {"articles": [
                {"id": "pending", "content_status": "pending", "body_next_retry": 9999999999},
                {"id": "ready", "content_status": "ready", "body_next_retry": 123},
            ]})
            weread_poll.write_json(root / "control.json", {"revision": "one", "paused": True,
                "poll_seconds": 1800, "feeds": {"MP_WXS_123": {"paused": True, "retry_token": "retry-one"}}})
            poller = weread_poll.Poller()
            poller.state.update(auth_required=True, global_pause_until=9999999999)
            poller.apply_control()
            self.assertTrue(poller.state["paused"])
            self.assertTrue(poller.state["auth_required"])
            self.assertEqual(poller.state["global_pause_until"], 9999999999)
            self.assertEqual(poller.interval, 1800)
            self.assertEqual(poller.state["control_revision"], "one")
            feed = weread_poll.read_json(root / "MP_WXS_123.json", {})
            self.assertEqual(feed["articles"][0]["body_next_retry"], 0)
            self.assertEqual(feed["articles"][1]["body_next_retry"], 123)
            # A consumed command must not reset a failed retry on every loop/restart.
            feed["articles"][0]["body_next_retry"] = 456
            weread_poll.write_json(root / "MP_WXS_123.json", feed)
            restarted = weread_poll.Poller()
            restarted.apply_control()
            self.assertEqual(weread_poll.read_json(root / "MP_WXS_123.json", {})["articles"][0]["body_next_retry"], 456)

    def test_manual_pause_prevents_upstream_requests(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(weread_poll, "ROOT", Path(directory)), patch.object(weread_poll, "MANIFEST", Path(directory) / "accounts.json"):
            weread_poll.write_json(weread_poll.MANIFEST, [{"mp_id": "MP_WXS_123", "name": "测试"}])
            weread_poll.write_json(Path(directory) / "control.json", {"paused": True})
            poller = weread_poll.Poller()
            with patch.object(poller, "request") as request:
                poller.run(once=True)
                request.assert_not_called()

    def test_link_preserves_underscore_and_decodes_weread_tilde(self):
        self.assertEqual(article_link("MP_WXS_123", "MP_WXS_123_ab_c~d"), "https://mp.weixin.qq.com/s/ab_c_d")
        with self.assertRaises(ValueError):
            article_link("MP_WXS_123", "MP_WXS_456_abc")

    def test_unknown_date_and_lazy_images(self):
        result = parse_body('<div id="js_content"><p>正文</p><img data-src="https://mmbiz.qpic.cn/a" onerror="bad()"></div>')
        self.assertEqual(result["published_at"], "")
        self.assertIn('src="https://mmbiz.qpic.cn/a"', result["content_html"])
        self.assertNotIn("data-src", result["content_html"])
        self.assertNotIn("onerror", result["content_html"])

    def test_validation_page_rejected(self):
        with self.assertRaises(ValueError):
            parse_body('<html>当前环境异常</html>')

    def test_body_error_classification(self):
        for raw, code in [("", "empty_response"), ("<p>当前环境异常，完成验证后继续</p>", "verification_required"), ("<p>内容已被发布者删除</p>", "article_unavailable"), ("<p>other</p>", "article_body_missing")]:
            with self.assertRaisesRegex(ValueError, code): parse_body(raw)

    def test_body_fallback_diagnostics_and_auth_do_not_get_conflated(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(weread_poll, "ROOT", Path(directory)):
            poller = weread_poll.Poller()
            a = {"id": "MP_WXS_123_test", "title": "test", "content_status": "pending"}
            f = {"articles": [a]}
            poller.request = lambda *args, **kwargs: ""
            with patch.object(poller, "public_body", side_effect=ValueError("verification_required")):
                poller.body_step("MP_WXS_123", f, a)
            self.assertEqual(a["weread_error"], "empty_response")
            self.assertEqual(a["public_error"], "verification_required")
            self.assertEqual(a["body_failures"], 1)
            self.assertTrue(a["body_last_attempt_at"])
            self.assertFalse(poller.state.get("auth_required"))
            def no_auth(*args, **kwargs): raise ValueError("http_401")
            poller.request = no_auth
            with patch.object(poller, "public_body") as public:
                poller.body_step("MP_WXS_123", f, a)
                public.assert_not_called()
            self.assertTrue(poller.state["auth_required"])
            poller.request = lambda *args, **kwargs: '<div id="js_content">正文</div>'
            poller.body_step("MP_WXS_123", f, a)
            self.assertEqual(a["content_status"], "ready")
            self.assertEqual(a["body_error"], "")
            self.assertEqual(a["body_next_retry"], 0)

    def test_explicit_date_only(self):
        result = parse_body('<script>var ct = "1750000000";</script><div id="js_content">正文</div>')
        self.assertTrue(result["published_at"].startswith("2025-"))

    def test_picture_message_excludes_nested_watermark_and_decodes_text(self):
        raw = r'''<meta property="og:description" content="第一行\\x0a第二行 &lt;script&gt;不是代码&lt;/script&gt;">
        <script>window.data = { item_show_type: '8' * 1, picture_page_info_list: [
          {cdn_url: 'https://mmbiz.qpic.cn/one.jpg', poi_info: [],
           watermark_info: {cdn_url: 'https://mmbiz.qpic.cn/watermark.jpg'},
           caption: 'brackets ] } and escaped quote \' remain data'},
          {cdn_url: 'http://mmbiz.qpic.cn/two.jpg', nested: [{x: 1}]},
          {cdn_url: 'https://unrelated.example/tracker.jpg'}
        ] };</script>'''
        result = parse_body(raw)
        self.assertEqual(result["images"], ["https://mmbiz.qpic.cn/one.jpg", "https://mmbiz.qpic.cn/two.jpg"])
        self.assertIn("第一行\n第二行", result["content_text"])
        self.assertIn("&lt;script&gt;", result["content_html"])
        self.assertNotIn("<script>", result["content_html"])
        self.assertEqual(result["published_at"], "")

    def test_message_identity_and_title_come_from_page_metadata(self):
        raw = ('<meta property="og:title" content="标题 &amp; 副题"><script>var biz = "MzA3NjkyOTEwMw==" || "";'
               'var mid = "2649700114" || "" || ""; var idx = "1" || "" || ""; var idx = opt.idx || window.idx</script>'
               '<div id="js_content">正文</div>')
        result = parse_body(raw)
        self.assertEqual(result["msg"], {"biz": "MzA3NjkyOTEwMw==", "mid": "2649700114", "idx": "1"})
        self.assertEqual(result["title"], "标题 & 副题")
        self.assertEqual(weread_poll.mp_biz("MP_WXS_3076929103"), "MzA3NjkyOTEwMw==")
        self.assertEqual(parse_body('<div id="js_content">正文</div>')["msg"], {})
        self.assertEqual(weread_poll.search_identity("https://mp.weixin.qq.com/s?__biz=Mz+A==&mid=1&idx=2&sn=" + "a" * 32 + "&chksm=" + "b" * 16)[0], "Mz+A==")
        self.assertIsNone(weread_poll.search_identity("https://mp.weixin.qq.com/s?__biz=M&mid=1&idx=2&sn=" + "a" * 32))
        self.assertIsNone(weread_poll.search_identity("https://mp.weixin.qq.com.evil.test/s?__biz=M&mid=1&idx=2&sn=" + "a" * 32 + "&chksm=" + "b" * 16))

    def test_search_finds_other_articles_of_the_same_push_only(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(weread_poll, "ROOT", Path(directory)), \
                patch.object(weread_poll, "KUAISOU_KEY", Path(directory) / "key"), \
                patch.object(weread_poll, "KUAISOU_CHECK_HOURS", [12, 48]):
            root = Path(directory); (root / "key").write_text("secret")
            biz = weread_poll.mp_biz("MP_WXS_123")
            sn = "0" * 32
            def url(b, mid, idx): return f"https://mp.weixin.qq.com/s?__biz={b}&mid={mid}&idx={idx}&sn={sn}&chksm=ab12cd34ef56ab78&scene=27"
            old = weread_poll.datetime.fromtimestamp(0, weread_poll.timezone.utc).isoformat()
            fresh = weread_poll.stamp()
            headline = {"id": "MP_WXS_123_tok", "title": "头条文章标题很长很长很长", "content_status": "ready", "observed_at": old}
            waiting = {"id": "MP_WXS_123_new", "title": "刚发现", "content_status": "ready", "observed_at": fresh}
            feed = {"name": "号", "articles": [headline, waiting]}
            weread_poll.write_json(root / "MP_WXS_123.json", feed)
            accounts = [{"mp_id": "MP_WXS_123"}]
            poller = weread_poll.Poller()
            calls = []
            def search(query, count):
                calls.append(query)
                if count == 10:  # headline cached before identity extraction: resolved by title
                    return [{"name": "头条文章标题很长很长很长", "url": url("other", "9", "1")},
                            {"name": "头条文章标题很长很长很长...", "url": url(biz, "77", "1")}]
                return [{"name": "头条", "url": url(biz, "77", "1")},
                        {"name": "次条标题...", "url": url(biz, "77", "2")},
                        {"name": "别的推送", "url": url(biz, "78", "1")},
                        {"name": "别的号", "url": url("other", "77", "3")},
                        {"name": "坏链接", "url": "https://mp.weixin.qq.com/s/short"}]
            poller.kuaisou = search
            mp_id, f, article = poller.sibling_job(accounts)
            self.assertEqual(article["id"], "MP_WXS_123_tok")
            poller.sibling_step(mp_id, f, article)
            self.assertEqual(calls, ["头条文章标题很长很长很长", "77"])
            saved = weread_poll.read_json(root / "MP_WXS_123.json", {})["articles"]
            self.assertEqual(len(saved), 3)
            sibling = saved[2]
            self.assertEqual(sibling["link"], f"https://mp.weixin.qq.com/s?__biz={biz.replace('=', '%3D')}&mid=77&idx=2&sn={sn}&chksm=ab12cd34ef56ab78")
            self.assertEqual((sibling["discovered_by"], sibling["content_status"], sibling["msg"]["idx"]), ("kuaisou", "pending", "2"))
            self.assertEqual(saved[0]["msg"]["mid"], "77")
            self.assertEqual(saved[0]["sibling_checks_done"], 1)
            # The second check neither re-adds the sibling nor re-resolves the headline.
            poller.sibling_step(*poller.sibling_job(accounts))
            self.assertEqual(calls[-1], "77")
            self.assertEqual(len(weread_poll.read_json(root / "MP_WXS_123.json", {})["articles"]), 3)
            self.assertIsNone(poller.sibling_job(accounts))  # both checks done; the fresh headline is not due
            # The sibling link is kept across cover polls and its body only comes from the public page.
            poller.request = lambda *a, **k: {"reviewId": "MP_WXS_123_tok", "title": "头条"}
            poller.step({"mp_id": "MP_WXS_123", "name": "号"})
            feed = weread_poll.read_json(root / "MP_WXS_123.json", {})
            sibling = feed["articles"][2]
            self.assertIn("mid=77", sibling["link"])
            def weread(*a, **k): raise AssertionError("sibling has no WeRead review id")
            poller.request = weread
            page = f'<meta property="og:title" content="次条完整标题"><script>var biz = "{biz}" || ""; var mid = "77" || ""; var idx = "2" || "";</script><div id="js_content">次条正文</div>'
            with patch.object(poller, "public_body", return_value=parse_body(page)) as public:
                poller.body_step("MP_WXS_123", feed, sibling)
                self.assertIs(public.call_args.args[1], sibling)
            self.assertEqual((sibling["content_status"], sibling["title"], sibling["body_source"]), ("ready", "次条完整标题", "public_article"))

    def test_search_is_optional_and_failures_pause_only_search(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(weread_poll, "ROOT", Path(directory)), \
                patch.object(weread_poll, "KUAISOU_KEY", Path(directory) / "missing"):
            root = Path(directory)
            old = weread_poll.datetime.fromtimestamp(0, weread_poll.timezone.utc).isoformat()
            article = {"id": "MP_WXS_123_tok", "title": "头条", "content_status": "ready", "observed_at": old,
                       "msg": {"biz": weread_poll.mp_biz("MP_WXS_123"), "mid": "77", "idx": "1"}}
            feed = {"articles": [article]}
            weread_poll.write_json(root / "MP_WXS_123.json", feed)
            poller = weread_poll.Poller()
            self.assertIsNone(poller.sibling_job([{"mp_id": "MP_WXS_123"}]))
            def broke(*a, **k): raise ValueError("kuaisou_http_402")
            poller.kuaisou = broke
            poller.sibling_step("MP_WXS_123", feed, article)
            self.assertNotIn("sibling_checks_done", article)
            self.assertGreater(poller.state["kuaisou"]["pause_until"], weread_poll.time.time() + 3600)
            self.assertFalse(poller.state.get("auth_required"))
            self.assertEqual(poller.state.get("global_pause_until", 0), 0)

    def test_picture_message_requires_complete_typed_picture_list(self):
        for raw in [
            "<script>picture_page_info_list: [{cdn_url: 'https://mmbiz.qpic.cn/a'}]</script>",
            "<script>item_show_type: '8', picture_page_info_list: [{cdn_url: 'https://mmbiz.qpic.cn/a'}</script>",
            "<script>item_show_type: '8', picture_page_info_list: []</script>",
        ]:
            with self.assertRaisesRegex(ValueError, "article_body_missing"): parse_body(raw)


if __name__ == "__main__":
    unittest.main()
