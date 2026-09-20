import * as companyService from "../services/company.service.js";
import { AppError } from "../utils/AppError.js";
import { parseId } from "../utils/parseId.js";

export async function createCompany(req, res) {
  const { name, description, website } = req.body;
  if (!name) throw new AppError("name is required", 400);

  const company = await companyService.createCompany(req.user.id, { name, description, website });
  res.status(201).json({ company });
}

export async function getMyCompany(req, res) {
  const company = await companyService.getMyCompany(req.user.id);
  res.status(200).json({ company });
}

export async function updateMyCompany(req, res) {
  const { name, description, website } = req.body;
  const company = await companyService.updateMyCompany(req.user.id, { name, description, website });
  res.status(200).json({ company });
}

export async function getCompany(req, res) {
  const company = await companyService.getCompanyById(parseId(req.params.id, "company id"));
  res.status(200).json({ company });
}