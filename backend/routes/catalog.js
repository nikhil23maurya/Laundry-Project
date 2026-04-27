const express = require("express");
const { listCatalog, upsertCatalog } = require("../controllers/catalogController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, listCatalog);
router.put("/", requireAuth, requireRole("admin"), upsertCatalog);

module.exports = router;

