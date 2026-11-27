const crypto = require('node:crypto');
const userDb = require('../db/user.db');
const mcpTokenDb = require('../db/caller-token.db');
const passwordService = require('./password');

function createAuthService(data, passwords = passwordService) {
    return {
        async login(email, password) {
            const user = await data.findUserByEmail(email);
            if (!user) {
                return null;
            }

            const isValid = await passwords.verifyPassword(password, user.password_hash);
            if (!isValid) {
                return null;
            }

            return { id: user.id, email: user.email, role: user.role };
        },

        async signup(email, password) {
            const passwordHash = await passwords.hashPassword(password);
            const user = await data.createUser(email, passwordHash);

            if (user?.error === 'EMAIL_TAKEN') {
                const error = new Error('Email is already registered');
                error.code = 'EMAIL_TAKEN';
                throw error;
            }

            return { id: user.id, email: user.email, role: user.role };
        }
    };
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
const authService = createAuthService(userDb);

module.exports = {
    ...authService,
    ...tokenService,
    createAuthService,
    createTokenService
};
