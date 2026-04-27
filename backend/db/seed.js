const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const { getDb, nowIso } = require("./index");

function generatePassword() {
  return crypto.randomBytes(12).toString("base64url");
}

const { config } = require("../config");

function ensureCatalog() {
  const db = getDb();
  const existing = db
    .prepare("SELECT COUNT(1) AS count FROM catalog_items")
    .get();
  if (existing.count > 0) {
    return;
  }

  const seedItems = [
    { name: "Shirt", unitPrice: 10 },
    { name: "Pants", unitPrice: 15 },
    { name: "Saree", unitPrice: 20 }
  ];

  const insert = db.prepare(
    "INSERT INTO catalog_items (id, name, unit_price, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const timestamp = nowIso();
  const tx = db.transaction(() => {
    for (const item of seedItems) {
      insert.run([
        uuidv4(),
        item.name,
        item.unitPrice,
        1,
        timestamp,
        timestamp
      ]);
    }
  });
  tx();
}

function ensureAdminUser() {
  const db = getDb();
  const email = String(config.fixedAdminEmail || "admia@gmail.com")
    .trim()
    .toLowerCase();
  const name = "Admin";
  const password = String(config.fixedAdminPassword || "assignment");

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get([email]);

  const passwordHash = bcrypt.hashSync(password, 12);
  const timestamp = nowIso();

  if (existing && existing.id) {
    db.prepare(
      "UPDATE users SET name = ?, role = ?, password_hash = ?, updated_at = ? WHERE id = ?"
    ).run([name, "admin", passwordHash, timestamp, existing.id]);
    return { email, password };
  }

  db.prepare(
    "INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run([
    uuidv4(),
    email,
    name,
    "admin",
    passwordHash,
    timestamp,
    timestamp
  ]);

  return { email, password };
}

function seedIfNeeded() {
  ensureCatalog();
  const admin = ensureAdminUser();
  return { admin };
}

module.exports = { seedIfNeeded };
