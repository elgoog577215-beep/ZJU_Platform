const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function downloadWeChatImage(imageUrl) {
  if (!imageUrl) return null;

  try {
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const ext = imageUrl.includes('.png') ? 'png'
      : imageUrl.includes('.gif') ? 'gif'
        : 'jpg';
    const filename = `wechat_${hash}.${ext}`;
    const uploadDir = path.join(__dirname, '../../uploads/covers');
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      console.log(`📸 Using cached image: ${filename}`);
      return `/uploads/covers/${filename}`;
    }

    console.log('📥 Downloading image from WeChat...');

    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://mp.weixin.qq.com/',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      timeout: 15000,
    });

    fs.writeFileSync(filePath, response.data);
    console.log(`✅ Image saved: ${filename}`);

    return `/uploads/covers/${filename}`;
  } catch (error) {
    console.error(`❌ Failed to download image: ${error.message}`);
    return null;
  }
}

module.exports = {
  downloadWeChatImage,
};
