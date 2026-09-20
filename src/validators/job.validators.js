import { z } from "zod";

const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"];

const jobFields = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(10000),
  location: z.string().trim().max(100).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  salaryMin: z.number().int().min(0).nullable().optional(), // null = clear the value
  salaryMax: z.number().int().min(0).nullable().optional(),
});

const salaryOrder = [
  (d) => d.salaryMin == null || d.salaryMax == null || d.salaryMin <= d.salaryMax,
  { message: "salaryMin cannot be greater than salaryMax", path: ["salaryMin"] },
];

export const createJobSchema = jobFields.refine(...salaryOrder);

export const updateJobSchema = jobFields
  .extend({ status: z.enum(["open", "closed"]) })
  .partial()
  .refine(...salaryOrder);

export const listJobsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  page: z.coerce.number().int().min(1).optional(),   // query strings are text, so coerce to number
  limit: z.coerce.number().int().min(1).max(50).optional(),
});