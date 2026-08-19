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
app.use(express.json({ limit: "10mb" }));

// Debug: log all incoming requests
app.use((req, res, next) => {
  console.log("Incoming request:", {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    headers: req.headers,
  });
  next();
});

// -------------------------------------------------------------
// Supabase client (with ws transport)
// -------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: { transport: ws }
  }
);

// -------------------------------------------------------------
// Import Route
// -------------------------------------------------------------
app.post("/api/import", async (req, res) => {
  console.log("Importer route hit: /api/import");
  console.log("Payload received:", JSON.stringify(req.body, null, 2));

  const { locations, units, parts } = req.body;

  try {
    // ---------------------------------------------------------
    // Insert Locations
    // ---------------------------------------------------------
    if (locations && locations.length > 0) {
      console.log("Inserting locations...");
      const { error } = await supabase.from("locations").insert(locations);
      if (error) {
        console.error("Supabase locations insert error:", error);
        return res.status(500).json({ error: error.message });
      }
    }

    // ---------------------------------------------------------
    // Insert Units + Nested Service Records
    // ---------------------------------------------------------
    if (units && units.length > 0) {
      console.log("Inserting units...");
      for (const unit of units) {
        const { service_records, ...unitData } = unit;

        const { error: unitErr } = await supabase
          .from("units")
          .insert(unitData);

        if (unitErr) {
          console.error("Supabase units insert error:", unitErr);
          return res.status(500).json({ error: unitErr.message });
        }

        if (service_records && service_records.length > 0) {
          console.log(
            `Inserting ${service_records.length} service records for ${unit.unit_number}...`
          );

          const { error: srErr } = await supabase
            .from("service_records")
            .insert(service_records);

          if (srErr) {
            console.error("Supabase service_records insert error:", srErr);
            return res.status(500).json({ error: srErr.message });
          }
        }
      }
    }

    // ---------------------------------------------------------
    // Insert Parts
    // ---------------------------------------------------------
    if (parts && parts.length > 0) {
      console.log("Inserting parts...");
      const { error } = await supabase.from("parts").insert(parts);
      if (error) {
        console.error("Supabase parts insert error:", error);
        return res.status(500).json({ error: error.message });
      }
    }

    console.log("Import completed successfully.");
    return res.status(200).json({ message: "Import successful" });

  } catch (err) {
    console.error("Unexpected importer error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Root Route (for debugging Traefik routing)
// -------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Importer is running. Use POST /api/import.");
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Importer running on port ${PORT}`);
});
