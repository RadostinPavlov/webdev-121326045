const pool = require('../db/db');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const derivedKey = await scrypt(password, salt, 64);
    return derivedKey.toString('hex') === hash;
}

async function login(email, password) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
        return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        return null;
    }

    return { id: user.id, email: user.email, role: user.role };
}

module.exports = { login };
