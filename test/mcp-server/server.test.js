const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../../mcp-server/server');

function createFixture({ token = 'valid-token', user = { id: 7 }, service = {} } = {}) {
    const calls = [];
    const handler = createHandler({
        lectureData: [{ number: 5, title: 'Testing', topics: 'tests and tools' }],
        getToken: () => token,
        async getUserForToken(receivedToken) {
            calls.push(['getUserForToken', receivedToken]);
            return user;
        },
        eventService: {
            async listUpcomingEvents(...args) {
                calls.push(['listUpcomingEvents', ...args]);
                if (service.listUpcomingEvents) {
                    return service.listUpcomingEvents(...args);
                }
                return [{ id: 1, title: 'Club event', free_places: 3 }];
            },
            async registerForEvent(...args) {
                calls.push(['registerForEvent', ...args]);
                if (service.registerForEvent) {
                    return service.registerForEvent(...args);
                }
                return { message: 'You are registered' };
            },
            async cancelRegistration(...args) {
                calls.push(['cancelRegistration', ...args]);
                if (service.cancelRegistration) {
                    return service.cancelRegistration(...args);
                }
                return { message: 'Registration cancelled' };
            }
        }
    });

    return { handler, calls };
}

function call(id, name, args = {}) {
    return {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name, arguments: args }
    };
}

test('AC-10 list_upcoming_events returns events for the token user through the service', async () => {
    const { handler, calls } = createFixture();

    const result = await handler(call(1, 'list_upcoming_events'));

    assert.deepEqual(result.result, {
        content: [{
            type: 'text',
            text: JSON.stringify([{ id: 1, title: 'Club event', free_places: 3 }])
        }],
        isError: false
    });
    assert.deepEqual(calls, [
        ['getUserForToken', 'valid-token'],
        ['listUpcomingEvents', 7]
    ]);
});

test('AC-2 register_for_event calls the shared service and returns its message', async () => {
    const { handler, calls } = createFixture();

    const result = await handler(call(2, 'register_for_event', { event_id: 12 }));

    assert.equal(result.result.content[0].text, 'You are registered');
    assert.equal(result.result.isError, false);
    assert.deepEqual(calls, [
        ['getUserForToken', 'valid-token'],
        ['registerForEvent', 12, 7]
    ]);
});

test('AC-13 cancel_registration calls the shared service with the token user', async () => {
    const { handler, calls } = createFixture();

    const result = await handler(
        call(3, 'cancel_registration', { registration_id: 34 })
    );

    assert.equal(result.result.content[0].text, 'Registration cancelled');
    assert.equal(result.result.isError, false);
    assert.deepEqual(calls, [
        ['getUserForToken', 'valid-token'],
        ['cancelRegistration', 34, 7]
    ]);
});

test('AC-15 missing and invalid tokens return tool errors without calling event services', async () => {
    let serviceCalls = 0;
    const calls = [
        ['list_upcoming_events', {}],
        ['register_for_event', { event_id: 1 }],
        ['cancel_registration', { registration_id: 1 }]
    ];
    const makeHandler = (token, user) => createHandler({
        getToken: () => token,
        async getUserForToken() {
            return user;
        },
        eventService: {
            async listUpcomingEvents() { serviceCalls += 1; return []; },
            async registerForEvent() { serviceCalls += 1; return {}; },
            async cancelRegistration() { serviceCalls += 1; return {}; }
        }
    });

    for (const [name, args] of calls) {
        const missing = await makeHandler(undefined, null)(call(4, name, args));
        const invalid = await makeHandler('bad-token', null)(call(5, name, args));

        assert.equal(missing.result.isError, true);
        assert.match(missing.result.content[0].text, /MCP_TOKEN is not set/);
        assert.equal(invalid.result.isError, true);
        assert.match(invalid.result.content[0].text, /MCP_TOKEN is invalid/);
    }
    assert.equal(serviceCalls, 0);
});

for (const [criterion, code, message, name, args] of [
    ['AC-1', 'EVENT_FULL', 'This event is full', 'register_for_event', { event_id: 1 }],
    ['AC-3', 'ALREADY_REGISTERED', 'You are already registered', 'register_for_event', { event_id: 1 }],
    ['AC-16', 'EVENT_NOT_FOUND', 'Event not found', 'register_for_event', { event_id: 999 }],
    ['AC-17', 'EVENT_STARTED', 'This event has already started', 'register_for_event', { event_id: 1 }]
]) {
    test(`${criterion} ${name} returns service failures as readable tool errors`, async () => {
        const { handler } = createFixture({
            service: {
                async registerForEvent() {
                    const error = new Error(message);
                    error.code = code;
                    throw error;
                }
            }
        });

        const result = await handler(call(6, name, args));

        assert.equal(result.error, undefined);
        assert.equal(result.result.isError, true);
        assert.equal(result.result.content[0].text, message);
    });
}

test('AC-14 cancel_registration returns the service ownership failure as a tool error', async () => {
    const message = 'You are not allowed to cancel this registration';
    const { handler } = createFixture({
        service: {
            async cancelRegistration() {
                throw Object.assign(new Error(message), {
                    code: 'REGISTRATION_FORBIDDEN'
                });
            }
        }
    });

    const result = await handler(
        call(7, 'cancel_registration', { registration_id: 34 })
    );

    assert.equal(result.error, undefined);
    assert.equal(result.result.isError, true);
    assert.equal(result.result.content[0].text, message);
});

test('unknown tool names still return JSON-RPC error -32602', async () => {
    const { handler } = createFixture();

    const result = await handler(call(8, 'unknown_tool'));

    assert.deepEqual(result.error, { code: -32602, message: 'Unknown tool' });
});

test('tools/list retains Exercise 1 tools and advertises all three event tools', async () => {
    const { handler } = createFixture();
    const result = await handler({ jsonrpc: '2.0', id: 9, method: 'tools/list' });

    assert.deepEqual(
        result.result.tools.map((tool) => tool.name),
        [
            'find_lecture',
            'list_lectures',
            'list_upcoming_events',
            'register_for_event',
            'cancel_registration'
        ]
    );
    assert.ok(result.result.tools.every((tool) => tool.description.length >= 20));
});
