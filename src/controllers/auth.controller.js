import { registerUser, loginUser } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    throw new AppError("name, email, password, and role are required", 400);
  }
  if (password.length < 6) throw new AppError("Password must be at least 6 characters", 400);

  const { user, token } = await registerUser({ name, email, password, role });
  res.status(201).json({ user, token });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("email and password are required", 400);

  const { user, token } = await loginUser({ email, password });
  res.status(200).json({ user, token });
}

export async function me(req, res) {
  res.status(200).json({ user: req.user });
}