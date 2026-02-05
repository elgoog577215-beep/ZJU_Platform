const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');

const getAllUsers = async (req, res, next) => {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { role, password, avatar, organization_cr, gender, age, nickname, invitation_code } = req.body;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate invite code if setting organization
    if (organization_cr !== undefined && organization_cr !== user.organization) {
        // Only require code if joining an organization (not clearing it)
        if (organization_cr) {
            if (!invitation_code) {
                return res.status(400).json({ error: 'Invitation code required for Organization/Cr' });
            }
            const settings = await db.get('SELECT value FROM settings WHERE key = ?', ['invite_code']);
            if (!settings || String(settings.value).trim() !== String(invitation_code).trim()) {

                return res.status(400).json({ error: 'Invalid invitation code' });
            }
        }
        await db.run('UPDATE users SET organization = ? WHERE id = ?', [organization_cr, id]);
    }

    if (role) {
      await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }

    if (avatar !== undefined) await db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, id]);
    if (gender !== undefined) await db.run('UPDATE users SET gender = ? WHERE id = ?', [gender, id]);
    if (age !== undefined) await db.run('UPDATE users SET age = ? WHERE id = ?', [age, id]);
    if (nickname !== undefined) await db.run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, id]);

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) { next(error); }
};

const getPublicProfile = async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const user = await db.get('SELECT id, username, nickname, avatar, role, created_at, organization_cr, gender, age FROM users WHERE id = ?', [id]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) { next(error); }
};

const getUserResources = async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const tables = ['photos', 'videos', 'music', 'articles', 'events'];
        let allResources = [];
        
        // Check if requester is the owner
        const isOwner = req.user && String(req.user.id) === String(id);

        for (const table of tables) {
            let query = `SELECT *, '${table}' as type FROM ${table} WHERE uploader_id = ?`;
            const params = [id];

            // If not owner, only show approved
            if (!isOwner) {
                query += ` AND status = 'approved'`;
            }
            
            query += ` ORDER BY id DESC`;

            const resources = await db.all(query, params);
            allResources = [...allResources, ...resources];
        }

        // Sort by id desc (approx time)
        allResources.sort((a, b) => b.id - a.id);

        res.json(allResources);
    } catch (error) { next(error); }
};

module.exports = { getAllUsers, updateUser, deleteUser, getPublicProfile, getUserResources };
