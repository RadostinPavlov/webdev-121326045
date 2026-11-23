const pool = require('./db');
const { migrate } = require('./migrate');
const { seed } = require('./seed');

async function setup() {
    try {
        console.log('Applying database migrations...');
        await migrate();

        console.log('Seeding data...');
        await seed();

        console.log('Database setup complete.');
    } catch (err) {
        console.error('Database setup failed:', err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    setup();
}
