import express from "express";
import { httpLogger } from "./middlewares/logger.middleware.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import companyRoutes from "./routes/company.routes.js"
import jobRoutes from "./routes/job.routes.js"
import applicationRoutes from "./routes/application.routes.js";

const app = express();

app.use(httpLogger);
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

app.use(notFound);
app.use(errorHandler); // must be last

export default app;