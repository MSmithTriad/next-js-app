import { Pool } from "pg";

// Database configuration with better security
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
          ca: process.env.DB_CA_CERT,
          cert: process.env.DB_CLIENT_CERT,
          key: process.env.DB_CLIENT_KEY,
        }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  query_timeout: 30000,
  statement_timeout: 30000,
});

// Test connection on initialization
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
