const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
    const [salt, hashHex] = storedHash.split(':');
    const hash = Buffer.from(hashHex, 'hex');
    const derivedKey = await scrypt(password, salt, 64);
    
    if (derivedKey.length !== hash.length) {
        return false;
    }
    
    return crypto.timingSafeEqual(derivedKey, hash);
}

module.exports = {
    hashPassword,
    verifyPassword
};
