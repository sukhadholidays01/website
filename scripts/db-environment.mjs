import dotenv from "dotenv";
export function databaseOptions() {
  const production = process.env.NODE_ENV === "production" || process.argv.includes("--production");
  if (!production) dotenv.config({ path: ".env.development", quiet: true });
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter(k => !process.env[k]);
  if (missing.length) throw new Error("Missing database environment: " + missing.join(", "));
  if (production && (process.env.DB_NAME.endsWith("_dev") || process.env.DB_USER === "root"))
    throw new Error("Production requires a dedicated database and application user.");
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid DB_PORT");
  return { host: process.env.DB_HOST, port, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    charset: "utf8mb4", timezone: "Z", connectTimeout: 10000,
    ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") } : {}) } } : {}) };
}
