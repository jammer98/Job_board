import { Router } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { applyLimiter } from "../middlewares/ratelimiter.middleware.js";
import { uploadResume } from "../middlewares/upload.middleware.js";
import { createJobSchema, updateJobSchema, listJobsQuerySchema } from "../validators/job.validators.js";
import {
  createJob,
  listJobs,
  getJob,
  listMyJobs,
  updateJob,
  deleteJob,
} from "../controllers/job.controller.js";
import { applyToJob, listJobApplications } from "../controllers/application.controller.js";
import { applySchema } from "../validators/applications.validators.js";

const router = Router();


router.get("/", validate(listJobsQuerySchema, "query"), catchAsync(listJobs));
router.get("/mine", protect, authorize("employer"), catchAsync(listMyJobs)); // must stay above /:id
router.get("/:id", catchAsync(getJob));
router.post("/", protect, authorize("employer"), validate(createJobSchema), catchAsync(createJob));
router.patch("/:id", protect, authorize("employer"), validate(updateJobSchema), catchAsync(updateJob));
router.delete("/:id", protect, authorize("employer", "admin"), catchAsync(deleteJob));

// Order matters: who are you → allowed? → over your limit? → parse the file → validate the text fields
router.post(
  "/:id/apply",
  protect,
  authorize("candidate"),
  applyLimiter,
  uploadResume,
  validate(applySchema), // after multer, because multer is what fills req.body for multipart forms
  catchAsync(applyToJob)
);
router.get("/:id/applications", protect, authorize("employer", "admin"), catchAsync(listJobApplications));

export default router;