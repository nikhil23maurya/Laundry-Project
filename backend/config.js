function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value);
}

const config = {
  port: Number(env("PORT", "3000")),
  jwtSecret: env("JWT_SECRET", "dev-only-change-me"),
  accessTokenTtlSeconds: Number(env("ACCESS_TOKEN_TTL_SECONDS", "900")),
  refreshTokenTtlSeconds: Number(env("REFRESH_TOKEN_TTL_SECONDS", "2592000")),
  corsOrigin: env("CORS_ORIGIN", "http://localhost:5173"),
  fixedAdminEmail: env("FIXED_ADMIN_EMAIL", "admia@gmail.com"),
  fixedAdminPassword: env("FIXED_ADMIN_PASSWORD", "assignment")
};

module.exports = { config };

