const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const { getDb, nowIso } = require("../db");
const { sendError } = require("../utils/http");

function listCatalog(req, res) {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, unit_price AS unitPrice, active FROM catalog_items ORDER BY name ASC"
    )
    .all();
  return res.json({ items: rows });
}

const upsertSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        unitPrice: z.number().int().min(0),
        active: z.boolean().optional()
      })
    )
    .min(1)
});

function upsertCatalog(req, res) {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid catalog payload.", parsed.error.flatten());
  }

  const db = getDb();
  const timestamp = nowIso();
  const insert = db.prepare(
    `INSERT INTO catalog_items (id, name, unit_price, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const updatePos = db.prepare(
    `UPDATE catalog_items
     SET unit_price = ?, active = ?, updated_at = ?
     WHERE name = ?`
  );
  const exists = db.prepare("SELECT id FROM catalog_items WHERE name = ?");

  const tx = db.transaction(() => {
    for (const item of parsed.data.items) {
      const name = item.name.trim();
      const active = item.active === undefined ? true : Boolean(item.active);
      const row = exists.get([name]);
      if (row) {
        updatePos.run([item.unitPrice, active ? 1 : 0, timestamp, name]);
      } else {
        insert.run([
          uuidv4(),
          name,
          item.unitPrice,
          active ? 1 : 0,
          timestamp,
          timestamp
        ]);
      }
    }
  });
  tx();

  return listCatalog(req, res);
}

module.exports = { listCatalog, upsertCatalog };
