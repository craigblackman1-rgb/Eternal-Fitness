// Helper: returns pg Pool for 'prod' or 'staging'. Secrets read from files, never printed.
const fs = require('fs');
const { Pool } = require('pg');
function url(which) {
  if (which === 'prod') {
    const env = fs.readFileSync('D:/apps/eternal-fitness-website/.env.local', 'utf8');
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (!m) throw new Error('DATABASE_URL not found');
    return m[1].trim().replace(/^["']|["']$/g, '');
  }
  const src = fs.readFileSync('D:/apps/eternal-fitness-website/scripts/run-client-notes-migration-staging.mjs', 'utf8');
  const m = src.match(/connectionString:\s*"([^"]+)"/);
  if (!m) throw new Error('staging conn not found');
  return m[1];
}
module.exports = { pool: (which) => new Pool({ connectionString: url(which), max: 2 }) };
