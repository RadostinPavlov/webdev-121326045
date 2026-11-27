const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.checkConnection = async function checkConnection() {
    await pool.query('SELECT 1');
};

module.exports = pool;
