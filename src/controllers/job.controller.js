import * as jobService from "../services/job.service.js";
import { parseId } from "../utils/parseId.js";

// The API speaks camelCase; the database speaks snake_case. This is the translation point.
function toJobFields(body) {
  return {
    title: body.title,
    description: body.description,
    location: body.location,
    employment_type: body.employmentType,
    salary_min: body.salaryMin,
    salary_max: body.salaryMax,
    status: body.status,
  };
}

export async function createJob(req, res) {
  const data = toJobFields(req.body);
  const job = await jobService.createJob(req.user.id, data);
  res.status(201).json({ job });
}

export async function listJobs(req, res) {
  const result = await jobService.listJobs(req.query);
  res.status(200).json(result);
}

export async function getJob(req, res) {
  const job = await jobService.getJobById(parseId(req.params.id, "job id"));
  res.status(200).json({ job });
}

export async function listMyJobs(req, res) {
  const jobs = await jobService.listMyJobs(req.user.id);
  res.status(200).json({ jobs });
}

export async function updateJob(req, res) {
  const job = await jobService.updateJob(
    parseId(req.params.id, "job id"),
    req.user.id,
    toJobFields(req.body)
  );
  res.status(200).json({ job });
}

export async function deleteJob(req, res) {
  await jobService.deleteJob(parseId(req.params.id, "job id"), req.user);
  res.status(204).send();
}