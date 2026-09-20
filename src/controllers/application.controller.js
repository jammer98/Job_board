import * as applicationService from "../services/application.service.js";
import { AppError } from "../utils/AppError.js";
import { parseId } from "../utils/parseId.js";

export async function applyToJob(req, res) {
  const jobId = parseId(req.params.id, "job id");

  if (!req.file) throw new AppError("resume (PDF file) is required", 400);
  // The mimetype comes from the client and can be faked; real PDFs start with "%PDF"
  if (req.file.buffer.subarray(0, 4).toString() !== "%PDF") {
    throw new AppError("Uploaded file is not a valid PDF", 400);
  }

  const coverLetter = req.body.coverLetter;
  if (coverLetter && coverLetter.length > 5000) {
    throw new AppError("coverLetter must be 5000 characters or fewer", 400);
  }

  const application = await applicationService.applyToJob({
    jobId,
    candidateId: req.user.id,
    file: req.file,
    coverLetter,
  });
  res.status(201).json({ application });
}

export async function listJobApplications(req, res) {
  const applications = await applicationService.listApplicantsForJob(
    parseId(req.params.id, "job id"),
    req.user
  );
  res.status(200).json({ applications });
}

export async function listMyApplications(req, res) {
  const applications = await applicationService.listMyApplications(req.user.id);
  res.status(200).json({ applications });
}

export async function updateApplicationStatus(req, res) {
  const application = await applicationService.updateApplicationStatus(
    parseId(req.params.id, "application id"),
    req.body.status,
    req.user.id
  );
  res.status(200).json({ application });
}