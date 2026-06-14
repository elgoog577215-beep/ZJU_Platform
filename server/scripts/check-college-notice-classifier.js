const {
  normalizeCollegeNoticeFields,
} = require('../src/services/eventIntelligenceService');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = () => {
  const bonusNotice = normalizeCollegeNoticeFields({
    title: '关于云峰学园综测加分活动报名的通知',
    description: '面向云峰学园学生，完成报名后可获得素质分。',
    organizer: '云峰学园',
  });

  assert(bonusNotice.is_college_notice === 1, 'Expected college notice flag.');
  assert(bonusNotice.source_college === '云峰学园', 'Expected source college.');
  assert(bonusNotice.notice_type === 'bonus', 'Expected bonus notice type.');

  const evaluationNotice = normalizeCollegeNoticeFields({
    title: '计算机科学与技术学院奖学金评奖评优公示',
    organizer: '计算机科学与技术学院',
  });

  assert(evaluationNotice.is_college_notice === 1, 'Expected evaluation notice flag.');
  assert(evaluationNotice.source_college === '计算机科学与技术学院', 'Expected CS college source.');
  assert(evaluationNotice.notice_type === 'evaluation', 'Expected evaluation notice type.');

  const normalEvent = normalizeCollegeNoticeFields({
    title: 'AI 产品黑客松路演活动',
    description: '欢迎全校同学参加。',
    organizer: '学生科创社团',
  });

  assert(normalEvent.is_college_notice === 0, 'Expected normal event not to be a college notice.');
  assert(normalEvent.source_college === null, 'Expected no source college.');
  assert(normalEvent.notice_type === null, 'Expected no notice type.');

  console.log('College notice classifier check passed.');
};

main();
