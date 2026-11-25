const crypto = require('node:crypto');
const pool = require('./db');
const { hashPassword } = require('../services/password');

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data
        await client.query(
            'TRUNCATE users, events, registrations, mcp_tokens, "session" RESTART IDENTITY CASCADE'
        );

        // Seed users
        const passwordHash = await hashPassword('password123');
        const users = [
            ['member@example.com', 'member'],
            ['member2@example.com', 'member'],
            ['organizer@example.com', 'organizer']
        ];

        for (const [email, role] of users) {
            await client.query(
                'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
                [email, passwordHash, role]
            );
        }

        if (process.env.MCP_TOKEN) {
            const tokenHash = crypto
                .createHash('sha256')
                .update(process.env.MCP_TOKEN, 'utf8')
                .digest('hex');
            await client.query(
                `INSERT INTO mcp_tokens (user_id, token_hash)
                 SELECT id, $1 FROM users WHERE email = $2`,
                [tokenHash, 'member@example.com']
            );
            console.log('Seeded MCP token for member@example.com.');
        } else {
            console.log('MCP_TOKEN is not set; skipped seeding MCP token.');
        }

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
