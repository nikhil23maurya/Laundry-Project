const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("admin", "staff"), getDashboard);

module.exports = router;
