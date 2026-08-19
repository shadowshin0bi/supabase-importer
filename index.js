import express from "express";
import cors from "cors";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------
// Middleware
// -------------------------------------------------------------
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// Supabase client (with ws transport for Node 20)
// -------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: { transport: ws }
  }
);

// -------------------------------------------------------------
// IMPORT HANDLER (shared logic)
// -------------------------------------------------------------
async function importHandler(req, res) {
  try {
    // -------------------------------
    // DEBUG: Incoming request details
    // -------------------------------
    console.log("Incoming request:", {
      method: req.method,
      path: req.path,
      url: req.url,
      headers: req.headers,
      body: req.body
    });

    const payload = req.body;

    // -------------------------------
    // DEBUG: Payload received
    // -------------------------------
    console.log("Payload received:", JSON.stringify(payload, null, 2));

    // -------------------------------
    // Supabase insert
    // -------------------------------
    const { data, error } = await supabase
      .from("ac_imports")
      .insert(payload);

    // -------------------------------
    // DEBUG: Supabase response
    // -------------------------------
    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Supabase insert success:", data);

    res.json({ status: "success", data });

  } catch (err) {
    console.error("IMPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

// -------------------------------------------------------------
// ROUTES COMPATIBLE WITH TRAEFIK LABELS
// -------------------------------------------------------------

// Traefik strips /api/import → Node receives "/"
app.post("/", importHandler);

// If Traefik ever stops stripping prefixes, this still works:
app.post("/api/import", importHandler);

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Supabase Importer running on port ${PORT}`);
});
