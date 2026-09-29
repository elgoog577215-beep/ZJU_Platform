// Read only explicitly linked, approved media. Keep source identities distinct.
async function getCompetitionMediaFeed(
    db,
    competitionId,
    { type = "photos", offset = 0, limit = 36, category = "" } = {}
) {
    const video = type === "videos";
    const table = video ? "videos" : "photos";
    const resourceType = video ? "video" : "photo";
    const mediaType = video ? "promo_video" : "stage_photo";
    const url = video ? "m.video" : "m.url";
    const cover = video ? "m.thumbnail" : "m.url";
    const union = `SELECT '${table}' AS source_table, m.id AS source_id, m.title,
        ${url} AS url, ${cover} AS cover_url, COALESCE(mc.name, '') AS category_name,
        m.created_at
        FROM competition_media_links l JOIN ${table} m ON m.id=l.resource_id
        LEFT JOIN media_categories mc ON mc.id=m.category_id
        WHERE l.competition_id=? AND l.resource_type=? AND m.status='approved' AND m.deleted_at IS NULL
        UNION ALL
        SELECT 'competition_media', id, title, url, cover_url, '', created_at
        FROM competition_media WHERE competition_id=? AND type=? AND status='approved' AND deleted_at IS NULL`;
    const bindings = [competitionId, resourceType, competitionId, mediaType];
    const filter = category ? " WHERE category_name=?" : "";
    const params = category ? [...bindings, category] : bindings;
    const [rows, count, categories] = await Promise.all([
        db.all(
            `SELECT * FROM (${union})${filter} ORDER BY datetime(created_at) DESC, source_table ASC, source_id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        ),
        db.get(`SELECT COUNT(*) AS total FROM (${union})${filter}`, params),
        db.all(
            `SELECT DISTINCT category_name FROM (${union}) WHERE category_name <> '' ORDER BY category_name`,
            bindings
        ),
    ]);
    return {
        items: rows.map((row) => ({ ...row, id: `${row.source_table}-${row.source_id}` })),
        total: count.total,
        offset,
        limit,
        hasMore: offset + rows.length < count.total,
        categories: categories.map((row) => row.category_name),
    };
}
module.exports = { getCompetitionMediaFeed };
