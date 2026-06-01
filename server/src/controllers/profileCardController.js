const { getDb } = require('../config/db');

const PROFILE_STATUSES = new Set([
  '',
  'open_chat',
  'seeking_collab',
  'coffee_chat',
  'team_up',
  'joining_events',
  'busy',
]);

const SOCIAL_PLATFORMS = new Set([
  'wechat',
  'github',
  'twitter',
  'xiaohongshu',
  'bilibili',
  'email',
  'website',
  'zhihu',
  'linkedin',
  'custom',
]);

const PROFILE_CARD_TYPES = new Set([
  'project',
  'work',
  'article',
  'event',
  'experience',
  'resource',
  'social',
  'other',
]);

const PROFILE_CARD_ASPECT_RATIOS = new Set(['square', 'landscape', 'portrait', 'wide', 'vertical', 'large', 'tall']);

const trimText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
};

const toVisibleInt = (value) => (value === false || value === 0 || value === '0' ? 0 : 1);

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
  label: row.label || '',
  url: row.url,
  sort_order: Number(row.sort_order) || 0,
  is_visible: Boolean(row.is_visible),
});

const serializeProfileCard = (row) => {
  const cropWidth = clampNumber(row.crop_width, 0.05, 1, 1);
  const cropHeight = clampNumber(row.crop_height, 0.05, 1, 1);
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    note: row.note || '',
    card_type: row.card_type || 'other',
    custom_type: row.custom_type || '',
    cover_url: row.cover_url || parseJsonArray(row.images_json)[0] || '',
    description: row.description || row.note || row.body || '',
    link_url: row.link_url || parseJsonArray(row.links_json)[0]?.url || '',
    crop_x: clampNumber(row.crop_x, 0, 1 - cropWidth, 0),
    crop_y: clampNumber(row.crop_y, 0, 1 - cropHeight, 0),
    crop_width: cropWidth,
    crop_height: cropHeight,
    aspect_ratio: PROFILE_CARD_ASPECT_RATIOS.has(row.aspect_ratio) ? row.aspect_ratio : 'wide',
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
      label: trimText(typeof item === 'string' ? item : item?.label, 24),
      sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
    }))
    .filter((item) => item.label)
    .slice(0, 24);

const sanitizeSocialLinks = (links = []) =>
  (Array.isArray(links) ? links : [])
    .map((item, index) => {
      const platform = trimText(item?.platform || 'custom', 40).toLowerCase();
      return {
        platform: SOCIAL_PLATFORMS.has(platform) ? platform : 'custom',
        label: trimText(item?.label, 40),
        url: trimText(item?.url, 1000),
        sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
        is_visible: toVisibleInt(item?.is_visible ?? item?.isVisible),
      };
    })
    .filter((item) => item.url)
    .slice(0, 20);

const sanitizeCardLinks = (links = []) =>
  (Array.isArray(links) ? links : [])
    .map((item) => ({
      label: trimText(item?.label, 80),
      url: trimText(item?.url, 1000),
    }))
    .filter((item) => item.url)
    .slice(0, 12);

const sanitizeUploadUrl = (value) => {
  const url = trimText(value, 1000);
  if (!url) return '';
  return url.startsWith('/uploads/') ? url : '';
};

const sanitizeCards = (cards = []) =>
  (Array.isArray(cards) ? cards : [])
    .map((item, index) => {
      const rawType = trimText(item?.card_type || item?.cardType || 'other', 40).toLowerCase();
      const cardType = PROFILE_CARD_TYPES.has(rawType) ? rawType : 'other';
      const customType = cardType === 'other' ? trimText(item?.custom_type || item?.customType || item?.title, 40) : '';
      const coverUrl = sanitizeUploadUrl(item?.cover_url || item?.coverUrl || item?.images?.[0]);
      const description = trimText(item?.description || item?.note || item?.body, 80);
      const linkUrl = trimText(item?.link_url || item?.linkUrl || item?.links?.[0]?.url, 500);
      const cropWidth = clampNumber(item?.crop_width ?? item?.cropWidth, 0.05, 1, 1);
      const cropHeight = clampNumber(item?.crop_height ?? item?.cropHeight, 0.05, 1, 1);
      const cropX = clampNumber(item?.crop_x ?? item?.cropX, 0, 1 - cropWidth, 0);
      const cropY = clampNumber(item?.crop_y ?? item?.cropY, 0, 1 - cropHeight, 0);
      const aspectRatio = trimText(item?.aspect_ratio || item?.aspectRatio || 'wide', 20);
      const displayType = customType || trimText(item?.title, 80) || cardType;
      const links = linkUrl
        ? [{ label: displayType, url: linkUrl }]
        : sanitizeCardLinks(item?.links).slice(0, 1);
      const images = coverUrl
        ? [coverUrl]
        : (Array.isArray(item?.images) ? item.images : [])
          .map((image) => sanitizeUploadUrl(image))
          .filter(Boolean)
          .slice(0, 1);
      return {
        title: displayType,
        body: description,
        note: description,
        card_type: cardType,
        custom_type: customType,
        cover_url: coverUrl || images[0] || '',
        description,
        link_url: linkUrl || links[0]?.url || '',
        crop_x: cropX,
        crop_y: cropY,
        crop_width: cropWidth,
        crop_height: cropHeight,
        aspect_ratio: PROFILE_CARD_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : 'wide',
        tags: sanitizeTags(item?.tags).map((tag) => tag.label).slice(0, 12),
        images,
        links,
        sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
        is_visible: toVisibleInt(item?.is_visible ?? item?.isVisible),
      };
    })
    .filter((item) => item.card_type || item.custom_type || item.cover_url || item.description || item.link_url)
    .slice(0, 40);

const ensureProfileCardColumns = async (db) => {
  const columns = await db.all(`PRAGMA table_info(user_profile_cards)`);
  const names = new Set(columns.map((column) => column.name));
  const additions = [
    ['card_type', `ALTER TABLE user_profile_cards ADD COLUMN card_type TEXT DEFAULT 'other'`],
    ['custom_type', `ALTER TABLE user_profile_cards ADD COLUMN custom_type TEXT`],
    ['cover_url', `ALTER TABLE user_profile_cards ADD COLUMN cover_url TEXT`],
    ['description', `ALTER TABLE user_profile_cards ADD COLUMN description TEXT`],
    ['link_url', `ALTER TABLE user_profile_cards ADD COLUMN link_url TEXT`],
    ['crop_x', `ALTER TABLE user_profile_cards ADD COLUMN crop_x REAL DEFAULT 0`],
    ['crop_y', `ALTER TABLE user_profile_cards ADD COLUMN crop_y REAL DEFAULT 0`],
    ['crop_width', `ALTER TABLE user_profile_cards ADD COLUMN crop_width REAL DEFAULT 1`],
    ['crop_height', `ALTER TABLE user_profile_cards ADD COLUMN crop_height REAL DEFAULT 1`],
    ['aspect_ratio', `ALTER TABLE user_profile_cards ADD COLUMN aspect_ratio TEXT DEFAULT 'wide'`],
  ];
  for (const [name, sql] of additions) {
    if (!names.has(name)) await db.exec(sql);
  }
};

const loadProfileCard = async (db, userId, includeHidden = false) => {
  await ensureProfileCardColumns(db);
  const user = await db.get(
    'SELECT id, profile_slogan, profile_status FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  const visibilityClause = includeHidden ? '' : ' AND is_visible = 1';
  const [tags, socialLinks, cards] = await Promise.all([
    db.all(
      'SELECT id, label, sort_order FROM user_profile_tags WHERE user_id = ? ORDER BY sort_order ASC, id ASC',
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
      `SELECT id, title, body, note, card_type, custom_type, cover_url, description, link_url,
              crop_x, crop_y, crop_width, crop_height, aspect_ratio,
              tags_json, images_json, links_json, sort_order, is_visible
       FROM user_profile_cards
       WHERE user_id = ? ${visibilityClause}
       ORDER BY sort_order ASC, id ASC`,
      [userId]
    ),
  ]);

  return {
    user_id: user.id,
    slogan: user.profile_slogan || '',
    status: user.profile_status || '',
    tags: tags.map(serializeTag),
    social_links: socialLinks.map(serializeSocialLink),
    cards: cards.map(serializeProfileCard),
  };
};

const getUserProfileCard = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });
    const includeHidden = Boolean(req.user && (Number(req.user.id) === userId || req.user.role === 'admin'));
    const db = await getDb();
    const profileCard = await loadProfileCard(db, userId, includeHidden);
    if (!profileCard) return res.status(404).json({ error: 'User not found' });
    res.json(profileCard);
  } catch (error) {
    next(error);
  }
};

const updateOwnProfileCard = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const db = await getDb();
    await ensureProfileCardColumns(db);
    const slogan = trimText(req.body?.slogan, 240);
    const status = trimText(req.body?.status, 40);
    if (!PROFILE_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid profile status' });
    }
    const tags = sanitizeTags(req.body?.tags);
    const socialLinks = sanitizeSocialLinks(req.body?.social_links || req.body?.socialLinks);
    const cards = sanitizeCards(req.body?.cards);

    await db.exec('BEGIN');
    try {
      await db.run(
        'UPDATE users SET profile_slogan = ?, profile_status = ? WHERE id = ?',
        [slogan, status, userId]
      );
      await db.run('DELETE FROM user_profile_tags WHERE user_id = ?', [userId]);
      await db.run('DELETE FROM user_social_links WHERE user_id = ?', [userId]);
      await db.run('DELETE FROM user_profile_cards WHERE user_id = ?', [userId]);

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
            user_id, title, body, note, card_type, custom_type, cover_url, description, link_url,
            crop_x, crop_y, crop_width, crop_height, aspect_ratio,
            tags_json, images_json, links_json,
            sort_order, is_visible, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            userId,
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
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    const profileCard = await loadProfileCard(db, userId, true);
    res.json(profileCard);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfileCard,
  updateOwnProfileCard,
};
