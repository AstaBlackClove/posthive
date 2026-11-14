// Run before you push: pnpm --filter api check:deploy
//
// Reads production (read-only, through the linked Supabase project) and says whether posts are
// being sent right now or are about to be. Exits 1 only when a job is running right now, so a
// push that would restart the server mid-send is easy to hold back for a minute.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const SQL = `
SELECT
  count(*) FILTER (WHERE status = 'running' AND "updatedAt" > now() - interval '30 minutes') AS running,
  count(*) FILTER (WHERE status = 'pending' AND "scheduledFor" BETWEEN now() - interval '5 minutes' AND now() + interval '2 minutes') AS due_soon,
  count(*) FILTER (WHERE status = 'running' AND "updatedAt" <= now() - interval '30 minutes') AS stale_running
FROM "PostJob";
`.replace(/\s+/g, " ").trim();

let row;
try {
  // The SQL has double-quoted column names, so escape them for the outer double quotes.
  const out = execSync(`supabase db query --linked "${SQL.replace(/"/g, '\\"')}"`, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const json = JSON.parse(out.slice(out.indexOf("{")));
  row = json.rows?.[0];
} catch (err) {
  console.error("Could not read production. Is the Supabase CLI installed and linked?");
  console.error(String(err.stderr || err.message).split("\n").slice(0, 3).join("\n"));
  process.exit(2);
}

if (!row) {
  console.error("Unexpected answer from the database.");
  process.exit(2);
}

const running = Number(row.running);
const dueSoon = Number(row.due_soon);
const stale = Number(row.stale_running);

console.log(`Jobs running now:            ${running}`);
console.log(`Jobs due within 2 minutes:   ${dueSoon}`);
if (stale > 0) console.log(`Old jobs stuck on "running": ${stale} (not blocking)`);

if (running > 0) {
  console.log("\nBUSY: a job is being sent right now. Wait a minute and run this again.");
  process.exit(1);
}
if (dueSoon > 0) {
  console.log("\nHeads up: posts are due in the next 2 minutes. Safe if graceful shutdown is deployed, otherwise wait.");
} else {
  console.log("\nQuiet. Safe to push.");
}
