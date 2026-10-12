#!/usr/bin/python3
"""Advertise pulse.local; rebind HTTPS on the current Wi-Fi's IPv4 subnet.

Reads only the nonsecret Wi-Fi settings. Compose resolves app secrets internally;
its output is suppressed so environment values never reach service logs.
"""
import ipaddress
import json
import os
from pathlib import Path
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
SETTINGS = ROOT / ".local-private/home-wifi.env"
running = True


def read_settings():
    return dict(line.split("=", 1) for line in SETTINGS.read_text().splitlines()
                if line and not line.startswith("#"))


def approved_network(settings, connection, addresses):
    connection = connection.strip()
    mode = settings.get("PULSE_WIFI_MODE", "any")
    if mode not in ("any", "home") or connection in ("", "--"):
        return None
    if mode == "home" and connection != settings["PULSE_WIFI_CONNECTION_UUID"]:
        return None
    home = ipaddress.ip_network(settings["PULSE_HOME_CIDR"]) if mode == "home" else None
    for interface in addresses:
        for address in interface.get("addr_info", []):
            try:
                candidate = ipaddress.ip_interface(f'{address["local"]}/{address["prefixlen"]}')
            except (KeyError, ValueError):
                continue
            ip = candidate.ip
            if (address.get("scope") != "global" or ip.version != 4
                    or ip.is_loopback or ip.is_link_local or ip.is_multicast
                    or ip.is_unspecified or candidate.network.prefixlen == 0):
                continue
            if home is None or ip in home:
                return str(ip), str(home or candidate.network), connection
    return None


def current_network(settings):
    try:
        connection = subprocess.check_output(
            ["nmcli", "-g", "GENERAL.CON-UUID", "device", "show", settings["PULSE_WIFI_INTERFACE"]],
            text=True, stderr=subprocess.DEVNULL, timeout=5)
        addresses = json.loads(subprocess.check_output(
            ["ip", "-j", "-4", "address", "show", "dev", settings["PULSE_WIFI_INTERFACE"]],
            text=True, stderr=subprocess.DEVNULL, timeout=5))
        return approved_network(settings, connection, addresses)
    except (subprocess.SubprocessError, ValueError):
        return None


def compose(*arguments):
    return subprocess.run(
        ["docker", "compose", "-p", "pulse-personal",
         "--env-file", ".local-private/pulse.env",
         "--env-file", ".local-private/home-wifi.env",
         "-f", "compose.personal.yaml", "-f", "compose.home-wifi.yaml", *arguments],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        timeout=90, check=True)


def stop_publisher(publisher):
    if publisher is not None and publisher.poll() is None:
        publisher.terminate()
        try:
            publisher.wait(timeout=5)
        except subprocess.TimeoutExpired:
            publisher.kill()
            publisher.wait()


def main():
    global running
    def stop(_signal, _frame):
        global running
        running = False
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    active = None
    publisher = None
    proxy_stopped = False
    try:
        while running:
            settings = read_settings()
            network = current_network(settings)
            if network is None:
                stop_publisher(publisher)
                publisher = None
                active = None
                if not proxy_stopped:
                    compose("stop", "wifi-https")
                    proxy_stopped = True
                    print("Wi-Fi unavailable or disallowed: HTTPS and name advertisement stopped", flush=True)
            elif network != active or publisher is None or publisher.poll() is not None:
                stop_publisher(publisher)
                publisher = None
                # Remove the old listener before starting anything on the new network.
                compose("stop", "wifi-https")
                address, subnet, _connection = network
                settings["PULSE_LAN_IP"] = address
                settings["PULSE_LAN_CIDR"] = subnet
                temporary = SETTINGS.with_suffix(".env.tmp")
                temporary.write_text("".join(f"{key}={value}\n" for key, value in settings.items()))
                temporary.chmod(0o600)
                os.replace(temporary, SETTINGS)
                compose("up", "-d", "pulse")
                # Caddy config is a file bind mount: recreate to pick up a replaced inode.
                compose("up", "-d", "--no-deps", "--force-recreate", "wifi-https")
                publisher = subprocess.Popen(
                    ["avahi-publish-address", "--no-reverse", "pulse.local", address],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(1)
                if publisher.poll() is not None:
                    raise RuntimeError("mDNS publication failed (check for a hostname conflict)")
                active = network
                proxy_stopped = False
                print(f"pulse.local advertised at {address}; HTTPS restricted to current Wi-Fi subnet {subnet}", flush=True)
            time.sleep(5)
    finally:
        stop_publisher(publisher)
        compose("stop", "wifi-https")


if __name__ == "__main__":
    main()
