const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { once } = require('node:events');
const session = require('express-session');
const { createApp } = require('../../src/app');
const { createEventService } = require('../../src/services/event.service');

const SESSION_SECRET = 'route-tests-only-secret';

function futureDate(daysFromNow = 30) {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

function createHarness({
    events = [
        { id: 1, title: 'Book Club', date: futureDate(5), capacity: 10 },
        { id: 2, title: 'Film Night', date: futureDate(10), capacity: 8 },
        { id: 3, title: 'Board Games', date: futureDate(15), capacity: 12 }
    ],
    registrations = [],
    eventService: injectedEventService
} = {}) {
    const eventRows = new Map(events.map((event) => [event.id, { ...event }]));
    const registrationRows = registrations.map((registration) => ({ ...registration }));
    let nextRegistrationId =
        Math.max(0, ...registrationRows.map((registration) => registration.id)) + 1;

    const defaultService = createEventService({
        async getUpcomingEvents() {
            return [...eventRows.values()]
                .filter((event) => new Date(event.date).getTime() >= Date.now())
                .sort((left, right) => new Date(left.date) - new Date(right.date))
                .map((event) => ({
                    ...event,
                    free_places: event.capacity -
                        registrationRows.filter((row) => row.eventId === event.id).length
                }));
        },
        async withEventLock(eventId, callback) {
            const event = eventRows.get(eventId) ?? null;
            return callback({
                event,
                async findRegistration(userId) {
                    return registrationRows.find(
                        (row) => row.eventId === eventId && row.userId === userId
                    ) ?? null;
                },
                async countRegistrations() {
                    return registrationRows.filter((row) => row.eventId === eventId).length;
                },
                async createRegistration(userId) {
                    const row = { id: nextRegistrationId++, eventId, userId };
                    registrationRows.push(row);
                    return row;
                }
            });
        },
        async getRegistrationById(registrationId) {
            return registrationRows.find((row) => row.id === registrationId) ?? null;
        },
        async deleteRegistration(registrationId, userId) {
            const index = registrationRows.findIndex(
                (row) => row.id === registrationId && row.userId === userId
            );
            if (index !== -1) {
                registrationRows.splice(index, 1);
            }
        }
    });
    const service = injectedEventService ?? defaultService;
    const store = new session.MemoryStore();
    const app = createApp({
        eventService: service,
        sessionOptions: {
            store,
            secret: SESSION_SECRET,
            resave: false,
            saveUninitialized: false
        }
    });
    const server = app.listen(0);
    let baseUrlPromise;

    return {
        eventRows,
        registrationRows,
        server,
        async start() {
            if (!baseUrlPromise) {
                baseUrlPromise = once(server, 'listening').then(
                    () => `http://127.0.0.1:${server.address().port}`
                );
            }
            return baseUrlPromise;
        },
        async close() {
            const closed = once(server, 'close');
            server.close();
            server.closeAllConnections();
            await closed;
        },
        async cookieFor(user) {
            const sid = `test-session-${user.id}`;
            const cookie = {
                originalMaxAge: null,
                expires: null,
                secure: false,
                httpOnly: true,
                path: '/',
                sameSite: false
            };
            await new Promise((resolve, reject) => {
                store.set(sid, { cookie, user }, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            const signature = createHmac('sha256', SESSION_SECRET)
                .update(sid)
                .digest('base64')
                .replace(/=+$/, '');
            return `connect.sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
        }
    };
}

async function request(harness, path, options = {}) {
    const baseUrl = await harness.start();
    return fetch(`${baseUrl}${path}`, {
        redirect: 'manual',
        ...options,
        headers: options.headers ?? {}
    });
}

function jsonOptions(method, cookie, body) {
    return {
        method,
        headers: {
            ...(cookie ? { Cookie: cookie } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    };
}

async function withHarness(t, options, callback) {
    const harness = createHarness(options);
    t.after(() => harness.close());
    await harness.start();
    await callback(harness);
}

test('AC-1 a full event returns 409 and does not add a registration', async (t) => {
    await withHarness(t, {
        events: [{ id: 1, title: 'Full', date: futureDate(), capacity: 1 }],
        registrations: [{ id: 10, eventId: 1, userId: 100 }]
    }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 200 });
        const response = await request(
            harness,
            '/api/events/1/registrations',
            jsonOptions('POST', cookie)
        );

        assert.equal(response.status, 409);
        assert.deepEqual(await response.json(), { error: 'This event is full' });
        assert.equal(harness.registrationRows.length, 1);
    });
});

test('AC-2 a member registers for an event with free places', async (t) => {
    await withHarness(t, {
        events: [{ id: 1, title: 'Open', date: futureDate(), capacity: 2 }]
    }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const response = await request(
            harness,
            '/api/events/1/registrations',
            jsonOptions('POST', cookie)
        );

        assert.equal(response.status, 201);
        assert.deepEqual(await response.json(), { message: 'You are registered' });
        assert.deepEqual(harness.registrationRows, [
            { id: 1, eventId: 1, userId: 100 }
        ]);
    });
});

test('AC-3 registering twice returns 409 and keeps one registration', async (t) => {
    await withHarness(t, {
        events: [{ id: 1, title: 'Open', date: futureDate(), capacity: 2 }],
        registrations: [{ id: 10, eventId: 1, userId: 100 }]
    }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const response = await request(
            harness,
            '/api/events/1/registrations',
            jsonOptions('POST', cookie)
        );

        assert.equal(response.status, 409);
        assert.deepEqual(await response.json(), { error: 'You are already registered' });
        assert.deepEqual(harness.registrationRows, [
            { id: 10, eventId: 1, userId: 100 }
        ]);
    });
});

test('AC-8 a visitor is sent to login before registering for an event', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const pageResponse = await request(harness, '/events');
        const registrationResponse = await request(
            harness,
            '/api/events/1/registrations',
            jsonOptions('POST')
        );

        assert.equal(pageResponse.status, 302);
        assert.equal(pageResponse.headers.get('location'), '/login');
        assert.equal(registrationResponse.status, 401);
        assert.equal(harness.registrationRows.length, 0);
    });
});

test('AC-9 a visitor opening /events is redirected to /login', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const response = await request(harness, '/events');

        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), '/login');
    });
});

test('AC-10 a signed-in events page loads three events with dates and free places', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const pageResponse = await request(harness, '/events', {
            headers: { Cookie: cookie }
        });
        const catalogResponse = await request(harness, '/api/events', {
            headers: { Cookie: cookie }
        });
        const catalog = await catalogResponse.json();

        assert.equal(pageResponse.status, 200);
        assert.equal(catalogResponse.status, 200);
        assert.match(await pageResponse.text(), /fetch\(['"]\/api\/events['"]\)/);
        assert.equal(catalog.length, 3);
        for (const event of catalog) {
            assert.ok(event.title);
            assert.ok(event.date);
            assert.equal(typeof event.free_places, 'number');
        }
    });
});

test('AC-11 reloading the catalog reflects an event removed from the data store', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const options = { headers: { Cookie: cookie } };
        const initialResponse = await request(harness, '/api/events', options);
        assert.equal((await initialResponse.json()).length, 3);

        harness.eventRows.delete(2);
        const reloadedResponse = await request(harness, '/api/events', options);

        assert.deepEqual(
            (await reloadedResponse.json()).map((event) => event.id),
            [1, 3]
        );
    });
});

test('AC-12 the root redirects to /events and visitors are then sent to /login', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const rootResponse = await request(harness, '/');
        const eventsResponse = await request(harness, rootResponse.headers.get('location'));

        assert.equal(rootResponse.status, 302);
        assert.equal(rootResponse.headers.get('location'), '/events');
        assert.equal(eventsResponse.status, 302);
        assert.equal(eventsResponse.headers.get('location'), '/login');
    });
});

test('AC-14 cancelling another member registration returns 403 and keeps the row', async (t) => {
    const serviceCalls = [];
    const serviceError = Object.assign(
        new Error('You are not allowed to cancel this registration'),
        { code: 'REGISTRATION_FORBIDDEN' }
    );
    const eventService = {
        async cancelRegistration(registrationId, userId) {
            serviceCalls.push(['cancelRegistration', registrationId, userId]);
            throw serviceError;
        }
    };

    await withHarness(t, {
        eventService,
        registrations: [{ id: 10, eventId: 1, userId: 100 }]
    }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 200 });
        const response = await request(
            harness,
            '/api/registrations/10',
            jsonOptions('DELETE', cookie)
        );

        assert.equal(response.status, 403);
        assert.deepEqual(
            await response.json(),
            { error: 'You are not allowed to cancel this registration' }
        );
        assert.deepEqual(serviceCalls, [['cancelRegistration', 10, 200]]);
        assert.deepEqual(harness.registrationRows, [
            { id: 10, eventId: 1, userId: 100 }
        ]);
    });
});

test('cancelling an owned registration returns 200 and removes the row', async (t) => {
    await withHarness(t, {
        registrations: [{ id: 10, eventId: 1, userId: 100 }]
    }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const response = await request(
            harness,
            '/api/registrations/10',
            jsonOptions('DELETE', cookie)
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { message: 'Registration cancelled' });
        assert.deepEqual(harness.registrationRows, []);
    });
});

test('cancelling a missing registration returns 404', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const response = await request(
            harness,
            '/api/registrations/999',
            jsonOptions('DELETE', cookie)
        );

        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: 'Registration not found' });
        assert.deepEqual(harness.registrationRows, []);
    });
});

test('AC-15 registration and cancellation without a session return 401 unchanged', async (t) => {
    const serviceCalls = [];
    const eventService = {
        async registerForEvent(...args) {
            serviceCalls.push(['registerForEvent', ...args]);
        },
        async cancelRegistration(...args) {
            serviceCalls.push(['cancelRegistration', ...args]);
        }
    };

    await withHarness(t, {
        eventService,
        registrations: [{ id: 10, eventId: 1, userId: 100 }]
    }, async (harness) => {
        const before = structuredClone(harness.registrationRows);
        const registerResponse = await request(
            harness,
            '/api/events/1/registrations',
            jsonOptions('POST')
        );
        const cancelResponse = await request(
            harness,
            '/api/registrations/10',
            jsonOptions('DELETE')
        );

        assert.equal(registerResponse.status, 401);
        assert.equal(cancelResponse.status, 401);
        assert.deepEqual(serviceCalls, []);
        assert.deepEqual(harness.registrationRows, before);
    });
});

test('invalid registration route IDs return 400 without changing data', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const invalidEventIdResponse = await request(
            harness,
            '/api/events/not-an-id/registrations',
            jsonOptions('POST', cookie)
        );
        const invalidRegistrationIdResponse = await request(
            harness,
            '/api/registrations/0',
            jsonOptions('DELETE', cookie)
        );

        assert.equal(invalidEventIdResponse.status, 400);
        assert.equal(invalidRegistrationIdResponse.status, 400);
        assert.deepEqual(harness.registrationRows, []);
    });
});

test('AC-16 registering for a missing event returns 404 without adding a row', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const response = await request(
            harness,
            '/api/events/999/registrations',
            jsonOptions('POST', cookie)
        );

        assert.equal(response.status, 404);
        assert.deepEqual(harness.registrationRows, []);
    });
});

test('AC-17 registering for a past event returns 409 without adding a row', async (t) => {
    await withHarness(t, {
        events: [{ id: 1, title: 'Past', date: new Date('2000-01-01T00:00:00Z'), capacity: 5 }]
    }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100 });
        const response = await request(
            harness,
            '/api/events/1/registrations',
            jsonOptions('POST', cookie)
        );

        assert.equal(response.status, 409);
        assert.deepEqual(
            await response.json(),
            { error: 'This event has already started' }
        );
        assert.deepEqual(harness.registrationRows, []);
    });
});
