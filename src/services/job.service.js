import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { buildUpdate } from "../utils/buildUpdates.js";

const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"];
const JOB_STATUSES = ["open", "closed"];
const UPDATABLE = ["title", "description", "location", "employment_type", "salary_min", "salary_max", "status"];

function validateJobFields(data) {
  if (data.employment_type !== undefined && !EMPLOYMENT_TYPES.includes(data.employment_type)) {
    throw new AppError(`employmentType must be one of: ${EMPLOYMENT_TYPES.join(", ")}`, 400);
  }
  if (data.status !== undefined && !JOB_STATUSES.includes(data.status)) {
    throw new AppError("status must be 'open' or 'closed'", 400);
  }
  for (const field of ["salary_min", "salary_max"]) {
    const v = data[field];
    if (v !== undefined && v !== null && (!Number.isInteger(v) || v < 0)) {
      throw new AppError("Salary values must be non-negative whole numbers", 400);
    }
  }
  if (data.salary_min != null && data.salary_max != null && data.salary_min > data.salary_max) {
    throw new AppError("salaryMin cannot be greater than salaryMax", 400);
  }
}

async function getEmployerCompanyId(userId) {
  const { rows } = await pool.query("SELECT id FROM companies WHERE employer_id = $1", [userId]);
  if (!rows[0]) throw new AppError("Create a company profile before posting jobs", 400);
  return rows[0].id;
}

export async function createJob(userId, data) {
  validateJobFields(data);
  const companyId = await getEmployerCompanyId(userId);

  const { rows } = await pool.query(
    `INSERT INTO jobs (company_id, title, description, location, employment_type, salary_min, salary_max)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      companyId,
      data.title,
      data.description,
      data.location || null,
      data.employment_type || null,
      data.salary_min ?? null,
      data.salary_max ?? null,
    ]
  );
  return rows[0];
}

export async function listJobs({ q, location, employmentType, page, limit }) {
  const conditions = ["j.status = 'open'"];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(j.title ILIKE $${values.length} OR j.description ILIKE $${values.length})`);
  }
  if (location) {
    values.push(`%${location}%`);
    conditions.push(`j.location ILIKE $${values.length}`);
  }
  if (employmentType) {
    values.push(employmentType);
    conditions.push(`j.employment_type = $${values.length}`);
  }

  const where = conditions.join(" AND ");
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
  const offset = (pageNum - 1) * limitNum;

  const { rows: jobs } = await pool.query(
    `SELECT j.id, j.title, j.location, j.employment_type, j.salary_min, j.salary_max, j.created_at,
            c.id AS company_id, c.name AS company_name
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     WHERE ${where}
     ORDER BY j.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limitNum, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM jobs j WHERE ${where}`,
    values
  );
  const total = countRows[0].total;

  return { jobs, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) };
}

export async function getJobById(id) {
  const { rows } = await pool.query(
    `SELECT j.*, c.name AS company_name, c.website AS company_website
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     WHERE j.id = $1`,
    [id]
  );
  if (!rows[0]) throw new AppError("Job not found", 404);
  return rows[0];
}

export async function listMyJobs(userId) {
  const { rows } = await pool.query(
    `SELECT j.* FROM jobs j
     JOIN companies c ON c.id = j.company_id
     WHERE c.employer_id = $1
     ORDER BY j.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateJob(jobId, userId, data) {
  validateJobFields(data);
  const update = buildUpdate(data, UPDATABLE);
  if (!update) throw new AppError("No valid fields to update", 400);

  const n = update.values.length;
  // Ownership check lives in the WHERE clause: you can only update a job whose company is yours
  const { rows } = await pool.query(
    `UPDATE jobs SET ${update.setClause}
     WHERE id = $${n + 1}
       AND company_id = (SELECT id FROM companies WHERE employer_id = $${n + 2})
     RETURNING *`,
    [...update.values, jobId, userId]
  );
  if (!rows[0]) throw new AppError("Job not found", 404);
  return rows[0];
}

export async function deleteJob(jobId, user) {
  const result =
    user.role === "admin"
      ? await pool.query("DELETE FROM jobs WHERE id = $1", [jobId])
      : await pool.query(
          `DELETE FROM jobs
           WHERE id = $1
             AND company_id = (SELECT id FROM companies WHERE employer_id = $2)`,
          [jobId, user.id]
        );
  if (result.rowCount === 0) throw new AppError("Job not found", 404);
}