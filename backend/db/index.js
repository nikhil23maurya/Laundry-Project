const fs = require("fs");
const path = require("path");

let SQL;
let db;
let rawDb;
let dbPath;
let inTransaction = false;
let dirty = false;

function nowIso() {
  return new Date().toISOString();
}

function resolveDbPath() {
  const explicit = process.env.DB_PATH && String(process.env.DB_PATH).trim();
  if (explicit) {
    return explicit;
  }
  return path.join(__dirname, "..", "data", "laundry.sqlite");
}

function persist() {
  if (!rawDb || !dirty || !dbPath) {
    return;
  }
  const bytes = rawDb.export();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(bytes));
  dirty = false;
}

function wrapDb(rawDb) {
  return {
    exec(sql) {
      rawDb.exec(sql);
    },
    prepare(sql) {
      return {
        get(params = []) {
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          const row = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return row;
        },
        all(params = []) {
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
        run(params = []) {
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            // no-op
          }
          stmt.free();
          dirty = true;
          if (!inTransaction) {
            persist();
          }
          return { changes: rawDb.getRowsModified() };
        }
      };
    },
    transaction(fn) {
      return () => {
        if (inTransaction) {
          return fn();
        }
        inTransaction = true;
        rawDb.exec("BEGIN IMMEDIATE");
        try {
          const result = fn();
          rawDb.exec("COMMIT");
          inTransaction = false;
          persist();
          return result;
        } catch (err) {
          try {
            rawDb.exec("ROLLBACK");
          } catch {
            // ignore rollback errors
          }
          inTransaction = false;
          dirty = true;
          persist();
          throw err;
        }
      };
    }
  };
}

function getCreateSql(tableName) {
  if (!rawDb) return "";
  try {
    const res = rawDb.exec(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    const rows = res && res[0] && res[0].values ? res[0].values : [];
    const first = rows[0] && rows[0][0] ? String(rows[0][0]) : "";
    return first;
  } catch {
    return "";
  }
}

function migrateUsersAddCustomerRole() {
  const createSql = getCreateSql("users").toLowerCase();
  if (!createSql) return;
  if (createSql.includes("'customer'")) return;

  // Recreate users table to expand CHECK constraint.
  rawDb.exec("PRAGMA foreign_keys=OFF");
  rawDb.exec(
    `CREATE TABLE IF NOT EXISTS users_v2 (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  rawDb.exec(
    `INSERT INTO users_v2 (id, email, name, role, password_hash, created_at, updated_at)
     SELECT id, email, name, role, password_hash, created_at, updated_at FROM users`
  );
  rawDb.exec("DROP TABLE users");
  rawDb.exec("ALTER TABLE users_v2 RENAME TO users");
  rawDb.exec("PRAGMA foreign_keys=ON");
  dirty = true;
}

async function initDb() {
  if (db) {
    return db;
  }

  dbPath = resolveDbPath();
  const initSqlJs = require("sql.js");
  const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
  SQL = await initSqlJs({
    locateFile(file) {
      if (file === "sql-wasm.wasm") {
        return wasmPath;
      }
      return file;
    }
  });

  const raw = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  rawDb = raw ? new SQL.Database(raw) : new SQL.Database();

  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  rawDb.exec(schemaSql);
  migrateUsersAddCustomerRole();

  db = wrapDb(rawDb);
  dirty = true;
  persist();
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("DB not initialized. Call initDb() first.");
  }
  return db;
}

module.exports = {
  initDb,
  getDb,
  nowIso
};
