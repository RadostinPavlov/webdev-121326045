const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../../src/db/db');
const eventDb = require('../../src/db/event.db');
const userDb = require('../../src/db/user.db');
const tokenDb = require('../../src/db/caller-token.db');

test('event data methods pass parameters through and map present or absent rows', async (t) => {
    const calls = [];
    const event = { id: 8, title: 'Book Club', organizerId: 2 };
    const attendee = { registrationId: 11, eventId: 8, userId: 4, email: 'member@example.com' };
    const registration = { id: 11, eventId: 8, userId: 4 };
    t.mock.method(pool, 'query', async (query, values) => {
        calls.push({ query, values });
        if (query.includes('FROM events e')) return { rows: [event] };
        if (query.startsWith('INSERT INTO events')) return { rows: [event] };
        if (query.includes('FROM events') && query.includes('WHERE id = $1')) {
            return { rows: values[0] === 8 ? [event] : [] };
        }
        if (query.includes('JOIN users')) return { rows: [attendee] };
        if (query.includes('FROM registrations') && query.includes('WHERE id = $1')) {
            return { rows: values[0] === 11 ? [registration] : [] };
        }
        return { rows: [] };
    });

    assert.deepEqual(await eventDb.getUpcomingEvents(4), [event]);
    assert.deepEqual(await eventDb.createEvent({
        title: 'Book Club',
        date: new Date('2100-01-01'),
        capacity: 8,
        description: 'Read together',
        venue: 'Club',
        organizerId: 2
    }), event);
    assert.deepEqual(await eventDb.getEventById(8), event);
    assert.equal(await eventDb.getEventById(99), null);
    assert.deepEqual(await eventDb.getEventAttendees(8), [attendee]);
    assert.deepEqual(await eventDb.getRegistrationById(11), registration);
    assert.equal(await eventDb.getRegistrationById(99), null);
    await eventDb.deleteRegistration(11, 4);

    assert.deepEqual(calls[0].values, [4]);
    assert.deepEqual(calls[1].values, [
        'Book Club',
        new Date('2100-01-01'),
        8,
        'Read together',
        'Club',
        2
    ]);
    assert.deepEqual(calls.at(-1).values, [11, 4]);
});

test('event locks commit successful callbacks and expose transaction queries', async (t) => {
    const statements = [];
    let released = 0;
    const event = { id: 8, title: 'Book Club', capacity: 8 };
    const registration = { id: 11, eventId: 8, userId: 4 };
    const created = { id: 12, eventId: 8, userId: 5 };
    const client = {
        async query(query, values) {
            statements.push({ query, values });
            if (query.startsWith('SELECT id, title')) return { rows: [event] };
            if (query.includes('WHERE event_id = $1 AND user_id = $2')) {
                return { rows: [registration] };
            }
            if (query.includes('COUNT(*)')) return { rows: [{ count: 2 }] };
            if (query.startsWith('INSERT INTO registrations')) return { rows: [created] };
            return { rows: [] };
        },
        release() {
            released += 1;
        }
    };
    t.mock.method(pool, 'connect', async () => client);

    const result = await eventDb.withEventLock(8, async (transaction) => {
        assert.deepEqual(transaction.event, event);
        assert.deepEqual(await transaction.findRegistration(4), registration);
        assert.equal(await transaction.countRegistrations(), 2);
        assert.deepEqual(await transaction.createRegistration(5), created);
        return 'saved';
    });

    assert.equal(result, 'saved');
    assert.equal(statements[0].query, 'BEGIN');
    assert.match(statements[1].query, /FOR UPDATE/);
    assert.match(statements[2].query, /FROM registrations/);
    assert.match(statements[3].query, /COUNT\(\*\)/);
    assert.match(statements[4].query, /INSERT INTO registrations/);
    assert.equal(statements[5].query, 'COMMIT');
    assert.deepEqual(statements[2].values, [8, 4]);
    assert.deepEqual(statements[4].values, [8, 5]);
    assert.equal(released, 1);
});

test('event locks commit missing-event callbacks and roll back callback failures', async (t) => {
    const statements = [];
    let released = 0;
    const client = {
        async query(query) {
            statements.push(query);
            return { rows: [] };
        },
        release() {
            released += 1;
        }
    };
    t.mock.method(pool, 'connect', async () => client);

    assert.equal(await eventDb.withEventLock(99, async ({ event }) => event), null);
    const failure = new Error('transaction callback failed');
    await assert.rejects(eventDb.withEventLock(8, async () => {
        throw failure;
    }), (error) => error === failure);

    assert.equal(statements[0], 'BEGIN');
    assert.match(statements[1], /FOR UPDATE/);
    assert.equal(statements[2], 'COMMIT');
    assert.equal(statements[3], 'BEGIN');
    assert.match(statements[4], /FOR UPDATE/);
    assert.equal(statements[5], 'ROLLBACK');
    assert.equal(released, 2);
});

test('event locks release a client and skip rollback when BEGIN itself fails', async (t) => {
    let released = 0;
    const failure = new Error('cannot begin');
    const client = {
        async query() {
            throw failure;
        },
        release() {
            released += 1;
        }
    };
    t.mock.method(pool, 'connect', async () => client);

    await assert.rejects(eventDb.withEventLock(8, async () => {}), (error) => error === failure);
    assert.equal(released, 1);
});

test('user data methods map duplicate emails and rethrow other database errors', async (t) => {
    const user = { id: 4, email: 'member@example.com', role: 'member' };
    let mode = 'found';
    t.mock.method(pool, 'query', async () => {
        if (mode === 'duplicate') throw Object.assign(new Error('duplicate'), { code: '23505' });
        if (mode === 'failure') throw new Error('database failure');
        return { rows: mode === 'found' ? [user] : [] };
    });

    assert.deepEqual(await userDb.findUserByEmail('member@example.com'), user);
    mode = 'missing';
    assert.equal(await userDb.findUserByEmail('missing@example.com'), null);
    mode = 'found';
    assert.deepEqual(await userDb.createUser(user.email, 'hash'), user);
    mode = 'duplicate';
    assert.deepEqual(await userDb.createUser(user.email, 'hash'), { error: 'EMAIL_TAKEN' });
    mode = 'failure';
    await assert.rejects(userDb.createUser(user.email, 'hash'), /database failure/);
});

test('MCP token lookup maps both present and absent users', async (t) => {
    const user = { id: 4, email: 'member@example.com', role: 'member' };
    let found = true;
    t.mock.method(pool, 'query', async () => ({ rows: found ? [user] : [] }));

    assert.deepEqual(await tokenDb.findUserByTokenHash('hashed-token'), user);
    found = false;
    assert.equal(await tokenDb.findUserByTokenHash('unknown-token'), null);
});

test('database health check executes a trivial query', async (t) => {
    const calls = [];
    t.mock.method(pool, 'query', async (query) => {
        calls.push(query);
        return { rows: [{ '?column?': 1 }] };
    });

    await pool.checkConnection();

    assert.deepEqual(calls, ['SELECT 1']);
});
