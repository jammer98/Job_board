import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(255);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  // bcrypt only uses the first 72 bytes, so longer passwords add nothing
  password: z.string().min(8, "must be at least 8 characters").max(72),
  role: z.enum(["candidate", "employer"]),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1), // no length rule on login, only on registration
});