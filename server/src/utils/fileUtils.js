const path = require('path');
const fs = require('fs');
const url = require('url');

const deleteFileFromUrl = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('http')) return;
  try {
    const parsed = url.parse(fileUrl);
    if (parsed.pathname && parsed.pathname.startsWith('/uploads/')) {
      // Go up two levels from utils to server root, then to uploads
      const serverRoot = path.join(__dirname, '../../');
      const filePath = path.join(serverRoot, parsed.pathname);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error(`Failed to delete file ${fileUrl}:`, err);
  }
};

module.exports = { deleteFileFromUrl };