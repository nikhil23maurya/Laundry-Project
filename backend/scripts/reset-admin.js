require("dotenv").config();

const bcrypt = require("bcryptjs");
const { initDb, getDb, nowIso } = require("../db");

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "admin@laundry.local")
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "").trim();

  if (!password || password.length < 8) {
    console.error(
      "ADMIN_PASSWORD missing or too short (min 8). Set it in .env, then re-run."
    );
    process.exitCode = 1;
    return;
  }

  await initDb();
  const db = getDb();

  const user = db
    .prepare("SELECT id, email, role FROM users WHERE email = ?")
    .get([email]);

  if (!user) {
    console.error(`No user found for email: ${email}`);
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const ts = nowIso();

  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run([
    hash,
    ts,
    user.id
  ]);

  console.log(`Updated password for ${email} (${user.role}).`);
}

main().catch((err) => {
  console.error("Failed to reset admin password:", err);
  process.exitCode = 1;
});

