const { getDb } = require('../config/db');

const registerEvent = async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return res.status(401).json({ error: 'Login required to register' });
        }

        // Check if event exists
        const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if already registered
        const existing = await db.get('SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?', [id, userId]);
        
        if (existing) {
            // Unregister (Toggle)
            await db.run('DELETE FROM event_registrations WHERE id = ?', [existing.id]);
            return res.json({ registered: false, message: 'Registration cancelled' });
        } else {
            // Register
            await db.run('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)', [id, userId]);
            return res.json({ registered: true, message: 'Successfully registered' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getRegistrationStatus = async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return res.json({ registered: false });
        }

        const existing = await db.get('SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?', [id, userId]);
        res.json({ registered: !!existing });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registerEvent, getRegistrationStatus };