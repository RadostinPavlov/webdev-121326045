const fs = require('fs');
const path = require('path');
const pool = require('./db');
const { seed } = require('./seed');

async function setup() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        await pool.query(schema);
        console.log('Schema applied.');

        console.log('Seeding data...');
        await seed();
        
        console.log('Database setup complete.');
    } catch (err) {
        console.error('Database setup failed:', err);
    } finally {
        await pool.end();
    }
}

setup();
