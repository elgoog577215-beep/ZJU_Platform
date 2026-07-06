const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canBypassReview,
  defaultReviewStatusForUser,
  normalizeAccountType,
  normalizeAdminScope,
  normalizeReviewPermission,
} = require('../src/utils/userPermissions');

test('user permission helpers keep account type, review permission, and admin scope separate', () => {
  assert.equal(normalizeAccountType('organization'), 'organization');
  assert.equal(normalizeAccountType('unknown'), 'personal');
  assert.equal(normalizeReviewPermission('trusted'), 'trusted');
  assert.equal(normalizeReviewPermission('unknown'), 'normal');
  assert.equal(normalizeAdminScope('platform'), 'platform');
  assert.equal(normalizeAdminScope('unknown'), 'none');

  assert.equal(canBypassReview({ role: 'user', review_permission: 'normal' }), false);
  assert.equal(canBypassReview({ role: 'user', review_permission: 'trusted' }), true);
  assert.equal(canBypassReview({ role: 'admin', review_permission: 'normal' }), true);
});

test('default review status preserves drafts and only bypasses review for trusted or admin actors', () => {
  assert.equal(defaultReviewStatusForUser({ review_permission: 'normal' }), 'pending');
  assert.equal(defaultReviewStatusForUser({ review_permission: 'trusted' }), 'approved');
  assert.equal(defaultReviewStatusForUser({ role: 'admin' }), 'approved');
  assert.equal(
    defaultReviewStatusForUser({ review_permission: 'trusted' }, { requestedStatus: 'draft' }),
    'draft',
  );
});
