const express = require('express');
const session = require('express-session');
const path = require('path');
const eventService = require('./services/event.service');
const authService = require('./services/auth.service');
const modelAssistanceService = require('./services/model-assistance.service');
const { createAuthRouter } = require('./routes/auth.routes');
const { createEventRouter, createRegistrationRouter } = require('./routes/event.routes');

function createApp({
    sessionOptions,
    eventService: injectedEventService = eventService,
    authService: injectedAuthService = authService,
    modelAssistanceService: injectedModelAssistanceService = modelAssistanceService
}) {
    const app = express();

    const jsonParser = express.json();
    app.use((req, res, next) => {
        if (req.path === '/api/events/poster-extraction') {
            return next();
        }
        return jsonParser(req, res, next);
    });
    app.use(express.urlencoded({ extended: true }));
    app.use(session(sessionOptions));

    app.use('/api/auth', createAuthRouter(injectedAuthService));
    app.use(
        '/api/events',
        createEventRouter(injectedEventService, injectedModelAssistanceService)
    );
    app.use('/api/registrations', createRegistrationRouter(injectedEventService));

    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.redirect('/events');
    });

    app.get('/events', (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        res.sendFile(path.join(__dirname, 'views', 'events.html'));
    });

    app.get('/login', (req, res) => {
        if (req.session.user) {
            return res.redirect('/events');
        }
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    return app;
}

module.exports = { createApp };
