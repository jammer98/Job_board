import { Router } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCompanySchema, updateCompanySchema } from "../validators/company.validators.js";
import {
  createCompany,
  getMyCompany,
  updateMyCompany,
  getCompany,
} from "../controllers/company.controller.js";

const router = Router();

router.post("/", protect, authorize("employer"),validate(createCompanySchema),catchAsync(createCompany));
router.get("/me", protect, authorize("employer"), catchAsync(getMyCompany));
router.patch("/me", protect, authorize("employer"),validate(updateCompanySchema), catchAsync(updateMyCompany));
router.get("/:id", catchAsync(getCompany)); // public. Must stay below /me or "me" gets read as an id

export default router;