const pool = require('./db');

async function findUserByTokenHash(tokenHash) {
    const result = await pool.query(
        `SELECT users.id, users.email, users.role
         FROM mcp_tokens
         JOIN users ON users.id = mcp_tokens.user_id
         WHERE mcp_tokens.token_hash = $1`,
        [tokenHash]
    );
    return result.rows[0] ?? null;
}

module.exports = { findUserByTokenHash };
