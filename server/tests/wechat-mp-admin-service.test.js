const test = require('node:test');
const assert = require('node:assert/strict');

const {
  authenticatedUrlFromLoginPayload,
  cookiesToHeader,
  credentialsFromBrowserState,
  extractArticleBody,
  extractAuthenticatedToken,
  parseMpArticlesPayload,
  redactCredentials,
  sanitizeCredentials,
} = require('../src/services/wechatMpAdminService');

test('WeChat MP token extraction only accepts authenticated trusted backend URLs', () => {
  assert.equal(
    extractAuthenticatedToken('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&token=123456'),
    '123456',
  );
  assert.equal(
    extractAuthenticatedToken('https://mp.weixin.qq.com/cgi-bin/login?token=123456'),
    '',
  );
  assert.equal(
    extractAuthenticatedToken('https://mp.weixin.qq.evil/cgi-bin/appmsg?token=123456'),
    '',
  );
  assert.equal(
    extractAuthenticatedToken('https://mp.weixin.qq.com/cgi-bin/appmsg?token=abc'),
    '',
  );
  assert.equal(
    extractAuthenticatedToken('https://mp.weixin.qq.com:444/cgi-bin/appmsg?token=123456'),
    '',
  );
  assert.equal(
    extractAuthenticatedToken('https://user:pass@mp.weixin.qq.com/cgi-bin/appmsg?token=123456'),
    '',
  );
});

test('WeChat MP login payload resolves only successful trusted redirects', () => {
  assert.equal(
    authenticatedUrlFromLoginPayload({
      base_resp: { ret: 0 },
      redirect_url: '/cgi-bin/home?t=home/index&token=987654',
    }),
    'https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=987654',
  );
  assert.equal(
    authenticatedUrlFromLoginPayload({
      base_resp: { ret: -1 },
      redirect_url: '/cgi-bin/home?t=home/index&token=987654',
    }),
    '',
  );
  assert.equal(
    authenticatedUrlFromLoginPayload({
      base_resp: { ret: 0 },
      redirect_url: 'https://example.com/cgi-bin/home?token=987654',
    }),
    '',
  );
});

test('WeChat MP browser state requires token and session cookies', () => {
  const credentials = credentialsFromBrowserState({
    urls: ['https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=24680'],
    cookies: [
      { name: 'master_sid', value: 'sid-value', path: '/' },
      { name: 'data_ticket', value: 'ticket-value', path: '/cgi-bin' },
    ],
  });

  assert.equal(credentials.token, '24680');
  assert.match(credentials.cookie, /data_ticket=ticket-value/);
  assert.match(credentials.cookie, /master_sid=sid-value/);

  const incomplete = credentialsFromBrowserState({
    urls: ['https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=24680'],
    cookies: [{ name: 'not_session', value: 'value', path: '/' }],
  });
  assert.equal(incomplete.token, undefined);
});

test('WeChat MP cookie headers keep specific paths first', () => {
  assert.equal(
    cookiesToHeader([
      { name: 'wide', value: '1', path: '/' },
      { name: 'deep', value: '2', path: '/cgi-bin' },
      { name: 'deeper', value: '3', path: '/cgi-bin/appmsg' },
    ]),
    'deeper=3; deep=2; wide=1',
  );
});

test('WeChat MP article list payload parser unwraps nested publish info', () => {
  const parsed = parseMpArticlesPayload({
    publish_page: JSON.stringify({
      total_count: 2,
      publish_list: [
        {
          publish_info: JSON.stringify({
            appmsgex: [
              { title: 'First Article', link: 'https://mp.weixin.qq.com/s/first' },
              { title: 'Second Article', content_url: 'https://mp.weixin.qq.com/s/second' },
            ],
          }),
        },
      ],
    }),
  });

  assert.equal(parsed.total, 2);
  assert.deepEqual(
    parsed.articles.map((article) => article.title),
    ['First Article', 'Second Article'],
  );
});

test('WeChat MP article extractor returns clean text and image candidates', () => {
  const parsed = extractArticleBody(`
    <html>
      <head>
        <meta property="og:title" content="Campus Notice">
        <meta property="og:article:author" content="ZJU Office">
        <meta name="description" content="Useful notice">
      </head>
      <body>
        <div id="js_content">
          <p>Line one&nbsp; text.</p>
          <script>alert("bad")</script>
          <p>Line two text.</p>
          <img data-src="https://mmbiz.qpic.cn/cover.png">
          <img src="https://mmbiz.qpic.cn/emoji.png">
        </div>
      </body>
    </html>
  `);

  assert.equal(parsed.title, 'Campus Notice');
  assert.equal(parsed.author, 'ZJU Office');
  assert.equal(parsed.summary, 'Useful notice');
  assert.equal(parsed.coverImage, 'https://mmbiz.qpic.cn/cover.png');
  assert.match(parsed.contentText, /Line one text/);
  assert.match(parsed.contentText, /Line two text/);
  assert.doesNotMatch(parsed.contentText, /alert/);
  assert.deepEqual(parsed.images, ['https://mmbiz.qpic.cn/cover.png']);
});

test('WeChat MP credential sanitization and redaction avoid leaking secrets', () => {
  const publicCredentials = sanitizeCredentials({
    token: '1234567890',
    cookie: 'master_sid=sid-value; data_ticket=ticket-value',
    source: 'file',
    updated_at: '2026-07-10T00:00:00.000Z',
  });

  assert.equal(publicCredentials.present, true);
  assert.equal(publicCredentials.token_mask, '1234***7890');
  assert.deepEqual(publicCredentials.cookie_names, ['master_sid', 'data_ticket']);

  const redacted = redactCredentials(
    'request failed token=1234567890 Cookie: master_sid=sid-value; data_ticket=ticket-value',
    {
      token: '1234567890',
      cookie: 'master_sid=sid-value; data_ticket=ticket-value',
    },
  );
  assert.doesNotMatch(redacted, /1234567890/);
  assert.doesNotMatch(redacted, /sid-value/);
  assert.match(redacted, /\[REDACTED\]/);
});
