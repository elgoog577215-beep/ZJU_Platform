/**
 * Identity pass-through. The anonymous help-post opt-in was removed
 * (see the "撤销匿名功能" commits) — since users can edit their own
 * nickname freely, an explicit anonymous flag added no real privacy
 * benefit. The helper is kept as a thin passthrough so existing call
 * sites in communityController, userController, communityLinks, and
 * systemController don't have to be re-threaded. `viewer` is retained
 * in the signature for future redaction use cases.
 */
function serializeCommunityPost(post /* , viewer */) {
  if (!post) return post;
  return { ...post };
}

module.exports = { serializeCommunityPost };
