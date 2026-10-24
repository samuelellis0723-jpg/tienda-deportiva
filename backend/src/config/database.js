import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST ?? process.env.PGHOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? process.env.PGPORT ?? 5432),
  database: process.env.DB_NAME ?? process.env.PGDATABASE ?? 'oje_dev',
  user: process.env.DB_USER ?? process.env.PGUSER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? process.env.PGPASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (error) => {
  console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error.message);
});

export async function query(text, values = []) {
  return pool.query(text, values);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}

export default pool;