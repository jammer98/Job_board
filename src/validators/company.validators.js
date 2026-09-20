import { z } from "zod";

const website = z
  .string()
  .trim()
  .url()
  .max(255)
  // .url() accepts things like "javascript:alert(1)", which is dangerous if a frontend renders it as a link
  .refine((v) => /^https?:\/\//i.test(v), "must start with http:// or https://");

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).optional(),
  website: website.optional(),
});

export const updateCompanySchema = createCompanySchema.partial(); // every field optional