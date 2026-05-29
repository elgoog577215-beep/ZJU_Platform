const { getDb } = require('../config/db');

const normalizeStatus = (value) => {
  const status = String(value || 'active').trim().toLowerCase();
  return status === 'inactive' ? 'inactive' : 'active';
};

const normalizeSortOrder = (value) => {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : 0;
};

const serializeCategory = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  sort_order: Number(row.sort_order || 0),
  status: row.status || 'active',
  photo_count: Number(row.photo_count || 0),
  video_count: Number(row.video_count || 0),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const categorySelect = `
  SELECT mc.*,
    (SELECT COUNT(*) FROM photos p WHERE p.category_id = mc.id AND p.deleted_at IS NULL) AS photo_count,
    (SELECT COUNT(*) FROM videos v WHERE v.category_id = mc.id AND v.deleted_at IS NULL) AS video_count
  FROM media_categories mc
`;

const listPublicCategories = async (_req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `${categorySelect}
       WHERE mc.deleted_at IS NULL AND mc.status = 'active'
       ORDER BY mc.sort_order ASC, mc.id ASC`,
    );
    res.json(rows.map(serializeCategory));
  } catch (error) {
    next(error);
  }
};

const listAdminCategories = async (_req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `${categorySelect}
       WHERE mc.deleted_at IS NULL
       ORDER BY mc.sort_order ASC, mc.id ASC`,
    );
    res.json(rows.map(serializeCategory));
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const db = await getDb();
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const duplicate = await db.get(
      'SELECT id FROM media_categories WHERE deleted_at IS NULL AND LOWER(name) = LOWER(?)',
      [name],
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const description = String(req.body?.description || '').trim();
    const sortOrder = normalizeSortOrder(req.body?.sort_order);
    const status = normalizeStatus(req.body?.status);
    const result = await db.run(
      `INSERT INTO media_categories (name, description, sort_order, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [name, description, sortOrder, status],
    );

    const row = await db.get(`${categorySelect} WHERE mc.id = ?`, [result.lastID]);
    res.json(serializeCategory(row));
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const existing = await db.get(
      'SELECT * FROM media_categories WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const name = String(req.body?.name ?? existing.name).trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const duplicate = await db.get(
      'SELECT id FROM media_categories WHERE deleted_at IS NULL AND LOWER(name) = LOWER(?) AND id != ?',
      [name, id],
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const description = String(req.body?.description ?? existing.description ?? '').trim();
    const sortOrder = normalizeSortOrder(req.body?.sort_order ?? existing.sort_order);
    const status = normalizeStatus(req.body?.status ?? existing.status);

    await db.run(
      `UPDATE media_categories
       SET name = ?, description = ?, sort_order = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, description, sortOrder, status, id],
    );

    const row = await db.get(`${categorySelect} WHERE mc.id = ?`, [id]);
    res.json(serializeCategory(row));
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const existing = await db.get(
      'SELECT id FROM media_categories WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await db.run(
      `UPDATE media_categories
       SET deleted_at = datetime('now'), status = 'inactive', updated_at = datetime('now')
       WHERE id = ?`,
      [id],
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPublicCategories,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
