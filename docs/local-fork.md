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
