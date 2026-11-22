const pool = require('./db');

async function getUpcomingEvents() {
    const query = `
        SELECT 
            e.id, 
            e.title, 
            e.date, 
            e.capacity,
            (e.capacity - (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id))::int as free_places
        FROM events e
        WHERE e.date >= NOW()
        ORDER BY e.date ASC
    `;
    const result = await pool.query(query);
    return result.rows;
}

module.exports = {
    getUpcomingEvents
};
