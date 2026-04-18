/**
 * Redact anonymous help posts for non-owner non-admin viewers.
 *
 * @param {object} post - raw row from community_posts join users
 * @param {object|null} viewer - { id, role } or null for anonymous viewer
 * @returns {object} serialized post safe to return
 */
function serializeCommunityPost(post, viewer) {
  if (!post) return post;

  const isAnonymous = Boolean(post.is_anonymous);
  if (!isAnonymous) return { ...post };

  const viewerId = viewer && viewer.id != null ? Number(viewer.id) : null;
  const viewerRole = viewer && viewer.role ? String(viewer.role) : null;
  const authorId = post.author_id != null ? Number(post.author_id) : null;
  const isOwner = viewerId !== null && authorId !== null && viewerId === authorId;
  const isAdmin = viewerRole === 'admin';

  if (isOwner || isAdmin) return { ...post };

  return {
    ...post,
    author_id: null,
    author_name: null,
    author_avatar: null,
    uploader_id: null,   // 防御性：某些 join 别名可能带此字段
  };
}

module.exports = { serializeCommunityPost };
