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

    def test_picture_message_requires_complete_typed_picture_list(self):
        for raw in [
            "<script>picture_page_info_list: [{cdn_url: 'https://mmbiz.qpic.cn/a'}]</script>",
            "<script>item_show_type: '8', picture_page_info_list: [{cdn_url: 'https://mmbiz.qpic.cn/a'}</script>",
            "<script>item_show_type: '8', picture_page_info_list: []</script>",
        ]:
            with self.assertRaisesRegex(ValueError, "article_body_missing"): parse_body(raw)


if __name__ == "__main__":
    unittest.main()
