// Explicit local credential migration. Never prints input values or error bodies.
// /input is a read-only mount; /private is the Pulse-only private output directory.
import fs from "node:fs";
import crypto from "node:crypto";

const fail = (code) => { throw Object.assign(new Error(code), { safeCode: code }); };
const input = "/input/token.json";

function credentials() {
  const bytes = fs.readFileSync(input);
  const c = JSON.parse(bytes);
  for (const key of ["client_id", "client_secret", "refresh_token"])
    if (typeof c[key] !== "string" || !c[key] || /[\r\n]/.test(c[key])) fail("missing_or_invalid_credential_field");
  const scopes = Array.isArray(c.scopes) ? c.scopes : typeof c.scopes === "string" ? c.scopes.split(/\s+/) : [];
  if (!scopes.length || scopes.some((s) => typeof s !== "string" || !s.endsWith(".readonly"))) fail("grant_is_not_exclusively_read_only");
  return { c, scopes, checksum: crypto.createHash("sha256").update(bytes).digest("hex") };
}

async function main() {
  const { c, scopes, checksum } = credentials();
  const mode = process.argv[2];
  if (mode === "prepare") {
    fs.mkdirSync("/private", { recursive: true, mode: 0o700 });
    fs.chmodSync("/private", 0o700);
    const owner = { username: "owner", email: "owner@pulse.local", password: crypto.randomBytes(24).toString("base64url") };
    const dbPassword = crypto.randomBytes(32).toString("hex");
    const env = {
      DATA_SOURCE: "google", GOOGLE_READ_ONLY: "true", SIGNUP: "closed",
      POSTGRES_PASSWORD: dbPassword, DATABASE_URL: `postgres://pulse:${dbPassword}@db:5432/pulse`,
      BETTER_AUTH_SECRET: crypto.randomBytes(32).toString("hex"), ADMIN_EMAILS: owner.email,
      GOOGLE_CLIENT_ID: c.client_id, GOOGLE_CLIENT_SECRET: c.client_secret,
      APP_URL: "http://localhost:3000", NEXT_TELEMETRY_DISABLED: "1", BETTER_AUTH_TELEMETRY: "0", DO_NOT_TRACK: "1",
    };
    fs.writeFileSync("/private/pulse.env", Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
    fs.writeFileSync("/private/owner-login.json", JSON.stringify(owner, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log("Private configuration created; generated owner login saved locally. Credential values were not displayed.");
  } else if (mode === "import") {
    const { default: pg } = await import("pg");
    const { hashPassword } = await import("better-auth/crypto");
    const owner = JSON.parse(fs.readFileSync("/private/owner-login.json", "utf8"));
    const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    try {
      const count = await db.query('select count(*)::int as n from "user"');
      if (count.rows[0].n !== 0) fail("destination_database_not_empty");
      if (process.env.GOOGLE_CLIENT_ID !== c.client_id || process.env.GOOGLE_CLIENT_SECRET !== c.client_secret) fail("client_configuration_mismatch");
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: c.refresh_token, grant_type: "refresh_token" }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) { await response.body?.cancel(); fail("google_refresh_failed_reauthorization_needed"); }
      let grant;
      try { grant = await response.json(); } catch { fail("invalid_google_refresh_response"); }
      if (typeof grant.access_token !== "string" || typeof grant.expires_in !== "number") fail("invalid_google_refresh_response");
      const actualScopes = typeof grant.scope === "string" ? grant.scope.split(/\s+/) : scopes;
      if (actualScopes.some((s) => !s.endsWith(".readonly"))) fail("google_grant_includes_non_read_scopes");
      const probe = await fetch("https://health.googleapis.com/v4/users/me/identity", {
        headers: { authorization: `Bearer ${grant.access_token}` }, signal: AbortSignal.timeout(30_000),
      });
      await probe.body?.cancel();
      if (!probe.ok) fail("google_health_read_probe_failed");
      const hashed = await hashPassword(owner.password);
      const now = Math.floor(Date.now() / 1000);
      await db.query("begin");
      const created = await db.query('insert into "user" (name,email,username,display_username) values ($1,$2,$3,$3) returning id', ["Local owner", owner.email, owner.username]);
      const id = created.rows[0].id;
      await db.query("insert into account (account_id,provider_id,user_id,password,updated_at) values ($1,'credential',$2,$3,now())", [String(id), id, hashed]);
      // Store only in Pulse's private database. Never change the source token file.
      await db.query("insert into oauth_tokens (user_id,access_token,refresh_token,expires_at,scope,updated_at) values ($1,$2,$3,$4,$5,$6)", [id, grant.access_token, c.refresh_token, now + grant.expires_in, actualScopes.join(" "), now]);
      await db.query("insert into server_settings (key,value) values ('signup','closed'),('coach','off') on conflict (key) do update set value=excluded.value");
      await db.query("commit");
      console.log("Read-only Google grant transferred into a separate personal account. Profile onboarding is still required.");
      console.log("Google token refresh and Health API read access succeeded; response bodies were not displayed or saved.");
    } catch (e) {
      await db.query("rollback").catch(() => {});
      throw e;
    } finally {
      await db.end();
    }
  } else fail("invalid_mode");
  const after = crypto.createHash("sha256").update(fs.readFileSync(input)).digest("hex");
  if (after !== checksum) fail("source_changed_during_transfer");
  console.log("Source credential file is unchanged; its mount was read-only.");
}

main().catch((e) => {
  console.error(`Credential transfer stopped: ${e.safeCode ?? "local_operation_failed"}. No credential or provider error values were displayed.`);
  process.exitCode = 1;
});
