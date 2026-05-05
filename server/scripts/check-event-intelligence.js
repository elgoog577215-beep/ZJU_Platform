const assert = require('assert');

const {
  classifyEventCategory,
  normalizeEventAudience,
  normalizeEventCategory,
  validateParsedEventPayload,
} = require('../src/services/eventIntelligenceService');

const checks = [
  () => assert.strictEqual(normalizeEventCategory('学术讲座'), 'lecture'),
  () => assert.strictEqual(normalizeEventCategory('公益实践'), 'volunteer'),
  () => assert.strictEqual(normalizeEventCategory('项目招募'), 'recruitment'),
  () => assert.strictEqual(normalizeEventAudience('全校师生'), '全校'),
  () => assert.strictEqual(normalizeEventAudience('计算机科学与技术学院、软件学院'), '计算机科学与技术学院,软件学院'),
  () => assert.strictEqual(normalizeEventAudience('本科和硕士均可报名'), '本科生,硕士生'),
  () => assert.strictEqual(
    classifyEventCategory({
      title: 'AI 工具效率分享会',
      description: '嘉宾分享学习效率和工具实践',
    }).category,
    'lecture'
  ),
  () => assert.strictEqual(
    classifyEventCategory({
      title: 'AI 主题活动',
      tags: ['AI'],
    }).confidence < 0.6,
    true
  ),
  () => assert.strictEqual(
    validateParsedEventPayload({
      title: '社区助老数字服务日',
      category: '公益实践',
      target_audience: '全体师生',
      tags: ['公益', 'AI', '自造词'],
    }).category,
    'volunteer'
  ),
  () => {
    const result = validateParsedEventPayload({
      title: '社区助老数字服务日',
      category: '奇怪分类',
      category_confidence: 0.99,
      category_reason: '模型自称很确定',
      tags: ['公益'],
    });
    assert.strictEqual(result.category, 'volunteer');
    assert.ok(result.category_confidence < 0.99);
    assert.notStrictEqual(result.category_reason, '模型自称很确定');
  },
  () => assert.deepStrictEqual(
    validateParsedEventPayload({
      title: '测试活动',
      category: 'lecture',
      tags: ['讲座', '自造词', 'AI'],
    }).tags,
    ['讲座', 'AI']
  ),
];

for (const check of checks) {
  check();
}

console.log(`Event intelligence checks passed: ${checks.length}`);
