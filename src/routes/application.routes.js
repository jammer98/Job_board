import { Router } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import {
  listMyApplications,
  updateApplicationStatus,
} from "../controllers/application.controller.js";

const router = Router();

router.get("/mine", protect, authorize("candidate"), catchAsync(listMyApplications));
router.patch("/:id/status", protect, authorize("employer"), catchAsync(updateApplicationStatus));

export default router;