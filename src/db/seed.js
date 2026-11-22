const pool = require('./db');
const { hashPassword } = require('../services/password');

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data
        await client.query('TRUNCATE users, events, registrations CASCADE');

        // Seed user
        const passwordHash = await hashPassword('password123');
        await client.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
            ['member@example.com', passwordHash, 'member']
        );

        // Seed events
        const events = [
            ['Tech Talk: Future of AI', new Date(Date.now() + 86400000 * 7), 50, 'A deep dive into AI trends.'],
            ['Yoga in the Park', new Date(Date.now() + 86400000 * 2), 20, 'Relaxing morning yoga session.'],
            ['Book Club: Sci-Fi Classics', new Date(Date.now() + 86400000 * 5), 15, 'Discussing Dune and Foundation.']
        ];

        for (const [title, date, capacity, description] of events) {
            await client.query(
                'INSERT INTO events (title, date, capacity, description) VALUES ($1, $2, $3, $4)',
                [title, date, capacity, description]
            );
        }

        await client.query('COMMIT');
        console.log('Database seeded successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { seed };
