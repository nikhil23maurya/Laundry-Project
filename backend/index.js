require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const { config } = require("./config");
const { initDb } = require("./db");
const { seedIfNeeded } = require("./db/seed");

const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const dashboardRoutes = require("./routes/dashboard");
const catalogRoutes = require("./routes/catalog");

async function start() {
  await initDb();
  const seed = seedIfNeeded();

  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(morgan("dev"));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/catalog", catalogRoutes);

  const frontendDist = path.join(__dirname, "..", "frontend", "dist");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      return res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    if (seed && seed.admin) {
      console.log("Seeded admin user:");
      console.log(`  email: ${seed.admin.email}`);
      console.log(`  password: ${seed.admin.password}`);
      console.log("Set ADMIN_PASSWORD to keep a stable password.");
    }
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exitCode = 1;
});
