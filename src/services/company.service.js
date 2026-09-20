import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { buildUpdate } from "../utils/buildUpdates.js";

export async function createCompany(employerId, { name, description, website }) {
  const { rows: existing } = await pool.query(
    "SELECT id FROM companies WHERE employer_id = $1",
    [employerId]
  );
  if (existing.length > 0) throw new AppError("You already have a company profile", 409);

  const { rows } = await pool.query(
    `INSERT INTO companies (employer_id, name, description, website)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [employerId, name, description || null, website || null]
  );
  return rows[0];
}

export async function getMyCompany(employerId) {
  const { rows } = await pool.query("SELECT * FROM companies WHERE employer_id = $1", [employerId]);
  if (!rows[0]) throw new AppError("You have not created a company profile yet", 404);
  return rows[0];
}

export async function getCompanyById(id) {
  const { rows } = await pool.query(
    "SELECT id, name, description, website, created_at FROM companies WHERE id = $1",
    [id]
  );
  if (!rows[0]) throw new AppError("Company not found", 404);
  return rows[0];
}

export async function updateMyCompany(employerId, data) {
  const update = buildUpdate(data, ["name", "description", "website"]);
  if (!update) throw new AppError("No valid fields to update", 400);

  const n = update.values.length;
  const { rows } = await pool.query(
    `UPDATE companies SET ${update.setClause} WHERE employer_id = $${n + 1} RETURNING *`,
    [...update.values, employerId]
  );
  if (!rows[0]) throw new AppError("You have not created a company profile yet", 404);
  return rows[0];
}