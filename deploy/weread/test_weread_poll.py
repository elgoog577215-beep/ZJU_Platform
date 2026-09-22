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

    def test_link_preserves_underscore_and_tilde(self):
        self.assertEqual(article_link("MP_WXS_123", "MP_WXS_123_ab_c~d"), "https://mp.weixin.qq.com/s/ab_c~d")
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

    def test_explicit_date_only(self):
        result = parse_body('<script>var ct = "1750000000";</script><div id="js_content">正文</div>')
        self.assertTrue(result["published_at"].startswith("2025-"))


if __name__ == "__main__":
    unittest.main()
