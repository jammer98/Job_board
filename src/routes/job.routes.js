import { Router } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import {
  createJob,
  listJobs,
  getJob,
  listMyJobs,
  updateJob,
  deleteJob,
} from "../controllers/job.controller.js";
import { uploadResume } from "../middlewares/upload.middleware.js";
import { applyToJob, listJobApplications } from "../controllers/application.controller.js";

const router = Router();

router.get("/", catchAsync(listJobs));                                              // anyone can browse
router.get("/mine", protect, authorize("employer"), catchAsync(listMyJobs));        // must stay above /:id
router.get("/:id", catchAsync(getJob));
router.post("/", protect, authorize("employer"), catchAsync(createJob));
router.patch("/:id", protect, authorize("employer"), catchAsync(updateJob));
router.delete("/:id", protect, authorize("employer", "admin"), catchAsync(deleteJob));
router.post("/:id/apply", protect, authorize("candidate"), uploadResume, catchAsync(applyToJob));
router.get("/:id/applications", protect, authorize("employer", "admin"), catchAsync(listJobApplications));

export default router;