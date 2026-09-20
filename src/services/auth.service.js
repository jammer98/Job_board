import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

const SELF_SIGNUP_ROLES = ["candidate", "employer"]; // admin is never self-assigned, it's seeded manually

function signToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export async function registerUser({ name, email, password, role }) {
  if (!SELF_SIGNUP_ROLES.includes(role)) {
    throw new AppError("Role must be 'candidate' or 'employer'", 400);
  }

  const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.length > 0) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
    [name, email, passwordHash, role]
  );

  const user = rows[0];
  logger.info({ userId: user.id, role }, "User registered");
  return { user, token: signToken(user.id, user.role) };
}

export async function loginUser({ email, password }) {
  const { rows } = await pool.query(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];
  if (!user) throw new AppError("Invalid email or password", 401);

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw new AppError("Invalid email or password", 401);

  logger.info({ userId: user.id }, "User logged in");
  delete user.password_hash;
  return { user, token: signToken(user.id, user.role) };
}