/**
 * Triggers the production Notion → Claude pipeline locally or against a deployed URL.
 *
 * Usage:
 *   CRON_SECRET=xxx QUANTA_URL=https://your-app.vercel.app npm run generate-batch
 */
async function main() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("Set CRON_SECRET in the environment.");
    process.exit(1);
  }

  const base = (process.env.QUANTA_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const url = `${base}/api/cron/pipeline`;

  console.log(`POST ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text();
  console.log(res.status, text.slice(0, 2000));

  if (!res.ok) process.exit(1);
}

void main();
