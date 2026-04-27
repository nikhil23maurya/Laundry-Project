const { getDb } = require("../db");
const { STATUS_FLOW } = require("./ordersController");

function getDashboard(req, res) {
  const db = getDb();
  const totalOrders = db.prepare("SELECT COUNT(1) AS count FROM orders").get()
    .count;
  const totalRevenue = db
    .prepare("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders")
    .get().total;

  const statusRows = db
    .prepare("SELECT status, COUNT(1) AS count FROM orders GROUP BY status")
    .all();
  const statusBreakdown = STATUS_FLOW.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  for (const row of statusRows) {
    statusBreakdown[row.status] = row.count;
  }

  const last7 = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(1) AS orders
       FROM orders
       WHERE created_at >= datetime('now', '-6 days')
       GROUP BY substr(created_at, 1, 10)
       ORDER BY day ASC`
    )
    .all();

  res.json({ totalOrders, totalRevenue, statusBreakdown, last7Days: last7 });
}

module.exports = { getDashboard };
