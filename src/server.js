require('dotenv').config();
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db/db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

const app = createApp({
    eventService: require('./services/event.service'),
    sessionOptions: {
        store: new pgSession({
            pool,
            tableName: 'session'
        }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: false
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
