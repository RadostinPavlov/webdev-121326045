const test = require('node:test');
const assert = require('node:assert/strict');
const { createEventService } = require('../../src/services/event.service');

function createFixture({ event, registrations = [] } = {}) {
    const events = new Map(event ? [[event.id, event]] : []);
    const storedRegistrations = registrations.map((registration) => ({ ...registration }));
    let nextRegistrationId = Math.max(0, ...storedRegistrations.map(({ id }) => id)) + 1;

    const data = {
        async withEventLock(eventId, fn) {
            const lockedEvent = events.get(eventId) ?? null;
            return fn({
                event: lockedEvent,
                async findRegistration(userId) {
                    return storedRegistrations.find(
                        (registration) =>
                            registration.eventId === eventId && registration.userId === userId
                    ) ?? null;
                },
                async countRegistrations() {
                    return storedRegistrations.filter(
                        (registration) => registration.eventId === eventId
                    ).length;
                },
                async createRegistration(userId) {
                    const registration = {
                        id: nextRegistrationId++,
                        eventId,
                        userId
                    };
                    storedRegistrations.push(registration);
                    return registration;
                }
            });
        },
        async getRegistrationById(registrationId) {
            return storedRegistrations.find(
                (registration) => registration.id === registrationId
            ) ?? null;
        },
        async deleteRegistration(registrationId) {
            const index = storedRegistrations.findIndex(
                (registration) => registration.id === registrationId
            );
            if (index !== -1) {
                storedRegistrations.splice(index, 1);
            }
        }
    };

    return {
        service: createEventService(data),
        registrations: storedRegistrations
    };
}

function futureEvent(overrides = {}) {
    return {
        id: 1,
        date: new Date('2100-01-01T00:00:00.000Z'),
        capacity: 1,
        ...overrides
    };
}

async function assertServiceError(promise, code, message) {
    await assert.rejects(promise, (error) => {
        assert.equal(error.code, code);
        assert.equal(error.message, message);
        return true;
    });
}

test('listUpcomingEvents passes the member id through to the data layer', async () => {
    let requestedUserId;
    const events = [{ id: 1, registration_id: 12 }];
    const service = createEventService({
        async getUpcomingEvents(userId) {
            requestedUserId = userId;
            return events;
        }
    });

    assert.deepEqual(await service.listUpcomingEvents(100), events);
    assert.equal(requestedUserId, 100);
});

test('AC-1 a full event rejects registration without adding a row', async () => {
    const registration = { id: 10, eventId: 1, userId: 100 };
    const { service, registrations } = createFixture({
        event: futureEvent(),
        registrations: [registration]
    });

    await assertServiceError(
        service.registerForEvent(1, 200),
        'EVENT_FULL',
        'This event is full'
    );
    assert.deepEqual(registrations, [registration]);
});

test('AC-2 a member registers for an event with free capacity', async () => {
    const { service, registrations } = createFixture({
        event: futureEvent({ capacity: 2 })
    });

    const result = await service.registerForEvent(1, 100);

    assert.equal(result.message, 'You are registered');
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].eventId, 1);
    assert.equal(registrations[0].userId, 100);
});

test('AC-3 registering twice rejects the duplicate and keeps one row', async () => {
    const registration = { id: 10, eventId: 1, userId: 100 };
    const { service, registrations } = createFixture({
        event: futureEvent(),
        registrations: [registration]
    });

    await assertServiceError(
        service.registerForEvent(1, 100),
        'ALREADY_REGISTERED',
        'You are already registered'
    );
    assert.deepEqual(registrations, [registration]);
});

test('AC-13 a member cancels their registration and its row is removed', async () => {
    const registration = { id: 10, eventId: 1, userId: 100 };
    const { service, registrations } = createFixture({
        registrations: [registration]
    });

    const result = await service.cancelRegistration(10, 100);

    assert.equal(result.message, 'Registration cancelled');
    assert.deepEqual(registrations, []);
});

test('AC-14 cancelling another member registration is forbidden and keeps its row', async () => {
    const registration = { id: 10, eventId: 1, userId: 100 };
    const { service, registrations } = createFixture({
        registrations: [registration]
    });

    await assertServiceError(
        service.cancelRegistration(10, 200),
        'REGISTRATION_FORBIDDEN',
        'You are not allowed to cancel this registration'
    );
    assert.deepEqual(registrations, [registration]);
});

test('AC-16 registering for a missing event is not found and adds no row', async () => {
    const { service, registrations } = createFixture();

    await assertServiceError(
        service.registerForEvent(999, 100),
        'EVENT_NOT_FOUND',
        'Event not found'
    );
    assert.deepEqual(registrations, []);
});

test('AC-17 registering for a past event is rejected and adds no row', async () => {
    const { service, registrations } = createFixture({
        event: futureEvent({ date: new Date('2000-01-01T00:00:00.000Z') })
    });

    await assertServiceError(
        service.registerForEvent(1, 100),
        'EVENT_STARTED',
        'This event has already started'
    );
    assert.deepEqual(registrations, []);
});
