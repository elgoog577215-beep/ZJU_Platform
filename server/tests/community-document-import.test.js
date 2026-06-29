const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  importCommunityDocument,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} = require('../src/utils/communityDocumentImport');

const writeTempDocument = async (fileName, content) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zju-community-import-'));
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, content, 'utf8');
  return {
    path: filePath,
    originalname: fileName,
  };
};

test('community document importer preserves markdown structure', async () => {
  const imported = await importCommunityDocument(await writeTempDocument(
    'launch-plan.md',
    [
      '# Launch Plan',
      '',
      'Ship the project plaza publishing loop.',
      '',
      '- Draft',
      '- Review',
      '',
      '```js',
      'console.log("ready");',
      '```',
    ].join('\n'),
  ));

  assert.equal(imported.title, 'Launch Plan');
  assert.equal(imported.meta.sourceType, 'markdown');
  assert.equal(imported.meta.extension, '.md');
  assert.match(imported.plainText, /Ship the project plaza publishing loop/);
  assert.deepEqual(
    imported.contentBlocks.map((block) => block.style),
    ['heading', 'paragraph', 'list', 'code'],
  );
  assert.equal(imported.contentBlocks[3].language, 'js');
});

test('community document importer promotes plain text title and lists', async () => {
  const imported = await importCommunityDocument(await writeTempDocument(
    'campus_toolkit.txt',
    [
      'Campus Toolkit',
      'A compact guide for builders.',
      '',
      '- Prepare repo',
      '- Publish notes',
    ].join('\n'),
  ));

  assert.equal(imported.title, 'Campus Toolkit');
  assert.equal(imported.meta.sourceType, 'text');
  assert.equal(imported.contentBlocks[0].style, 'heading');
  assert.equal(imported.contentBlocks[1].style, 'paragraph');
  assert.equal(imported.contentBlocks[2].style, 'list');
});

test('community document importer strips html chrome into clean blocks', async () => {
  const imported = await importCommunityDocument(await writeTempDocument(
    'news.html',
    '<article><h1>AI News Digest</h1><p>Useful update &amp; context.</p><script>bad()</script></article>',
  ));

  assert.equal(imported.title, 'AI News Digest');
  assert.equal(imported.meta.sourceType, 'html');
  assert.equal(imported.contentBlocks[0].style, 'heading');
  assert.match(imported.plainText, /Useful update & context/);
  assert.doesNotMatch(imported.plainText, /bad\(\)/);
});

test('community document importer rejects unsupported and empty inputs', async () => {
  assert.equal(SUPPORTED_DOCUMENT_EXTENSIONS.has('.txt'), true);

  const unsupported = await writeTempDocument('image.png', 'not a document');
  await assert.rejects(
    () => importCommunityDocument(unsupported),
    (error) => error.statusCode === 400 && error.message === 'Unsupported document format',
  );

  const empty = await writeTempDocument('empty.txt', '   \n\n');
  await assert.rejects(
    () => importCommunityDocument(empty),
    (error) => error.statusCode === 422 && error.message === 'Document does not contain importable text',
  );
});
