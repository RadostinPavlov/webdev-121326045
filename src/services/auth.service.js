const crypto = require('node:crypto');
const userDb = require('../db/user.db');
const mcpTokenDb = require('../db/caller-token.db');
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

function createTokenService(data) {
    return {
        async getUserForToken(token) {
            if (typeof token !== 'string' || token.length === 0) {
                return null;
            }

            const tokenHash = crypto
                .createHash('sha256')
                .update(token, 'utf8')
                .digest('hex');
            const user = await data.findUserByTokenHash(tokenHash);

            if (!user) {
                return null;
            }

            return { id: user.id, email: user.email, role: user.role };
        }
    };
}

const tokenService = createTokenService(mcpTokenDb);

module.exports = { login, ...tokenService, createTokenService };
