import pool from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

const REVIEW_STATUSES = ["reviewed", "accepted", "rejected"]; // "pending" is only ever the starting state

export async function applyToJob({ jobId, candidateId, file, coverLetter }) {
  const { rows: jobRows } = await pool.query("SELECT id, status FROM jobs WHERE id = $1", [jobId]);
  if (!jobRows[0]) throw new AppError("Job not found", 404);
  if (jobRows[0].status !== "open") {
    throw new AppError("This job is no longer accepting applications", 400);
  }

  // Check for a duplicate BEFORE uploading, so we don't waste an upload
  const { rows: existing } = await pool.query(
    "SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2",
    [jobId, candidateId]
  );
  if (existing.length > 0) throw new AppError("You have already applied to this job", 409);

  const upload = await uploadToCloudinary(file.buffer, {
    publicId: `resume-${candidateId}-${jobId}-${Date.now()}.pdf`, // raw files need the extension in the id
  });

  try {
    const { rows } = await pool.query(
      `INSERT INTO applications (job_id, candidate_id, resume_url, cover_letter)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [jobId, candidateId, upload.secure_url, coverLetter || null]
    );
    logger.info({ applicationId: rows[0].id, jobId, candidateId }, "Application submitted");
    return rows[0];
  } catch (err) {
    // The insert failed after the upload succeeded, so delete the orphaned file
    await cloudinary.uploader
      .destroy(upload.public_id, { resource_type: "raw" })
      .catch((e) => logger.warn({ e }, "Failed to clean up orphaned resume"));
    throw err;
  }
}

export async function listApplicantsForJob(jobId, user) {
  const { rows: jobRows } = await pool.query(
    `SELECT j.id, c.employer_id
     FROM jobs j JOIN companies c ON c.id = j.company_id
     WHERE j.id = $1`,
    [jobId]
  );
  const job = jobRows[0];
  if (!job) throw new AppError("Job not found", 404);
  // Ownership check: an employer can only see applicants for their own jobs (admins see all)
  if (user.role === "employer" && job.employer_id !== user.id) {
    throw new AppError("Job not found", 404);
  }

  const { rows } = await pool.query(
    `SELECT a.id, a.status, a.resume_url, a.cover_letter, a.applied_at,
            u.id AS candidate_id, u.name AS candidate_name, u.email AS candidate_email
     FROM applications a
     JOIN users u ON u.id = a.candidate_id
     WHERE a.job_id = $1
     ORDER BY a.applied_at DESC`,
    [jobId]
  );
  return rows;
}

export async function listMyApplications(candidateId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.status, a.resume_url, a.applied_at,
            j.id AS job_id, j.title AS job_title, c.name AS company_name
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN companies c ON c.id = j.company_id
     WHERE a.candidate_id = $1
     ORDER BY a.applied_at DESC`,
    [candidateId]
  );
  return rows;
}

export async function updateApplicationStatus(applicationId, status, employerId) {
  if (!REVIEW_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${REVIEW_STATUSES.join(", ")}`, 400);
  }

  // Ownership check: the application must belong to a job at THIS employer's company
  const { rows } = await pool.query(
    `UPDATE applications a SET status = $1
     FROM jobs j JOIN companies c ON c.id = j.company_id
     WHERE a.id = $2 AND j.id = a.job_id AND c.employer_id = $3
     RETURNING a.*`,
    [status, applicationId, employerId]
  );
  if (!rows[0]) throw new AppError("Application not found", 404);
  return rows[0];
}