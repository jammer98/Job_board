# Job Board API

A REST API for a job board with three roles: **candidates** browse jobs and apply with a PDF resume, **employers** post jobs and review applicants, and **admins** moderate. Built with Node.js, Express, and PostgreSQL, with role-based access control, ownership-based authorization, and resume uploads to Cloudinary.

## Features

- JWT authentication (register, login) with **role-based access control** (candidate / employer / admin)
- Employers create one company profile, post jobs, and manage only their own listings
- Public job browsing with search, location and employment-type filters, and pagination
- Candidates apply with a **PDF resume** (streamed to Cloudinary, never written to disk) and a cover letter
- Employers see applicants for their own jobs and move applications through `pending → reviewed → accepted / rejected`
- Candidates track the status of their own applications
- Input validation, rate limiting, secure headers, and CORS allow-listing
- Structured JSON logging and consistent `{ "error": "..." }` responses

## Tech stack

| Area | Choice |
|---|---|
| Runtime / framework | Node.js (ES modules), Express |
| Database | PostgreSQL via `pg` (raw SQL, no ORM) |
| Auth | `jsonwebtoken`, `bcryptjs` |
| File uploads | `multer` (memory storage) + `cloudinary` |
| Validation | `zod` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Logging | `pino`, `pino-http` |

## Architecture

Requests flow through a layered structure, and each layer has one job:

```
routes  →  controllers  →  services  →  PostgreSQL
(wiring)   (HTTP in/out)   (business rules + SQL)
```

The middleware order for the most complex route, `POST /api/jobs/:id/apply`:

```mermaid
flowchart LR
  A[Request] --> B[helmet, cors, logger]
  B --> C[global rate limit]
  C --> D[protect: verify JWT]
  D --> E[authorize: candidate only]
  E --> F[apply rate limit]
  F --> G[multer: PDF, max 5 MB]
  G --> H[validate: zod]
  H --> I[controller]
  I --> J[service]
  J --> K[Cloudinary upload]
  J --> L[(PostgreSQL)]
```

### Project structure

```
job-board/
├── db/
│   └── schema.sql
├── scripts/
│   └── seedAdmin.js
├── src/
│   ├── config/          db.js, cloudinary.js
│   ├── controllers/     auth, company, job, application
│   ├── services/        auth, company, job, application
│   ├── middleware/      auth (protect), rbac (authorize), validate, rateLimit,
│   │                    upload, logger, error
│   ├── routes/          auth, company, job, application, health
│   ├── validators/      zod schemas for auth, company, job, application
│   ├── utils/           AppError, catchAsync, logger, parseId,
│   │                    buildUpdate, uploadToCloudinary
│   └── app.js
├── index.js
├── .env.example
└── package.json
```

## Data model

```mermaid
erDiagram
  USERS ||--o| COMPANIES : "employer owns"
  COMPANIES ||--o{ JOBS : posts
  USERS ||--o{ APPLICATIONS : "candidate submits"
  JOBS ||--o{ APPLICATIONS : receives

  USERS {
    int id PK
    string name
    string email UK
    string password_hash
    enum role "candidate | employer | admin"
    timestamp created_at
  }
  COMPANIES {
    int id PK
    int employer_id FK, UK
    string name
    text description
    string website
  }
  JOBS {
    int id PK
    int company_id FK
    string title
    text description
    string location
    string employment_type
    int salary_min
    int salary_max
    enum status "open | closed"
  }
  APPLICATIONS {
    int id PK
    int job_id FK
    int candidate_id FK
    text resume_url
    text cover_letter
    enum status "pending | reviewed | accepted | rejected"
    timestamp applied_at
  }
```

`applications` is a many-to-many junction between candidates and jobs, but it carries data of its own (status, resume, cover letter), so it is a full entity rather than a bare link table. The full schema, including indexes and constraints, is in [`db/schema.sql`](db/schema.sql).

## Getting started

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (local or hosted)
- A free [Cloudinary](https://cloudinary.com) account

### Setup

```bash
git clone https://github.com/jammer98/Job_board.git
npm install
cp .env.example .env        # then fill in the values below
psql "$DATABASE_URI" -f db/schema.sql
npm run seed:admin          #  set ADMIN_EMAIL and ADMIN_PASSWORD in .env first
npm run dev
```

The API runs on `http://localhost:3003`. Check it with `GET /api/health`.

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URI` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/jobboard` |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |
| `PORT` | Server port, default `3003` |
| `TRUST_PROXY` | Set to `1` when deployed behind a reverse proxy so rate limiting sees real client IPs |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with file watching |
| `npm start` | Start normally |
| `npm run seed:admin` | Create the admin account (admins cannot self-register) |

## API reference

All errors return `{ "error": "message" }` with an appropriate status code. Protected routes need `Authorization: Bearer <token>`.

### Roles and permissions

| Action | Public | Candidate | Employer | Admin |
|---|:-:|:-:|:-:|:-:|
| Register / log in | ✅ | | | |
| Browse jobs and companies | ✅ | ✅ | ✅ | ✅ |
| Create company, post jobs | | | ✅ | |
| Edit / delete own jobs | | | ✅ | |
| Delete any job | | | | ✅ |
| Apply to a job | | ✅ | | |
| View applicants for a job | | | ✅ own jobs | ✅ any job |
| Update application status | | | ✅ own jobs | |
| View own applications | | ✅ | | |

### Endpoints

**Auth**

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Body: `name`, `email`, `password` (min 8), `role` (`candidate` or `employer`) |
| POST | `/api/auth/login` | Public | Body: `email`, `password` |
| GET | `/api/auth/me` | Any logged-in user | Returns `{ id, role }` from the token |

**Companies**

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/companies` | Employer | Body: `name`, optional `description`, `website`. One company per employer (409 otherwise) |
| GET | `/api/companies/me` | Employer | Your company |
| PATCH | `/api/companies/me` | Employer | Any subset of `name`, `description`, `website` |
| GET | `/api/companies/:id` | Public | |

**Jobs**

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/jobs` | Public | Open jobs only. Query: `q`, `location`, `employmentType`, `page`, `limit` (max 50) |
| GET | `/api/jobs/mine` | Employer | All your jobs, open and closed |
| GET | `/api/jobs/:id` | Public | |
| POST | `/api/jobs` | Employer | Body: `title`, `description`, optional `location`, `employmentType`, `salaryMin`, `salaryMax` |
| PATCH | `/api/jobs/:id` | Employer (owner) | Any subset of the fields above, plus `status` (`open` / `closed`) |
| DELETE | `/api/jobs/:id` | Employer (owner) or Admin | 204 on success |

`employmentType` is one of `full-time`, `part-time`, `contract`, `internship`.

**Applications**

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/jobs/:id/apply` | Candidate | `multipart/form-data`: `resume` (PDF, max 5 MB), optional `coverLetter` |
| GET | `/api/jobs/:id/applications` | Employer (owner) or Admin | Applicants with name, email, resume link |
| GET | `/api/applications/mine` | Candidate | Your applications with job title and company |
| PATCH | `/api/applications/:id/status` | Employer (owner) | Body: `status` (`reviewed`, `accepted`, `rejected`) |

**Health**

| Method | Path | Access |
|---|---|---|
| GET | `/api/health` | Public |

### Examples

Register and log in:

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha","email":"asha@example.com","password":"secret1234","role":"candidate"}'
```
```json
{
  "user": { "id": 1, "name": "Asha", "email": "asha@example.com", "role": "candidate", "created_at": "..." },
  "token": "eyJhbGciOi..."
}
```

Browse jobs with filters:

```bash
curl "http://localhost:3003/api/jobs?q=backend&location=bengaluru&page=1&limit=5"
```
```json
{
  "jobs": [
    { "id": 3, "title": "Backend Developer", "location": "Bengaluru", "employment_type": "full-time",
      "salary_min": 600000, "salary_max": 900000, "company_id": 2, "company_name": "Acme", "created_at": "..." }
  ],
  "page": 1, "limit": 5, "total": 1, "totalPages": 1
}
```

Apply with a resume:

```bash
curl -X POST http://localhost:3003/api/jobs/3/apply \
  -H "Authorization: Bearer <token>" \
  -F "resume=@./resume.pdf;type=application/pdf" \
  -F "coverLetter=I would love to join the team."
```

### Status codes

| Code | Meaning |
|---|---|
| 400 | Validation failed, bad file type or size, invalid id |
| 401 | Missing, invalid, or expired token; wrong login credentials |
| 403 | Authenticated but the role is not allowed, or CORS origin rejected |
| 404 | Not found, **or not yours** (see design decisions) |
| 409 | Duplicate (email already registered, already applied, company already exists) |
| 413 | JSON body too large |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error (details are logged, never sent to the client) |

## Design decisions

**RBAC as a role column plus middleware.** Each user has one of three fixed roles. `protect` verifies the JWT and sets `req.user`; `authorize(...roles)` checks `req.user.role` before the route logic runs. A separate roles/permissions table with many-to-many links would only pay off if admins needed to create custom roles at runtime, which they don't here. The role is embedded in the JWT to avoid a database lookup on every request. The tradeoff is that a role change only takes effect at the user's next login.

**Two layers of authorization.** `authorize("employer")` answers "is this the right kind of user?". It does not answer "is this *your* job?". Without a second check, any employer could edit or delete another employer's listings by guessing IDs (an IDOR vulnerability). Ownership is enforced inside the SQL itself, for example `WHERE id = $1 AND company_id = (SELECT id FROM companies WHERE employer_id = $2)`, using the user id from the verified token and never from the request. Ownership failures return **404 rather than 403**, so callers cannot probe which IDs exist.

**Admins can't self-register.** Registration only accepts `candidate` or `employer`. Admin accounts are created by a seed script run by someone with database access.

**Applications are a junction table with attributes.** `UNIQUE (job_id, candidate_id)` prevents double applications at the database level, so the guarantee holds even if application code is bypassed or two requests race. The service also checks first, to return a friendly 409 before spending an upload.

**Resume upload pipeline.** Multer holds the file in memory (max 5 MB, PDF only), the controller checks the `%PDF` magic bytes because the client-supplied MIME type can be faked, and the buffer is streamed to Cloudinary. Nothing touches local disk, so it works on hosts without persistent storage. Cloudinary and Postgres can't share a transaction, so if the insert fails after the upload, the service deletes the orphaned file. Authentication and role checks run *before* multer so anonymous users can't make the server buffer uploads.

**Validation in three layers.** Zod schemas check the shape of input at the edge and strip unknown fields (protection against mass assignment). Services enforce business rules such as "job must be open". Database constraints guarantee integrity regardless of code path: foreign keys, `UNIQUE`, and a `CHECK` that `salary_min <= salary_max`. The last one covers a PATCH that only sends one of the two salary fields, which request-level validation can't see.

**Hardening.** `helmet` sets security headers. CORS uses an explicit origin allow-list from the environment; no cookies are used (the JWT goes in the `Authorization` header), so `credentials` and CSRF protection aren't needed. Rate limits: 300 requests per 15 minutes per IP overall, 10 *failed* logins or registrations per 15 minutes, and 20 applications per hour per user (the upload endpoint is the expensive one). JSON bodies are capped at 10 KB. Passwords are hashed with bcrypt and capped at 72 characters, the most bcrypt uses. Emails are trimmed and lowercased on both register and login so case variants can't create duplicate accounts. Company website URLs must be `http://` or `https://`.

**Centralised error handling.** Controllers throw `AppError(message, status)` for expected failures, and `catchAsync` forwards rejections to one error middleware. That middleware also translates known Postgres error codes (unique, foreign key, check violations), multer errors, and body-parser errors into clean 4xx responses. Anything unrecognised is logged in full and returned as a generic 500, so internals never leak.

**Observability.** `pino` produces structured logs, `pino-http` logs each request, and startup verifies the database connection (fatal if it fails) and pings Cloudinary (warning only, since browsing and auth work without it).

## Known limitations and next steps

-  **No automated tests yet.** The API has been tested manually with Postman. Next step is Vitest and Supertest for the auth, RBAC, and ownership paths.
- **Resume links are public URLs.** Anyone with the link can open a resume. A production version would use Cloudinary's authenticated delivery with short-lived signed URLs.
- **Rate limit counters are in memory.** They reset on restart and are not shared across multiple instances; a Redis store would fix that.
- **Role in JWT** means role changes apply at next login; short-lived access tokens with refresh tokens would tighten this.
- **Possible features:** email notifications on status changes, applicant pagination, soft-deleting jobs so application history survives