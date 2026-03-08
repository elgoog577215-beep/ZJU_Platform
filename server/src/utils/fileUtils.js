const path = require('path');
const fs = require('fs');
const url = require('url');

const deleteFileFromUrl = (fileUrl) => {
  if (!fileUrl) return;
  try {
    let filePath;
    // Handle full URLs
    if (fileUrl.startsWith('http')) {
        const parsed = url.parse(fileUrl);
        if (parsed.pathname && parsed.pathname.startsWith('/uploads/')) {
            const serverRoot = path.resolve(__dirname, '../../');
            filePath = path.join(serverRoot, parsed.pathname);
        }
    } 
    // Handle relative paths (e.g. /uploads/...)
    else if (fileUrl.startsWith('/uploads/')) {
        const serverRoot = path.resolve(__dirname, '../../');
        filePath = path.join(serverRoot, fileUrl);
    }

    // Path Traversal Protection
    const uploadDir = path.resolve(__dirname, '../../uploads');
    if (filePath && !filePath.startsWith(uploadDir)) {
        console.warn(`Security Warning: Attempted path traversal deletion: ${filePath}`);
        return;
    }

    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to delete file ${fileUrl}:`, err);
  }
};

module.exports = { deleteFileFromUrl };