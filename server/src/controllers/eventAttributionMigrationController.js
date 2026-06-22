const { getDb } = require('../config/db');
const migrationService = require('../services/eventAttributionMigrationService');

const parseLevels = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const previewCandidates = async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await migrationService.scanEventAttributionCandidates(db, {
      profileId: req.query.profile_id || req.query.profileId,
      levels: parseLevels(req.query.levels),
      limit: req.query.limit,
    });
    return res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
};

const applyCandidates = async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await migrationService.applyEventAttributionMigration(db, {
      candidates: req.body.candidates,
      adminUserId: req.user?.id,
      allowOverwrite: req.body.allow_overwrite === true || req.body.allowOverwrite === true,
    });
    return res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
};

const listLogs = async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await migrationService.listMigrationLogs(db, {
      limit: req.query.limit,
    });
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  applyCandidates,
  listLogs,
  previewCandidates,
};
