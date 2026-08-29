const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const IMAGE_EXTENSIONS = new Set(["jpg", "png", "gif", "webp"]);

const normalizeExtension = (value) => {
    const extension = String(value || "")
        .toLowerCase()
        .replace(/^\./, "");
    if (extension === "jpeg") return "jpg";
    return IMAGE_EXTENSIONS.has(extension) ? extension : "";
};

const extensionFromImageUrl = (imageUrl) => {
    try {
        const url = new URL(imageUrl);
        const format = url.searchParams.get("wx_fmt");
        const pathExtension = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1];
        return normalizeExtension(format || pathExtension);
    } catch {
        return normalizeExtension(String(imageUrl).match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]);
    }
};

const extensionFromContentType = (value) => {
    const contentType = String(value || "")
        .toLowerCase()
        .split(";", 1)[0]
        .trim();
    return normalizeExtension(contentType.replace(/^image\//, ""));
};

async function downloadWeChatImage(imageUrl) {
    if (!imageUrl) return null;

    try {
        const hash = crypto.createHash("md5").update(imageUrl).digest("hex");
        const urlExtension = extensionFromImageUrl(imageUrl);
        let ext = urlExtension || "jpg";
        const filename = `wechat_${hash}.${ext}`;
        const uploadDir = path.join(__dirname, "../../uploads/covers");
        let filePath = path.join(uploadDir, filename);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        if (fs.existsSync(filePath)) {
            console.log(`📸 Using cached image: ${filename}`);
            return `/uploads/covers/${filename}`;
        }

        console.log("📥 Downloading image from WeChat...");

        const response = await axios({
            method: "GET",
            url: imageUrl,
            responseType: "arraybuffer",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Referer: "https://mp.weixin.qq.com/",
                Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
            },
            timeout: 15000,
        });

        if (!urlExtension) {
            ext = extensionFromContentType(response.headers?.["content-type"]) || ext;
            filePath = path.join(uploadDir, `wechat_${hash}.${ext}`);
        }
        fs.writeFileSync(filePath, response.data);
        console.log(`✅ Image saved: ${path.basename(filePath)}`);

        return `/uploads/covers/${path.basename(filePath)}`;
    } catch (error) {
        console.error(`❌ Failed to download image: ${error.message}`);
        return null;
    }
}

module.exports = {
    downloadWeChatImage,
    extensionFromContentType,
    extensionFromImageUrl,
};
