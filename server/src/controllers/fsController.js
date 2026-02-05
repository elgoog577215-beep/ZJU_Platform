const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../../../src');

// Helper to validate path
const validatePath = (relativePath) => {
    if (!relativePath) return null;
    // Prevent directory traversal
    if (relativePath.includes('..')) return null;
    
    // Resolve absolute path and ensure it's within PROJECT_ROOT
    const fullPath = path.resolve(PROJECT_ROOT, relativePath);
    if (!fullPath.startsWith(PROJECT_ROOT)) return null;
    
    return fullPath;
};

const listFiles = (req, res, next) => {
    const relativePath = req.query.path || '';
    const fullPath = validatePath(relativePath);
    
    if (!fullPath) return res.status(403).json({ error: 'Access denied' });
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'Path not found' });
    }

    try {
        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
             return res.json({ type: 'file', name: path.basename(fullPath) });
        }

        const items = fs.readdirSync(fullPath).map(name => {
            const itemPath = path.join(fullPath, name);
            try {
                const itemStats = fs.statSync(itemPath);
                return {
                    name,
                    path: path.join(relativePath, name).replace(/\\/g, '/'),
                    type: itemStats.isDirectory() ? 'dir' : 'file',
                    size: itemStats.size,
                    updatedAt: itemStats.mtime
                };
            } catch (e) {
                return null; 
            }
        }).filter(Boolean);
        
        items.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
        });

        res.json(items);
    } catch (err) {
        console.error('FS Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getFileContent = (req, res, next) => {
    const relativePath = req.query.path;
    const fullPath = validatePath(relativePath);
    
    if (!fullPath) return res.status(400).json({error: 'Invalid path'});
    
    try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const content = fs.readFileSync(fullPath, 'utf8');
            res.json({ content });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        console.error('FS Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const saveFileContent = (req, res, next) => {
    const { path: relativePath, content } = req.body;
    const fullPath = validatePath(relativePath);
    
    if (!fullPath) return res.status(400).json({error: 'Invalid path'});

    // Security: Whitelist allowed extensions for editing
    const allowedExtensions = ['.json', '.md', '.txt', '.css', '.scss'];
    const ext = path.extname(fullPath).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
        return res.status(403).json({ error: 'Editing this file type is not allowed for security reasons.' });
    }

    try {
        fs.writeFileSync(fullPath, content, 'utf8');
        res.json({ success: true });
    } catch (err) {
        console.error('FS Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { listFiles, getFileContent, saveFileContent };