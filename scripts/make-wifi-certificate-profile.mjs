// Public certificate only: do not mount the CA private key or app credentials.
import { readFileSync, writeFileSync } from "node:fs";
import { X509Certificate, randomUUID } from "node:crypto";

const certificate = new X509Certificate(readFileSync("/input/root.crt"));
if (!certificate.ca) throw new Error("Expected a CA certificate");
const profileId = randomUUID();
const certificateId = randomUUID();
const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>PayloadType</key><string>Configuration</string>
<key>PayloadVersion</key><integer>1</integer>
<key>PayloadIdentifier</key><string>local.pulse.wifi.${profileId}</string>
<key>PayloadUUID</key><string>${profileId}</string>
<key>PayloadDisplayName</key><string>Pulse Home Wi-Fi Certificate</string>
<key>PayloadDescription</key><string>Trust certificate for your own Pulse PC. Contains only a public CA certificate; no passwords, Google tokens, VPN, or device management.</string>
<key>PayloadContent</key><array><dict>
<key>PayloadType</key><string>com.apple.security.root</string>
<key>PayloadVersion</key><integer>1</integer>
<key>PayloadIdentifier</key><string>local.pulse.wifi.certificate.${certificateId}</string>
<key>PayloadUUID</key><string>${certificateId}</string>
<key>PayloadDisplayName</key><string>Pulse Local HTTPS CA</string>
<key>PayloadCertificateFileName</key><string>Pulse-WiFi-CA.crt</string>
<key>PayloadContent</key><data>${certificate.raw.toString("base64")}</data>
</dict></array>
</dict></plist>
`;
writeFileSync("/output/Pulse-WiFi.mobileconfig", profile, { mode: 0o600 });
writeFileSync("/output/Pulse-WiFi-CA.crt", certificate.toString(), { mode: 0o600 });
console.log(`Public CA SHA-256 fingerprint: ${certificate.fingerprint256}`);
console.log("Generated certificate-only iPhone profile. No private key exported.");
