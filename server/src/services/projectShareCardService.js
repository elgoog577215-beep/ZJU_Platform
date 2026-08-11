const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const WIDTH = 1000;
const HEIGHT = 800;
const COVER_HEIGHT = 432;
const uploadRoot = path.resolve(__dirname, "../../uploads");

const escapeXml = (value) =>
    String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

const clampText = (value, max) => {
    const text = String(value || "").trim();
    return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
};

const progressLabel = (value) =>
    ({
        idea: "构思中",
        dev: "开发中",
        live: "已上线",
        pause: "暂停",
    })[value] || "进行中";

const parseTags = (value) => {
    try {
        const parsed = JSON.parse(value || "[]");
        return Array.isArray(parsed)
            ? parsed
                  .map((item) => String(item).trim())
                  .filter(Boolean)
                  .slice(0, 3)
            : [];
    } catch {
        return [];
    }
};

const resolveLocalCover = async (coverUrl) => {
    if (!coverUrl) return null;
    let pathname = String(coverUrl).trim();
    try {
        if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname;
    } catch {
        return null;
    }
    if (!pathname.startsWith("/uploads/") || pathname.includes("\0") || pathname.includes(".."))
        return null;
    const filePath = path.resolve(uploadRoot, pathname.replace(/^\/uploads\//, ""));
    if (filePath !== uploadRoot && !filePath.startsWith(`${uploadRoot}${path.sep}`)) return null;
    try {
        return await fs.readFile(filePath);
    } catch {
        return null;
    }
};

const buildCoverFallback = (title) =>
    Buffer.from(`
  <svg width="${WIDTH}" height="${COVER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827"/>
    <text x="62" y="250" fill="#334155" font-size="190" font-weight="900"
      font-family="Arial, 'Microsoft YaHei', sans-serif">${escapeXml(clampText(title, 2))}</text>
  </svg>
`);

const buildBodySvg = (project) => {
    const title = escapeXml(clampText(project.title, 18));
    const intro = escapeXml(clampText(project.intro || "一个正在生长的校园项目", 30));
    const status = escapeXml(progressLabel(project.progress));
    const tags = parseTags(project.need_tags);
    let tagX = 58;
    const tagSvg = tags
        .map((tag) => {
            const label = escapeXml(clampText(tag, 8));
            const width = Math.max(92, Math.min(190, 52 + Array.from(label).length * 27));
            const svg = `<g transform="translate(${tagX},700)">
      <rect width="${width}" height="54" rx="12" fill="#2a1b18" stroke="#fb923c" stroke-opacity=".58"/>
      <text x="${width / 2}" y="35" text-anchor="middle" fill="#fed7aa" font-size="22" font-weight="800"
        font-family="Arial, 'Microsoft YaHei', sans-serif">${label}</text>
    </g>`;
            tagX += width + 16;
            return svg;
        })
        .join("");

    return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#050b18" stop-opacity="0"/>
          <stop offset="1" stop-color="#050b18"/>
        </linearGradient>
      </defs>
      <rect y="${COVER_HEIGHT}" width="${WIDTH}" height="${HEIGHT - COVER_HEIGHT}" fill="#050b18"/>
      <rect y="342" width="${WIDTH}" height="94" fill="url(#fade)"/>
      <g transform="translate(770,38)">
        <rect width="172" height="58" rx="12" fill="#071725" fill-opacity=".94" stroke="#67e8f9" stroke-opacity=".52"/>
        <circle cx="28" cy="29" r="7" fill="#67e8f9"/>
        <text x="50" y="38" fill="#cffafe" font-size="25" font-weight="900"
          font-family="Arial, 'Microsoft YaHei', sans-serif">${status}</text>
      </g>
      <text x="58" y="500" fill="#67e8f9" font-size="20" font-weight="900"
        font-family="Arial, 'Microsoft YaHei', sans-serif">项目广场 / PROJECT</text>
      <text x="58" y="590" fill="#f8fafc" font-size="74" font-weight="900"
        font-family="Arial, 'Microsoft YaHei', sans-serif">${title}</text>
      <text x="58" y="644" fill="#cbd5e1" font-size="29" font-weight="600"
        font-family="Arial, 'Microsoft YaHei', sans-serif">${intro}</text>
      ${tagSvg}
      <text x="942" y="724" text-anchor="end" fill="#64748b" font-size="18" font-weight="800"
        font-family="Arial, 'Microsoft YaHei', sans-serif">TUOZHE AI ECOSYSTEM</text>
      <text x="942" y="752" text-anchor="end" fill="#64748b" font-size="18" font-weight="700"
        font-family="Arial, 'Microsoft YaHei', sans-serif">拓浙AI生态</text>
    </svg>
  `);
};

const roundedMask = Buffer.from(`
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" rx="42" fill="#fff"/>
  </svg>
`);

const renderProjectShareCard = async (project) => {
    const cover = await resolveLocalCover(project.cover_url);
    const coverLayer = cover
        ? await sharp(cover)
              .rotate()
              .resize(WIDTH, COVER_HEIGHT, { fit: "cover", position: "north" })
              .png()
              .toBuffer()
        : buildCoverFallback(project.title);

    return sharp({
        create: {
            width: WIDTH,
            height: HEIGHT,
            channels: 4,
            background: { r: 5, g: 11, b: 24, alpha: 1 },
        },
    })
        .composite([
            { input: coverLayer, left: 0, top: 0 },
            { input: buildBodySvg(project), left: 0, top: 0 },
            { input: roundedMask, blend: "dest-in" },
        ])
        .png({ compressionLevel: 9 })
        .toBuffer();
};

module.exports = {
    WIDTH,
    HEIGHT,
    renderProjectShareCard,
};
