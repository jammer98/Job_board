import multer from "multer";
import { AppError } from "../utils/AppError.js";

export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new AppError("Only PDF resumes are allowed", 400));
    }
    cb(null, true);
  },
}).single("resume"); // the form field must be named "resume"