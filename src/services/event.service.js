const eventDb = require('../db/event.db');

function createServiceError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function validateNewEvent(input) {
    const title = typeof input?.title === 'string' ? input.title.trim() : '';
    const date = new Date(input?.date);
    const capacity = input?.capacity;

    if (
        !title ||
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now() ||
        !Number.isInteger(capacity) ||
        capacity <= 0
    ) {
        throw createServiceError(
            'VALIDATION_ERROR',
            'Title, future date, and positive integer capacity are required'
        );
    }

    return { title, date, capacity };
}

function createEventService(data) {
    return {
        async listUpcomingEvents(userId) {
            return data.getUpcomingEvents(userId);
        },

        async createEvent(user, input) {
            if (user?.role !== 'organizer') {
                throw createServiceError('FORBIDDEN', 'Only organizers can create events');
            }

            const event = validateNewEvent(input);
            return data.createEvent({ ...event, organizerId: user.id });
        },

        async listEventAttendees(eventId, user) {
            const event = await data.getEventById(eventId);
            if (!event) {
                throw createServiceError('EVENT_NOT_FOUND', 'Event not found');
            }

            if (user?.role !== 'organizer' || event.organizerId !== user.id) {
                throw createServiceError(
                    'FORBIDDEN',
                    'You are not allowed to view attendees for this event'
                );
            }

            return data.getEventAttendees(eventId);
        },

        async registerForEvent(eventId, userId) {
            return data.withEventLock(eventId, async (transaction) => {
                if (!transaction.event) {
                    throw createServiceError('EVENT_NOT_FOUND', 'Event not found');
                }

                if (new Date(transaction.event.date).getTime() <= Date.now()) {
                    throw createServiceError(
                        'EVENT_STARTED',
                        'This event has already started'
                    );
                }

                const existingRegistration = await transaction.findRegistration(userId);
                if (existingRegistration) {
                    throw createServiceError(
                        'ALREADY_REGISTERED',
                        'You are already registered'
                    );
                }

                const registrationCount = await transaction.countRegistrations();
                if (registrationCount >= transaction.event.capacity) {
                    throw createServiceError('EVENT_FULL', 'This event is full');
                }

                await transaction.createRegistration(userId);
                return { message: 'You are registered' };
            });
        },

        async cancelRegistration(registrationId, userId) {
            const registration = await data.getRegistrationById(registrationId);
            if (!registration) {
                throw createServiceError(
                    'REGISTRATION_NOT_FOUND',
                    'Registration not found'
                );
            }

            if (registration.userId !== userId) {
                throw createServiceError(
                    'REGISTRATION_FORBIDDEN',
                    'You are not allowed to cancel this registration'
                );
            }

            await data.deleteRegistration(registrationId, userId);
            return { message: 'Registration cancelled' };
        }
    };
}

const defaultService = createEventService({
    getUpcomingEvents: eventDb.getUpcomingEvents,
    createEvent: eventDb.createEvent,
    getEventById: eventDb.getEventById,
    getEventAttendees: eventDb.getEventAttendees,
    withEventLock: eventDb.withEventLock,
    getRegistrationById: eventDb.getRegistrationById,
    deleteRegistration: eventDb.deleteRegistration
});

module.exports = {
    ...defaultService,
    createEventService
};
