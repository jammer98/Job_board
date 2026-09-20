import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URI,
  // If you use a hosted DB (Neon, Supabase, Render), add:
  // ssl: { rejectUnauthorized: false },
});

export default pool;