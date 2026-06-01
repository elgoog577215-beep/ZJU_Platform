const { getDb, pool } = require('../src/config/db');
const { runMigrations } = require('../src/config/runMigrations');
const { refreshEventProfileIndex } = require('../src/services/eventAiProfileService');
const { refreshResourceSearchIndex } = require('../src/services/resourceSearchIndexService');

const readFlag = (name, fallback) => {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  if (!value) return fallback;
  return value.slice(prefix.length);
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const main = async () => {
  const db = await getDb();
  try {
    await runMigrations(db);

    let eventProfiles = null;
    if (!hasFlag('skip-event-profiles')) {
      eventProfiles = await refreshEventProfileIndex(db, {
        limit: Number(readFlag('profile-limit', readFlag('limit', 40))),
        force: hasFlag('force-profiles'),
        useModel: hasFlag('with-model'),
      });
    }

    const result = await refreshResourceSearchIndex(db, {
      limit: Number(readFlag('limit', 280)),
      force: hasFlag('force'),
      types: readFlag('types', ''),
    });

    console.log(JSON.stringify({
      ok: true,
      eventProfiles: eventProfiles
        ? {
          runId: eventProfiles.runId,
          summary: eventProfiles.summary,
          coverage: eventProfiles.coverage,
        }
        : null,
      globalSearchIndex: {
        runId: result.runId,
        summary: result.summary,
        coverage: result.coverage,
      },
    }, null, 2));
  } finally {
    await pool.close();
  }
};

main().catch(async (error) => {
  console.error('Resource search index refresh failed:', error.message);
  await pool.close().catch(() => {});
  process.exitCode = 1;
});
