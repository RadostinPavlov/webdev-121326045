const express = require('express');

function parseId(value) {
    if (!/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}

function sendServiceError(res, error) {
    const statusByCode = {
        EVENT_NOT_FOUND: 404,
        EVENT_STARTED: 409,
        ALREADY_REGISTERED: 409,
        EVENT_FULL: 409,
        REGISTRATION_FORBIDDEN: 403,
        REGISTRATION_NOT_FOUND: 404
    };
    const status = statusByCode[error.code];

    if (!status) {
        console.error('Event route error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(status).json({ error: error.message });
}

function createEventRouter(eventService) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not signed in' });
        }

        try {
            const events = await eventService.listUpcomingEvents(req.session.user.id);
            return res.json(events);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    router.post('/:eventId/registrations', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not signed in' });
        }

        const eventId = parseId(req.params.eventId);
        if (eventId === null) {
            return res.status(400).json({ error: 'Invalid event id' });
        }

        try {
            const result = await eventService.registerForEvent(
                eventId,
                req.session.user.id
            );
            return res.status(201).json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    return router;
}

function createRegistrationRouter(eventService) {
    const router = express.Router();

    router.delete('/:registrationId', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not signed in' });
        }

        const registrationId = parseId(req.params.registrationId);
        if (registrationId === null) {
            return res.status(400).json({ error: 'Invalid registration id' });
        }

        try {
            const result = await eventService.cancelRegistration(
                registrationId,
                req.session.user.id
            );
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    return router;
}

module.exports = { createEventRouter, createRegistrationRouter };
