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
// Postgres connection via DATABASE_URL
// -------------------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function dbQuery(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
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
      url: req.url
    });

    console.log("Payload:", JSON.stringify(req.body, null, 2));

    const payload = req.body;

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
// Dashboard
// -------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    service: "Importer",
    status: "ok",
    timestamp: new Date().toISOString(),
    database_url_present: !!process.env.DATABASE_URL,
    routes: {
      import: "/api/import",
      health: "/health",
      health_full: "/health/full"
    }
  });
});

// -------------------------------------------------------------
// Health checks
// -------------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/health/full", async (req, res) => {
  const result = {
    status: "checking",
    timestamp: new Date().toISOString(),
    database_url_present: !!process.env.DATABASE_URL,
    postgres: { connected: false }
  };

  try {
    await dbQuery("SELECT 1", []);
    result.status = "healthy";
    result.postgres.connected = true;
    res.json(result);
  } catch (err) {
    result.status = "down";
    result.postgres.error = err.message;
    res.status(500).json(result);
  }
});

// -------------------------------------------------------------
// Import routes (Traefik + Apps Script)
// -------------------------------------------------------------
app.post("/", importHandler);
app.post("/api/import", importHandler);

// -------------------------------------------------------------
// Start server
// -------------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Importer running on port ${PORT}`);
});
