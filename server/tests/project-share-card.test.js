const assert = require('node:assert/strict');
const test = require('node:test');
const sharp = require('sharp');

const {
  WIDTH,
  HEIGHT,
  renderProjectShareCard,
} = require('../src/services/projectShareCardService');

test('project share card renders a rounded 5:4 PNG without a cover', async () => {
  const image = await renderProjectShareCard({
    title: '灵知',
    intro: '一句话课程生成',
    progress: 'dev',
    need_tags: JSON.stringify(['缺人', '缺设计', '找测试用户']),
    cover_url: '',
  });
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, WIDTH);
  assert.equal(metadata.height, HEIGHT);
  assert.equal(WIDTH / HEIGHT, 1.25);
  assert.equal(metadata.hasAlpha, true);

  const topLeft = await sharp(image).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
  assert.equal(topLeft[3], 0);
});
