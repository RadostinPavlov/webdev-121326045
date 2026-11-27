const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const packageJson = require('../package.json');
const { missingRequiredEnvironment } = require('../src/server');
const { createApp } = require('../src/app');

test('npm start uses Node to load the optional .env file', () => {
    assert.equal(packageJson.scripts.start, 'node --env-file-if-exists=.env src/server.js');
});

test('startup reports every missing required environment variable and exits', () => {
    const environment = { ...process.env, DATABASE_URL: '', SESSION_SECRET: '' };
    const result = spawnSync(process.execPath, ['src/server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: environment,
        encoding: 'utf8'
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing DATABASE_URL: see \.env\.example/);
    assert.match(result.stderr, /missing SESSION_SECRET: see \.env\.example/);
    assert.equal(result.stderr.includes('Error:'), false);
});

test('optional model, MCP, and Google variables are not startup requirements', () => {
    assert.deepEqual(
        missingRequiredEnvironment({
            DATABASE_URL: 'postgres://localhost/clubevents',
            SESSION_SECRET: 'test-secret',
            GEMINI_API_KEY: '',
            MODEL_NAME: '',
            MCP_TOKEN: '',
            GOOGLE_CLIENT_ID: '',
            GOOGLE_CLIENT_SECRET: ''
        }),
        []
    );
});

test('NODE_ENV=production enables one trusted proxy in the app', (t) => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    t.after(() => {
        if (original === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = original;
        }
    });

    const app = createApp({
        sessionOptions: {
            secret: 'test-secret',
            resave: false,
            saveUninitialized: false
        }
    });

    assert.equal(app.get('trust proxy'), 1);
});
