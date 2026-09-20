import { Router } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { register, login, me } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", catchAsync(register));
router.post("/login", catchAsync(login));
router.get("/me", protect, catchAsync(me)); // handy for testing that tokens work

export default router;

