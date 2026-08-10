const { getDb } = require("../config/db");
const { renderProjectShareCard } = require("../services/projectShareCardService");

const PROGRESS = new Set(["idea", "dev", "live", "pause"]);
const MAX_TAGS = 12;

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
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 24));
        const offset = (page - 1) * limit;

        const where = [`p.status = 'published'`];
        const params = [];
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
        const rows = await db.all(
            `SELECT p.*, COALESCE(NULLIF(u.nickname, ''), u.username) AS owner_name, u.avatar AS owner_avatar
         FROM project_cards p LEFT JOIN users u ON u.id = p.user_id
        WHERE ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json({
            items: rows.map((r) => serialize(r, { includeContact: false })),
            page,
            limit,
            total: totalRow?.n || 0,
            totalPages: Math.max(1, Math.ceil((totalRow?.n || 0) / limit)),
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
        res.json(serialize({ ...row, views: row.views + 1 }, { viewer: req.user?.id }));
    } catch (error) {
        next(error);
    }
};

// GET /api/projects/:id/share-card.png (public 5:4 mini program share image)
const getProjectShareCard = async (req, res, next) => {
    try {
        const db = await getDb();
        const row = await db.get(
            `SELECT p.* FROM project_cards p WHERE p.id = ? AND p.status = 'published'`,
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
