
import "server-only";
import mysql from "mysql2/promise";

const globalForMySQL = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

export function getDatabasePool(): mysql.Pool {
  if (globalForMySQL.mysqlPool) return globalForMySQL.mysqlPool;

  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error(
      "MySQL is not configured. Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME on the server.",
    );
  }

  const port = Number(DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid TCP port.");
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 25,
    connectTimeout: 10000,
    ...(process.env.DB_SSL === "true" ? {
      ssl: { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") } : {}) },
    } : {}),
    enableKeepAlive: true,
    charset: "utf8mb4",
  });

  globalForMySQL.mysqlPool = pool;
  return pool;
}

export default getDatabasePool;
