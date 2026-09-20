-- Job Board schema (PostgreSQL)
-- Run once against an empty database:
--   psql "$DATABASE_URI" -f db/schema.sql

CREATE TYPE user_role AS ENUM ('candidate', 'employer', 'admin');
CREATE TYPE job_status AS ENUM ('open', 'closed');
CREATE TYPE application_status AS ENUM ('pending', 'reviewed', 'accepted', 'rejected');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP DEFAULT NOW()
);

-- One employer owns at most one company (UNIQUE on employer_id)
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(100),
  employment_type VARCHAR(50),
  salary_min INTEGER,
  salary_max INTEGER,
  status job_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT salary_range_check
    CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);

-- Junction table between candidates and jobs, carrying its own data
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_url TEXT NOT NULL,
  cover_letter TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);