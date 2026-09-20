import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

const name = process.env.ADMIN_NAME || "Admin";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const { rowCount } = await pool.query(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES ($1, $2, $3, 'admin')
   ON CONFLICT (email) DO NOTHING`,
  [name, email, hash]
);

console.log(
  rowCount ? `Admin created: ${email}` : `${email} already exists, nothing changed`
);
await pool.end();