import express from "express";
import { supabase } from "./supabase.js";

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Importer API" });
});

/* -------------------------------------------------------
   MAIN IMPORT ENDPOINT WITH DEBUG LOGGING
------------------------------------------------------- */
app.post("/import", async (req, res) => {
  console.log("--------------------------------------------------");
  console.log("📥 Incoming /import request");
  console.log("Raw payload:", JSON.stringify(req.body, null, 2));

  try {
    const {
      locations = [],
      units = [],
      parts = [],
      service_records = []
    } = req.body;

    console.log("Parsed payload:");
    console.log("  locations:", locations.length);
    console.log("  units:", units.length);
    console.log("  parts:", parts.length);
    console.log("  service_records:", service_records.length);

    const results = {
      locations: null,
      units: null,
      parts: null,
      service_records: null
    };

    /* -------------------------------------------------------
       1. LOCATIONS FIRST
    ------------------------------------------------------- */
    if (locations.length > 0) {
      console.log("➡️ Inserting locations:", JSON.stringify(locations, null, 2));

      const { data, error } = await supabase
        .from("locations")
        .insert(locations);

      console.log("📤 Supabase response (locations):", { data, error });

      if (error) throw error;
      results.locations = data;
    } else {
      console.log("⚠️ No locations to insert");
    }

    /* -------------------------------------------------------
       2. UNITS SECOND
    ------------------------------------------------------- */
    if (units.length > 0) {
      console.log("➡️ Inserting units:", JSON.stringify(units, null, 2));

      const { data, error } = await supabase
        .from("units")
        .insert(units);

      console.log("📤 Supabase response (units):", { data, error });

      if (error) throw error;
      results.units = data;
    } else {
      console.log("⚠️ No units to insert");
    }

    /* -------------------------------------------------------
       3. PARTS THIRD
    ------------------------------------------------------- */
    if (parts.length > 0) {
      console.log("➡️ Inserting parts:", JSON.stringify(parts, null, 2));

      const { data, error } = await supabase
        .from("parts")
        .insert(parts);

      console.log("📤 Supabase response (parts):", { data, error });

      if (error) throw error;
      results.parts = data;
    } else {
      console.log("⚠️ No parts to insert");
    }

    /* -------------------------------------------------------
       4. SERVICE RECORDS LAST
    ------------------------------------------------------- */
    if (service_records.length > 0) {
      console.log("➡️ Inserting service_records:", JSON.stringify(service_records, null, 2));

      const { data, error } = await supabase
        .from("service_records")
        .insert(service_records);

      console.log("📤 Supabase response (service_records):", { data, error });

      if (error) throw error;
      results.service_records = data;
    } else {
      console.log("⚠️ No service_records to insert");
    }

    /* -------------------------------------------------------
       FINAL RESPONSE
    ------------------------------------------------------- */
    console.log("✅ Import completed successfully");
    console.log("Final results:", JSON.stringify(results, null, 2));

    res.json({
      success: true,
      inserted: results
    });

  } catch (err) {
    console.error("❌ Importer error:", err);
    console.error("Stack trace:", err.stack);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }

  console.log("--------------------------------------------------");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Importer API running on port ${PORT}`);
});
