import { getDb, rows, sql } from "../src/server/db";
import { ensureDefaultTags } from "../src/server/journalTags";

async function main() {
  const db = getDb();
  const owners = await rows<{ id: number }>(db, sql`select id from "user" where username = ${"owner"}`);
  if (owners.length !== 1) throw new Error("owner_missing");
  await ensureDefaultTags(db, owners[0].id);
  const profiles = await rows<{ n: number }>(db, sql`select count(*)::int n from profile where user_id = ${owners[0].id}`);
  console.log("Local journal defaults initialized; profile onboarding pending:", profiles[0].n === 0);
}

main().then(() => process.exit(0)).catch(() => {
  console.error("Local account initialization failed without displaying private values");
  process.exit(1);
});
