const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { getDb, nowIso } = require("../db");
const { config } = require("../config");
const { sendError } = require("../utils/http");

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function issueAccessToken(user) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + config.accessTokenTtlSeconds;

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: nowSeconds,
      exp
    },
    config.jwtSecret
  );
}

function createRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const createdAt = nowIso();
  const expiresAt = new Date(
    Date.now() + config.refreshTokenTtlSeconds * 1000
  ).toISOString();

  const db = getDb();
  db.prepare(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).run([uuidv4(), userId, tokenHash, createdAt, expiresAt]);

  return { token, expiresAt };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "Invalid login payload.", parsed.error.flatten());
  }

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = ?"
    )
    .get([parsed.data.email.toLowerCase()]);

  if (!user) {
    return sendError(res, 401, "Invalid email or password.");
  }

  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) {
    return sendError(res, 401, "Invalid email or password.");
  }

  const accessToken = issueAccessToken(user);
  const refreshToken = createRefreshToken(user.id);

  return res.json({
    accessToken,
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt: refreshToken.expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
}

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

async function refresh(req, res) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid refresh payload.",
      parsed.error.flatten()
    );
  }

  const tokenHash = sha256(parsed.data.refreshToken);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT rt.id AS refresh_id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.id AS user_id2, u.email, u.name, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ?`
    )
    .get([tokenHash]);

  if (!row || row.revoked_at) {
    return sendError(res, 401, "Invalid refresh token.");
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return sendError(res, 401, "Refresh token expired.");
  }

  const timestamp = nowIso();
  const tx = db.transaction(() => {
    db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?").run([
      timestamp,
      row.refresh_id
    ]);
  });
  tx();

  const user = {
    id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role
  };

  const accessToken = issueAccessToken(user);
  const nextRefresh = createRefreshToken(user.id);

  return res.json({
    accessToken,
    refreshToken: nextRefresh.token,
    refreshTokenExpiresAt: nextRefresh.expiresAt
  });
}

const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional()
});

async function logout(req, res) {
  const parsed = logoutSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid logout payload.",
      parsed.error.flatten()
    );
  }

  if (parsed.data.refreshToken) {
    const db = getDb();
    const timestamp = nowIso();
    db.prepare(
      "UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL"
    ).run([timestamp, sha256(parsed.data.refreshToken)]);
  }

  return res.json({ ok: true });
}

function me(req, res) {
  return res.json({ user: req.user });
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  role: z.enum(["admin", "staff"]).default("staff"),
  password: z.string().min(8).max(72)
});

async function createUser(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid user payload.",
      parsed.error.flatten()
    );
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  const existing = db
    .prepare("SELECT 1 FROM users WHERE email = ?")
    .get([email]);
  if (existing) {
    return sendError(res, 409, "User already exists.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const timestamp = nowIso();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run([
    id,
    email,
    parsed.data.name,
    parsed.data.role,
    passwordHash,
    timestamp,
    timestamp
  ]);

  return res.status(201).json({
    user: { id, email, name: parsed.data.name, role: parsed.data.role }
  });
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  createUser,
  registerCustomer
};

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(72)
});

async function registerCustomer(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(
      res,
      400,
      "Invalid register payload.",
      parsed.error.flatten()
    );
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  const existing = db
    .prepare("SELECT 1 FROM users WHERE email = ?")
    .get([email]);
  if (existing) {
    return sendError(res, 409, "User already exists.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const timestamp = nowIso();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run([
    id,
    email,
    parsed.data.name,
    "customer",
    passwordHash,
    timestamp,
    timestamp
  ]);

  return res.status(201).json({
    user: { id, email, name: parsed.data.name, role: "customer" }
  });
}
