const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../../src/services/password');

test('password hashes verify the original password but not a different one', async () => {
    const hash = await hashPassword('correct horse battery staple');

    assert.match(hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.equal(await verifyPassword('correct horse battery staple', hash), true);
    assert.equal(await verifyPassword('wrong password', hash), false);
    assert.equal(await verifyPassword('wrong password', `${hash.split(':')[0]}:00`), false);
});
