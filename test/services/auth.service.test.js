const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
    createAuthService,
    createTokenService
} = require('../../src/services/auth.service');

test('login returns only a valid user and rejects missing users or incorrect passwords', async () => {
    const existing = {
        id: 10,
        email: 'member@example.com',
        role: 'member',
        password_hash: 'stored-hash'
    };
    const service = createAuthService({
        async findUserByEmail(email) {
            return email === existing.email ? existing : null;
        }
    }, {
        async verifyPassword(password, hash) {
            return password === 'correct' && hash === existing.password_hash;
        }
    });

    assert.deepEqual(await service.login('member@example.com', 'correct'), {
        id: 10,
        email: 'member@example.com',
        role: 'member'
    });
    assert.equal(await service.login('member@example.com', 'incorrect'), null);
    assert.equal(await service.login('missing@example.com', 'correct'), null);
});

test('AC-7 signup creates a member with a password hash, never the plaintext password', async () => {
    const createdUsers = [];
    const password = 'correct horse battery staple';
    const service = createAuthService({
        async createUser(email, passwordHash) {
            const user = { id: 21, email, passwordHash, role: 'member' };
            createdUsers.push(user);
            return user;
        }
    }, {
        async hashPassword(value) {
            assert.equal(value, password);
            return 'salted-password-hash';
        }
    });

    const user = await service.signup('new-member@example.com', password);

    assert.deepEqual(user, {
        id: 21,
        email: 'new-member@example.com',
        role: 'member'
    });
    assert.deepEqual(createdUsers, [{
        id: 21,
        email: 'new-member@example.com',
        passwordHash: 'salted-password-hash',
        role: 'member'
    }]);
    assert.notEqual(createdUsers[0].passwordHash, password);
});

test('AC-7 signup maps the email-taken data result to a domain error', async () => {
    const service = createAuthService({
        async createUser() {
            return { error: 'EMAIL_TAKEN' };
        }
    }, {
        async hashPassword() {
            return 'salted-password-hash';
        }
    });

    await assert.rejects(
        service.signup('existing@example.com', 'password'),
        (error) => {
            assert.equal(error.code, 'EMAIL_TAKEN');
            assert.equal(error.message, 'Email is already registered');
            assert.equal(error.code.startsWith('23505'), false);
            return true;
        }
    );
});

test('AC-15 a valid MCP token is hashed before lookup and returns its user', async () => {
    const token = 'member-token-for-tests';
    const expectedHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    let lookedUpHash;
    const user = { id: 1, email: 'member@example.com', role: 'member' };
    const service = createTokenService({
        async findUserByTokenHash(tokenHash) {
            lookedUpHash = tokenHash;
            return user;
        }
    });

    assert.deepEqual(await service.getUserForToken(token), user);
    assert.equal(lookedUpHash, expectedHash);
    assert.notEqual(lookedUpHash, token);
});

test('AC-15 a missing MCP token skips lookup and an unknown token returns no user', async () => {
    let lookups = 0;
    const service = createTokenService({
        async findUserByTokenHash() {
            lookups += 1;
            return null;
        }
    });

    assert.equal(await service.getUserForToken(undefined), null);
    assert.equal(await service.getUserForToken(''), null);
    assert.equal(await service.getUserForToken('unknown-token'), null);
    assert.equal(lookups, 1);
});
