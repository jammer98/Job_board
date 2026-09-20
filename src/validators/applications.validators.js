import { z } from "zod";

export const applySchema = z.object({
  coverLetter: z.string().trim().max(5000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["reviewed", "accepted", "rejected"]),
});