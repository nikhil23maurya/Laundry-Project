const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const { getDb, nowIso } = require("../db");
const { sendError } = require("../utils/http");

const STATUS_FLOW = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

function estimateReadyAt(totalPieces) {
  const hours = 24 + Math.min(72, totalPieces * 6);
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function getActiveCatalogMap(db) {
  const rows = db
    .prepare(
      "SELECT name, unit_price AS unitPrice FROM catalog_items WHERE active = 1"
    )
    .all();
  const map = new Map();
  for (const row of rows) {
    map.set(row.name.toLowerCase(), row.unitPrice);
  }
  return map;
}

const createOrderSchema = z.object({
  customerName: z.string().min(1).max(80),
  phone: z.string().min(5).max(20),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        quantity: z.number().int().min(1)
      })
    )
    .min(1),
  currency: z.string().min(3).max(3).optional()
});

function createOrder(req, res) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid order payload.", parsed.error.flatten());
  }

  const db = getDb();
  const catalog = getActiveCatalogMap(db);
  if (catalog.size === 0) {
    return sendError(res, 400, "Catalog is empty.");
  }

  const timestamp = nowIso();
  const orderId = uuidv4();

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, customer_name, phone, status, currency, total_amount, estimated_ready_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (id, order_id, item_name, quantity, unit_price, line_total)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertEvent = db.prepare(
    `INSERT INTO order_status_events (id, order_id, from_status, to_status, changed_by, changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  let totalAmount = 0;
  let totalPieces = 0;
  const normalizedItems = [];
  for (const item of parsed.data.items) {
    const name = item.name.trim();
    const unitPrice = catalog.get(name.toLowerCase());
    if (unitPrice === undefined) {
      return sendError(
        res,
        400,
        `Unknown or inactive item: ${name}. Use an active catalog item.`
      );
    }
    const lineTotal = unitPrice * item.quantity;
    normalizedItems.push({
      id: uuidv4(),
      orderId,
      name,
      quantity: item.quantity,
      unitPrice,
      lineTotal
    });
    totalAmount += lineTotal;
    totalPieces += item.quantity;
  }

  const estimatedReadyAt = estimateReadyAt(totalPieces);

  const tx = db.transaction(() => {
    insertOrder.run([
      orderId,
      parsed.data.customerName.trim(),
      parsed.data.phone.trim(),
      STATUS_FLOW[0],
      (parsed.data.currency || "INR").toUpperCase(),
      totalAmount,
      estimatedReadyAt,
      req.user ? req.user.id : null,
      timestamp,
      timestamp
    ]);

    for (const row of normalizedItems) {
      insertItem.run([
        row.id,
        row.orderId,
        row.name,
        row.quantity,
        row.unitPrice,
        row.lineTotal
      ]);
    }

    insertEvent.run([
      uuidv4(),
      orderId,
      null,
      STATUS_FLOW[0],
      req.user ? req.user.id : null,
      timestamp
    ]);
  });
  tx();

  return res.status(201).json({
    orderId,
    status: STATUS_FLOW[0],
    totalAmount,
    estimatedReadyAt
  });
}

const listSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  phone: z.string().optional(),
  customerName: z.string().optional(),
  garment: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

function getOrders(req, res) {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid query.", parsed.error.flatten());
  }

  const status = (parsed.data.status || "").trim().toUpperCase();
  const allowedStatuses = new Set(STATUS_FLOW);
  if (status && !allowedStatuses.has(status)) {
    return sendError(res, 400, "Invalid status filter.");
  }

  const search = (parsed.data.search || "").trim().toLowerCase();
  const phone = (parsed.data.phone || "").trim();
  const customerName = (parsed.data.customerName || "").trim().toLowerCase();
  const garment = (parsed.data.garment || "").trim().toLowerCase();

  const page = parsed.data.page;
  const pageSize = parsed.data.pageSize;
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];

  if (req.user && req.user.role === "customer") {
    where.push("o.created_by = ?");
    params.push(req.user.id);
  }

  if (status) {
    where.push("o.status = ?");
    params.push(status);
  }
  if (phone) {
    where.push("o.phone LIKE ?");
    params.push(`%${phone}%`);
  }
  if (customerName) {
    where.push("LOWER(o.customer_name) LIKE ?");
    params.push(`%${customerName}%`);
  }
  if (search) {
    where.push(
      "(LOWER(o.customer_name) LIKE ? OR o.phone LIKE ? OR o.id LIKE ?)"
    );
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (garment) {
    where.push(
      "EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND LOWER(oi.item_name) LIKE ?)"
    );
    params.push(`%${garment}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const total = db
    .prepare(`SELECT COUNT(1) AS count FROM orders o ${whereSql}`)
    .get(params).count;

  const rows = db
    .prepare(
      `SELECT o.id, o.customer_name AS customerName, o.phone, o.status,
              o.currency, o.total_amount AS totalAmount, o.estimated_ready_at AS estimatedReadyAt,
              o.created_at AS createdAt, o.updated_at AS updatedAt
       FROM orders o
       ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all([...params, pageSize, offset]);

  return res.json({
    data: rows,
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

function getOrderById(req, res) {
  const orderId = String(req.params.id || "").trim();
  if (!orderId) {
    return sendError(res, 400, "Order id is required.");
  }

  const db = getDb();
  const order = db
    .prepare(
      `SELECT id, customer_name AS customerName, phone, status, currency,
              total_amount AS totalAmount, estimated_ready_at AS estimatedReadyAt,
              created_at AS createdAt, updated_at AS updatedAt
       FROM orders WHERE id = ?`
    )
    .get([orderId]);

  if (!order) {
    return sendError(res, 404, "Order not found.");
  }
  if (req.user && req.user.role === "customer") {
    const owner = db
      .prepare("SELECT created_by AS createdBy FROM orders WHERE id = ?")
      .get([orderId]);
    if (!owner || owner.createdBy !== req.user.id) {
      return sendError(res, 403, "Forbidden.");
    }
  }

  const items = db
    .prepare(
      `SELECT id, item_name AS name, quantity, unit_price AS unitPrice, line_total AS lineTotal
       FROM order_items WHERE order_id = ? ORDER BY item_name ASC`
    )
    .all([orderId]);

  const events = db
    .prepare(
      `SELECT id, from_status AS fromStatus, to_status AS toStatus, changed_by AS changedBy, changed_at AS changedAt
       FROM order_status_events WHERE order_id = ? ORDER BY changed_at ASC`
    )
    .all([orderId]);

  return res.json({ ...order, items, events });
}

const updateStatusSchema = z.object({
  status: z.enum(["RECEIVED", "PROCESSING", "READY", "DELIVERED"])
});

function updateStatus(req, res) {
  const orderId = String(req.params.id || "").trim();
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid status payload.", parsed.error.flatten());
  }

  const nextStatus = parsed.data.status;
  const db = getDb();
  const order = db
    .prepare("SELECT id, status FROM orders WHERE id = ?")
    .get([orderId]);
  if (!order) {
    return sendError(res, 404, "Order not found.");
  }
  if (req.user && req.user.role === "customer") {
    return sendError(res, 403, "Forbidden.");
  }

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextIndex = STATUS_FLOW.indexOf(nextStatus);
  const allowedNext = STATUS_FLOW[currentIndex + 1];

  if (nextIndex !== currentIndex + 1) {
    return sendError(
      res,
      400,
      allowedNext
        ? `Invalid status transition. Next allowed status: ${allowedNext}.`
        : "Order is already delivered."
    );
  }

  const timestamp = nowIso();
  const tx = db.transaction(() => {
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run([
      nextStatus,
      timestamp,
      orderId
    ]);
    db.prepare(
      `INSERT INTO order_status_events (id, order_id, from_status, to_status, changed_by, changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run([
      uuidv4(),
      orderId,
      order.status,
      nextStatus,
      req.user ? req.user.id : null,
      timestamp
    ]);
  });
  tx();

  return res.json({ orderId, status: nextStatus });
}

module.exports = {
  STATUS_FLOW,
  createOrder,
  getOrders,
  getOrderById,
  updateStatus
};
