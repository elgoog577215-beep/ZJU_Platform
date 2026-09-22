#!/usr/bin/env bash
set -eu

release_id="${1:?release commit required}"
case "$release_id" in *[!a-f0-9]*|"") exit 2;; esac
[ "${#release_id}" -eq 40 ]
app_root="${ZJU_APP_ROOT:-/var/www/ZJU_Platform}"
artifact_dir="${ZJU_ARTIFACT_DIR:-/tmp/zju-platform}"
artifact_name="zju-platform-${release_id}.tar.gz"
deployment_root="${app_root}/.deployments"
slot="${deployment_root}/${release_id}"
stage="${slot}/stage"
previous="${slot}/previous"
payload="${stage}/payload"

exec 9>"${ZJU_DEPLOY_LOCK:-/var/lock/zju-platform-deploy.lock}"
flock -n 9 || { echo "Another deployment is active"; exit 1; }

echo "Deploying ${release_id} on $(hostname) as $(id -un)"
if [ ! -d "$app_root/server" ] || [ ! -d "$app_root/dist" ]; then
  echo "ERROR: expected application directories are missing under $app_root"
  ls -la "$app_root" 2>/dev/null || true
  exit 1
fi
if [ ! -d "$artifact_dir" ]; then
  echo "ERROR: artifact directory is missing: $artifact_dir"
  exit 1
fi

artifact="$(find "$artifact_dir" -maxdepth 2 -type f -name "$artifact_name" -print -quit)"
if [ -z "$artifact" ]; then
  echo "ERROR: release artifact was not found: $artifact_name"
  find "$artifact_dir" -maxdepth 2 -type f -print || true
  exit 1
fi
checksum="$(find "$(dirname "$artifact")" -maxdepth 1 -type f -name "${artifact_name}.sha256" -print -quit)"
if [ -z "$checksum" ]; then
  echo "ERROR: release checksum was not found beside $artifact"
  find "$(dirname "$artifact")" -maxdepth 1 -type f -print || true
  exit 1
fi
echo "Release artifact: $artifact"

(
  cd "$(dirname "$checksum")"
  sha256sum --check "$(basename "$checksum")"
)
echo "Release checksum verified"
if [ -z "${ZJU_QWEN_BASE_URL:-}" ]; then
  ZJU_QWEN_BASE_URL=$(cd "$app_root/server" && node -e 'const fs=require("node:fs");const env=require("dotenv").parse(fs.readFileSync(".env"));process.stdout.write(env.ZJU_QWEN_BASE_URL || "");')
  export ZJU_QWEN_BASE_URL
fi
[ -n "$ZJU_QWEN_BASE_URL" ] || { echo "Missing private model configuration"; exit 1; }


mkdir -p "$deployment_root"
find "$deployment_root" -mindepth 1 -maxdepth 1 -type d -exec rm -rf -- {} +
rm -rf "$slot"
mkdir -p "$stage" "$previous"
tar -xzf "$artifact" -C "$stage"
test -f "$payload/release-manifest.txt"
test -f "$payload/dist/index.html"
test -s "$payload/dist/images/hero-landscape-day-4k.jpg"
test -s "$payload/dist/images/hero-landscape-night.jpg"
test -s "$payload/dist/images/hero-background.jpg"
test -s "$payload/dist/images/hero-campus-day-4k.jpg"
test -s "$payload/dist/images/partner-logos/getui.svg"
test -s "$payload/dist/images/partner-logos/getui-dark.svg"
test -s "$payload/dist/images/partner-logos/organizations/official/zhejiang-university.png"
test -s "$payload/dist/images/partner-logos/organizations/official/xlab.svg"
test -s "$payload/dist/images/partner-logos/organizations/official/xlab-white.svg"
test -s "$payload/dist/images/partner-logos/organizations/official/zjuai.webp"
test -f "$payload/server/index.js"
test -f "$payload/shared/hackathonTemplateDefaults.json"
node --check "$payload/server/index.js"
echo "Release payload validated"

(
  cd "$payload/server"
  npm ci --omit=dev --legacy-peer-deps
  npx playwright install --with-deps chromium
  node -e 'const { chromium } = require("playwright"); chromium.launch({ headless: true }).then(async (browser) => { await browser.close(); console.log("Playwright Chromium launch verified"); }).catch((error) => { console.error(error); process.exit(1); });'
)

caddy validate --config /etc/caddy/Caddyfile
echo "Caddy configuration validated"

switched=0
rollback() {
  code=$?
  trap - EXIT
  if [ "$code" -ne 0 ] && [ "$switched" -eq 1 ] && [ -d "$previous/server" ]; then
    echo "Deployment failed; restoring previous release"
    for runtime_path in .env uploads logs data backups; do
      if [ -e "$app_root/server/$runtime_path" ] || [ -L "$app_root/server/$runtime_path" ]; then
        mv "$app_root/server/$runtime_path" "$previous/server/$runtime_path"
      fi
    done
    for file in "$app_root/server"/database.sqlite*; do
      if [ -e "$file" ] || [ -L "$file" ]; then mv "$file" "$previous/server/"; fi
    done
    for part in server dist shared; do
      if [ -e "$previous/$part" ]; then
        if [ -e "$app_root/$part" ]; then mv "$app_root/$part" "$slot/failed-$part"; fi
        mv "$previous/$part" "$app_root/$part"
      fi
    done
    if [ -f "$previous/release-manifest.txt" ]; then cp "$previous/release-manifest.txt" "$app_root/.deployed-release"; fi
    if [ -f "$previous/runtime.env" ]; then cp -p "$previous/runtime.env" "$app_root/server/.env"; fi
    pm2 restart zju-server --update-env || true
  fi
  exit "$code"
}
trap rollback EXIT
if [ -f "$app_root/.deployed-release" ]; then cp "$app_root/.deployed-release" "$previous/release-manifest.txt"; fi
if [ -f "$app_root/server/.env" ]; then cp -p "$app_root/server/.env" "$previous/runtime.env"; fi
switched=1

mv "$app_root/server" "$previous/server"
mv "$app_root/dist" "$previous/dist"
if [ -e "$app_root/shared" ] || [ -L "$app_root/shared" ]; then
  mv "$app_root/shared" "$previous/shared"
fi
mv "$payload/server" "$app_root/server"
mv "$payload/dist" "$app_root/dist"
mv "$payload/shared" "$app_root/shared"

for runtime_path in .env uploads logs data backups; do
  if [ -e "$previous/server/$runtime_path" ] || [ -L "$previous/server/$runtime_path" ]; then
    mv "$previous/server/$runtime_path" "$app_root/server/$runtime_path"
  fi
done
for database_file in "$previous/server"/database.sqlite*; do
  if [ -e "$database_file" ] || [ -L "$database_file" ]; then
    mv "$database_file" "$app_root/server/"
    fi
done

if [ -z "${ZJU_QWEN_BASE_URL:-}" ]; then
  echo "ERROR: private Qwen endpoint secret is missing"
  exit 1
fi
APP_ROOT="$app_root" ZJU_QWEN_BASE_URL="$ZJU_QWEN_BASE_URL" node - <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const envPath = path.join(process.env.APP_ROOT, "server", ".env");
const tempPath = `${envPath}.qwen-policy.tmp`;
const key = "ZJU_QWEN_BASE_URL";
const value = process.env.ZJU_QWEN_BASE_URL || "";
if (!value || !/^https?:\/\//.test(value)) {
  throw new Error("Private Qwen endpoint secret is invalid.");
}
const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const lines = current
  .split(/\r?\n/)
  .filter((line) => !line.startsWith(`${key}=`));
while (lines.length > 0 && lines.at(-1) === "") lines.pop();
lines.push(`${key}=${value}`, "");
const mode = fs.existsSync(envPath) ? fs.statSync(envPath).mode & 0o777 : 0o600;
fs.writeFileSync(tempPath, lines.join("\n"), { mode });
fs.renameSync(tempPath, envPath);
NODE
echo "Private Qwen endpoint anchor configured"

install -m 0644 "$stage/payload/release-manifest.txt" "$app_root/.deployed-release"
grep -Fxq "commit=$release_id" "$app_root/.deployed-release"

if systemctl is-enabled --quiet nginx 2>/dev/null || systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl disable --now nginx
fi

systemctl enable caddy
if systemctl is-active --quiet caddy; then
  systemctl reload caddy
else
  systemctl start caddy
fi
systemctl is-active --quiet caddy

if ! pm2 restart zju-server --update-env; then
  pm2 status || true
  pm2 logs zju-server --lines 80 --nostream || true
  exit 1
fi

health_file="/tmp/zju-health-${release_id}.json"
healthy=0
for i in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:3001/api/health > "$health_file"; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  pm2 logs zju-server --lines 80 --nostream || true
  cat "$health_file" 2>/dev/null || true
  exit 1
fi

rm -f "$health_file"
echo "Previous release retained at $previous"
find "$artifact_dir" -maxdepth 2 -type f \
  \( -name 'zju-platform-*.tar.gz' -o -name 'zju-platform-*.tar.gz.sha256' \) \
  -delete
