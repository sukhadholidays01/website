
import dotenv from "dotenv";

// Explicitly load your development environment
dotenv.config({ path: ".env.development" });

// Import database only after environment variables are loaded
const { default: db } = await import("./src/config/database.js");

try {
  console.log("DB HOST:", process.env.DB_HOST);
  console.log("DB USER:", process.env.DB_USER);
  console.log("DB NAME:", process.env.DB_NAME);

  const [rows] = await db.query(`
    SELECT
      DATABASE() AS database_name,
      VERSION() AS mysql_version,
      NOW() AS server_time
  `);

  console.log("Database connected successfully!");
  console.table(rows);

} catch (error) {
  console.error("Database connection failed:", error.message);
} finally {
  await db.end();
}
