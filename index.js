import "dotenv/config"; // must stay the first import so env vars exist before other modules read them
import app from "./src/app.js";
import pool from "./src/config/db.js";
import logger from "./src/utils/logger.js";
import cloudinary from "./src/config/cloudinary.js";

const PORT = process.env.PORT || 3003;

async function checkCloudinary() {
  try {
    await cloudinary.api.ping();
    logger.info("Cloudinary connected");
  } catch (err) {
    // Warn instead of crashing: browsing jobs and auth still work without uploads
    logger.warn({ err: err.error?.message || err.message }, "Cloudinary check failed, resume uploads will not work");
  }
}

async function start() {
  try {
    await pool.query("SELECT 1");
    logger.info("Database connected");

    await checkCloudinary();

    app.listen(PORT, () => logger.info(`Job Board API running on port ${PORT}`));
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

start();