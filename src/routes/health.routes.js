import { Router } from "express";
import pool from "../config/db.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = Router();

router.get(
  "/",
  catchAsync(async (req, res) => {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  })
);

export default router;