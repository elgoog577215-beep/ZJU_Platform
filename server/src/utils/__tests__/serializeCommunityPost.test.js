const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serializeCommunityPost } = require('../serializeCommunityPost');

const basePost = {
  id: 100,
  author_id: 7,
  author_name: 'xsh',
  author_avatar: 'a.png',
  is_anonymous: 1,
  title: 't',
  content: 'c',
};

test('null/undefined post: passthrough', () => {
  assert.equal(serializeCommunityPost(null, null), null);
  assert.equal(serializeCommunityPost(undefined, null), undefined);
});

test('non-anonymous: returns as-is', () => {
  const out = serializeCommunityPost({ ...basePost, is_anonymous: 0 }, null);
  assert.equal(out.author_name, 'xsh');
  assert.equal(out.author_id, 7);
  assert.equal(out.author_avatar, 'a.png');
});

test('anonymous + visitor (null viewer): redacted', () => {
  const out = serializeCommunityPost(basePost, null);
  assert.equal(out.author_name, null);
  assert.equal(out.author_id, null);
  assert.equal(out.author_avatar, null);
  assert.equal(out.uploader_id, null);
  // Other fields preserved
  assert.equal(out.id, 100);
  assert.equal(out.title, 't');
  assert.equal(out.content, 'c');
});

test('anonymous + other user: redacted', () => {
  const out = serializeCommunityPost(basePost, { id: 99, role: 'user' });
  assert.equal(out.author_name, null);
  assert.equal(out.author_id, null);
  assert.equal(out.author_avatar, null);
});

test('anonymous + owner: full visibility', () => {
  const out = serializeCommunityPost(basePost, { id: 7, role: 'user' });
  assert.equal(out.author_name, 'xsh');
  assert.equal(out.author_id, 7);
  assert.equal(out.author_avatar, 'a.png');
});

test('anonymous + owner with string id: full visibility (numeric coercion)', () => {
  const out = serializeCommunityPost(basePost, { id: '7', role: 'user' });
  assert.equal(out.author_name, 'xsh');
});

test('anonymous + admin: full visibility', () => {
  const out = serializeCommunityPost(basePost, { id: 99, role: 'admin' });
  assert.equal(out.author_name, 'xsh');
  assert.equal(out.author_id, 7);
  assert.equal(out.author_avatar, 'a.png');
});

test('anonymous + uploader_id field present: also nulled for non-owner', () => {
  const postWithUploader = { ...basePost, uploader_id: 7 };
  const out = serializeCommunityPost(postWithUploader, null);
  assert.equal(out.uploader_id, null);
  assert.equal(out.author_id, null);
});
