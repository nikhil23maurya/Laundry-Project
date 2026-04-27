const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  login,
  refresh,
  logout,
  me,
  createUser,
  registerCustomer
} = require("../controllers/authController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/login", loginLimiter, login);
router.post("/register", registerCustomer);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/users", requireAuth, requireRole("admin"), createUser);

module.exports = router;

