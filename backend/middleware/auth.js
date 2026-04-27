const jwt = require("jsonwebtoken");
const { config } = require("../config");
const { sendError } = require("../utils/http");

function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || "");
  const [, token] = header.split(" ");
  if (!token) {
    return sendError(res, 401, "Missing Authorization header.");
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
    return next();
  } catch {
    return sendError(res, 401, "Invalid or expired token.");
  }
}

function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return sendError(res, 401, "Unauthorized.");
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, "Forbidden.");
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };

