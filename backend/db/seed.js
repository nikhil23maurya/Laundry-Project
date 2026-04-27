const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const { getDb, nowIso } = require("./index");

function generatePassword() {
  return crypto.randomBytes(12).toString("base64url");
}

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
  const hasAnyUser = db.prepare("SELECT 1 FROM users LIMIT 1").get();
  if (hasAnyUser) {
    return null;
  }

  const email =
    (process.env.ADMIN_EMAIL && String(process.env.ADMIN_EMAIL).trim()) ||
    "admin@laundry.local";
  const name =
    (process.env.ADMIN_NAME && String(process.env.ADMIN_NAME).trim()) ||
    "Admin";
  const password =
    (process.env.ADMIN_PASSWORD && String(process.env.ADMIN_PASSWORD)) ||
    generatePassword();

  const passwordHash = bcrypt.hashSync(password, 12);
  const timestamp = nowIso();

  db.prepare(
    "INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run([
    uuidv4(),
    email.toLowerCase(),
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
