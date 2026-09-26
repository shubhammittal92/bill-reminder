import fs from 'fs';
import path from 'path';

/**
 * Minimal .env loader (no dependency). Reads KEY=VALUE lines from a .env file
 * at the backend root and populates process.env for any key not already set.
 * Ignores blank lines and # comments. Values may be optionally quoted.
 */
export function loadEnv(file = path.join(__dirname, '..', '..', '.env')): void {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
