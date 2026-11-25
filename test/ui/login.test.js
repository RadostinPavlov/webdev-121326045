const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoginPage } = require('../../src/public/js/login.js');

function response(status, body) {
    return {
        ok: status >= 200 && status < 300,
        async json() {
            return body;
        }
    };
}

test('AC-7 signup submits email and password and shows the API confirmation', async () => {
    const messages = [];
    const requests = [];
    const page = createLoginPage({
        async fetch(url, options) {
            requests.push({ url, options });
            return response(201, { message: 'Account created' });
        },
        redirect() {
            assert.fail('Sign-up must not redirect before the member signs in');
        },
        showLoginMessage() {},
        showSignupMessage(message) {
            messages.push(message);
        }
    });

    await page.signup('new@example.com', 'password123');

    assert.deepEqual(requests[0], {
        url: '/api/auth/signup',
        options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'new@example.com', password: 'password123' })
        }
    });
    assert.deepEqual(messages, ['Account created']);
});

test('AC-7 signup displays an existing-email error from the API', async () => {
    const messages = [];
    const page = createLoginPage({
        async fetch() {
            return response(409, { error: 'Email is already registered' });
        },
        redirect() {},
        showLoginMessage() {},
        showSignupMessage(message) {
            messages.push(message);
        }
    });

    await page.signup('existing@example.com', 'password123');

    assert.deepEqual(messages, ['Email is already registered']);
});
