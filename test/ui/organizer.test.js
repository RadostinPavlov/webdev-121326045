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

test('organizer form labels every input and identifies the description as a suggestion', () => {
    const html = OrganizerView.render({
        visible: true,
        assistant: OrganizerView.createAssistantState()
    });
    const inputIds = [...html.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)]
        .map((match) => match[1]);

    for (const id of inputIds) {
        assert.match(html, new RegExp(`<label\\s+for="${id}"`));
    }
    assert.match(
        html,
        /Description suggestion \(AI-assisted; review and edit before creating\)/
    );
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

test('AC-20 suggestion shows loading then places the editable draft in the form without creating an event', async () => {
    let finishSuggestion;
    const requests = [];
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events') {
            return response(200, []);
        }
        if (url === '/api/events/description-draft') {
            return new Promise((resolve) => {
                finishSuggestion = resolve;
            });
        }
        throw new Error(`Unexpected request: ${url}`);
    });
    const form = {
        title: 'Community Dinner',
        date: '2100-06-01',
        time: '18:30',
        venue: 'Club Hall',
        audience: 'members',
        notes: 'Bring a dish'
    };

    await ui.page.loadEvents({ id: 40, role: 'organizer' });
    const suggesting = ui.page.suggestDescription(form);
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(ui.organizerHtml, /Suggesting description/);

    finishSuggestion(response(200, {
        description: 'Join us for dinner.',
        source: 'model'
    }));
    await suggesting;

    assert.match(ui.organizerHtml, /Join us for dinner\./);
    assert.match(ui.organizerHtml, /name="venue" type="text" value="Club Hall"/);
    assert.match(ui.organizerHtml, /name="audience" type="text" value="members"/);
    assert.match(ui.organizerHtml, /name="notes">Bring a dish<\/textarea>/);
    assert.equal(requests.filter(({ url }) => url === '/api/events').length, 1);
    assert.equal(requests[1].url, '/api/events/description-draft');
    assert.deepEqual(JSON.parse(requests[1].options.body), form);
});

test('AC-21 fallback description displays the required notice and can be created manually', async () => {
    const requests = [];
    const event = {
        id: 8,
        title: 'Community Dinner',
        date: '2100-06-01T18:30:00.000Z',
        capacity: 20,
        description: 'Join us for Community Dinner.',
        venue: 'Club Hall',
        organizerId: 40
    };
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events/description-draft') {
            return response(200, {
                description: 'Join us for Community Dinner.',
                source: 'fallback',
                message: 'Suggested without the model'
            });
        }
        if (url === '/api/events' && options.method === 'POST') {
            return response(201, event);
        }
        if (url === '/api/events') {
            return response(200, [event]);
        }
        if (url === '/api/events/8/attendees') {
            return response(200, []);
        }
        throw new Error(`Unexpected request: ${url}`);
    });
    const form = {
        title: 'Community Dinner',
        date: '2100-06-01',
        time: '18:30',
        capacity: '20',
        description: '',
        venue: 'Club Hall',
        audience: 'members',
        notes: ''
    };

    await ui.page.loadEvents({ id: 40, role: 'organizer' });
    await ui.page.suggestDescription(form);

    assert.match(ui.organizerHtml, /Suggested without the model/);
    assert.match(ui.organizerHtml, /Join us for Community Dinner\./);
    assert.equal(requests.filter(({ url, options }) =>
        url === '/api/events' && options.method === 'POST'
    ).length, 0);

    await ui.page.createEvent({
        ...form,
        date: '2100-06-01T18:30:00.000Z',
        capacity: 20,
        description: 'Join us for Community Dinner.'
    });
    assert.equal(requests.filter(({ url, options }) =>
        url === '/api/events' && options.method === 'POST'
    ).length, 1);
    assert.equal(JSON.parse(requests.find(({ url, options }) =>
        url === '/api/events' && options.method === 'POST'
    ).options.body).description, 'Join us for Community Dinner.');
});

test('AC-22 poster extraction reads a PNG as base64 and fills editable event fields without creating an event', async () => {
    const requests = [];
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
    const file = {
        type: 'image/png',
        size: bytes.byteLength,
        async arrayBuffer() {
            return bytes.buffer;
        }
    };
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events') {
            return response(200, []);
        }
        if (url === '/api/events/poster-extraction') {
            return response(200, {
                title: 'Open Day',
                date: '2100-07-12',
                time: '17:45',
                venue: 'Club Hall',
                capacity: 42,
                source: 'model'
            });
        }
        throw new Error(`Unexpected request: ${url}`);
    });

    await ui.page.loadEvents({ id: 40, role: 'organizer' });
    await ui.page.extractFromPoster(file, {
        title: '',
        date: '',
        time: '',
        venue: '',
        capacity: '',
        description: '',
        audience: '',
        notes: ''
    });

    assert.match(ui.organizerHtml, /value="Open Day"/);
    assert.match(ui.organizerHtml, /name="date" type="date" value="2100-07-12"/);
    assert.match(ui.organizerHtml, /name="time" type="time" value="17:45"/);
    assert.match(ui.organizerHtml, /name="capacity" type="number" min="1" step="1" value="42"/);
    assert.match(ui.organizerHtml, /name="venue" type="text" value="Club Hall"/);
    assert.equal(requests[1].url, '/api/events/poster-extraction');
    assert.deepEqual(JSON.parse(requests[1].options.body), {
        mimeType: 'image/png',
        data: Buffer.from(bytes).toString('base64')
    });
    assert.equal(requests.filter(({ url, options }) =>
        url === '/api/events' && options.method === 'POST'
    ).length, 0);
});

test('AC-23 poster extraction lists invalid fields for manual entry and rejects unsupported uploads', async () => {
    const requests = [];
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events') {
            return response(200, []);
        }
        if (url === '/api/events/poster-extraction') {
            return response(200, {
                title: 'Open Day',
                date: '',
                time: '17:45',
                venue: 'Club Hall',
                capacity: '',
                source: 'model',
                message: 'Please fill in the date and capacity by hand.'
            });
        }
        throw new Error(`Unexpected request: ${url}`);
    });
    const fields = {
        title: '',
        date: '',
        time: '',
        venue: '',
        capacity: '',
        description: '',
        audience: '',
        notes: ''
    };

    await ui.page.loadEvents({ id: 40, role: 'organizer' });
    await ui.page.extractFromPoster({
        type: 'image/jpeg',
        size: 5 * 1024 * 1024,
        async arrayBuffer() {
            throw new Error('Oversized file must not be read');
        }
    }, fields);

    assert.match(ui.organizerHtml, /Choose a PNG or JPEG poster no larger than 4 MB/);
    assert.equal(requests.length, 1);

    await ui.page.extractFromPoster({
        type: 'image/jpeg',
        size: 4,
        async arrayBuffer() {
            return Uint8Array.from([0xff, 0xd8, 0xff]).buffer;
        }
    }, fields);

    assert.match(ui.organizerHtml, /Please fill in the date and capacity by hand\./);
    assert.match(ui.organizerHtml, /name="date" type="date" value=""/);
    assert.match(ui.organizerHtml, /name="capacity" type="number" min="1" step="1" value=""/);
});

test('AC-20 and AC-22 assistant requests expose loading and error states', async () => {
    const requests = [];
    const ui = createPage(async (url, options = {}) => {
        requests.push({ url, options });
        if (url === '/api/events') {
            return response(200, []);
        }
        if (url === '/api/events/description-draft') {
            return response(503, { error: 'Draft service unavailable' });
        }
        if (url === '/api/events/poster-extraction') {
            return response(500, { error: 'Poster service unavailable' });
        }
        throw new Error(`Unexpected request: ${url}`);
    });
    const file = {
        type: 'image/png',
        size: 8,
        async arrayBuffer() {
            return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
        }
    };
    const form = { title: 'Open Day', date: '2100-07-12', time: '18:00' };

    await ui.page.loadEvents({ id: 40, role: 'organizer' });
    await ui.page.suggestDescription(form);
    assert.match(ui.organizerHtml, /Draft service unavailable/);

    await ui.page.extractFromPoster(file, form);
    assert.match(ui.organizerHtml, /Poster service unavailable/);
    assert.equal(requests.length, 3);
});
