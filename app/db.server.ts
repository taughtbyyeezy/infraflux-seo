import pg from 'pg';
const { Pool } = pg;

// Use a global variable to persist the pool across HMR in development
declare global {
  var __db_pool: pg.Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database queries will fail.");
}

const pool = global.__db_pool || new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

if (process.env.NODE_ENV !== "production") {
  global.__db_pool = pool;
}

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
