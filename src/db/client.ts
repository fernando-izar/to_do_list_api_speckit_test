import { Pool } from 'pg';

/** Shared PostgreSQL connection pool. Uses DATABASE_URL from environment. */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default pool;
