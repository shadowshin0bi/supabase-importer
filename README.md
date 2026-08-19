# Supabase Importer

This service receives AC maintenance payloads from Google Apps Script and imports
them into Supabase using the service role key.

## Endpoints

### POST /api/import
Imports:
- locations
- units
- parts
- service_records

## Environment Variables (set in Coolify)

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=3000
