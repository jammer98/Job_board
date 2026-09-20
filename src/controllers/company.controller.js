import * as companyService from "../services/company.service.js";
import { parseId } from "../utils/parseId.js";

export async function createCompany(req, res) {
  const company = await companyService.createCompany(req.user.id, req.body);
  res.status(201).json({ company });
}

export async function getMyCompany(req, res) {
  const company = await companyService.getMyCompany(req.user.id);
  res.status(200).json({ company });
}

export async function updateMyCompany(req, res) {
  const company = await companyService.updateMyCompany(req.user.id, req.body);
  res.status(200).json({ company });
}

export async function getCompany(req, res) {
  const company = await companyService.getCompanyById(parseId(req.params.id, "company id"));
  res.status(200).json({ company });
}