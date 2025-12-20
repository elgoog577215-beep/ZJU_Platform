const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { role, password, avatar, organization_cr, gender, age, nickname, invitation_code } = req.body;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate invite code if setting organization
    if (organization_cr !== undefined && organization_cr !== user.organization_cr) {
        // Only require code if joining an organization (not clearing it)
        if (organization_cr) {
            if (!invitation_code) {
                return res.status(400).json({ error: 'Invitation code required for Organization/Cr' });
            }
            const settings = await db.get('SELECT value FROM settings WHERE key = ?', ['org_invite_code']);
            if (!settings || settings.value !== invitation_code) {
                return res.status(400).json({ error: 'Invalid invitation code' });
            }
        }
        await db.run('UPDATE users SET organization_cr = ? WHERE id = ?', [organization_cr, id]);
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllUsers, updateUser, deleteUser };
