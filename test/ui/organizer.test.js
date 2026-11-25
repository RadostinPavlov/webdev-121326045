const test = require('node:test');
const assert = require('node:assert/strict');
const OrganizerView = require('../../src/public/js/organizer-view.js');
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
    const organizerStates = [];
    const eventStates = [];
    const redirects = [];
    const page = createEventsPage({
        fetch,
        render(state) {
            eventStates.push(state);
        },
        renderOrganizer(state) {
            organizerStates.push(state);
        },
        redirect(path) {
            redirects.push(path);
        }
    });

    return {
        page,
        organizerStates,
        eventStates,
        redirects,
        get organizerHtml() {
            return OrganizerView.render(organizerStates.at(-1));
        },
        get eventsHtml() {
            return EventsView.render(eventStates.at(-1));
        }
    };
}

test('AC-4 organizer UI posts event details and shows the created event', async () => {
    const event = {
        id: 5,
        title: 'Member workshop',
        date: '2100-06-01T18:00:00.000Z',
        capacity: 18,
        free_places: 18,
        organizerId: 40
    };
    const requests = [];
    let catalogLoads = 0;
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events' && options.method === 'POST') {
            return response(201, event);
        }
        if (url === '/api/events') {
            catalogLoads += 1;
            return response(200, catalogLoads === 1 ? [] : [event]);
        }
        if (url === '/api/events/5/attendees') {
            return response(200, []);
        }
        throw new Error(`Unexpected request: ${url}`);
    });

    await ui.page.loadEvents({ id: 40, role: 'organizer' });
    await ui.page.createEvent({
        title: event.title,
        date: event.date,
        capacity: event.capacity
    });

    assert.deepEqual(requests[1], {
        url: '/api/events',
        options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: event.title,
                date: event.date,
                capacity: event.capacity
            })
        }
    });
    assert.match(ui.organizerHtml, /Event created/);
    assert.match(ui.organizerHtml, /Member workshop/);
    assert.match(ui.eventsHtml, /Member workshop/);
});

test('AC-5 attendee view shows loading, empty and error states for owned events only', async () => {
    const ownerEvent = {
        id: 5,
        title: 'Owned event',
        date: '2100-06-01T18:00:00.000Z',
        capacity: 18,
        free_places: 18,
        organizerId: 40
    };
    const otherEvent = {
        id: 6,
        title: 'Other event',
        date: '2100-06-02T18:00:00.000Z',
        capacity: 18,
        free_places: 18,
        organizerId: 41
    };
    const failingEvent = {
        ...ownerEvent,
        id: 7,
        title: 'Second owned event'
    };
    const requests = [];
    let markAttendeeRequestStarted;
    const attendeeRequestStarted = new Promise((resolve) => {
        markAttendeeRequestStarted = resolve;
    });
    let finishAttendeeRequest;
    const attendeeResponse = new Promise((resolve) => {
        finishAttendeeRequest = resolve;
    });
    const ui = createPage(async (url) => {
        requests.push(url);
        if (url === '/api/events') {
            return response(200, [ownerEvent, otherEvent, failingEvent]);
        }
        if (url === '/api/events/5/attendees') {
            markAttendeeRequestStarted();
            return attendeeResponse;
        }
        if (url === '/api/events/7/attendees') {
            return response(500, { error: 'Attendees unavailable' });
        }
        return response(500, { error: 'Attendees unavailable' });
    });

    const loading = ui.page.loadEvents({ id: 40, role: 'organizer' });
    await attendeeRequestStarted;
    assert.match(ui.organizerHtml, /Loading attendees/);
    finishAttendeeRequest(response(200, []));
    await loading;

    assert.ok(requests.includes('/api/events/5/attendees'));
    assert.ok(!requests.includes('/api/events/6/attendees'));
    assert.match(ui.organizerHtml, /No attendees registered yet/);
    assert.match(ui.organizerHtml, /Attendees unavailable/);
    assert.equal(ui.organizerStates.at(-1).attendees[5].status, 'empty');
    assert.equal(ui.organizerStates.at(-1).attendees[7].status, 'error');
});

test('AC-5 members do not see organizer controls or load attendee data', async () => {
    const requests = [];
    const ui = createPage(async (url) => {
        requests.push(url);
        return response(200, [{
            id: 5,
            title: 'Event',
            date: '2100-06-01T18:00:00.000Z',
            capacity: 18,
            free_places: 18,
            organizerId: 40
        }]);
    });

    await ui.page.loadEvents({ id: 50, role: 'member' });

    assert.equal(ui.organizerHtml, '');
    assert.ok(!requests.some((url) => url.endsWith('/attendees')));
    assert.match(ui.eventsHtml, /Event/);
});
