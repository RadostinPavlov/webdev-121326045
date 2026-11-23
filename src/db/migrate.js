const fs = require('fs');
const path = require('path');
const pool = require('./db');

const migrationDirectory = path.join(__dirname, 'migrations');
const migrationLockId = 121326045;

async function migrate(dbPool = pool) {
    const client = await dbPool.connect();
    let lockAcquired = false;

    try {
        await client.query('SELECT pg_advisory_lock($1::bigint)', [migrationLockId]);
        lockAcquired = true;

        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        const migrationFiles = fs.readdirSync(migrationDirectory)
            .filter((filename) => /^\d{3}_[a-z0-9_]+\.sql$/.test(filename))
            .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

        for (const filename of migrationFiles) {
            await client.query('BEGIN');
            let transactionOpen = true;

            try {
                const result = await client.query(
                    'SELECT 1 FROM schema_migrations WHERE filename = $1',
                    [filename]
                );

                if (result.rowCount > 0) {
                    await client.query('ROLLBACK');
                    transactionOpen = false;
                    continue;
                }

                const sql = fs.readFileSync(path.join(migrationDirectory, filename), 'utf8');
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [filename]
                );
                await client.query('COMMIT');
                transactionOpen = false;
                console.log(`Applied migration ${filename}.`);
            } catch (error) {
                if (transactionOpen) {
                    await client.query('ROLLBACK');
                }
                throw error;
            }
        }
    } finally {
        try {
            if (lockAcquired) {
                await client.query('SELECT pg_advisory_unlock($1::bigint)', [migrationLockId]);
            }
        } finally {
            client.release();
        }
    }
}

if (require.main === module) {
    migrate()
        .then(() => {
            console.log('Database migrations complete.');
        })
        .catch((error) => {
            console.error('Database migration failed:', error);
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}

module.exports = { migrate };
