import express from "express";
import { supabase } from "./supabase.js";

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Importer API" });
});

/* -------------------------------------------------------
   MAIN IMPORT ENDPOINT
------------------------------------------------------- */
app.post("/import", async (req, res) => {
  try {
    const {
      locations = [],
      units = [],
      parts = [],
      service_records = []
    } = req.body;

    const results = {
      locations: null,
      units: null,
      parts: null,
      service_records: null
    };

    /* -------------------------------------------------------
       1. LOCATIONS FIRST
       (units + parts + service_records depend on them)
    ------------------------------------------------------- */
    if (locations.length > 0) {
      const { data, error } = await supabase
        .from("locations")
        .insert(locations);

      if (error) throw error;
      results.locations = data;
    }

    /* -------------------------------------------------------
       2. UNITS SECOND
       (service_records depend on unit_number)
    ------------------------------------------------------- */
    if (units.length > 0) {
      const { data, error } = await supabase
        .from("units")
        .insert(units);

      if (error) throw error;
      results.units = data;
    }

    /* -------------------------------------------------------
       3. PARTS THIRD
       (parts depend on unit_number + location_id)
    ------------------------------------------------------- */
    if (parts.length > 0) {
      const { data, error } = await supabase
        .from("parts")
        .insert(parts);

      if (error) throw error;
      results.parts = data;
    }

    /* -------------------------------------------------------
       4. SERVICE RECORDS LAST
       (depends on units + locations)
    ------------------------------------------------------- */
    if (service_records.length > 0) {
      const { data, error } = await supabase
        .from("service_records")
        .insert(service_records);

      if (error) throw error;
      results.service_records = data;
    }

    /* -------------------------------------------------------
       FINAL RESPONSE
    ------------------------------------------------------- */
    res.json({
      success: true,
      inserted: results
    });

  } catch (err) {
    console.error("Importer error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Importer API running on port ${PORT}`);
});
