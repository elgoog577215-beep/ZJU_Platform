const { getDb } = require('../config/db');

const CATEGORY_VALUES = new Set(['school', 'organization', 'enterprise']);

const trimText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
};

const nullableText = (value, maxLength = 500) => {
  const text = trimText(value, maxLength);
  return text || null;
};

const toInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBooleanInt = (value, fallback = 0) => {
  if (value === undefined || value === null) return fallback;
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  return 0;
};

const normalizeCategory = (value, fallback = 'enterprise') => {
  const category = trimText(value, 40).toLowerCase();
  return CATEGORY_VALUES.has(category) ? category : fallback;
};

const isSafePartnerUrl = (value) => {
  const url = trimText(value, 1000);
  if (!url) return true;
  if (url.includes('..')) return false;
  if (url.startsWith('/images/') || url.startsWith('/uploads/')) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const sendBadRequest = (res, message) => res.status(400).json({ error: message });

const serializePartner = (row) => ({
  ...row,
  sort_order: toInteger(row.sort_order, 0),
  enabled: Boolean(row.enabled),
  featured: Boolean(row.featured),
});

const readPartnerBody = (body, existing = {}) => {
  const name = body.name !== undefined ? trimText(body.name, 120) : existing.name;
  const category =
    body.category !== undefined
      ? normalizeCategory(body.category, existing.category || 'enterprise')
      : existing.category || 'enterprise';
  const description =
    body.description !== undefined ? nullableText(body.description, 500) : existing.description || null;
  const logoUrl =
    body.logo_url !== undefined || body.logoUrl !== undefined
      ? nullableText(body.logo_url ?? body.logoUrl, 1000)
      : existing.logo_url || null;
  const darkLogoUrl =
    body.dark_logo_url !== undefined || body.darkLogoUrl !== undefined
      ? nullableText(body.dark_logo_url ?? body.darkLogoUrl, 1000)
      : existing.dark_logo_url || null;
  const linkUrl =
    body.link_url !== undefined || body.linkUrl !== undefined
      ? nullableText(body.link_url ?? body.linkUrl, 1000)
      : existing.link_url || null;

  return {
    name,
    category,
    description,
    logoUrl,
    darkLogoUrl,
    linkUrl,
    sortOrder:
      body.sort_order !== undefined || body.sortOrder !== undefined
        ? toInteger(body.sort_order ?? body.sortOrder, 0)
        : toInteger(existing.sort_order, 0),
    enabled:
      body.enabled !== undefined
        ? toBooleanInt(body.enabled, 1)
        : existing.enabled === undefined
          ? 1
          : toBooleanInt(existing.enabled, 1),
    featured:
      body.featured !== undefined
        ? toBooleanInt(body.featured, 1)
        : existing.featured === undefined
          ? 1
          : toBooleanInt(existing.featured, 1),
  };
};

const validatePartnerPayload = (payload, res) => {
  if (!payload.name) return sendBadRequest(res, '请填写合作方名称');
  if (!CATEGORY_VALUES.has(payload.category)) return sendBadRequest(res, '合作方分类无效');
  if (!isSafePartnerUrl(payload.logoUrl)) return sendBadRequest(res, 'Logo 地址无效');
  if (!isSafePartnerUrl(payload.darkLogoUrl)) return sendBadRequest(res, '深色 Logo 地址无效');
  if (!isSafePartnerUrl(payload.linkUrl)) return sendBadRequest(res, '链接地址无效');
  return null;
};

const createAuditLog = async (db, adminId, resourceId, action, reason = null) => {
  if (!adminId) return;
  try {
    await db.run(
      'INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'ecosystem_partners', resourceId, action, reason],
    );
  } catch (error) {
    console.warn('[EcosystemPartner] audit log skipped:', error.message);
  }
};

const listPublicPartners = async (_req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT *
      FROM ecosystem_partners
      WHERE deleted_at IS NULL
        AND enabled = 1
        AND featured = 1
      ORDER BY
        CASE category
          WHEN 'school' THEN 1
          WHEN 'organization' THEN 2
          WHEN 'enterprise' THEN 3
          ELSE 4
        END,
        sort_order ASC,
        id ASC
    `);
    res.setHeader('Cache-Control', 'no-store');
    return res.json(rows.map(serializePartner));
  } catch (error) {
    return next(error);
  }
};

const listAdminPartners = async (req, res, next) => {
  try {
    const db = await getDb();
    const category = normalizeCategory(req.query.category, '');
    const clauses = ['deleted_at IS NULL'];
    const params = [];
    if (category) {
      clauses.push('category = ?');
      params.push(category);
    }

    const rows = await db.all(
      `SELECT *
       FROM ecosystem_partners
       WHERE ${clauses.join(' AND ')}
       ORDER BY
         CASE category
           WHEN 'school' THEN 1
           WHEN 'organization' THEN 2
           WHEN 'enterprise' THEN 3
           ELSE 4
         END,
         sort_order ASC,
         id ASC`,
      params,
    );
    return res.json(rows.map(serializePartner));
  } catch (error) {
    return next(error);
  }
};

const createPartner = async (req, res, next) => {
  try {
    const db = await getDb();
    const payload = readPartnerBody(req.body);
    if (validatePartnerPayload(payload, res)) return;

    const result = await db.run(
      `INSERT INTO ecosystem_partners (
        category, name, description, logo_url, dark_logo_url, link_url,
        sort_order, enabled, featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        payload.category,
        payload.name,
        payload.description,
        payload.logoUrl,
        payload.darkLogoUrl,
        payload.linkUrl,
        payload.sortOrder,
        payload.enabled,
        payload.featured,
      ],
    );

    await createAuditLog(db, req.user?.id, result.lastID, 'create');
    const row = await db.get('SELECT * FROM ecosystem_partners WHERE id = ?', [result.lastID]);
    return res.status(201).json(serializePartner(row));
  } catch (error) {
    return next(error);
  }
};

const updatePartner = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await db.get(
      'SELECT * FROM ecosystem_partners WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    if (!existing) return res.status(404).json({ error: '合作方不存在' });

    const payload = readPartnerBody(req.body, existing);
    if (validatePartnerPayload(payload, res)) return;

    await db.run(
      `UPDATE ecosystem_partners
       SET category = ?,
           name = ?,
           description = ?,
           logo_url = ?,
           dark_logo_url = ?,
           link_url = ?,
           sort_order = ?,
           enabled = ?,
           featured = ?,
           updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [
        payload.category,
        payload.name,
        payload.description,
        payload.logoUrl,
        payload.darkLogoUrl,
        payload.linkUrl,
        payload.sortOrder,
        payload.enabled,
        payload.featured,
        id,
      ],
    );

    await createAuditLog(db, req.user?.id, id, 'update');
    const row = await db.get('SELECT * FROM ecosystem_partners WHERE id = ?', [id]);
    return res.json(serializePartner(row));
  } catch (error) {
    return next(error);
  }
};

const deletePartner = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await db.get(
      'SELECT id FROM ecosystem_partners WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    if (!existing) return res.status(404).json({ error: '合作方不存在' });

    await db.run(
      'UPDATE ecosystem_partners SET deleted_at = datetime("now"), updated_at = datetime("now") WHERE id = ?',
      [id],
    );
    await createAuditLog(db, req.user?.id, id, 'soft_delete');
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listPublicPartners,
  listAdminPartners,
  createPartner,
  updatePartner,
  deletePartner,
};
