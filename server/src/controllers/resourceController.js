const { getDb } = require('../config/db');
const { deleteFileFromUrl } = require('../utils/fileUtils');
const { createNotification, fanOutNewContent } = require('./notificationController');
const { normalizeLinkagePayload, serializeLinkageFields, attachLinkedResources } = require('../utils/communityLinks');
const { getEventCategoryFilterTerms, normalizeEventCategory } = require('../services/eventIntelligenceService');

const buildCommaSeparatedMatch = (field, value) => ({
    clause: `("${field}" = ? OR "${field}" LIKE ? OR "${field}" LIKE ? OR "${field}" LIKE ?)`,
    params: [value, `${value},%`, `%,${value}`, `%,${value},%`],
});

const normalizeOrganizerAny = (value) => {
    const source = Array.isArray(value) ? value : String(value || '').split(',');
    const seen = new Set();
    const terms = [];
    for (const item of source) {
        const term = String(item || '').trim().slice(0, 120);
        if (!term || seen.has(term)) continue;
        seen.add(term);
        terms.push(term);
        if (terms.length >= 20) break;
    }
    return terms;
};

const buildOrganizerAnyFilter = (value) => {
    const terms = normalizeOrganizerAny(value);
    if (terms.length === 0) return null;
    return {
        clause: `(${terms.map(() => '"organizer" = ?').join(' OR ')})`,
        params: terms,
    };
};

const buildAllSchoolAudienceMatch = (field) => ({
    clause: `("${field}" = ? OR "${field}" LIKE ? OR "${field}" LIKE ? OR "${field}" LIKE ? OR "${field}" LIKE ? OR "${field}" LIKE ? OR "${field}" LIKE ?)`,
    params: ['全校', '全校,%', '%,全校', '%,全校,%', '%全校%', '%全校师生%', '%全体师生%'],
});

const buildTextContainsMatch = (field, value) => ({
    clause: `("${field}" = ? OR "${field}" LIKE ?)`,
    params: [value, `%${value}%`],
});

const mergeOrFilters = (filters) => ({
    clause: `(${filters.map((filter) => filter.clause).join(' OR ')})`,
    params: filters.flatMap((filter) => filter.params),
});

const isCollegeScopeValue = (value) => (
    /学院|学园|学系|校区|College|School|Department|Institute|Campus/i.test(String(value || ''))
);

const buildEventCollegeScopeFilter = (audience) => {
    const normalized = String(audience || '').trim();
    if (!normalized) return null;

    if (normalized === '全校') {
        return buildAllSchoolAudienceMatch('target_audience');
    }

    const filters = [
        buildCommaSeparatedMatch('target_audience', normalized),
        buildTextContainsMatch('target_audience', normalized),
        buildAllSchoolAudienceMatch('target_audience'),
    ];

    if (isCollegeScopeValue(normalized)) {
        filters.push(
            buildTextContainsMatch('source_college', normalized),
            buildTextContainsMatch('organizer', normalized),
        );
    }

    return mergeOrFilters(filters);
};

const buildEventCategoryFilter = (category) => {
    const normalized = String(category || '').trim();
    if (normalized === 'college_notice' || normalized === '学院通知') {
        return {
            clause: '(is_college_notice = 1 OR tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)',
            params: ['学院通知', '学院通知,%', '%,学院通知', '%,学院通知,%'],
        };
    }

    const terms = getEventCategoryFilterTerms(normalized);
    if (terms.length === 0) return null;

    const categoryClauses = terms.map(() => 'category = ?');
    const tagClauses = terms.map(() => '(tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)');
    const params = [
        ...terms,
        ...terms.flatMap(term => [term, `${term},%`, `%,${term}`, `%,${term},%`]),
    ];

    return {
        clause: `(${[...categoryClauses, ...tagClauses].join(' OR ')})`,
        params,
    };
};

const buildEventSearchFilter = (searchTerm, rawSearch) => {
    const category = normalizeEventCategory(rawSearch);
    if (!category) {
        return {
            clause: '(title LIKE ? OR category LIKE ? OR description LIKE ? OR organizer LIKE ? OR target_audience LIKE ? OR source_college LIKE ?)',
            params: [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
        };
    }

    return {
        clause: '(title LIKE ? OR category LIKE ? OR category = ? OR description LIKE ? OR organizer LIKE ? OR target_audience LIKE ? OR source_college LIKE ?)',
        params: [searchTerm, searchTerm, category, searchTerm, searchTerm, searchTerm, searchTerm],
    };
};

// FIX: O4 — Remove CREATE TABLE from hot path; table should exist from migrations
const processTags = async (tagsString) => {
  if (!tagsString) return;
  try {
    const db = await getDb();
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    for (const tag of tags) {
      await db.run('INSERT OR IGNORE INTO tags (name, count) VALUES (?, 0)', [tag]);
    }
  } catch (e) {
    console.error('Error processing tags:', e);
  }
};

const normalizeEventTags = (tagsString) => {
  if (!tagsString) return '';
  const tags = String(tagsString)
    .split(/[，,;；、\n\t]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return Array.from(new Set(tags)).join(',');
};

const inferCollegeNoticeFlag = (body = {}) => {
  const explicit = body.is_college_notice;
  if (explicit === true || explicit === 1 || explicit === '1' || explicit === 'true') return 1;
  if (explicit === false || explicit === 0 || explicit === '0' || explicit === 'false') return 0;
  return normalizeEventTags(body.tags).split(',').includes('学院通知') ? 1 : 0;
};

const normalizeEventPayload = (body = {}) => {
  body.tags = normalizeEventTags(body.tags);
  body.is_college_notice = inferCollegeNoticeFlag(body);

  if (body.is_college_notice && !body.tags.split(',').includes('学院通知')) {
    body.tags = normalizeEventTags([body.tags, '学院通知'].filter(Boolean).join(','));
  }

  if (!body.is_college_notice) {
    body.notice_type = null;
    body.source_college = null;
    return;
  }

  body.notice_type = String(body.notice_type || '').trim() || 'other';
  body.source_college = String(body.source_college || '').trim();
};

const normalizeArticlePayload = (table, body) => {
  if (!body) return;
  normalizeLinkagePayload(body, { strict: true });
  if (table !== 'articles') return;
  if (body.content_blocks == null) return;

  if (Array.isArray(body.content_blocks)) {
    body.content_blocks = JSON.stringify(body.content_blocks);
    return;
  }

  if (typeof body.content_blocks === 'string') {
    try {
      const parsed = JSON.parse(body.content_blocks);
      if (!Array.isArray(parsed)) {
        body.content_blocks = null;
      }
    } catch (_error) {
      body.content_blocks = null;
    }
    return;
  }

  body.content_blocks = null;
};

const serializeResourceItem = (table, item) => {
  if (!item || typeof item !== 'object') return item;
  return serializeLinkageFields(item);
};

const supportsMediaCategory = (table) => table === 'photos' || table === 'videos';

const normalizeArticleWorkflowStatus = (table, requestedStatus, userRole = 'user') => {
  if (table !== 'articles') return null;
  const normalized = String(requestedStatus || '').trim().toLowerCase();
  if (!normalized) {
    return userRole === 'admin' ? 'approved' : 'pending';
  }
  // Non-admin users can only create drafts or submit for pending review.
  if (userRole !== 'admin') {
    if (normalized === 'draft') return 'draft';
    if (normalized === 'pending') return 'pending';
    return 'pending';
  }
  // Admins can set any workflow status explicitly.
  if (['draft', 'pending', 'approved', 'rejected'].includes(normalized)) {
    return normalized;
  }
  return 'approved';
};

const restoreOwnHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const item = await db.get(`SELECT id, uploader_id, deleted_at FROM ${table} WHERE id = ?`, [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (!item.deleted_at) {
      return res.status(400).json({ error: 'Item is not in trash' });
    }
    if (req.user.role !== 'admin' && item.uploader_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to restore this resource' });
    }

    await db.run(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, [id]);
    res.json({ message: 'Restored successfully' });
  } catch (error) { next(error); }
};

// Helper Factories
const createHandler = (table, fields) => async (req, res, next) => {
  try {
    const db = await getDb();
    normalizeArticlePayload(table, req.body);
    if (table === 'events') {
        normalizeEventPayload(req.body);
    }
    const placeholders = fields.map(() => '?').join(',');
    
    // Determine status based on user role and optional workflow intent.
    const userRole = req.user ? req.user.role : 'user';
    const workflowStatus = normalizeArticleWorkflowStatus(table, req.body.status, userRole);
    const status = workflowStatus || (userRole === 'admin' ? 'approved' : 'pending');
    const uploader_id = req.user ? req.user.id : null;

    const sql = `INSERT INTO ${table} (${fields.join(',')}, status, uploader_id, created_at) VALUES (${placeholders}, ?, ?, datetime('now'))`;
    const values = [...fields.map(field => req.body[field]), status, uploader_id];
    
    const result = await db.run(sql, values);

    // Process tags to ensure they exist in the centralized tags table
    if (req.body.tags) {
        await processTags(req.body.tags);
    }

    // Fan-out new-content notifications to the author's followers.
    // Only for the 5 user-facing resource tables. Community posts are excluded
    // per spec "No Fan-out for Community Posts". Rejected items are skipped so
    // admin moderation does not leak pre-review content.
    //
    // NOTE: Using getSingularType so 'music' stays 'music' (not table.slice(0,-1)
    // which would incorrectly produce 'musi').
    const FANOUT_TABLES = new Set(['photos', 'music', 'videos', 'articles', 'events']);
    if (FANOUT_TABLES.has(table) && status !== 'rejected') {
        await fanOutNewContent({
            authorId: uploader_id,
            resourceType: getSingularType(table),
            resourceId: result.lastID,
            title: req.body.title,
        });
    }

    res.json(serializeResourceItem(table, { id: result.lastID, ...req.body, status, likes: 0 }));
  } catch (error) { next(error); }
};

const updateHandler = (table, fields) => async (req, res, next) => {
  try {
    const db = await getDb();
    normalizeArticlePayload(table, req.body);
    if (table === 'events') {
        normalizeEventPayload(req.body);
    }
    const { id } = req.params;
    
    // Check ownership
    const oldItem = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (!oldItem) {
        return res.status(404).json({ error: 'Item not found' });
    }

    if (req.user.role !== 'admin' && oldItem.uploader_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this resource' });
    }

    // Check for file changes to delete old files
    const fileFields = ['url', 'cover', 'thumbnail', 'image', 'audio', 'video'];
    fileFields.forEach(field => {
    if (req.body[field] && req.body[field] !== oldItem[field]) {
        deleteFileFromUrl(oldItem[field]);
    }
    });

    const setClause = fields.map(field => `${field} = ?`).join(',');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const values = [...fields.map(field => req.body[field]), id];
    await db.run(sql, values);
    
    // Process tags to ensure they exist in the centralized tags table
    if (req.body.tags) {
        await processTags(req.body.tags);
    }

    res.json(serializeResourceItem(table, { id, ...req.body }));
  } catch (error) { next(error); }
};

const deleteHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    // Check ownership
    const item = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }

    if (req.user.role !== 'admin' && item.uploader_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this resource' });
    }

    // Soft delete: Update deleted_at timestamp
    await db.run(`UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ?`, id);
    
    // Audit Log for Admins
    if (req.user.role === 'admin') {
         await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, table, id, 'soft_delete', 'Admin soft deleted resource']
        );
    }

    res.json({ message: 'Moved to trash' });
  } catch (error) { next(error); }
};

const permanentDeleteHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const singularType = getSingularType(table);

    // Delete associated files
    const item = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (item) {

        const fileFields = ['url', 'cover', 'thumbnail', 'image', 'audio', 'video'];
        fileFields.forEach(field => {
            if (item[field]) {

                deleteFileFromUrl(item[field]);
            }
        });
    }

    // FIX: BUG-08 — Wrap cascade deletes in a transaction for data consistency
    try {
      await db.exec('BEGIN TRANSACTION');

      // 1. Delete from favorites
      await db.run(
          'DELETE FROM favorites WHERE item_id = ? AND (item_type = ? OR item_type = ?)',
          [id, singularType, table]
      );

      // 2. Delete from comments
      await db.run(
          'DELETE FROM comments WHERE resource_id = ? AND (resource_type = ? OR resource_type = ?)',
          [id, singularType, table]
      );

      // 3. Delete from notifications
      await db.run(
          'DELETE FROM notifications WHERE related_resource_id = ? AND (related_resource_type = ? OR related_resource_type = ?)',
          [id, singularType, table]
      );

      // 4. Delete from event_registrations (only for events)
      if (table === 'events') {
          await db.run('DELETE FROM event_registrations WHERE event_id = ?', [id]);
      }

      // 5. Delete from table
      await db.run(`DELETE FROM ${table} WHERE id = ?`, id);

      // Audit Log for Admins
      if (req.user.role === 'admin') {
           await db.run(
              `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
              [req.user.id, table, id, 'permanent_delete', 'Admin permanently deleted resource']
          );
      }

      await db.exec('COMMIT');
    } catch (txError) {
      await db.exec('ROLLBACK');
      throw txError;
    }

    res.json({ message: 'Permanently deleted with all associated data' });
  } catch (error) { next(error); }
};

const restoreHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    await db.run(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, id);
    
    // Audit Log for Admins
    if (req.user.role === 'admin') {
         await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, table, id, 'restore', 'Admin restored resource']
        );
    }

    res.json({ message: 'Restored successfully' });
  } catch (error) { next(error); }
};

const getSingularType = (table) => {
    const map = {
        'photos': 'photo',
        'music': 'music',
        'videos': 'video',
        'articles': 'article',
        'events': 'event'
    };
    return map[table] || table.slice(0, -1);
};

const getOneHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const itemType = getSingularType(table);

    let query = `SELECT ${table}.*, COALESCE(u.nickname, u.username) AS author_name, u.avatar AS author_avatar`;
    if (supportsMediaCategory(table)) {
        query += `, (SELECT name FROM media_categories WHERE id = ${table}.category_id) AS category_name`;
    }
    let params = [];

    if (userId) {
         query += `, (SELECT 1 FROM favorites WHERE favorites.item_id = ${table}.id AND favorites.item_type = ? AND favorites.user_id = ?) as favorited`;
         params.push(itemType, userId);
    }

    query += ` FROM ${table} LEFT JOIN users u ON ${table}.uploader_id = u.id WHERE ${table}.id = ?`;
    params.push(id);

    const item = await db.get(query, params);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Access Control: Only admin or owner can see non-approved/deleted items
    if (item.status !== 'approved' || item.deleted_at) {
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && req.user.id === item.uploader_id;
        
        if (!isAdmin && !isOwner) {
             return res.status(403).json({ error: 'Access denied' });
        }
    }

    // Convert favorited to boolean
    if (userId) {
        item.favorited = !!item.favorited;
    }

    if (!userId && item.status === 'approved' && !item.deleted_at) {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }

    if (table === 'articles') {
      const viewer = req.user && req.user.id != null
        ? { id: req.user.id, role: req.user.role || null }
        : null;
      const linkedItem = await attachLinkedResources(db, item, { viewer });
      return res.json(linkedItem);
    }

    res.json(serializeResourceItem(table, item));
  } catch (error) { next(error); }
};

const getAllHandler = (table, defaultLimit = 12) => async (req, res, next) => {
    try {
        const db = await getDb();
        const page = parseInt(req.query.page) || 1;
        // Limit max limit to 100 to prevent DoS
        const limit = Math.min(parseInt(req.query.limit) || defaultLimit, 100);
        const category = req.query.category;
        const rawCategoryId = req.query.category_id || req.query.categoryId;
        const tag = req.query.tag; // For articles
        const requestedStatus = String(req.query.status || 'approved').trim().toLowerCase();
        const requestedUploaderId = req.query.uploader_id ? Number.parseInt(req.query.uploader_id, 10) : null;
        const sort = req.query.sort || 'newest'; // Default to newest
        const search = req.query.search; // Generic search
        const trashed = req.query.trashed === 'true'; // Check if requesting trash
        const offset = (page - 1) * limit;

        const userId = (req.user && req.user.id) ? req.user.id : null;
        const isAdmin = req.user && req.user.role === 'admin';
        const itemType = getSingularType(table);

        let effectiveStatus = requestedStatus;
        let effectiveUploaderId = requestedUploaderId;

        // Non-admin visibility guard:
        // - only approved resources are public
        // - draft/pending/rejected/all are only allowed when querying own uploader_id
        if (!isAdmin) {
            const ownUploaderScope = !!(userId && effectiveUploaderId && Number(userId) === Number(effectiveUploaderId));
            if (effectiveUploaderId && !ownUploaderScope) {
                effectiveUploaderId = null;
            }

            if (['all', 'draft', 'pending', 'rejected'].includes(effectiveStatus)) {
                if (!ownUploaderScope) {
                    effectiveStatus = 'approved';
                }
            }
        }

        let query = `SELECT ${table}.*, COALESCE(u.nickname, u.username) AS author_name, u.avatar AS author_avatar`;
        let params = [];

        if (supportsMediaCategory(table)) {
             query += `, (SELECT name FROM media_categories WHERE id = ${table}.category_id) AS category_name`;
        }

        if (table === 'events') {
             query += `, (SELECT COUNT(*) FROM event_registrations WHERE event_registrations.event_id = events.id) as registration_count`;
        }

        if (userId) {
             query += `, (SELECT 1 FROM favorites WHERE favorites.item_id = ${table}.id AND favorites.item_type = ? AND favorites.user_id = ?) as favorited`;
             params.push(itemType, userId);
        }

        query += ` FROM ${table} LEFT JOIN users u ON ${table}.uploader_id = u.id`;

        let countQuery = `SELECT COUNT(*) as count FROM ${table}`;
        let countParams = [];
        let whereClauses = [];
        
        // Trash Filter
        if (trashed) {
            if (isAdmin) {
                whereClauses.push('deleted_at IS NOT NULL');
            } else if (userId && effectiveUploaderId && Number(userId) === Number(effectiveUploaderId)) {
                whereClauses.push('deleted_at IS NOT NULL');
            } else {
                whereClauses.push('deleted_at IS NULL');
            }
        } else {
            whereClauses.push('deleted_at IS NULL');
        }

        // Generic Search
        if (search && search.trim() !== '') {
            const searchTerm = `%${search}%`;
            if (table === 'events') {
                const eventSearch = buildEventSearchFilter(searchTerm, search);
                whereClauses.push(eventSearch.clause);
                params.push(...eventSearch.params);
                countParams.push(...eventSearch.params);
            } else if (table === 'articles') {
                whereClauses.push('(title LIKE ? OR tags LIKE ? OR excerpt LIKE ? OR content LIKE ?)');
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            } else if (supportsMediaCategory(table)) {
                whereClauses.push(`(title LIKE ? OR tags LIKE ? OR EXISTS (SELECT 1 FROM media_categories mc WHERE mc.id = ${table}.category_id AND mc.name LIKE ?))`);
                params.push(searchTerm, searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm, searchTerm);
            } else {
                whereClauses.push('(title LIKE ? OR tags LIKE ?)');
                params.push(searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm);
            }
        }

        // Filter by status unless asking for 'all'
        if (effectiveStatus !== 'all') {
            whereClauses.push('status = ?');
            params.push(effectiveStatus);
            countParams.push(effectiveStatus);
        }

        if (effectiveUploaderId) {
            whereClauses.push('uploader_id = ?');
            params.push(effectiveUploaderId);
            countParams.push(effectiveUploaderId);
        }

        if (supportsMediaCategory(table) && String(rawCategoryId || '').trim() !== '') {
            const categoryId = Number.parseInt(rawCategoryId, 10);
            if (Number.isFinite(categoryId) && categoryId > 0) {
                whereClauses.push('category_id = ?');
                params.push(categoryId);
                countParams.push(categoryId);
            }
        }

        if (String(category || '').trim() !== '' && (table === 'articles' || table === 'events')) {
            if (table === 'events') {
                const categoryFilter = buildEventCategoryFilter(category);
                if (categoryFilter) {
                    whereClauses.push(categoryFilter.clause);
                    params.push(...categoryFilter.params);
                    countParams.push(...categoryFilter.params);
                }
            } else {
                whereClauses.push('category = ?');
                params.push(category);
                countParams.push(category);
            }
        }

        if (tag && tag !== 'All') {
            const normalizedTag = String(tag).trim();
            if (normalizedTag) {
                whereClauses.push('(tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)');
                const tagParams = [
                    normalizedTag,
                    `${normalizedTag},%`,
                    `%,${normalizedTag}`,
                    `%,${normalizedTag},%`,
                ];
                params.push(...tagParams);
                countParams.push(...tagParams);
            }
        }

        // Dynamic Field Filtering
        if (table === 'events') {
            const filterableFields = ['location', 'organizer', 'target_audience', 'source_college', 'notice_type'];
            filterableFields.forEach(field => {
                if (req.query[field]) {
                    if (field === 'target_audience') {
                        const collegeScopeFilter = buildEventCollegeScopeFilter(req.query[field]);
                        if (collegeScopeFilter) {
                            whereClauses.push(collegeScopeFilter.clause);
                            params.push(...collegeScopeFilter.params);
                            countParams.push(...collegeScopeFilter.params);
                        }
                    } else {
                        whereClauses.push(`"${field}" = ?`);
                        params.push(req.query[field]);
                        countParams.push(req.query[field]);
                    }
                }
            });

            const organizerAnyFilter = buildOrganizerAnyFilter(req.query.organizer_any);
            if (organizerAnyFilter) {
                whereClauses.push(organizerAnyFilter.clause);
                params.push(...organizerAnyFilter.params);
                countParams.push(...organizerAnyFilter.params);
            }
        }
        
        // Tags Search (comma separated for multiple tags OR logic)
        const tagsQuery = req.query.tags;
        if (table !== 'events' && tagsQuery && tagsQuery.trim() !== '') {
             const tagsList = tagsQuery.split(',').map(t => t.trim()).filter(Boolean);
             if (tagsList.length > 0) {
                 // Optimize tag matching to avoid substring matches (e.g. 'art' matching 'smart')
                 const tagConditions = tagsList.map(() => 
                    '(tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)'
                 ).join(' OR ');
                 
                 whereClauses.push(`(${tagConditions})`);
                 
                 tagsList.forEach(tag => {
                     // Exact match
                     params.push(tag);
                     countParams.push(tag);
                     // Start of string
                     params.push(`${tag},%`);
                     countParams.push(`${tag},%`);
                     // End of string
                     params.push(`%,${tag}`);
                     countParams.push(`%,${tag}`);
                     // Middle of string
                     params.push(`%,${tag},%`);
                     countParams.push(`%,${tag},%`);
                 });
             }
        }

        // Lifecycle filter for events
        const lifecycle = req.query.lifecycle;
        if (lifecycle && table === 'events') {
             if (lifecycle === 'upcoming') {
                 whereClauses.push('date > date("now", "localtime")');
             } else if (lifecycle === 'past') {
                 whereClauses.push('date < date("now", "localtime")');
             } else if (lifecycle === 'ongoing') {
                 whereClauses.push('date = date("now", "localtime")');
             }
        }

        if (whereClauses.length > 0) {
            const whereSQL = ' WHERE ' + whereClauses.join(' AND ');
            query += whereSQL;
            countQuery += whereSQL;
        }

        // Sorting Logic
        switch (sort) {
            case 'oldest':
                query += ' ORDER BY id ASC';
                break;
            case 'views':
                if (table === 'events') {
                    query += ' ORDER BY COALESCE(views, 0) DESC, date DESC, id DESC';
                    break;
                }
                query += ' ORDER BY id DESC';
                break;
            case 'registrations':
                if (table === 'events') {
                    query += ' ORDER BY registration_count DESC, date DESC, id DESC';
                    break;
                }
                query += ' ORDER BY id DESC';
                break;
            case 'likes':
                query += ' ORDER BY likes DESC, id DESC';
                break;
            case 'title':
                query += ' ORDER BY title ASC';
                break;
            case 'date_asc':
                query += ' ORDER BY date ASC';
                break;
            case 'date_desc':
                query += ' ORDER BY date DESC';
                break;
            case 'newest':
            default:
                query += ' ORDER BY id DESC';
                break;
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const items = await db.all(query, params);
        const countResult = await db.get(countQuery, countParams);

        // Convert favorited to boolean for all items
        if (userId) {
            items.forEach(item => {
                item.favorited = !!item.favorited;
            });
        }

        if (!userId && effectiveStatus === 'approved' && !trashed && !search && !effectiveUploaderId) {
            res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        }

        res.json({
            data: items.map((item) => serializeResourceItem(table, item)),
            pagination: {
                total: countResult.count,
                page,
                limit,
                totalPages: Math.ceil(countResult.count / limit)
            }
        });
    } catch (error) { next(error); }
}

const updateStatus = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { status, reason } = req.body;
        const adminId = req.user ? req.user.id : null;
        
        if (!['approved', 'pending', 'rejected', 'draft'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update resource status and rejection_reason
        await db.run(`UPDATE ${table} SET status = ?, rejection_reason = ? WHERE id = ?`, [status, reason || null, id]);

        // Get resource details to find uploader
        const resource = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        
        // Add audit log
        if (adminId) {
             await db.run(
                `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
                [adminId, table, id, status, reason || null]
            );
        }

        // Send notification to uploader
        if (resource && resource.uploader_id && resource.uploader_id !== adminId) {
            let notificationContent = '';
            let notificationType = 'system';
            
            if (status === 'approved') {
                notificationContent = `Your ${getSingularType(table)} "${resource.title}" has been approved!`;
                notificationType = 'approval';
            } else if (status === 'rejected') {
                notificationContent = `Your ${getSingularType(table)} "${resource.title}" was rejected. Reason: ${reason || 'No reason provided'}`;
                notificationType = 'rejection';
            }
            
            if (notificationContent) {
                await createNotification(
                    resource.uploader_id,
                    notificationType,
                    notificationContent,
                    id,
                    table
                );
            }
        }

        res.json({ success: true, id, status, reason });
    } catch (error) { next(error); }
};

// Specific Handlers
const getCategories = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const categories = await db.all(`SELECT DISTINCT category FROM ${table}`);
        res.json(categories.map(c => c.category));
    } catch (error) { next(error); }
}

const getDistinctValues = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const { field } = req.params;
        
        // Validate field to prevent SQL injection
        const allowedFields = fields[table];
        if (!allowedFields || !allowedFields.includes(field)) {
             return res.status(400).json({ error: `Invalid field: ${field}` });
        }

        let query = `SELECT DISTINCT "${field}" FROM ${table}`;
        let whereClauses = [];
        let params = [];

        // Always exclude null/empty
        whereClauses.push(`"${field}" IS NOT NULL AND "${field}" != ''`);

        // Apply filters from req.query (similar to getAllHandler)
        const status = req.query.status || 'approved';
        if (status !== 'all') {
            whereClauses.push('status = ?');
            params.push(status);
        }

        // Dynamic Field Filtering for Events
        if (table === 'events') {
            const filterableFields = ['location', 'organizer', 'target_audience', 'source_college', 'notice_type'];
            filterableFields.forEach(f => {
                // Don't filter by the field we are querying distinct values for
                if (f !== field && req.query[f]) {
                    whereClauses.push(`"${f}" = ?`);
                    params.push(req.query[f]);
                }
            });

            // Lifecycle filter
            const lifecycle = req.query.lifecycle;
            if (lifecycle) {
                 if (lifecycle === 'upcoming') {
                     whereClauses.push('date > date("now", "localtime")');
                 } else if (lifecycle === 'past') {
                     whereClauses.push('date < date("now", "localtime")');
                 } else if (lifecycle === 'ongoing') {
                     whereClauses.push('date = date("now", "localtime")');
                 }
            }
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` ORDER BY "${field}" ASC`;

        const values = await db.all(query, params);
        res.json(values.map(v => v[field]));
    } catch (error) { next(error); }
}

const getEventDistinctOptions = async (req, res, next) => {
    try {
        const db = await getDb();
        const status = req.query.status || 'approved';
        const lifecycle = req.query.lifecycle;
        const filterableFields = ['location', 'organizer', 'target_audience', 'source_college', 'notice_type'];

        const buildQueryForField = (field) => {
            const whereClauses = [`"${field}" IS NOT NULL AND "${field}" != ''`];
            const params = [];

            if (status !== 'all') {
                whereClauses.push('status = ?');
                params.push(status);
            }

            filterableFields.forEach((f) => {
                if (f !== field && req.query[f]) {
                    whereClauses.push(`"${f}" = ?`);
                    params.push(req.query[f]);
                }
            });

            if (lifecycle === 'upcoming') {
                whereClauses.push('date > date("now", "localtime")');
            } else if (lifecycle === 'past') {
                whereClauses.push('date < date("now", "localtime")');
            } else if (lifecycle === 'ongoing') {
                whereClauses.push('date = date("now", "localtime")');
            }

            const whereSQL = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
            const query = `SELECT DISTINCT "${field}" FROM events${whereSQL} ORDER BY "${field}" ASC`;
            return { query, params };
        };

        const [locationRows, organizerRows, audienceRows, sourceCollegeRows, noticeTypeRows] = await Promise.all(
            filterableFields.map((field) => {
                const { query, params } = buildQueryForField(field);
                return db.all(query, params);
            })
        );

        res.json({
            location: locationRows.map((row) => row.location),
            organizer: organizerRows.map((row) => row.organizer),
            target_audience: audienceRows.map((row) => row.target_audience),
            source_college: sourceCollegeRows.map((row) => row.source_college),
            notice_type: noticeTypeRows.map((row) => row.notice_type)
        });
    } catch (error) { next(error); }
}

// Fields Definitions
const fields = {
    photos: ['url', 'title', 'tags', 'category_id', 'size', 'gameType', 'gameDescription', 'featured'],
    music: ['title', 'artist', 'duration', 'cover', 'audio', 'featured', 'tags'],
    videos: ['title', 'tags', 'category_id', 'thumbnail', 'video', 'gameType', 'gameDescription', 'featured'],
    articles: ['title', 'date', 'excerpt', 'tags', 'content', 'content_blocks', 'cover', 'featured', 'category', 'related_article_ids', 'related_post_ids', 'related_news_ids', 'related_group_ids'],
    events: ['title', 'date', 'end_date', 'location', 'tags', 'image', 'description', 'content', 'link', 'featured', 'score', 'target_audience', 'organizer', 'volunteer_time', 'category', 'is_college_notice', 'notice_type', 'source_college']
};

const getRelatedHandler = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 6;
        
        const item = await db.get(`SELECT tags, category FROM ${table} WHERE id = ?`, id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        let whereClauses = [`id != ?`, `status = 'approved'`, `deleted_at IS NULL`];
        let params = [id];
        
        if (table === 'events') {
            if (item.category) {
                whereClauses.push('category = ?');
                params.push(item.category);
            }
        } else if (item.tags) {
            const tags = item.tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tags.length > 0) {
                 const tagConditions = tags.map(() => 
                    '(tags LIKE ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)'
                 ).join(' OR ');
                 
                 whereClauses.push(`(${tagConditions})`);
                 
                 tags.forEach(tag => {
                     params.push(tag);
                     params.push(`${tag},%`);
                     params.push(`%,${tag}`);
                     params.push(`%,${tag},%`);
                 });
            } else if (item.category) {
                 whereClauses.push('category = ?');
                 params.push(item.category);
            }
        } else if (item.category) {
             whereClauses.push('category = ?');
             params.push(item.category);
        }

        const whereSQL = ' WHERE ' + whereClauses.join(' AND ');
        const query = `SELECT * FROM ${table} ${whereSQL} ORDER BY RANDOM() LIMIT ?`;
        params.push(limit);

        const related = await db.all(query, params);
        res.json(related);
    } catch (error) { next(error); }
}

module.exports = {
    createHandler,
    updateHandler,
    deleteHandler,
    permanentDeleteHandler,
    restoreHandler,
    restoreOwnHandler,
    getAllHandler,
    getOneHandler,
    getRelatedHandler,
    getDistinctValues,
    getEventDistinctOptions,
    updateStatus,
    fields,
    _test: {
        buildEventCollegeScopeFilter,
    },
};
