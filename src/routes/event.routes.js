const express = require('express');
const router = express.Router();
const eventService = require('../services/event.service');

router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not signed in' });
    }

    try {
        const events = await eventService.listUpcomingEvents();
        res.json(events);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
