import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://grid:strongpassword@187.127.139.208:5432/edtech",
    // The server specifically rejects SSL, so we must disable it entirely
    ssl: false
});

export default pool;
