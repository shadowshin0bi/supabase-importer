import express from "express";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const app = express();
app.use(express.json({ limit: "10mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
     realtime: { transport: ws }
  }
);

app.post("/api/import", async (req, res) => {
  const payload = req.body;

  try {
    if (payload.locations) {
      const { error } = await supabase
        .from("locations")
        .upsert(payload.locations, { onConflict: "id" });
      if (error) throw error;
    }

    if (payload.units) {
      const { error } = await supabase
        .from("units")
        .upsert(payload.units, { onConflict: "unit_number" });
      if (error) throw error;
    }

    if (payload.parts) {
      const { error } = await supabase
        .from("parts")
        .upsert(payload.parts, { onConflict: "unit_number" });
      if (error) throw error;
    }

    if (payload.service_records) {
      const { error } = await supabase
        .from("service_records")
        .upsert(payload.service_records, {
          onConflict: "unit_number,year,month"
        });
      if (error) throw error;
    }

    await supabase.from("import_logs").insert({
      payload,
      imported_at: new Date().toISOString()
    });

    res.json({ status: "success", message: "Supabase import complete." });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Supabase importer running on port ${port}`);
});
