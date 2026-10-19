# Local fork

Based on [Aditya Jindal's original Pulse](https://github.com/adityaongit/pulse).
Keep the original `LICENSE` and `NOTICE`; this remains a noncommercial project.

## Additions

- Docker-only local demo and separate personal deployments.
- Read-only Google authorization and guards that reject Google health writes.
- Fitbit-only point provenance checks before mapping and archiving.
- A configurable earliest import date, retained on subsequent syncs/backfills.
- Daily totals restricted to Google's Google/Fitbit wearable source family.
  Explicitly enabling `GOOGLE_FITBIT_ROLLUP_FALLBACK` allows a date-bounded
  fallback only if per-point source inspection is unsupported. That family also
  includes Pixel Watch: enable this fallback only if Fitbit is the only Google
  wearable used during the permitted period. Explicit non-Fitbit source findings
  never fall back to unfiltered data.
- Local HTTPS at `https://pulse.local:8443`, following the laptop's current Wi-Fi
  IPv4 subnet; password login and the existing account remain in use.
- Wake-up-time previews on Home and Sleep, without changing recorded sleep or
  creating an alarm. Previews are temporary and respect the profile time zone.
- Groq as a Coach provider, sent only to Groq's fixed OpenAI-compatible endpoint
  and pinned to `qwen/qwen3.8-27b`. The user's key follows the existing encrypted
  BYOK path and is never committed to this repository.

## Groq limits and privacy

Checked against Groq's official [model](https://console.groq.com/docs/model/qwen/qwen3.8-27b)
and [rate-limit](https://console.groq.com/docs/rate-limits) documentation on
2026-10-18. The published Free Plan limits for `qwen/qwen3.8-27b` are 30 requests
per minute, 1,000 requests per day, 8,000 tokens per minute and 200,000 tokens per
day. Groq does not publish a separate per-second quota; the minute limits average
to about 0.5 requests and 133 tokens per second, but that arithmetic is not a
burst guarantee. Its Developer Plan table lists 1,000 requests per minute and
250,000 tokens per minute without a daily limit in that table. The exact
[organization and project limits](https://console.groq.com/settings/limits) in
the Groq Console are authoritative.

Groq's [data documentation](https://console.groq.com/docs/your-data) says
inference inputs and outputs are not retained by default, but it may temporarily
log them for reliability or abuse investigations for up to 30 days. Usage
metadata is always retained and excludes inputs and outputs. All customers may
enable [Zero Data Retention](https://console.groq.com/settings/data-controls);
retained customer data is stored in US GCP buckets. Groq's
[Services Agreement](https://console.groq.com/docs/legal/services-agreement)
says inputs and outputs are not used for model training unless the customer
explicitly permits it.

The Qwen model is marked Preview. Groq's agreement says preview/beta services
may fall outside its DPA and BAA unless documentation says otherwise. Treat the
coach as a wellness assistant, not medical advice, and enable Zero Data Retention
before asking it about personal health data.

## Private configuration

Keep deployment configuration in `.local-private/`, outside Git. Never commit
OAuth files, account passwords, signing secrets, imported health records, the
database, backups, CA keys, or certificates. `.env.example` contains names only.

For the personal compose overlays, set `GOOGLE_SYNC_FROM` in a private env file
to the first date you want to import. Do not copy another person's start date.
The Wi-Fi watcher's private `home-wifi.env` needs `PULSE_WIFI_INTERFACE`,
`PULSE_WIFI_MODE=any`, and initial `PULSE_LAN_IP`/`PULSE_LAN_CIDR`; the watcher
updates the latter two. To restrict it to one saved home network, use
`PULSE_WIFI_MODE=home`, `PULSE_WIFI_CONNECTION_UUID` and `PULSE_HOME_CIDR`.

Run compose with both private env files and the personal + Wi-Fi overlays. Install
`deploy/pulse-wifi-name.service` as a user service, adjusting its project path.
The name retains “home-wifi” for compatibility; `any` follows any Wi-Fi network.
Devices must trust your locally generated public CA and share a reachable network.
Do not bypass certificate warnings, disable authentication, open database/app
ports to the network, or add router forwarding. Network client isolation or mDNS
restrictions can prevent phone access. IPv6-only networks are not supported.

## Source-policy migration

Changing the filter does not remove already-imported mixed-source values.
Stop the app, make a private verified database backup, and preview
`scripts/reset-imported-health.mts` before applying it. The migration rebuilds
imported health tables and derived scores but preserves the Google grant,
account, settings, profile, journal and locally logged entries. Its apply mode
requires `--backup-confirmed`. `scripts/check-fitbit-source.mts` performs a
bounded live check and emits counts/safe codes only, never health response bodies.

The server's Google connection must remain read-only. No disconnect/revocation is
needed for a local rebuild, particularly if another app shares the same grant.
