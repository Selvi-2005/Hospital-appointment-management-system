const pool = require('./config/db');

async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();

        console.log('✅ MySQL database connected successfully!');

        const [rows] = await connection.query('SELECT 1 AS result');

        console.log('✅ Database query successful:', rows);

        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    } finally {
        await pool.end();
    }
}

testDatabaseConnection();