process.env.SECRET_KEY = process.env.SECRET_KEY || 'security-hardening-test-secret';
process.env.NODE_ENV = 'test';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zju-security-hardening-'));
process.env.DATABASE_FILE = path.join(tempDir, 'database.sqlite');
process.env.UPLOAD_DIR = path.join(tempDir, 'uploads');

const {
  isAllowedFile,
  isDangerousStaticUploadPath,
  blockDangerousUploadRequest,
} = require('../src/middleware/upload');
const settingsController = require('../src/controllers/settingsController');
const authController = require('../src/controllers/authController');
const { validate, settingsValidation } = require('../src/middleware/validate');
const { pool } = require('../src/config/db');

const file = (originalname, mimetype, size = 128) => ({ originalname, mimetype, size });

const createRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const runSettingsValidation = async (body) => {
  const req = { body };
  const res = createRes();
  let nextCalled = false;
  await validate(settingsValidation)(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, res };
};

after(async () => {
  await pool.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('strict upload whitelist rejects scriptable files and allows content file types', () => {
  assert.equal(isAllowedFile(file('cover.jpg', 'image/jpeg')).allowed, true);
  assert.equal(isAllowedFile(file('cover.png', 'image/png')).allowed, true);
  assert.equal(isAllowedFile(file('clip.mp4', 'video/mp4')).allowed, true);
  assert.equal(isAllowedFile(file('voice.m4a', 'audio/mp4')).allowed, true);
  assert.equal(isAllowedFile(file('brief.pdf', 'application/pdf')).allowed, true);
  assert.equal(isAllowedFile(file('notes.md', 'text/markdown')).allowed, true);

  assert.equal(isAllowedFile(file('legacy.bmp', 'image/bmp')).allowed, false);
  assert.equal(isAllowedFile(file('movie.avi', 'video/x-msvideo')).allowed, false);
  assert.equal(isAllowedFile(file('audio.flac', 'audio/flac')).allowed, false);
  assert.equal(isAllowedFile(file('page.html', 'text/html')).allowed, false);
  assert.equal(isAllowedFile(file('icon.svg', 'image/svg+xml')).allowed, false);
  assert.equal(isAllowedFile(file('payload.jpg.js', 'application/javascript')).allowed, false);
});

test('wechat account list uploads are isolated to csv tsv and json', () => {
  const accountTypes = ['wechatAccountList'];

  assert.equal(isAllowedFile(file('accounts.csv', 'text/csv'), accountTypes).allowed, true);
  assert.equal(isAllowedFile(file('accounts.tsv', 'text/tab-separated-values'), accountTypes).allowed, true);
  assert.equal(isAllowedFile(file('accounts.json', 'application/json'), accountTypes).allowed, true);

  assert.equal(isAllowedFile(file('accounts.csv', 'text/csv')).allowed, false);
  assert.equal(isAllowedFile(file('accounts.md', 'text/markdown'), accountTypes).allowed, false);
  assert.equal(isAllowedFile(file('accounts.html', 'text/html'), accountTypes).allowed, false);
});

test('dangerous upload paths are blocked before static serving', () => {
  assert.equal(isDangerousStaticUploadPath('/documents/report.html'), true);
  assert.equal(isDangerousStaticUploadPath('/documents/report.htm'), true);
  assert.equal(isDangerousStaticUploadPath('/images/vector.svg'), true);
  assert.equal(isDangerousStaticUploadPath('/documents/data.xml'), true);
  assert.equal(isDangerousStaticUploadPath('/documents/app.js'), true);
  assert.equal(isDangerousStaticUploadPath('/images/photo.jpg'), false);
  assert.equal(isDangerousStaticUploadPath('/documents/brief.pdf'), false);
  assert.equal(isDangerousStaticUploadPath('/documents/notes.md'), false);

  const res = createRes();
  let nextCalled = false;
  blockDangerousUploadRequest(
    { path: '/documents/report.html' },
    res,
    () => { nextCalled = true; },
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'File not found' });
  assert.equal(nextCalled, false);
});

test('registration setting defaults open and false values close non-bootstrap registration', async () => {
  assert.equal(settingsController.normalizeSettingValue('allow_registrations', false), 'false');
  assert.equal(settingsController.normalizeSettingValue('allow_registrations', '0'), 'false');
  assert.equal(settingsController.normalizeSettingValue('allow_registrations', 'off'), 'false');
  assert.equal(settingsController.normalizeSettingValue('allow_registrations', 'true'), 'true');
  assert.equal(settingsController.normalizeSettingValue('site_title', 'TUOTU ZJU'), 'TUOTU ZJU');

  const missingSettingDb = { get: async () => null };
  const disabledDb = { get: async () => ({ value: 'false' }) };
  const missingTableDb = {
    get: async () => {
      throw new Error('SQLITE_ERROR: no such table: settings');
    },
  };

  assert.equal(await authController.isRegistrationEnabled(missingSettingDb), true);
  assert.equal(await authController.isRegistrationEnabled(disabledDb), false);
  assert.equal(await authController.isRegistrationEnabled(missingTableDb), true);
  assert.equal(await authController.shouldAllowRegistration(disabledDb, 0), true);
  assert.equal(await authController.shouldAllowRegistration(disabledDb, 1), false);
});

test('settings validator accepts boolean registration switch values', async () => {
  const falseResult = await runSettingsValidation({ key: 'allow_registrations', value: false });
  assert.equal(falseResult.nextCalled, true);

  const missingResult = await runSettingsValidation({ key: 'allow_registrations' });
  assert.equal(missingResult.nextCalled, false);
  assert.equal(missingResult.res.statusCode, 400);
});

test('normal login helper records failed attempts and clears successful attempts', () => {
  let failed = 0;
  let cleared = 0;
  const req = {
    loginTracker: {
      recordFailed: () => { failed += 1; },
      clear: () => { cleared += 1; },
    },
  };

  authController.recordInvalidLoginAttempt(req);
  authController.recordInvalidLoginAttempt(req);
  authController.clearSuccessfulLoginAttempts(req);

  assert.equal(failed, 2);
  assert.equal(cleared, 1);
});
