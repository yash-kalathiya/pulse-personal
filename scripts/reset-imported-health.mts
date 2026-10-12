// One-time local source-policy migration. Never touches Google data, grants, auth, profile or journal.
import { eq, and, ne, getTableName } from "drizzle-orm";
import { getDb, sql, rows } from "../src/server/db";
import { dailyMetrics, dailyValues, dailyScores, exercises, foldCheckpoints, healthRecords,
  hrDays, stepsDays, intradaySeries, intradayDirty, loggedEntries, oauthTokens, rawPayloads,
  sleepSegments, sleepSessions, syncState } from "../src/server/db/schema";
import { getConfig } from "../src/server/config";

const db = getDb();
async function main() {
  const cfg = getConfig();
  if (!cfg.googleFitbitOnly || !cfg.googleReadOnly || !cfg.googleSyncFrom) throw new Error("policy_not_ready");
  const users = await db.select({ id: oauthTokens.userId }).from(oauthTokens);
  if (users.length !== 1) throw new Error("ambiguous_user_scope");
  const userId = users[0].id;
  const tables = [dailyScores, foldCheckpoints, intradaySeries, intradayDirty, sleepSegments,
    sleepSessions, exercises, hrDays, stepsDays, dailyMetrics, dailyValues, healthRecords, rawPayloads, syncState];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const [{ n }] = await rows<{ n: number }>(db, sql`select count(*)::int n from ${table} where ${table.userId} = ${userId}`);
    counts[getTableName(table)] = n;
  }
  if (process.argv[2] !== "apply") {
    console.log(JSON.stringify({ mode: "preview", counts, preserves: "Google grant, auth, profile, journal and locally logged entries" }));
    return;
  }
  if (process.argv[3] !== "--backup-confirmed") throw new Error("backup_confirmation_required");
  await db.transaction(async (tx) => {
    // Shares the worker's per-user advisory lock. The app must be stopped before this command.
    await tx.execute(sql`select pg_advisory_xact_lock(${0x50756c73}, ${userId})`);
    for (const table of tables) await tx.delete(table).where(eq(table.userId, userId));
    await tx.delete(loggedEntries).where(and(eq(loggedEntries.userId, userId), ne(loggedEntries.source, "pulse")));
  });
  console.log(JSON.stringify({ mode: "applied", removed: counts,
    next: "Start the app to rebuild from filtered Fitbit data", backupRequired: true }));
}
main().then(() => process.exit(0)).catch(() => {
  console.error("Local source-policy reset failed; details suppressed to protect credentials.");
  process.exit(1);
});
