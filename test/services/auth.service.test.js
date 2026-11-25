const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createTokenService } = require('../../src/services/auth.service');

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
