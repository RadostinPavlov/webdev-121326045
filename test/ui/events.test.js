const test = require('node:test');
const assert = require('node:assert/strict');
const EventsView = require('../../src/public/js/events-view.js');
const { createEventsPage } = require('../../src/public/js/events.js');

function response(status, body) {
    return {
        status,
        ok: status >= 200 && status < 300,
        async json() {
            return body;
        }
    };
}

function createPage(fetch) {
    const states = [];
    const redirects = [];
    const page = createEventsPage({
        fetch,
        render(state) {
            states.push(state);
        },
        redirect(path) {
            redirects.push(path);
        }
    });

    return {
        page,
        states,
        redirects,
        get html() {
            return EventsView.render(states.at(-1));
        }
    };
}

test('AC-2 registering shows the API message and the updated Cancel button', async () => {
    const event = {
        id: 1,
        title: 'Book Club',
        date: '2100-01-01T18:00:00.000Z',
        capacity: 10,
        free_places: 4,
        registration_id: null
    };
    const requests = [];
    let catalogRequestCount = 0;
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events') {
            catalogRequestCount += 1;
            return response(200, [
                catalogRequestCount === 1
                    ? event
                    : { ...event, free_places: 3, registration_id: 42 }
            ]);
        }
        return response(201, { message: 'You are registered' });
    });

    await ui.page.loadEvents();
    assert.match(ui.html, />Register<\/button>/);
    await ui.page.register(1);

    assert.deepEqual(requests[1], {
        url: '/api/events/1/registrations',
        options: { method: 'POST' }
    });
    assert.match(ui.html, /You are registered/);
    assert.match(ui.html, /data-registration-id="42"/);
    assert.match(ui.html, />Cancel registration<\/button>/);
});

test('AC-8 a registration request receiving 401 redirects to /login', async () => {
    const ui = createPage(async () => response(401, { error: 'Not signed in' }));

    await ui.page.register(1);

    assert.deepEqual(ui.redirects, ['/login']);
});

test('AC-13 cancelling shows the API message and restores the Register button', async () => {
    const event = {
        id: 1,
        title: 'Book Club',
        date: '2100-01-01T18:00:00.000Z',
        capacity: 10,
        free_places: 3,
        registration_id: 42
    };
    const requests = [];
    let catalogRequestCount = 0;
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events') {
            catalogRequestCount += 1;
            return response(200, [
                catalogRequestCount === 1
                    ? event
                    : { ...event, free_places: 4, registration_id: null }
            ]);
        }
        return response(200, { message: 'Registration cancelled' });
    });

    await ui.page.loadEvents();
    assert.match(ui.html, />Cancel registration<\/button>/);
    await ui.page.cancel(42);

    assert.deepEqual(requests[1], {
        url: '/api/registrations/42',
        options: { method: 'DELETE' }
    });
    assert.match(ui.html, /Registration cancelled/);
    assert.match(ui.html, />Register<\/button>/);
});

test('AC-18 an empty catalog shows the exact empty-state message', async () => {
    const ui = createPage(async () => response(200, []));

    await ui.page.loadEvents();

    assert.match(
        ui.html,
        /No upcoming events yet\. Check back later\./
    );
});

test('AC-19 an unavailable API shows the exact error-state message', async (t) => {
    const errorLogger = t.mock.method(console, 'error', () => {});
    const ui = createPage(async () => {
        throw new Error('API unavailable');
    });

    await ui.page.loadEvents();

    assert.equal(errorLogger.mock.callCount(), 1);
    assert.match(
        ui.html,
        /Could not load events\. Please try again\./
    );
});
