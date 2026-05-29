const { getDb } = require('../config/db');
const { QueryParser, SearchEngineV2 } = require('../utils/searchEngine');


const registerEvent = async (req, res, next) => {
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

    } catch (error) { next(error); }
};

const getRegistrationStatus = async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return res.json({ registered: false });
        }

        const existing = await db.get('SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?', [id, userId]);
        res.json({ registered: !!existing });

    } catch (error) { next(error); }
};

const trackEventView = async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { visitorKey } = req.body || {};

        if (!visitorKey || typeof visitorKey !== 'string') {
            return res.status(400).json({ error: 'visitorKey is required' });
        }

        if (req.user?.role === 'admin') {
            const existingEvent = await db.get('SELECT COALESCE(views, 0) as views FROM events WHERE id = ?', [id]);
            return res.json({ success: true, ignored: 'admin', views: existingEvent?.views || 0 });
        }

        const event = await db.get('SELECT id, COALESCE(views, 0) as views FROM events WHERE id = ?', [id]);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const sanitizedVisitorKey = visitorKey.slice(0, 128);
        const dateKey = new Date().toISOString().slice(0, 10);

        const recentView = await db.get(
            `
                SELECT id
                FROM event_view_events
                WHERE event_id = ?
                  AND visitor_key = ?
                  AND created_at >= datetime('now', '-30 minutes')
                LIMIT 1
            `,
            [id, sanitizedVisitorKey]
        );

        if (recentView) {
            return res.json({ success: true, deduped: true, views: event.views });
        }

        await db.run(
            'INSERT INTO event_view_events (event_id, visitor_key, date_key) VALUES (?, ?, ?)',
            [id, sanitizedVisitorKey, dateKey]
        );

        await db.run('UPDATE events SET views = COALESCE(views, 0) + 1 WHERE id = ?', [id]);
        const updatedEvent = await db.get('SELECT COALESCE(views, 0) as views FROM events WHERE id = ?', [id]);

        res.json({ success: true, views: updatedEvent?.views || 0 });
    } catch (error) { next(error); }
};

const searchEvents = async (req, res, next) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const parser = new QueryParser(query);
        const parsed = parser.parse();
        
        const engine = new SearchEngineV2();
        const result = await engine.search(parsed);
        
        // Build top-level match_reasons map
        const matchReasonsMap = {};
        if (result.events && Array.isArray(result.events)) {
            result.events.forEach(ev => {
                matchReasonsMap[ev.id] = ev.match_reasons || [];
            });
        }

        res.json({
            query: query,
            parsed_query: parsed,
            total: result.total,
            search_time_ms: result.search_time_ms,
            relaxed_match: result.relaxed_match,
            deduped: result.deduped,
            events: result.events,
            match_reasons: matchReasonsMap
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { registerEvent, getRegistrationStatus, trackEventView, searchEvents };

