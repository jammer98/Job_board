import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

const hash = await bcrypt.hash("admin123", 10);
await pool.query(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES ('Admin', 'admin@jobboard.com', $1, 'admin')
   ON CONFLICT (email) DO NOTHING`,
  [hash]
);
console.log("Admin seeded");
await pool.end();