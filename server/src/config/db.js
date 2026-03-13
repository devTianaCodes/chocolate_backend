import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('Database connection OK');
  } catch (err) {
    console.error('Database connection failed', err.message);
    throw err;
  }
}
