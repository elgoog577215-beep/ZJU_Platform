const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildArticlePayload,
  buildContentBlocks,
  buildEventPayload,
  buildWechatMpResourcePayload,
} = require('../src/services/wechatMpResourcePayloadService');

const fixture = {
  article: {
    title: '浙大活动通知',
    link: 'https://mp.weixin.qq.com/s/demo',
    summary: '这是一条来自公众号的摘要。',
    time_text: '2026-07-11 12:30:00',
    account: '浙江大学',
  },
  content: {
    title: '浙大活动通知',
    author: '浙江大学',
    contentText: '活动介绍\n\n一、亮点\n\n- 报名方式\n- 参与对象',
    images: ['/uploads/wechat/body.png'],
    coverImage: '/uploads/wechat/cover.png',
    url: 'https://mp.weixin.qq.com/s/demo',
  },
};

test('WeChat MP deterministic converter builds readable content blocks', () => {
  const blocks = buildContentBlocks(fixture.content.contentText, fixture.content.images);

  assert.equal(blocks[0].type, 'text');
  assert.equal(blocks[0].style, 'heading');
  assert.equal(blocks.at(-1).type, 'image');
  assert.equal(blocks.at(-1).url, '/uploads/wechat/body.png');
});

test('WeChat MP article payload follows ZJU Platform article shape', () => {
  const payload = buildArticlePayload(fixture);
  const blocks = JSON.parse(payload.content_blocks);

  assert.equal(payload.title, '浙大活动通知');
  assert.equal(payload.date, '2026-07-11');
  assert.equal(payload.cover, '/uploads/wechat/cover.png');
  assert.equal(payload.category, 'campus');
  assert.match(payload.content, /<h2>活动介绍<\/h2>/);
  assert.match(payload.content, /阅读原文/);
  assert.equal(blocks.some((block) => block.type === 'image'), true);
});

test('WeChat MP event payload avoids inventing event time while preserving body', () => {
  const payload = buildEventPayload(fixture);

  assert.equal(payload.title, '浙大活动通知');
  assert.equal(payload.date, '');
  assert.equal(payload.link, 'https://mp.weixin.qq.com/s/demo');
  assert.equal(payload.organizer, '浙江大学');
  assert.equal(payload.image, '/uploads/wechat/cover.png');
  assert.match(payload.content, /<ul><li>报名方式<\/li><li>参与对象<\/li><\/ul>/);
});

test('WeChat MP import payload routes supported resource types', () => {
  assert.deepEqual(
    buildWechatMpResourcePayload({ ...fixture, resourceType: 'article' }).endpoint,
    '/articles',
  );
  assert.deepEqual(
    buildWechatMpResourcePayload({ ...fixture, resourceType: 'event' }).endpoint,
    '/events',
  );
  assert.throws(
    () => buildWechatMpResourcePayload({ ...fixture, resourceType: 'photo' }),
    /Unsupported/,
  );
});
