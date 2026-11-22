const userDb = require('../db/user.db');
const passwordService = require('./password');

async function login(email, password) {
    const user = await userDb.findUserByEmail(email);

    if (!user) {
        return null;
    }

    const isValid = await passwordService.verifyPassword(password, user.password_hash);
    if (!isValid) {
        return null;
    }

    return { id: user.id, email: user.email, role: user.role };
}

module.exports = { login };
