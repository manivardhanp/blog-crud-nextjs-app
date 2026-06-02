import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Creates a connection pool to manage database traffic smoothly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:root@127.0.0.1:5432/blog_platform",
});

// Exports the db instance with your schema loaded for full autocomplete type safety
export const db = drizzle(pool, { schema });