const pool = require('./db');

async function findUserByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
}

async function createUser(email, passwordHash) {
    try {
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, 'member')
             RETURNING id, email, role`,
            [email, passwordHash]
        );
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            return { error: 'EMAIL_TAKEN' };
        }
        throw error;
    }
}

module.exports = {
    findUserByEmail,
    createUser
};
