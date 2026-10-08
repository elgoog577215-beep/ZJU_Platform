const { withProfileWrite, listProfileWorks, safeUrl } = require("../services/profileHomeService");
const { getDb } = require("../config/db");

const PROFILE_STATUSES = new Set([
    "",
    "open_chat",
    "seeking_collab",
    "coffee_chat",
    "team_up",
    "joining_events",
    "busy",
]);

const SOCIAL_PLATFORMS = new Set([
    "wechat",
    "github",
    "twitter",
    "xiaohongshu",
    "bilibili",
    "email",
    "website",
    "zhihu",
    "linkedin",
    "custom",
]);

const PROFILE_CARD_TYPES = new Set([
    "text",
    "image",
    "heading",
    "link",
    "project",
    "work",
    "article",
    "event",
    "experience",
    "resource",
    "social",
    "other",
]);

const PROFILE_CARD_ASPECT_RATIOS = new Set([
    "square",
    "landscape",
    "portrait",
    "wide",
    "vertical",
    "large",
    "tall",
]);

const trimText = (value, maxLength = 500) => {
    if (value === undefined || value === null) return "";
    return String(value).trim().slice(0, maxLength);
};

const toVisibleInt = (value) => (value === false || value === 0 || value === "0" ? 0 : 1);

const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
};

const parseJsonArray = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const serializeTag = (row) => ({
    id: row.id,
    label: row.label,
    sort_order: Number(row.sort_order) || 0,
});

const serializeSocialLink = (row) => ({
    id: row.id,
    platform: row.platform,
    label: row.label || "",
    url: row.url,
    sort_order: Number(row.sort_order) || 0,
    is_visible: Boolean(row.is_visible),
});

const serializeProfileCard = (row) => {
    const cropWidth = clampNumber(row.crop_width, 0.05, 1, 1);
    const cropHeight = clampNumber(row.crop_height, 0.05, 1, 1);
    return {
        id: row.id,
        source_type: row.source_type || null,
        source_id: row.source_id || null,
        title: row.title || "",
        body: row.body || "",
        note: row.note || "",
        card_type: row.card_type || "other",
        custom_type: row.custom_type || "",
        cover_url: row.cover_url || parseJsonArray(row.images_json)[0] || "",
        description: row.description || row.note || row.body || "",
        link_url: row.link_url || parseJsonArray(row.links_json)[0]?.url || "",
        crop_x: clampNumber(row.crop_x, 0, 1 - cropWidth, 0),
        crop_y: clampNumber(row.crop_y, 0, 1 - cropHeight, 0),
        crop_width: cropWidth,
        crop_height: cropHeight,
        aspect_ratio: PROFILE_CARD_ASPECT_RATIOS.has(row.aspect_ratio) ? row.aspect_ratio : "wide",
        tags: parseJsonArray(row.tags_json),
        images: parseJsonArray(row.images_json),
        links: parseJsonArray(row.links_json),
        sort_order: Number(row.sort_order) || 0,
        is_visible: Boolean(row.is_visible),
    };
};

const sanitizeTags = (tags = []) =>
    (Array.isArray(tags) ? tags : [])
        .map((item, index) => ({
            label: trimText(typeof item === "string" ? item : item?.label, 24),
            sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
        }))
        .filter((item) => item.label)
        .slice(0, 24);

const sanitizeSocialLinks = (links = []) =>
    (Array.isArray(links) ? links : [])
        .map((item, index) => {
            const platform = trimText(item?.platform || "custom", 40).toLowerCase();
            return {
                platform: SOCIAL_PLATFORMS.has(platform) ? platform : "custom",
                label: trimText(item?.label, 40),
                url: ["wechat", "email"].includes(platform)
                    ? trimText(item?.url, 1000)
                    : safeUrl(item?.url),
                sort_order: Number.isFinite(Number(item?.sort_order))
                    ? Number(item.sort_order)
                    : index,
                is_visible: toVisibleInt(item?.is_visible ?? item?.isVisible),
            };
        })
        .filter((item) => item.url)
        .slice(0, 20);

const sanitizeCardLinks = (links = []) =>
    (Array.isArray(links) ? links : [])
        .map((item) => ({
            label: trimText(item?.label, 80),
            url: safeUrl(item?.url),
        }))
        .filter((item) => item.url)
        .slice(0, 12);

const sanitizeUploadUrl = (value) => {
    const url = trimText(value, 1000);
    if (!url) return "";
    return safeUrl(url, true);
};

const sanitizeCards = (cards = []) =>
    (Array.isArray(cards) ? cards : [])
        .map((item, index) => {
            const rawType = trimText(
                item?.card_type || item?.cardType || "other",
                40
            ).toLowerCase();
            const cardType = PROFILE_CARD_TYPES.has(rawType) ? rawType : "other";
            const customType =
                cardType === "other"
                    ? trimText(item?.custom_type || item?.customType || item?.title, 40)
                    : "";
            const coverUrl = sanitizeUploadUrl(
                item?.cover_url ?? item?.coverUrl ?? item?.images?.[0]
            );
            const description = trimText(item?.description ?? item?.note ?? item?.body, 4000);
            const linkUrl = safeUrl(item?.link_url ?? item?.linkUrl ?? item?.links?.[0]?.url);
            const cropWidth = clampNumber(item?.crop_width ?? item?.cropWidth, 0.05, 1, 1);
            const cropHeight = clampNumber(item?.crop_height ?? item?.cropHeight, 0.05, 1, 1);
            const cropX = clampNumber(item?.crop_x ?? item?.cropX, 0, 1 - cropWidth, 0);
            const cropY = clampNumber(item?.crop_y ?? item?.cropY, 0, 1 - cropHeight, 0);
            const aspectRatio = trimText(item?.aspect_ratio || item?.aspectRatio || "wide", 20);
            const displayType = customType || trimText(item?.title, 80) || cardType;
            const links = linkUrl
                ? [{ label: displayType, url: linkUrl }]
                : item?.link_url !== undefined || item?.linkUrl !== undefined
                  ? []
                  : sanitizeCardLinks(item?.links).slice(0, 1);
            const images = coverUrl
                ? [coverUrl]
                : (item?.cover_url !== undefined || item?.coverUrl !== undefined
                      ? []
                      : Array.isArray(item?.images)
                        ? item.images
                        : []
                  )
                      .map((image) => sanitizeUploadUrl(image))
                      .filter(Boolean)
                      .slice(0, 1);
            return {
                source_type: item?.source_type || null,
                source_id: Number(item?.source_id) || null,
                title: item?.title !== undefined ? trimText(item.title, 120) : displayType,
                body: description,
                note: description,
                card_type: cardType,
                custom_type: customType,
                cover_url: coverUrl || images[0] || "",
                description,
                link_url: linkUrl || links[0]?.url || "",
                crop_x: cropX,
                crop_y: cropY,
                crop_width: cropWidth,
                crop_height: cropHeight,
                aspect_ratio: PROFILE_CARD_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : "wide",
                tags: sanitizeTags(item?.tags)
                    .map((tag) => tag.label)
                    .slice(0, 12),
                images,
                links,
                sort_order: Number.isFinite(Number(item?.sort_order))
                    ? Number(item.sort_order)
                    : index,
                is_visible: toVisibleInt(item?.is_visible ?? item?.isVisible),
            };
        })
        .filter(
            (item) =>
                item.card_type ||
                item.custom_type ||
                item.cover_url ||
                item.description ||
                item.link_url
        )
        .slice(0, 40);

const loadProfileCard = async (db, userId, includeHidden = false) => {
    const user = await db.get(
        "SELECT id, nickname, profile_slogan, profile_status, profile_description, profile_background, profile_version FROM users WHERE id = ?",
        [userId]
    );
    if (!user) return null;

    const visibilityClause = includeHidden ? "" : " AND is_visible = 1";
    const [tags, socialLinks, cards] = await Promise.all([
        db.all(
            "SELECT id, label, sort_order FROM user_profile_tags WHERE user_id = ? ORDER BY sort_order ASC, id ASC",
            [userId]
        ),
        db.all(
            `SELECT id, platform, label, url, sort_order, is_visible
       FROM user_social_links
       WHERE user_id = ? ${visibilityClause}
       ORDER BY sort_order ASC, id ASC`,
            [userId]
        ),
        db.all(
            `SELECT id, source_type, source_id, title, body, note, card_type, custom_type, cover_url, description, link_url,
              crop_x, crop_y, crop_width, crop_height, aspect_ratio,
              tags_json, images_json, links_json, sort_order, is_visible
       FROM user_profile_cards
       WHERE user_id = ? ${visibilityClause}
       ORDER BY sort_order ASC, id ASC`,
            [userId]
        ),
    ]);

    const works = await listProfileWorks(db, userId);
    const resolvedCards = cards
        .map(serializeProfileCard)
        .map((card) => {
            if (!card.source_type) return card;
            const work = works.find(
                (item) => item.type === card.source_type && item.id === card.source_id
            );
            return work
                ? {
                      ...card,
                      title: work.title,
                      cover_url: work.cover,
                      link_url: work.url,
                      relation: work.relation,
                  }
                : includeHidden
                  ? {
                        ...card,
                        unavailable: true,
                        title: "",
                        cover_url: "",
                        link_url: "",
                        description: "",
                    }
                  : null;
        })
        .filter(Boolean);
    let background = {};
    try {
        background = JSON.parse(user.profile_background || "{}");
    } catch {
        /* legacy empty value */
    }
    // Existing public personal descriptions remain visible until the first homepage save.
    const legacy =
        user.profile_version === 0
            ? await db.get(
                  "SELECT description, bio, cover_url FROM profiles WHERE type = 'person' AND owner_user_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 1",
                  [userId]
              )
            : null;
    if (!background.image && legacy?.cover_url) background.image = safeUrl(legacy.cover_url, true);
    return {
        user_id: user.id,
        nickname: user.nickname || "",
        version: user.profile_version || 0,
        description: user.profile_description || legacy?.description || legacy?.bio || "",
        background,
        works,
        slogan: user.profile_slogan || "",
        status: user.profile_status || "",
        tags: tags.map(serializeTag),
        social_links: socialLinks.map(serializeSocialLink),
        cards: resolvedCards,
    };
};

const getUserProfileCard = async (req, res, next) => {
    try {
        res.set?.("Cache-Control", "no-store");
        const userId = Number(req.params.id);
        if (!Number.isFinite(userId)) return res.status(400).json({ error: "Invalid user id" });
        const includeHidden = Boolean(req.user && Number(req.user.id) === userId);
        const db = await getDb();
        const profileCard = await loadProfileCard(db, userId, includeHidden);
        if (!profileCard) return res.status(404).json({ error: "User not found" });
        res.json(profileCard);
    } catch (error) {
        next(error);
    }
};

const updateOwnProfileCard = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Login required" });
        const slogan = trimText(req.body?.slogan, 240);
        const status = trimText(req.body?.status, 40);
        if (!PROFILE_STATUSES.has(status)) {
            return res.status(400).json({ error: "Invalid profile status" });
        }
        const tags = sanitizeTags(req.body?.tags);
        const socialLinks = sanitizeSocialLinks(req.body?.social_links || req.body?.socialLinks);
        const cards = sanitizeCards(req.body?.cards);

        const description = trimText(req.body?.description, 4000);
        const bg = req.body?.background || {};
        const background = {
            color: /^#[0-9a-f]{6}$/i.test(bg.color || "") ? bg.color : "",
            image: safeUrl(bg.image, true),
            x: clampNumber(bg.x, 0, 100, 50),
            y: clampNumber(bg.y, 0, 100, 50),
            opacity: clampNumber(bg.opacity, 0, 1, 0.25),
        };
        const result = await withProfileWrite(async (db) => {
            const current = await db.get("SELECT profile_version FROM users WHERE id = ?", [
                userId,
            ]);
            if (
                !current ||
                !Number.isInteger(req.body.version) ||
                req.body.version !== current.profile_version
            ) {
                const error = new Error("Profile changed. Reload before saving.");
                error.status = 409;
                throw error;
            }
            const works = await listProfileWorks(db, userId);
            for (const card of cards) {
                if (
                    card.source_type &&
                    !works.some(
                        (work) => work.type === card.source_type && work.id === card.source_id
                    )
                ) {
                    const existing = await db.get(
                        "SELECT id FROM user_profile_cards WHERE user_id = ? AND source_type = ? AND source_id = ?",
                        [userId, card.source_type, card.source_id]
                    );
                    if (!existing) {
                        const error = new Error("Work is not publicly available for this profile");
                        error.status = 400;
                        throw error;
                    }
                }
            }
            if (req.body.nickname !== undefined) {
                const nickname = trimText(req.body.nickname, 40);
                if (!nickname || !/^[\p{L}\p{N}_ .·-]+$/u.test(nickname)) {
                    const error = new Error("Invalid display name");
                    error.status = 400;
                    throw error;
                }
                await db.run("UPDATE users SET nickname = ? WHERE id = ?", [nickname, userId]);
                await db.run(
                    "UPDATE profiles SET display_name = ? WHERE type = 'person' AND owner_user_id = ?",
                    [nickname, userId]
                );
            }
            await db.run(
                "UPDATE profiles SET description = ? WHERE type = 'person' AND owner_user_id = ?",
                [description, userId]
            );
            await db.run(
                "UPDATE users SET profile_description = ?, profile_background = ?, profile_version = profile_version + 1 WHERE id = ?",
                [description, JSON.stringify(background), userId]
            );
            await db.run("UPDATE users SET profile_slogan = ?, profile_status = ? WHERE id = ?", [
                slogan,
                status,
                userId,
            ]);
            await db.run("DELETE FROM user_profile_tags WHERE user_id = ?", [userId]);
            await db.run("DELETE FROM user_social_links WHERE user_id = ?", [userId]);
            await db.run("DELETE FROM user_profile_cards WHERE user_id = ?", [userId]);

            for (const tag of tags) {
                await db.run(
                    `INSERT INTO user_profile_tags (user_id, label, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
                    [userId, tag.label, tag.sort_order]
                );
            }
            for (const link of socialLinks) {
                await db.run(
                    `INSERT INTO user_social_links (
            user_id, platform, label, url, sort_order, is_visible, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [userId, link.platform, link.label, link.url, link.sort_order, link.is_visible]
                );
            }
            for (const card of cards) {
                await db.run(
                    `INSERT INTO user_profile_cards (
            user_id, source_type, source_id, title, body, note, card_type, custom_type, cover_url, description, link_url,
            crop_x, crop_y, crop_width, crop_height, aspect_ratio,
            tags_json, images_json, links_json,
            sort_order, is_visible, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [
                        userId,
                        card.source_type,
                        card.source_id,
                        card.title,
                        card.body,
                        card.note,
                        card.card_type,
                        card.custom_type,
                        card.cover_url,
                        card.description,
                        card.link_url,
                        card.crop_x,
                        card.crop_y,
                        card.crop_width,
                        card.crop_height,
                        card.aspect_ratio,
                        JSON.stringify(card.tags),
                        JSON.stringify(card.images),
                        JSON.stringify(card.links),
                        card.sort_order,
                        card.is_visible,
                    ]
                );
            }
            return loadProfileCard(db, userId, true);
        });
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === "SQLITE_CONSTRAINT")
            return res
                .status(409)
                .json({ error: "Display name is already in use", code: "NAME_TAKEN" });
        next(error);
    }
};

module.exports = {
    getUserProfileCard,
    updateOwnProfileCard,
};
