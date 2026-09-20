import express from "express";
import helmet from "helmet";
import cors from "cors";
import { httpLogger } from "./middlewares/logger.middleware.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import companyRoutes from "./routes/company.routes.js"
import jobRoutes from "./routes/job.routes.js"
import applicationRoutes from "./routes/application.routes.js";
import { globalLimiter } from "./middlewares/ratelimiter.middleware.js";

const app = express();

if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header means Postman, curl, or a server-to-server call, not a browser page
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new AppError("Origin not allowed by CORS", 403));
    },
  })
);  

app.use(httpLogger);

app.use("/api/health", healthRoutes);

app.use(globalLimiter);
app.use(express.json({ limit: "10kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

app.use(notFound);
app.use(errorHandler); // must be last

export default app;