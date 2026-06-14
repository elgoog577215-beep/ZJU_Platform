const assert = require('assert');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const {
  _test: { buildEventCollegeScopeFilter },
} = require('../src/controllers/resourceController');
const { pool } = require('../src/config/db');

const sampleEvents = [
  [1, 'AI 学院通知', '全校', '人工智能学院', '人工智能学院'],
  [2, 'AI 学院专场活动', '人工智能学院', '', '校学生会'],
  [3, '全校讲座', '全校师生', '', '校团委'],
  [4, '软件学院通知', '软件学院', '软件学院', '软件学院'],
  [5, '本科生通用活动', '本科生', '', '学生服务中心'],
  [6, 'AI 学院硕士生通知', '硕士生', '人工智能学院', '人工智能学院'],
];

async function main() {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database,
  });

  try {
    await db.exec(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY,
        title TEXT,
        target_audience TEXT,
        source_college TEXT,
        organizer TEXT
      )
    `);

    for (const event of sampleEvents) {
      await db.run(
        'INSERT INTO events (id, title, target_audience, source_college, organizer) VALUES (?, ?, ?, ?, ?)',
        event,
      );
    }

    const aiCollegeFilter = buildEventCollegeScopeFilter('人工智能学院');
    const aiMatches = await db.all(
      `SELECT id FROM events WHERE ${aiCollegeFilter.clause} ORDER BY id ASC`,
      aiCollegeFilter.params,
    );
    assert.deepStrictEqual(aiMatches.map((event) => event.id), [1, 2, 3, 6]);

    const undergraduateFilter = buildEventCollegeScopeFilter('本科生');
    const undergraduateMatches = await db.all(
      `SELECT id FROM events WHERE ${undergraduateFilter.clause} ORDER BY id ASC`,
      undergraduateFilter.params,
    );
    assert.deepStrictEqual(undergraduateMatches.map((event) => event.id), [1, 3, 5]);

    console.log('Event college scope filter checks passed');
  } finally {
    await db.close();
    await pool.close();
  }
}

main().catch(async (error) => {
  console.error(error);
  await pool.close();
  process.exit(1);
});
