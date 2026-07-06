import mysql from 'mysql2/promise';

function envFlag(value) {
  return ['1', 'true', 'yes', 'required'].includes(String(value || '').toLowerCase());
}

function sslConfig() {
  if (!envFlag(process.env.DB_SSL)) {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(sslConfig() ? { ssl: sslConfig() } : {}),
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
