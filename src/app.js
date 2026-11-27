const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./db/db');
const eventService = require('./services/event.service');
const authService = require('./services/auth.service');
const modelAssistanceService = require('./services/model-assistance.service');
const { createAuthRouter } = require('./routes/auth.routes');
const { createEventRouter, createRegistrationRouter } = require('./routes/event.routes');

function createApp({
    sessionOptions,
    healthCheck = pool.checkConnection,
    production = process.env.NODE_ENV === 'production',
    eventService: injectedEventService = eventService,
    authService: injectedAuthService = authService,
    modelAssistanceService: injectedModelAssistanceService = modelAssistanceService
}) {
    const app = express();
    if (production) {
        app.set('trust proxy', 1);
    }

    const jsonParser = express.json();
    app.use((req, res, next) => {
        if (req.path === '/api/events/poster-extraction') {
            return next();
        }
        return jsonParser(req, res, next);
    });
    app.use(express.urlencoded({ extended: true }));
    const sessionMiddleware = session({
        ...sessionOptions,
        cookie: {
            ...sessionOptions.cookie,
            secure: production || sessionOptions.cookie?.secure
        }
    });
    app.use((req, res, next) => {
        if (req.path === '/health') {
            return next();
        }
        return sessionMiddleware(req, res, next);
    });

    app.get('/health', async (req, res) => {
        try {
            await healthCheck();
            return res.json({ status: 'ok', db: 'ok' });
        } catch {
            return res.status(503).json({ status: 'error', db: 'down' });
        }
    });

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

    app.use((req, res) => {
        res.status(404).type('text').send('Not found\n');
    });

    app.use((error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }
        if (error?.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Request body must be valid JSON.' });
        }
        console.error(error);
        return res.status(500).json({ error: 'An unexpected error occurred.' });
    });

    return app;
}

module.exports = { createApp };
