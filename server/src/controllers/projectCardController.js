const { getDb } = require("../config/db");
const { renderProjectShareCard } = require("../services/projectShareCardService");

const PROGRESS = new Set(["idea", "dev", "live", "pause"]);
const MAX_TAGS = 12;

const normalizeCompetitionSlug = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);

const parseArr = (raw) => {
    try {
        const v = JSON.parse(raw || "[]");
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
};

const cleanTags = (input) => {
    const arr = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
    return arr
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, MAX_TAGS);
};

const cleanImages = (input) => {
    const arr = Array.isArray(input) ? input : [];
    return arr
        .map((u) => String(u).trim())
        .filter((u) => u.startsWith("/uploads/"))
        .slice(0, 9);
};

// Serialize a row for API output. Contact fields are login-gated.
const serialize = (row, { viewer, includeContact = true } = {}) => {
    const loggedIn = Boolean(viewer);
    const base = {
        id: row.id,
        user_id: row.user_id,
        owner_name: row.owner_name || null,
        owner_avatar: row.owner_avatar || null,
        title: row.title,
        intro: row.intro,
        content: row.content,
        progress: row.progress,
        need_tags: parseArr(row.need_tags),
        tech_tags: parseArr(row.tech_tags),
        repo_url: row.repo_url,
        cover_url: row.cover_url,
        images: parseArr(row.images_json),
        status: row.status,
        likes: row.likes,
        views: row.views,
        created_at: row.created_at,
        updated_at: row.updated_at,
        competitions: Array.isArray(row.competitions) ? row.competitions : [],
    };
    if (!includeContact) return base;
    // Contact only visible to logged-in viewers (privacy: anti-scrape).
    return {
        ...base,
        contact_locked: !loggedIn,
        contact_wechat: loggedIn ? row.contact_wechat || null : null,
        contact_email: loggedIn ? row.contact_email || null : null,
    };
};

const loadCompetitionSummaries = async (db, projectIds) => {
    const ids = [...new Set(projectIds.map((id) => Number(id)).filter(Number.isFinite))];
    if (ids.length === 0) return new Map();
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db.all(
        `SELECT cw.project_id,
                cw.id AS work_id,
                cw.award,
                cw.rank,
                c.slug,
                c.title,
                c.event_date
           FROM competition_works cw
           JOIN competitions c ON c.id = cw.competition_id
          WHERE cw.project_id IN (${placeholders})
            AND cw.status = 'approved'
            AND COALESCE(cw.public_consent, 1) = 1
            AND cw.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND c.status != 'draft'
          ORDER BY COALESCE(c.event_date, c.created_at) DESC, cw.id DESC`,
        ids
    );
    const grouped = new Map(ids.map((id) => [id, []]));
    rows.forEach((row) => {
        grouped.get(Number(row.project_id))?.push({
            work_id: row.work_id,
            slug: row.slug,
            title: row.title,
            event_date: row.event_date,
            award: row.award || null,
            rank: row.rank || null,
        });
    });
    return grouped;
};

const attachCompetitionSummaries = async (db, rows) => {
    const summaries = await loadCompetitionSummaries(
        db,
        rows.map((row) => row.id)
    );
    return rows.map((row) => ({ ...row, competitions: summaries.get(Number(row.id)) || [] }));
};

const serializeLegacyCompetitionWork = (row) => ({
    id: `competition-work-${row.id}`,
    source_type: "competition_work",
    work_id: row.id,
    user_id: row.uploader_id || null,
    owner_name: row.author || row.uploader_name || null,
    owner_avatar: null,
    title: row.title,
    intro: row.summary || null,
    content: row.experience || row.summary || null,
    progress: "live",
    need_tags: [],
    tech_tags: [],
    repo_url: row.git_url || null,
    cover_url: row.cover_url || null,
    images: row.cover_url ? [row.cover_url] : [],
    status: "published",
    likes: 0,
    views: 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    competitions: [
        {
            work_id: row.id,
            slug: row.competition_slug,
            title: row.competition_title,
            event_date: row.event_date,
            award: row.award || null,
            rank: row.rank || null,
        },
    ],
});

const validate = (body) => {
    if (!body.title || !String(body.title).trim()) return "项目名称必填";
    if (String(body.title).trim().length > 40) return "项目名称过长";
    if (body.progress && !PROGRESS.has(body.progress)) return "进度取值非法";
    if (body.repo_url && !/^https:\/\//i.test(String(body.repo_url)))
        return "仓库链接需为 https 链接";
    return null;
};

const buildWriteFields = (body) => {
    const images = cleanImages(body.images);
    return {
        title: String(body.title).trim(),
        intro: body.intro ? String(body.intro).trim().slice(0, 80) : null,
        content: body.content ? String(body.content) : null,
        progress: PROGRESS.has(body.progress) ? body.progress : "idea",
        need_tags: JSON.stringify(cleanTags(body.need_tags)),
        tech_tags: JSON.stringify(cleanTags(body.tech_tags)),
        repo_url: body.repo_url ? String(body.repo_url).trim() : null,
        contact_wechat: body.contact_wechat
            ? String(body.contact_wechat).trim().slice(0, 60)
            : null,
        contact_email: body.contact_email ? String(body.contact_email).trim().slice(0, 120) : null,
        cover_url: images[0] || null,
        images_json: JSON.stringify(images),
        status: body.status === "draft" ? "draft" : "published",
    };
};

// POST /api/projects
const createProject = async (req, res, next) => {
    try {
        const err = validate(req.body);
        if (err) return res.status(400).json({ error: err });
        const db = await getDb();
        const f = buildWriteFields(req.body);
        const result = await db.run(
            `INSERT INTO project_cards
        (user_id, title, intro, content, progress, need_tags, tech_tags, repo_url,
         contact_wechat, contact_email, cover_url, images_json, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                req.user.id,
                f.title,
                f.intro,
                f.content,
                f.progress,
                f.need_tags,
                f.tech_tags,
                f.repo_url,
                f.contact_wechat,
                f.contact_email,
                f.cover_url,
                f.images_json,
                f.status,
            ]
        );
        const row = await db.get("SELECT * FROM project_cards WHERE id = ?", [result.lastID]);
        res.status(201).json(serialize(row, { viewer: req.user.id }));
    } catch (error) {
        next(error);
    }
};

// PUT /api/projects/:id  (owner only)
const updateProject = async (req, res, next) => {
    try {
        const db = await getDb();
        const row = await db.get("SELECT * FROM project_cards WHERE id = ?", [req.params.id]);
        if (!row) return res.status(404).json({ error: "项目不存在" });
        if (String(row.user_id) !== String(req.user.id) && req.user.role !== "admin") {
            return res.status(403).json({ error: "无权修改此项目" });
        }
        const err = validate({ ...row, ...req.body });
        if (err) return res.status(400).json({ error: err });
        const f = buildWriteFields({
            ...row,
            ...req.body,
            images: req.body.images ?? parseArr(row.images_json),
        });
        await db.run(
            `UPDATE project_cards SET
        title=?, intro=?, content=?, progress=?, need_tags=?, tech_tags=?, repo_url=?,
        contact_wechat=?, contact_email=?, cover_url=?, images_json=?, status=?,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
            [
                f.title,
                f.intro,
                f.content,
                f.progress,
                f.need_tags,
                f.tech_tags,
                f.repo_url,
                f.contact_wechat,
                f.contact_email,
                f.cover_url,
                f.images_json,
                f.status,
                req.params.id,
            ]
        );
        const updated = await db.get("SELECT * FROM project_cards WHERE id = ?", [req.params.id]);
        res.json(serialize(updated, { viewer: req.user.id }));
    } catch (error) {
        next(error);
    }
};

// DELETE /api/projects/:id  (owner only)
const deleteProject = async (req, res, next) => {
    try {
        const db = await getDb();
        const row = await db.get("SELECT user_id FROM project_cards WHERE id = ?", [req.params.id]);
        if (!row) return res.status(404).json({ error: "项目不存在" });
        if (String(row.user_id) !== String(req.user.id) && req.user.role !== "admin") {
            return res.status(403).json({ error: "无权删除此项目" });
        }
        await db.run("DELETE FROM project_cards WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// GET /api/projects  (public list; only published)
const listProjects = async (req, res, next) => {
    try {
        const db = await getDb();
        const { q, progress, need } = req.query;
        const mine = req.query.mine === "1" || req.query.mine === "true";
        if (mine && !req.user) return res.status(401).json({ error: "请先登录" });
        const requestedCompetition = normalizeCompetitionSlug(req.query.competition);
        const competition = requestedCompetition
            ? await db.get(
                  `SELECT c.id, c.slug, c.title, c.subtitle, c.description, c.event_date,
                          c.cover_image, c.is_featured, c.status,
                          (
                              SELECT COUNT(*)
                                FROM competition_works cw
                               WHERE cw.competition_id = c.id
                                 AND cw.status = 'approved'
                                 AND COALESCE(cw.public_consent, 1) = 1
                                 AND cw.deleted_at IS NULL
                          ) AS approved_project_count
                     FROM competitions c
                    WHERE c.slug = ? AND c.status != 'draft' AND c.deleted_at IS NULL`,
                  [requestedCompetition]
              )
            : null;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 24));
        const offset = (page - 1) * limit;

        const where = [mine ? "p.user_id = ? AND p.status != 'removed'" : "p.status = 'published'"];
        const params = [];
        if (mine) params.push(req.user.id);
        if (competition) {
            where.push(
                `EXISTS (
                    SELECT 1
                      FROM competition_works cw
                     WHERE cw.project_id = p.id
                       AND cw.competition_id = ?
                       AND cw.status = 'approved'
                       AND COALESCE(cw.public_consent, 1) = 1
                       AND cw.deleted_at IS NULL
                )`
            );
            params.push(competition.id);
        }
        if (progress && PROGRESS.has(progress)) {
            where.push("p.progress = ?");
            params.push(progress);
        }
        if (need) {
            where.push("p.need_tags LIKE ?");
            params.push(`%"${need}"%`);
        }
        if (q) {
            where.push(
                "(p.title LIKE ? OR p.tech_tags LIKE ? OR COALESCE(NULLIF(u.nickname, ''), u.username) LIKE ?)"
            );
            const like = `%${q}%`;
            params.push(like, like, like);
        }
        const whereSql = where.join(" AND ");

        const totalRow = await db.get(
            `SELECT COUNT(*) AS n FROM project_cards p LEFT JOIN users u ON u.id = p.user_id WHERE ${whereSql}`,
            params
        );
        const fetchLimit = competition && !mine ? limit + offset : limit;
        const rows = await db.all(
            `SELECT p.*, COALESCE(NULLIF(u.nickname, ''), u.username) AS owner_name, u.avatar AS owner_avatar
         FROM project_cards p LEFT JOIN users u ON u.id = p.user_id
        WHERE ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
            [...params, fetchLimit, competition && !mine ? 0 : offset]
        );
        const rowsWithCompetitions = await attachCompetitionSummaries(db, rows);
        const legacyWorkRows =
            competition && !mine && !need && (!progress || progress === "live")
                ? await db.all(
                      `SELECT cw.*, COUNT(*) OVER() AS legacy_total,
                              c.slug AS competition_slug, c.title AS competition_title,
                              c.event_date, COALESCE(u.nickname, u.username) AS uploader_name
                         FROM competition_works cw
                         JOIN competitions c ON c.id = cw.competition_id
                         LEFT JOIN users u ON u.id = cw.uploader_id
                        WHERE cw.competition_id = ?
                          AND cw.status = 'approved'
                          AND COALESCE(cw.public_consent, 1) = 1
                          AND cw.deleted_at IS NULL
                          AND NOT EXISTS (
                              SELECT 1 FROM project_cards p
                               WHERE p.id = cw.project_id AND p.status = 'published'
                          )
                          AND (? = '' OR cw.title LIKE ? OR cw.author LIKE ? OR cw.summary LIKE ?)
                        ORDER BY cw.created_at DESC, cw.id DESC
                        LIMIT ?`,
                      [
                          competition.id,
                          String(q || "").trim(),
                          `%${String(q || "").trim()}%`,
                          `%${String(q || "").trim()}%`,
                          `%${String(q || "").trim()}%`,
                          fetchLimit,
                      ]
                  )
                : [];
        const publicItems = [
            ...rowsWithCompetitions.map((row) => serialize(row, { includeContact: false })),
            ...legacyWorkRows.map(serializeLegacyCompetitionWork),
        ];
        const pagedItems =
            competition && !mine
                ? publicItems
                      .sort((left, right) =>
                          String(right.created_at || "").localeCompare(
                              String(left.created_at || "")
                          )
                      )
                      .slice(offset, offset + limit)
                : publicItems;
        const legacyTotal = Number(legacyWorkRows[0]?.legacy_total || 0);
        const total = Number(totalRow?.n || 0) + legacyTotal;
        res.json({
            items: pagedItems,
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            competition: competition
                ? { ...competition, is_featured: Boolean(competition.is_featured) }
                : null,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/projects  (admin list; includes drafts, removals and report signals)
const listAdminProjects = async (req, res, next) => {
    try {
        const db = await getDb();
        const { q, progress } = req.query;
        const status = ["published", "draft", "removed"].includes(req.query.status)
            ? req.query.status
            : "all";
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
        const offset = (page - 1) * limit;
        const where = ["1 = 1"];
        const params = [];

        if (status !== "all") {
            where.push("p.status = ?");
            params.push(status);
        }
        if (progress && PROGRESS.has(progress)) {
            where.push("p.progress = ?");
            params.push(progress);
        }
        if (q) {
            where.push(
                "(p.title LIKE ? OR p.tech_tags LIKE ? OR COALESCE(NULLIF(u.nickname, ''), u.username) LIKE ?)"
            );
            const like = `%${q}%`;
            params.push(like, like, like);
        }

        const whereSql = where.join(" AND ");
        const totalRow = await db.get(
            `SELECT COUNT(*) AS n
               FROM project_cards p
               LEFT JOIN users u ON u.id = p.user_id
              WHERE ${whereSql}`,
            params
        );
        const rows = await db.all(
            `SELECT p.*,
                    COALESCE(NULLIF(u.nickname, ''), u.username) AS owner_name,
                    (SELECT COUNT(*) FROM project_reports r WHERE r.project_id = p.id) AS report_count,
                    (SELECT r.reason FROM project_reports r
                      WHERE r.project_id = p.id
                      ORDER BY r.created_at DESC, r.id DESC LIMIT 1) AS latest_report_reason,
                    (SELECT GROUP_CONCAT(DISTINCT pr.display_name)
                       FROM profiles pr
                       LEFT JOIN profile_members pm ON pm.profile_id = pr.id
                      WHERE pr.deleted_at IS NULL
                        AND pr.status = 'active'
                        AND (pr.owner_user_id = p.user_id OR (pm.user_id = p.user_id AND pm.status = 'active'))
                    ) AS owner_profiles
               FROM project_cards p
               LEFT JOIN users u ON u.id = p.user_id
              WHERE ${whereSql}
              ORDER BY report_count DESC, p.updated_at DESC, p.id DESC
              LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            items: rows.map((row) => ({
                ...serialize(row, { viewer: req.user.id }),
                owner_profiles: String(row.owner_profiles || "")
                    .split(",")
                    .map((name) => name.trim())
                    .filter(Boolean),
                report_count: Number(row.report_count || 0),
                latest_report_reason: row.latest_report_reason || null,
            })),
            page,
            limit,
            total: totalRow?.n || 0,
            totalPages: Math.max(1, Math.ceil((totalRow?.n || 0) / limit)),
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/projects/:id  (detail; contact login-gated; views++)
const getProject = async (req, res, next) => {
    try {
        const db = await getDb();
        const row = await db.get(
            `SELECT p.*, COALESCE(NULLIF(u.nickname, ''), u.username) AS owner_name, u.avatar AS owner_avatar
         FROM project_cards p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
            [req.params.id]
        );
        if (!row || row.status === "removed") return res.status(404).json({ error: "项目不存在" });
        const isOwner = req.user && String(req.user.id) === String(row.user_id);
        if (row.status === "draft" && !isOwner && req.user?.role !== "admin") {
            return res.status(404).json({ error: "项目不存在" });
        }
        await db.run("UPDATE project_cards SET views = views + 1 WHERE id = ?", [req.params.id]);
        const [withCompetitions] = await attachCompetitionSummaries(db, [
            { ...row, views: row.views + 1 },
        ]);
        res.json(serialize(withCompetitions, { viewer: req.user?.id }));
    } catch (error) {
        next(error);
    }
};

// GET /api/projects/:id/share-card.png (public 5:4 mini program share image)
const getProjectShareCard = async (req, res, next) => {
    try {
        const db = await getDb();
        const row = await db.get(
            `SELECT p.*,
                    c.title AS event_title,
                    cw.award AS event_award,
                    cw.rank AS event_rank
               FROM project_cards p
               LEFT JOIN competition_works cw
                 ON cw.id = (
                    SELECT work.id
                      FROM competition_works work
                      JOIN competitions event ON event.id = work.competition_id
                     WHERE work.project_id = p.id
                       AND work.status = 'approved'
                       AND COALESCE(work.public_consent, 1) = 1
                       AND work.deleted_at IS NULL
                       AND event.deleted_at IS NULL
                       AND event.status != 'draft'
                     ORDER BY COALESCE(event.event_date, event.created_at) DESC, work.id DESC
                     LIMIT 1
                 )
               LEFT JOIN competitions c ON c.id = cw.competition_id
              WHERE p.id = ? AND p.status = 'published'`,
            [req.params.id]
        );
        if (!row) return res.status(404).json({ error: "项目不存在" });
        const image = await renderProjectShareCard(row);
        res.set({
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
            "X-Content-Type-Options": "nosniff",
        });
        return res.send(image);
    } catch (error) {
        return next(error);
    }
};

// POST /api/projects/:id/report
const reportProject = async (req, res, next) => {
    try {
        const db = await getDb();
        const row = await db.get("SELECT id FROM project_cards WHERE id = ?", [req.params.id]);
        if (!row) return res.status(404).json({ error: "项目不存在" });
        await db.run(
            "INSERT INTO project_reports (project_id, reporter_id, reason) VALUES (?, ?, ?)",
            [
                req.params.id,
                req.user.id,
                req.body.reason ? String(req.body.reason).slice(0, 500) : null,
            ]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/projects/:id/takedown  (admin)
const takedownProject = async (req, res, next) => {
    try {
        const db = await getDb();
        const result = await db.run(`UPDATE project_cards SET status = 'removed' WHERE id = ?`, [
            req.params.id,
        ]);
        if (!result.changes) return res.status(404).json({ error: "项目不存在" });
        await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.user.id,
                "project_cards",
                req.params.id,
                "takedown",
                req.body?.reason ? String(req.body.reason).slice(0, 500) : "Admin removed project",
            ]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/projects/:id/restore  (admin)
const restoreProject = async (req, res, next) => {
    try {
        const db = await getDb();
        const result = await db.run(
            `UPDATE project_cards SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [req.params.id]
        );
        if (!result.changes) return res.status(404).json({ error: "项目不存在" });
        await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, "project_cards", req.params.id, "restore", "Admin restored project"]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProject,
    updateProject,
    deleteProject,
    listProjects,
    listAdminProjects,
    getProject,
    getProjectShareCard,
    reportProject,
    takedownProject,
    restoreProject,
};
