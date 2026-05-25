require('dotenv').config();

const path = require('path');
const bcrypt = require('bcryptjs');

const serverRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(serverRoot, '.env'), override: true });

if (process.env.DATABASE_FILE && !path.isAbsolute(process.env.DATABASE_FILE)) {
  process.env.DATABASE_FILE = path.resolve(serverRoot, process.env.DATABASE_FILE);
}

const { getDb, pool } = require('../src/config/db');
const { runMigrations } = require('../src/config/runMigrations');

const TARGET_USER_COUNT = 2563;

const DAILY_DEMO_PROFILE = [
  { views: 705, visitors: 442, registrations: 46 },
  { views: 861, visitors: 532, registrations: 58 },
  { views: 1194, visitors: 711, registrations: 101 },
  { views: 738, visitors: 468, registrations: 52 },
  { views: 1267, visitors: 775, registrations: 113 },
  { views: 812, visitors: 505, registrations: 64 },
  { views: 979, visitors: 604, registrations: 82 },
  { views: 682, visitors: 428, registrations: 52 },
  { views: 756, visitors: 481, registrations: 66 },
  { views: 934, visitors: 587, registrations: 88 },
  { views: 1288, visitors: 764, registrations: 118 },
  { views: 1047, visitors: 641, registrations: 97 },
  { views: 691, visitors: 436, registrations: 57 },
  { views: 1236, visitors: 748, registrations: 126 },
];

const PAGE_PATHS = [
  '/',
  '/events',
  '/community/news',
  '/community/help',
  '/articles',
  '/user/1',
  '/hackathon-season-one',
];

const EVENT_WEIGHTS = [0.36, 0.27, 0.21, 0.16];

const pad = (value, size = 2) => String(value).padStart(size, '0');

const toDateKey = (date) => date.toISOString().slice(0, 10);

const dateKeyDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return toDateKey(date);
};

const timestampFor = (dateKey, index) => {
  const hour = 7 + (index % 15);
  const minute = (index * 7) % 60;
  const second = (index * 13) % 60;
  return `${dateKey} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

const distribute = (total, bucketCount, seed = 0) => {
  if (bucketCount <= 0) return [];

  const weights = Array.from({ length: bucketCount }, (_, index) => (
    EVENT_WEIGHTS[index] || Math.max(0.08, 1 / bucketCount)
  ));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const counts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  let remainder = total - counts.reduce((sum, value) => sum + value, 0);
  let index = seed % bucketCount;

  while (remainder > 0) {
    counts[index] += 1;
    remainder -= 1;
    index = (index + 1) % bucketCount;
  }

  return counts;
};

async function ensureDemoUsers(db) {
  const currentRow = await db.get('SELECT COUNT(*) as count FROM users');
  let currentCount = Number(currentRow?.count || 0);
  let inserted = 0;

  if (currentCount >= TARGET_USER_COUNT) {
    return { before: currentCount, after: currentCount, inserted };
  }

  const passwordHash = await bcrypt.hash('TuotuDemo123456', 10);
  await db.exec('BEGIN TRANSACTION');
  try {
    for (let serial = 1; currentCount < TARGET_USER_COUNT; serial += 1) {
      const username = `demo_member_${pad(serial, 6)}`;
      const daysAgo = 120 - (serial % 120);
      const createdAt = `${dateKeyDaysAgo(daysAgo)} ${pad(8 + (serial % 12))}:${pad((serial * 11) % 60)}:00`;
      const result = await db.run(
        `INSERT OR IGNORE INTO users
          (username, password, role, nickname, organization_cr, created_at)
         VALUES (?, ?, 'user', NULL, ?, ?)`,
        [username, passwordHash, 'ZJU demo cohort', createdAt],
      );

      if (result.changes > 0) {
        inserted += 1;
        currentCount += 1;
      }

      if (serial > TARGET_USER_COUNT * 3) {
        throw new Error('Unable to generate enough unique demo users.');
      }
    }
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return { before: currentRow?.count || 0, after: currentCount, inserted };
}

async function resetGeneratedAnalytics(db, startDate) {
  await db.run(
    `DELETE FROM site_visit_events
     WHERE visitor_key LIKE 'demo-site-%'
        OR (date_key >= ? AND page_path LIKE '/demo-dashboard/%')`,
    [startDate],
  );
  await db.run(
    `DELETE FROM site_daily_visitors
     WHERE visitor_key LIKE 'demo-site-%'
        OR (date_key >= ? AND first_path LIKE '/demo-dashboard/%')`,
    [startDate],
  );
  await db.run(
    `DELETE FROM event_view_events
     WHERE visitor_key LIKE 'demo-event-%'`,
  );
  await db.run(
    `DELETE FROM event_registrations
     WHERE created_at >= ?
       AND user_id IN (SELECT id FROM users WHERE username LIKE 'demo_member_%')`,
    [`${startDate} 00:00:00`],
  );
}

async function seedSiteAnalytics(db, datedProfile) {
  let siteViews = 0;
  let siteVisitors = 0;

  for (const day of datedProfile) {
    for (let index = 0; index < day.visitors; index += 1) {
      const visitorKey = `demo-site-${day.dateKey}-${pad(index + 1, 5)}`;
      const firstPath = PAGE_PATHS[index % PAGE_PATHS.length];
      await db.run(
        `INSERT OR IGNORE INTO site_daily_visitors
          (date_key, visitor_key, first_path, created_at)
         VALUES (?, ?, ?, ?)`,
        [day.dateKey, visitorKey, firstPath, timestampFor(day.dateKey, index)],
      );
      siteVisitors += 1;
    }

    for (let index = 0; index < day.views; index += 1) {
      const visitorIndex = index % day.visitors;
      const visitorKey = `demo-site-${day.dateKey}-${pad(visitorIndex + 1, 5)}`;
      const pagePath = PAGE_PATHS[(index + day.dayIndex) % PAGE_PATHS.length];
      await db.run(
        `INSERT INTO site_visit_events
          (visitor_key, page_path, date_key, created_at)
         VALUES (?, ?, ?, ?)`,
        [visitorKey, pagePath, day.dateKey, timestampFor(day.dateKey, index)],
      );
      siteViews += 1;
    }
  }

  return { siteViews, siteVisitors };
}

async function seedEventAnalytics(db, datedProfile) {
  const events = await db.all(
    `SELECT id, title
     FROM events
     WHERE deleted_at IS NULL
     ORDER BY COALESCE(featured, 0) DESC, id ASC`,
  );

  if (events.length === 0) {
    return { eventViews: 0, eventRegistrations: 0, eventCount: 0 };
  }

  const users = await db.all(
    `SELECT id
     FROM users
     WHERE username LIKE 'demo_member_%'
     ORDER BY id ASC`,
  );

  let eventViews = 0;
  let eventRegistrations = 0;
  const registrationOffsets = new Map(events.map((event) => [event.id, 0]));

  for (const day of datedProfile) {
    const viewDistribution = distribute(day.views, events.length, day.dayIndex);
    const registrationDistribution = distribute(day.registrations, events.length, day.dayIndex + 1);

    for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
      const event = events[eventIndex];
      const viewCount = viewDistribution[eventIndex] || 0;
      const registrationCount = registrationDistribution[eventIndex] || 0;

      for (let index = 0; index < viewCount; index += 1) {
        const visitorKey = `demo-event-${day.dateKey}-${event.id}-${pad(index + 1, 5)}`;
        await db.run(
          `INSERT INTO event_view_events
            (event_id, visitor_key, date_key, created_at)
           VALUES (?, ?, ?, ?)`,
          [event.id, visitorKey, day.dateKey, timestampFor(day.dateKey, index + eventIndex)],
        );
        eventViews += 1;
      }

      if (users.length > 0) {
        for (let index = 0; index < registrationCount; index += 1) {
          const offset = registrationOffsets.get(event.id) || 0;
          const user = users[(offset + (eventIndex * 397)) % users.length];
          registrationOffsets.set(event.id, offset + 1);

          const result = await db.run(
            `INSERT OR IGNORE INTO event_registrations
              (event_id, user_id, created_at)
             VALUES (?, ?, ?)`,
            [event.id, user.id, timestampFor(day.dateKey, index + eventIndex)],
          );

          if (result.changes > 0) {
            eventRegistrations += 1;
          }
        }
      }
    }
  }

  await db.exec(`
    UPDATE events
    SET views = (
      SELECT COUNT(*)
      FROM event_view_events
      WHERE event_view_events.event_id = events.id
    )
    WHERE id IN (SELECT DISTINCT event_id FROM event_view_events)
  `);

  return { eventViews, eventRegistrations, eventCount: events.length };
}

async function main() {
  const db = await getDb();
  await runMigrations(db);

  const datedProfile = DAILY_DEMO_PROFILE.map((item, index) => ({
    ...item,
    dayIndex: index,
    dateKey: dateKeyDaysAgo(DAILY_DEMO_PROFILE.length - 1 - index),
  }));
  const startDate = datedProfile[0].dateKey;

  const users = await ensureDemoUsers(db);
  await resetGeneratedAnalytics(db, startDate);

  await db.exec('BEGIN TRANSACTION');
  let site;
  let events;
  try {
    site = await seedSiteAnalytics(db, datedProfile);
    events = await seedEventAnalytics(db, datedProfile);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  const lastSevenStart = datedProfile[datedProfile.length - 7].dateKey;
  const [userCount, siteViews7d, eventViews7d, registrations7d] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM users'),
    db.get('SELECT COUNT(*) as count FROM site_visit_events WHERE date_key >= ?', [lastSevenStart]),
    db.get('SELECT COUNT(*) as count FROM event_view_events WHERE date_key >= ?', [lastSevenStart]),
    db.get('SELECT COUNT(*) as count FROM event_registrations WHERE created_at >= ?', [`${lastSevenStart} 00:00:00`]),
  ]);

  console.log(JSON.stringify({
    users,
    generated: {
      siteViews: site.siteViews,
      siteVisitors: site.siteVisitors,
      eventViews: events.eventViews,
      eventRegistrations: events.eventRegistrations,
      eventCount: events.eventCount,
    },
    dashboardCheck: {
      totalUsers: userCount?.count || 0,
      siteViews7d: siteViews7d?.count || 0,
      eventViews7d: eventViews7d?.count || 0,
      registrations7d: registrations7d?.count || 0,
      dateRange: `${startDate}..${datedProfile[datedProfile.length - 1].dateKey}`,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.close();
  });
