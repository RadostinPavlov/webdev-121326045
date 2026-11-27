const REQUIRED_ENVIRONMENT_VARIABLES = ['DATABASE_URL', 'SESSION_SECRET'];

function missingRequiredEnvironment(environment = process.env) {
    return REQUIRED_ENVIRONMENT_VARIABLES.filter((name) => !environment[name]);
}

function startServer(environment = process.env) {
    const missing = missingRequiredEnvironment(environment);
    if (missing.length) {
        for (const name of missing) {
            console.error(`missing ${name}: see .env.example`);
        }
        return false;
    }

    const session = require('express-session');
    const pgSession = require('connect-pg-simple')(session);
    const pool = require('./db/db');
    const { createApp } = require('./app');
    const production = environment.NODE_ENV === 'production';
    const port = environment.PORT || 3000;

    const app = createApp({
        eventService: require('./services/event.service'),
        production,
        sessionOptions: {
            store: new pgSession({
                pool,
                tableName: 'session'
            }),
            secret: environment.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: production
            }
        }
    });

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
    return true;
}

if (require.main === module && !startServer()) {
    process.exitCode = 1;
}

module.exports = { missingRequiredEnvironment, startServer };
