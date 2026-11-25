const pool = require('./db');

async function getUpcomingEvents(userId) {
    const query = `
        SELECT 
            e.id, 
            e.title, 
            e.date, 
            e.capacity,
            member_registration.id AS registration_id,
            (e.capacity - (
                SELECT COUNT(*)
                FROM registrations event_registration
                WHERE event_registration.event_id = e.id
            ))::int AS free_places
        FROM events e
        LEFT JOIN registrations member_registration
            ON member_registration.event_id = e.id
            AND member_registration.user_id = $1
        WHERE e.date >= NOW()
        ORDER BY e.date ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

async function withEventLock(eventId, fn) {
    const client = await pool.connect();
    let transactionOpen = false;

    try {
        await client.query('BEGIN');
        transactionOpen = true;

        const eventResult = await client.query(
            `SELECT id, title, date, capacity, description
             FROM events
             WHERE id = $1
             FOR UPDATE`,
            [eventId]
        );
        const event = eventResult.rows[0] ?? null;

        const transaction = {
            event,
            async findRegistration(userId) {
                const result = await client.query(
                    `SELECT id, event_id AS "eventId", user_id AS "userId"
                     FROM registrations
                     WHERE event_id = $1 AND user_id = $2`,
                    [eventId, userId]
                );
                return result.rows[0] ?? null;
            },
            async countRegistrations() {
                const result = await client.query(
                    `SELECT COUNT(*)::int AS count
                     FROM registrations
                     WHERE event_id = $1`,
                    [eventId]
                );
                return result.rows[0].count;
            },
            async createRegistration(userId) {
                const result = await client.query(
                    `INSERT INTO registrations (event_id, user_id)
                     VALUES ($1, $2)
                     RETURNING id, event_id AS "eventId", user_id AS "userId",
                               created_at AS "createdAt"`,
                    [eventId, userId]
                );
                return result.rows[0];
            }
        };

        const result = await fn(transaction);
        await client.query('COMMIT');
        transactionOpen = false;
        return result;
    } catch (error) {
        if (transactionOpen) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        client.release();
    }
}

async function getRegistrationById(registrationId) {
    const result = await pool.query(
        `SELECT id, event_id AS "eventId", user_id AS "userId"
         FROM registrations
         WHERE id = $1`,
        [registrationId]
    );
    return result.rows[0] ?? null;
}

async function deleteRegistration(registrationId, userId) {
    await pool.query(
        'DELETE FROM registrations WHERE id = $1 AND user_id = $2',
        [registrationId, userId]
    );
}

module.exports = {
    getUpcomingEvents,
    withEventLock,
    getRegistrationById,
    deleteRegistration
};
