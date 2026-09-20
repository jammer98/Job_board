import { AppError } from "./AppError.js";

export function parseId(value, label = "id") {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new AppError(`Invalid ${label}`, 400);
  return id;
}