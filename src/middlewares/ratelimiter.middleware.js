import rateLimit from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

// Send 429s through our error handler so the response stays { "error": "..." }
const handler = (req, res, next, options) =>
  next(new AppError(options.message, options.statusCode));

const base = { standardHeaders: "draft-7", legacyHeaders: false, handler };

// Everything: a loose safety net per IP
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: "Too many requests, please try again later",
});

// Login/register: tight, and only failed attempts count (skipSuccessfulRequests)
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many failed attempts, please try again in 15 minutes",
});

// Resume uploads hit Cloudinary, so limit them per logged-in user, not per IP
export const applyLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `user-${req.user.id}`,
  message: "Application limit reached, please try again later",
});