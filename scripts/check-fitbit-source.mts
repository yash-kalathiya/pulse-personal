// Bounded live check: emits only point counts and safe error codes, never response bodies.
import { getConfig } from "../src/server/config";
import { getDb } from "../src/server/db";
import { oauthTokens } from "../src/server/db/schema";
import { getProfile } from "../src/server/profile";
import { addDays, localDay, localMidnight } from "../src/server/time";
import { createGoogleClient } from "../src/server/sources/google/client";
import { GoogleError } from "../src/server/sources/google/oauth";
import { isFitbitPoint } from "../src/server/sources/google/sourcePolicy";
async function main() {
  const cfg = getConfig();
  if (!cfg.google || !cfg.googleFitbitOnly || !cfg.googleReadOnly) throw new Error("policy_not_ready");
  const db = getDb();
  const users = await db.select({ id: oauthTokens.userId }).from(oauthTokens);
  if (users.length !== 1) throw new Error("ambiguous_user_scope");
  const userId = users[0].id;
  const timeZone = (await getProfile(db, userId))?.timeZone ?? "UTC";
  const to = localDay(Date.now() / 1000, timeZone), from = addDays(to, -1);
  const client = createGoogleClient({ db, userId, google: cfg.google, timeZone });
  for (const type of ["daily-resting-heart-rate", "sleep", "heart-rate"] as const) {
    const points = await client.list(type, localMidnight(from, timeZone), localMidnight(to, timeZone));
    console.log(JSON.stringify({ type, accepted: points.length, allFitbit: points.every(isFitbitPoint) }));
  }
  for (const type of ["steps", "total-calories"] as const) {
    const points = await client.dailyRollUp(type, from, to);
    console.log(JSON.stringify({ type, verifiedFitbitAggregateDays: points.length }));
  }
}
main().then(() => process.exit(0)).catch((err) => {
  console.error(err instanceof GoogleError ? err.message : "Source-policy check failed; details suppressed.");
  process.exit(1);
});
