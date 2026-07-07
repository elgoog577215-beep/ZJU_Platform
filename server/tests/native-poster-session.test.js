const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const test = require('node:test');

const {
  MAX_POSTER_BYTES,
  createNativePosterSession,
  getNativePosterSession,
  sanitizeFileName,
} = require('../src/services/nativePosterSessionService');

const ONE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

test('native poster session stores a temporary PNG and returns it with the token', async () => {
  const created = await createNativePosterSession({
    imageData: ONE_PIXEL_PNG,
    fileName: 'poster:demo.png',
  });

  assert.ok(created.sessionId);
  assert.ok(created.token);
  assert.equal(created.fileName, 'poster-demo.png');

  const stored = await getNativePosterSession(created.sessionId, created.token);
  const bytes = await fs.readFile(stored.filePath);
  assert.equal(bytes.subarray(1, 4).toString('utf8'), 'PNG');

  await fs.unlink(stored.filePath);
});

test('native poster session rejects non-PNG data URLs', async () => {
  await assert.rejects(
    () => createNativePosterSession({ imageData: 'data:text/plain;base64,SGVsbG8=' }),
    (error) => error.errorCode === 'NATIVE_POSTER_INVALID_IMAGE'
  );
});

test('native poster session rejects oversized images', async () => {
  const oversized = `data:image/png;base64,${Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(MAX_POSTER_BYTES + 1),
  ]).toString('base64')}`;

  await assert.rejects(
    () => createNativePosterSession({ imageData: oversized }),
    (error) => error.errorCode === 'NATIVE_POSTER_IMAGE_TOO_LARGE'
  );
});

test('native poster file names are normalized to PNG', () => {
  assert.equal(sanitizeFileName('../bad:name'), 'bad-name.png');
  assert.equal(sanitizeFileName('ready.png'), 'ready.png');
});
