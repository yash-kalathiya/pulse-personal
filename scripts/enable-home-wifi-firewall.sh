#!/usr/bin/env bash
# Only the current home IPv4 subnet. No public IPv6, app/DB port, or router changes.
set -euo pipefail
for persistence in runtime permanent; do
    flags=()
    if [[ "$persistence" == permanent ]]; then
        flags=(--permanent)
    fi
    sudo firewall-cmd "${flags[@]}" --zone=FedoraWorkstation --add-rich-rule='rule family="ipv4" source address="192.168.12.0/24" port port="8443" protocol="tcp" accept'
    sudo firewall-cmd "${flags[@]}" --zone=FedoraWorkstation --add-rich-rule='rule family="ipv4" source address="192.168.12.0/24" destination address="224.0.0.251" port port="5353" protocol="udp" accept'
done
printf '%s\n' 'Home-only HTTPS and mDNS rules installed for this session and future reboots.'
