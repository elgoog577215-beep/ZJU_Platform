const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../../../src');

const listFiles = (req, res) => {
    const relativePath = req.query.path || '';
    if (relativePath.includes('..')) return res.status(403).json({ error: 'Access denied' });
    
    const fullPath = path.join(PROJECT_ROOT, relativePath);
    
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
        res.status(500).json({ error: err.message });
    }
};

const getFileContent = (req, res) => {
    const relativePath = req.query.path;
    if(!relativePath || relativePath.includes('..')) return res.status(400).json({error: 'Invalid path'});
    
    const fullPath = path.join(PROJECT_ROOT, relativePath);

    try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const content = fs.readFileSync(fullPath, 'utf8');
            res.json({ content });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const saveFileContent = (req, res) => {
    const { path: relativePath, content } = req.body;
    if(!relativePath || relativePath.includes('..')) return res.status(400).json({error: 'Invalid path'});

    const fullPath = path.join(PROJECT_ROOT, relativePath);

    try {
        fs.writeFileSync(fullPath, content, 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { listFiles, getFileContent, saveFileContent };