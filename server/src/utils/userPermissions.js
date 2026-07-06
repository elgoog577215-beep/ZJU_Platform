const ACCOUNT_TYPES = new Set(['personal', 'organization']);
const REVIEW_PERMISSIONS = new Set(['normal', 'trusted', 'admin']);
const ADMIN_SCOPES = new Set(['none', 'platform']);

const normalizeAccountType = (value, fallback = 'personal') => {
  const normalized = String(value || '').trim().toLowerCase();
  return ACCOUNT_TYPES.has(normalized) ? normalized : fallback;
};

const normalizeReviewPermission = (value, fallback = 'normal') => {
  const normalized = String(value || '').trim().toLowerCase();
  return REVIEW_PERMISSIONS.has(normalized) ? normalized : fallback;
};

const normalizeAdminScope = (value, fallback = 'none') => {
  const normalized = String(value || '').trim().toLowerCase();
  return ADMIN_SCOPES.has(normalized) ? normalized : fallback;
};

const canBypassReview = (user = {}) => (
  user?.role === 'admin' ||
  normalizeReviewPermission(user?.review_permission) === 'trusted' ||
  normalizeReviewPermission(user?.review_permission) === 'admin'
);

const defaultReviewStatusForUser = (user = {}, { requestedStatus = '', allowDraft = true } = {}) => {
  const requested = String(requestedStatus || '').trim().toLowerCase();
  if (allowDraft && requested === 'draft') return 'draft';
  return canBypassReview(user) ? 'approved' : 'pending';
};

module.exports = {
  ACCOUNT_TYPES,
  ADMIN_SCOPES,
  REVIEW_PERMISSIONS,
  canBypassReview,
  defaultReviewStatusForUser,
  normalizeAccountType,
  normalizeAdminScope,
  normalizeReviewPermission,
};
