import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------
// Middleware
// -------------------------------------------------------------
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// Postgres pool (internal Supabase DB)
// -------------------------------------------------------------
const pool = new pg.Pool({
  user: "postgres",
  host: "41a3d702e73b.internal",
  database: "postgres",
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function dbQuery(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// -------------------------------------------------------------
// Import handler (Apps Script payload)
// -------------------------------------------------------------
async function importHandler(req, res) {
  try {
    console.log("Incoming request:", {
      method: req.method,
      path: req.path,
      url: req.url,
      headers: req.headers
    });
    console.log("Payload:", JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // Store raw payload JSON in a table (example: ac_imports.raw_payload)
    const result = await dbQuery(
      `INSERT INTO ac_imports (raw_payload)
       VALUES ($1)
       RETURNING id, created_at`,
      [JSON.stringify(payload)]
    );

    res.json({
      status: "success",
      import_id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

// -------------------------------------------------------------
// Status / dashboard routes
// -------------------------------------------------------------
function dashboardJSON() {
  return {
    service: "Supabase Importer (Postgres direct)",
    status: "ok",
    timestamp: new Date().toISOString(),
    routes: {
      root: "/",
      import: "/api/import"
    },
    postgres: {
      host: "41a3d702e73b.internal",
      port: 5432,
      user: "postgres",
      database: "postgres",
      password_env: !!process.env.POSTGRES_PASSWORD
    },
    environment: {
      node_env: process.env.NODE_ENV || "development",
      port: PORT
    }
  };
}

app.get("/", (req, res) => {
  res.json(dashboardJSON());
});

app.get("/api/import", (req, res) => {
  res.json(dashboardJSON());
});

// -------------------------------------------------------------
// Health checks
// -------------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/health/full", async (req, res) => {
  const payload = {
    status: "checking",
    timestamp: new Date().toISOString(),
    postgres: {
      host: "41a3d702e73b.internal",
      connected: false
    }
  };

  try {
    await dbQuery("SELECT 1", []);
    payload.status = "healthy";
    payload.postgres.connected = true;
    res.json(payload);
  } catch (err) {
    payload.status = "down";
    payload.postgres.error = err.message;
    res.status(500).json(payload);
  }
});

// -------------------------------------------------------------
// Import routes (for Traefik + Apps Script)
// -------------------------------------------------------------
app.post("/", importHandler);
app.post("/api/import", importHandler);

// -------------------------------------------------------------
// Start server
// -------------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Importer (Postgres direct) running on port ${PORT}`);
});
