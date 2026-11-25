const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { once } = require('node:events');
const session = require('express-session');
const { createApp } = require('../../src/app');
const { createEventService } = require('../../src/services/event.service');
const {
    createModelAssistanceService
} = require('../../src/services/model-assistance.service');

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
    attendees = [],
    eventService: injectedEventService,
    modelAssistanceService: injectedModelAssistanceService,
    authService: injectedAuthService
} = {}) {
    const eventRows = new Map(events.map((event) => [event.id, { ...event }]));
    const registrationRows = registrations.map((registration) => ({ ...registration }));
    const attendeeRows = attendees.map((attendee) => ({ ...attendee }));
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
        async createEvent(event) {
            const id = Math.max(0, ...eventRows.keys()) + 1;
            const created = { id, ...event };
            eventRows.set(id, created);
            return created;
        },
        async getEventById(eventId) {
            return eventRows.get(eventId) ?? null;
        },
        async getEventAttendees(eventId) {
            return attendeeRows.filter((attendee) => attendee.eventId === eventId);
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
        ...(injectedModelAssistanceService
            ? { modelAssistanceService: injectedModelAssistanceService }
            : {}),
        ...(injectedAuthService ? { authService: injectedAuthService } : {}),
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
        const pageHtml = await pageResponse.text();

        assert.equal(pageResponse.status, 200);
        assert.equal(catalogResponse.status, 200);
        assert.match(pageHtml, /src="\/js\/events-view\.js"/);
        assert.match(pageHtml, /src="\/js\/events\.js"/);
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

test('AC-4 an organizer creates an event and validation errors map to 400', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const event = {
            title: 'Community Dinner',
            date: futureDate(60).toISOString(),
            capacity: 24
        };
        const response = await request(
            harness,
            '/api/events',
            jsonOptions('POST', cookie, event)
        );
        const created = await response.json();

        assert.equal(response.status, 201);
        assert.equal(created.title, event.title);
        assert.equal(created.capacity, event.capacity);
        assert.equal(created.organizerId, 300);
        assert.ok(harness.eventRows.has(created.id));

        const invalidResponse = await request(
            harness,
            '/api/events',
            jsonOptions('POST', cookie, { ...event, capacity: 0 })
        );
        assert.equal(invalidResponse.status, 400);
        assert.deepEqual(
            await invalidResponse.json(),
            { error: 'Title, future date, and positive integer capacity are required' }
        );
    });
});

test('AC-4 and AC-6 event creation checks session before the service and maps its 403', async (t) => {
    let serviceCalls = 0;
    const eventService = {
        async createEvent() {
            serviceCalls += 1;
            throw Object.assign(new Error('Only organizers can create events'), {
                code: 'FORBIDDEN'
            });
        }
    };

    await withHarness(t, { eventService }, async (harness) => {
        const noSessionResponse = await request(
            harness,
            '/api/events',
            jsonOptions('POST', null, { title: 'Event', date: futureDate(), capacity: 4 })
        );
        assert.equal(noSessionResponse.status, 401);
        assert.equal(serviceCalls, 0);

        const memberCookie = await harness.cookieFor({ id: 100, role: 'member' });
        const memberResponse = await request(
            harness,
            '/api/events',
            jsonOptions(
                'POST',
                memberCookie,
                { title: 'Event', date: futureDate(), capacity: 4 }
            )
        );

        assert.equal(memberResponse.status, 403);
        assert.deepEqual(await memberResponse.json(), {
            error: 'Only organizers can create events'
        });
        assert.equal(serviceCalls, 1);
    });
});

test('AC-20 description draft route returns a draft from the service for an organizer', async (t) => {
    const calls = [];
    const modelAssistanceService = {
        async draftDescription(user, event) {
            calls.push({ user, event });
            return { description: 'Editable draft', source: 'model' };
        }
    };

    await withHarness(t, { modelAssistanceService }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const event = {
            title: 'Community Dinner',
            date: futureDate(60).toISOString(),
            time: '18:30',
            venue: 'Club Hall',
            audience: 'members',
            notes: 'Bring a dish'
        };
        const response = await request(
            harness,
            '/api/events/description-draft',
            jsonOptions('POST', cookie, event)
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            description: 'Editable draft',
            source: 'model'
        });
        assert.deepEqual(calls, [{ user: { id: 300, role: 'organizer' }, event }]);
    });
});

test('AC-21 description draft route returns the service fallback message', async (t) => {
    const modelAssistanceService = {
        async draftDescription() {
            return {
                description: 'Join us for Community Dinner at Club Hall.',
                source: 'fallback',
                message: 'Suggested without the model'
            };
        }
    };

    await withHarness(t, { modelAssistanceService }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const response = await request(
            harness,
            '/api/events/description-draft',
            jsonOptions('POST', cookie, { title: 'Community Dinner' })
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            description: 'Join us for Community Dinner at Club Hall.',
            source: 'fallback',
            message: 'Suggested without the model'
        });
    });
});

test('AC-22 poster extraction route accepts an image JSON body larger than 100 KB', async (t) => {
    const calls = [];
    const modelAssistanceService = {
        async extractFromPoster(user, image) {
            calls.push({ user, image });
            return {
                title: 'Open Day',
                date: '2099-06-12',
                time: '18:30',
                venue: 'Club Hall',
                capacity: 40,
                source: 'model'
            };
        }
    };

    await withHarness(t, { modelAssistanceService }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const imageBytes = Buffer.alloc(160 * 1024);
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(imageBytes);
        const image = {
            mimeType: 'image/png',
            data: imageBytes.toString('base64')
        };
        const body = JSON.stringify(image);
        assert.ok(Buffer.byteLength(body) > 100 * 1024);

        const response = await request(
            harness,
            '/api/events/poster-extraction',
            {
                method: 'POST',
                headers: {
                    Cookie: cookie,
                    'Content-Type': 'application/json'
                },
                body
            }
        );

        assert.equal(response.status, 200);
        assert.equal((await response.json()).title, 'Open Day');
        assert.deepEqual(calls, [{ user: { id: 300, role: 'organizer' }, image }]);
    });
});

test('AC-22 poster extraction maps an invalid image from the service to 400', async (t) => {
    const modelAssistanceService = createModelAssistanceService({
        client: {
            isConfigured() {
                throw new Error('Invalid images must be rejected before the client');
            }
        }
    });

    await withHarness(t, { modelAssistanceService }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const response = await request(
            harness,
            '/api/events/poster-extraction',
            jsonOptions('POST', cookie, {
                mimeType: 'image/gif',
                data: 'R0lGODlh'
            })
        );

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: 'Upload a PNG or JPEG poster' });
    });
});

test('AC-23 poster extraction returns invalid date and capacity fields for manual entry', async (t) => {
    const modelAssistanceService = {
        async extractFromPoster() {
            return {
                title: 'Open Day',
                date: '',
                time: '18:30',
                venue: 'Club Hall',
                capacity: '',
                source: 'model',
                message: 'Please fill in the date and capacity by hand.'
            };
        }
    };

    await withHarness(t, { modelAssistanceService }, async (harness) => {
        const cookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const response = await request(
            harness,
            '/api/events/poster-extraction',
            jsonOptions('POST', cookie, {
                mimeType: 'image/png',
                data: 'iVBORw0KGgoAAAAA'
            })
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            title: 'Open Day',
            date: '',
            time: '18:30',
            venue: 'Club Hall',
            capacity: '',
            source: 'model',
            message: 'Please fill in the date and capacity by hand.'
        });
    });
});

test('AC-24 model assistance routes return 401 without a session and service 403 for members', async (t) => {
    let clientCalls = 0;
    const modelAssistanceService = createModelAssistanceService({
        client: {
            isConfigured() {
                clientCalls += 1;
                return true;
            },
            async generateText() {
                clientCalls += 1;
                return 'Draft';
            },
            async generateJson() {
                clientCalls += 1;
                return '{}';
            }
        }
    });

    await withHarness(t, { modelAssistanceService }, async (harness) => {
        const body = {
            title: 'Community Dinner',
            mimeType: 'image/png',
            data: 'iVBORw0KGgoAAAAA'
        };
        for (const [path, payload] of [
            ['/api/events/description-draft', body],
            ['/api/events/poster-extraction', {
                mimeType: body.mimeType,
                data: body.data
            }]
        ]) {
            const unauthenticated = await request(
                harness,
                path,
                jsonOptions('POST', null, payload)
            );
            assert.equal(unauthenticated.status, 401);

            const memberCookie = await harness.cookieFor({ id: 100, role: 'member' });
            const forbidden = await request(
                harness,
                path,
                jsonOptions('POST', memberCookie, payload)
            );
            assert.equal(forbidden.status, 403);
            assert.deepEqual(await forbidden.json(), {
                error: 'Only organizers can use model assistance'
            });
        }
        assert.equal(clientCalls, 0);
    });
});

test('AC-6 a member receives 403 from the event service when creating an event', async (t) => {
    await withHarness(t, {}, async (harness) => {
        const cookie = await harness.cookieFor({ id: 100, role: 'member' });
        const response = await request(
            harness,
            '/api/events',
            jsonOptions('POST', cookie, {
                title: 'Unauthorized Event',
                date: futureDate(60).toISOString(),
                capacity: 10
            })
        );

        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), {
            error: 'Only organizers can create events'
        });
        assert.equal(harness.eventRows.size, 3);
    });
});

test('AC-5 only an event owner can see its attendees; missing event returns 404', async (t) => {
    const attendee = {
        eventId: 9,
        registrationId: 70,
        userId: 101,
        email: 'member@example.com'
    };
    await withHarness(t, {
        events: [{
            id: 9,
            title: 'Owner event',
            date: futureDate(),
            capacity: 10,
            organizerId: 300
        }],
        attendees: [attendee]
    }, async (harness) => {
        const ownerCookie = await harness.cookieFor({ id: 300, role: 'organizer' });
        const ownerResponse = await request(
            harness,
            '/api/events/9/attendees',
            { headers: { Cookie: ownerCookie } }
        );
        assert.equal(ownerResponse.status, 200);
        assert.deepEqual(await ownerResponse.json(), [attendee]);

        const otherOrganizerCookie = await harness.cookieFor({
            id: 301,
            role: 'organizer'
        });
        const forbiddenResponse = await request(
            harness,
            '/api/events/9/attendees',
            { headers: { Cookie: otherOrganizerCookie } }
        );
        assert.equal(forbiddenResponse.status, 403);

        const missingResponse = await request(
            harness,
            '/api/events/999/attendees',
            { headers: { Cookie: ownerCookie } }
        );
        assert.equal(missingResponse.status, 404);
        assert.deepEqual(await missingResponse.json(), { error: 'Event not found' });
    });
});

test('AC-5 unauthenticated attendee lookup returns 401 before the service', async (t) => {
    let serviceCalls = 0;
    const eventService = {
        async listEventAttendees() {
            serviceCalls += 1;
            return [];
        }
    };

    await withHarness(t, { eventService }, async (harness) => {
        const response = await request(harness, '/api/events/1/attendees');

        assert.equal(response.status, 401);
        assert.equal(serviceCalls, 0);
    });
});

test('AC-7 signup creates an account and maps an existing email to 409', async (t) => {
    const signupCalls = [];
    const authService = {
        async signup(email, password) {
            signupCalls.push([email, password]);
            if (email === 'existing@example.com') {
                throw Object.assign(new Error('Email is already registered'), {
                    code: 'EMAIL_TAKEN'
                });
            }
            return { id: 501, email, role: 'member' };
        }
    };

    await withHarness(t, { authService }, async (harness) => {
        const response = await request(
            harness,
            '/api/auth/signup',
            jsonOptions('POST', null, {
                email: 'new@example.com',
                password: 'a secure password'
            })
        );

        assert.equal(response.status, 201);
        assert.deepEqual(await response.json(), {
            message: 'Account created',
            user: { id: 501, email: 'new@example.com', role: 'member' }
        });
        assert.deepEqual(signupCalls[0], ['new@example.com', 'a secure password']);

        const duplicateResponse = await request(
            harness,
            '/api/auth/signup',
            jsonOptions('POST', null, {
                email: 'existing@example.com',
                password: 'a secure password'
            })
        );
        assert.equal(duplicateResponse.status, 409);
        assert.deepEqual(await duplicateResponse.json(), {
            error: 'Email is already registered'
        });
    });
});
