const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createModelAssistanceService
} = require('../../src/services/model-assistance.service');
const {
    ModelUnavailableError
} = require('../../src/lib/model-client');

const organizer = { id: 300, role: 'organizer' };

function createFakeClient({
    configured = true,
    textResult = 'Join us for a welcoming evening.',
    jsonResult = '{"title":"Open Day","date":"2099-06-12","time":"18:30","venue":"Club Hall","capacity":40}',
    textError,
    jsonError
} = {}) {
    const calls = [];
    return {
        calls,
        client: {
            isConfigured() {
                return configured;
            },
            async generateText(prompt) {
                calls.push({ type: 'text', prompt });
                if (!configured) {
                    throw new ModelUnavailableError('missing_key');
                }
                if (textError) {
                    throw textError;
                }
                return textResult;
            },
            async generateJson(prompt, image) {
                calls.push({ type: 'json', prompt, image });
                if (!configured) {
                    throw new ModelUnavailableError('missing_key');
                }
                if (jsonError) {
                    throw jsonError;
                }
                return jsonResult;
            }
        }
    };
}

function validPng() {
    return {
        mimeType: 'image/png',
        data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64')
    };
}

test('AC-20 description draft uses event details and returns an editable model result', async () => {
    const { client, calls } = createFakeClient();
    const service = createModelAssistanceService({ client });
    const event = {
        title: 'Open Day',
        date: '2099-06-12',
        time: '18:30',
        venue: 'Club Hall',
        audience: 'new members',
        notes: 'Bring questions'
    };

    const result = await service.draftDescription(organizer, event);

    assert.deepEqual(result, {
        description: 'Join us for a welcoming evening.',
        source: 'model'
    });
    assert.equal(calls.length, 1);
    for (const value of Object.values(event)) {
        assert.ok(calls[0].prompt.includes(value));
    }
});

test('AC-21 description draft falls back for missing key, timeout, rate limit, and invalid output', async () => {
    const event = {
        title: 'Open Day',
        date: '2099-06-12',
        time: '18:30',
        venue: 'Club Hall'
    };
    const cases = [
        { configured: false },
        { textError: new ModelUnavailableError('timeout') },
        { textError: new ModelUnavailableError('rate_limited') },
        { textResult: '' },
        { textResult: 'x'.repeat(1001) }
    ];

    for (const options of cases) {
        const { client, calls } = createFakeClient(options);
        const service = createModelAssistanceService({ client });
        const result = await service.draftDescription(organizer, event);

        assert.equal(result.source, 'fallback');
        assert.equal(result.message, 'Suggested without the model');
        assert.match(result.description, /Open Day/);
        assert.match(result.description, /Club Hall/);
        assert.equal(calls.length, 1);
    }
});

test('AC-22 poster extraction returns editable structured fields from a PNG', async () => {
    const { client, calls } = createFakeClient();
    const service = createModelAssistanceService({ client });
    const image = validPng();

    const result = await service.extractFromPoster(organizer, image);

    assert.deepEqual(result, {
        title: 'Open Day',
        date: '2099-06-12',
        time: '18:30',
        venue: 'Club Hall',
        capacity: 40,
        source: 'model'
    });
    assert.deepEqual(calls[0].image, image);

    const jpeg = {
        mimeType: 'image/jpeg',
        data: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64')
    };
    assert.equal((await service.extractFromPoster(organizer, jpeg)).source, 'model');
});

test('AC-22 poster extraction rejects non-PNG/JPEG and images larger than 4 MB', async () => {
    const { client, calls } = createFakeClient();
    const service = createModelAssistanceService({ client });
    const invalidImages = [
        { mimeType: 'image/gif', data: 'R0lGODlh' },
        { mimeType: 'image/png', data: '!!!!' },
        { mimeType: 'image/png', data: Buffer.from('not a PNG').toString('base64') },
        { mimeType: 'image/jpeg', data: Buffer.from([0xff, 0xd8]).toString('base64') },
        { mimeType: 'image/png', data: 'A'.repeat(5_592_412) },
        {
            mimeType: 'image/png',
            data: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64')
        }
    ];

    for (const image of invalidImages) {
        await assert.rejects(
            service.extractFromPoster(organizer, image),
            (error) => error.code === 'INVALID_IMAGE'
        );
    }
    assert.equal(calls.length, 0);
});

test('AC-22 poster extraction returns empty fields when the key is missing, times out, or is rate limited', async () => {
    const cases = [
        { configured: false },
        { jsonError: new ModelUnavailableError('timeout') },
        { jsonError: new ModelUnavailableError('rate_limited') }
    ];

    for (const options of cases) {
        const { client, calls } = createFakeClient(options);
        const service = createModelAssistanceService({ client });
        const result = await service.extractFromPoster(organizer, validPng());

        assert.deepEqual(result, {
            title: '',
            date: '',
            time: '',
            venue: '',
            capacity: '',
            source: 'fallback',
            message: 'The model is unavailable. Please fill in the form by hand.'
        });
        assert.equal(calls.length, 1);
    }
});

test('AC-23 past or impossible dates and invalid capacities stay empty for manual entry', async () => {
    for (const date of ['2000-02-28', '2099-02-31']) {
        const { client } = createFakeClient({
            jsonResult: JSON.stringify({
                title: 'Open Day',
                date,
                time: '18:30',
                venue: 'Club Hall',
                capacity: 'many'
            })
        });
        const service = createModelAssistanceService({ client });

        const result = await service.extractFromPoster(organizer, validPng());

        assert.equal(result.title, 'Open Day');
        assert.equal(result.date, '');
        assert.equal(result.capacity, '');
        assert.equal(result.message, 'Please fill in the date and capacity by hand.');
        assert.equal(result.source, 'model');
    }
});

test('AC-24 model assistance rejects non-organizers before contacting the client', async () => {
    let clientCalls = 0;
    const service = createModelAssistanceService({
        client: {
            isConfigured() {
                clientCalls += 1;
                return true;
            },
            async generateText() {
                clientCalls += 1;
            },
            async generateJson() {
                clientCalls += 1;
            }
        }
    });

    await assert.rejects(
        service.draftDescription({ id: 100, role: 'member' }, { title: 'Event' }),
        { code: 'FORBIDDEN' }
    );
    await assert.rejects(
        service.extractFromPoster(
            { id: 100, role: 'member' },
            validPng()
        ),
        { code: 'FORBIDDEN' }
    );
    assert.equal(clientCalls, 0);
});

test('model assistance propagates unexpected client errors instead of falling back', async () => {
    const failure = new TypeError('Unexpected client failure');
    const service = createModelAssistanceService({
        client: {
            async generateText() {
                throw failure;
            },
            async generateJson() {
                throw failure;
            }
        }
    });

    await assert.rejects(
        service.draftDescription(organizer, { title: 'Open Day' }),
        (error) => error === failure
    );
    await assert.rejects(
        service.extractFromPoster(organizer, validPng()),
        (error) => error === failure
    );
});

test('AC-22 invalid structured output returns empty fields or identifies invalid fields', async () => {
    const cases = [
        {
            response: 'not JSON',
            source: 'fallback',
            message: 'The model returned invalid poster details. Please fill in the form by hand.'
        },
        {
            response: '[]',
            source: 'fallback',
            message: 'The model returned invalid poster details. Please fill in the form by hand.'
        },
        {
            response: JSON.stringify({
                title: 10,
                date: null,
                time: '25:61',
                venue: {},
                capacity: 0
            }),
            source: 'model',
            message: 'Please fill in the title and date and time and venue and capacity by hand.'
        }
    ];

    for (const scenario of cases) {
        const { client } = createFakeClient({ jsonResult: scenario.response });
        const service = createModelAssistanceService({ client });
        const result = await service.extractFromPoster(organizer, validPng());

        assert.equal(result.source, scenario.source);
        assert.equal(result.title, '');
        assert.equal(result.date, '');
        assert.equal(result.time, '');
        assert.equal(result.venue, '');
        assert.equal(result.capacity, '');
        assert.equal(result.message, scenario.message);
    }
});
