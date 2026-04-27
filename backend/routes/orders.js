const express = require("express");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateStatus
} = require("../controllers/ordersController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, createOrder);
router.get("/", requireAuth, getOrders);
router.get("/:id", requireAuth, getOrderById);
router.patch("/:id/status", requireAuth, updateStatus);

module.exports = router;
