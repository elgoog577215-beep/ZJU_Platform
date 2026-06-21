import fs from 'node:fs';
import path from 'node:path';

const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error('[startup-chunks] dist/assets does not exist. Run npm run build first.');
  process.exit(1);
}

const assetFiles = fs.readdirSync(distAssetsDir);
const homeSplashChunks = assetFiles.filter((file) => /^HomeSplash-[\w-]+\.js$/.test(file));

if (homeSplashChunks.length > 0) {
  console.error(
    [
      '[startup-chunks] HomeSplash is still emitted as a lazy startup chunk.',
      'The home route should not depend on a separately fetched HomeSplash-*.js file,',
      'because stale browser or service-worker state can request an old hashed chunk at launch.',
      `Found: ${homeSplashChunks.join(', ')}`,
    ].join('\n'),
  );
  process.exit(1);
}

console.log('[startup-chunks] HomeSplash is bundled into the startup path.');
