import unittest
from unittest.mock import patch
from home_wifi_name import approved_network, current_network


class WifiAddressTests(unittest.TestCase):
    home = {"PULSE_WIFI_MODE": "home", "PULSE_WIFI_CONNECTION_UUID": "home-connection",
            "PULSE_HOME_CIDR": "192.168.12.0/24"}

    def addresses(self, address, scope="global", prefix=24):
        return [{"addr_info": [{"local": address, "scope": scope, "prefixlen": prefix}]}]

    def test_home_address(self):
        self.assertEqual(approved_network(self.home, "home-connection\n", self.addresses("192.168.12.230")),
                         ("192.168.12.230", "192.168.12.0/24", "home-connection"))

    def test_dhcp_change(self):
        self.assertEqual(approved_network(self.home, "home-connection", self.addresses("192.168.12.231"))[0], "192.168.12.231")

    def test_home_mode_rejects_other_wifi_with_same_subnet(self):
        self.assertIsNone(approved_network(self.home, "other-connection", self.addresses("192.168.12.230")))

    def test_home_mode_rejects_outside_home_subnet(self):
        self.assertIsNone(approved_network(self.home, "home-connection", self.addresses("10.0.0.12")))

    def test_any_mode_is_default(self):
        self.assertEqual(approved_network({}, "campus", self.addresses("10.250.107.124", prefix=16)),
                         ("10.250.107.124", "10.250.0.0/16", "campus"))

    def test_any_mode_ignores_old_home_settings(self):
        settings = {**self.home, "PULSE_WIFI_MODE": "any"}
        self.assertEqual(approved_network(settings, "cafe", self.addresses("172.20.10.5", prefix=28)),
                         ("172.20.10.5", "172.20.10.0/28", "cafe"))

    def test_same_address_new_connection_is_a_new_network(self):
        addresses = self.addresses("192.168.1.4")
        self.assertNotEqual(approved_network({}, "first", addresses), approved_network({}, "second", addresses))

    def test_same_address_new_prefix_is_a_new_network(self):
        self.assertNotEqual(approved_network({}, "wifi", self.addresses("10.0.0.2", prefix=24)),
                            approved_network({}, "wifi", self.addresses("10.0.0.2", prefix=16)))

    def test_non_lan_addresses_rejected(self):
        for address, prefix in [("169.254.1.1", 16), ("127.0.0.1", 8), ("0.0.0.0", 24),
                                ("224.0.0.1", 24), ("10.0.0.2", 0), ("2001:db8::1", 64)]:
            with self.subTest(address=address, prefix=prefix):
                self.assertIsNone(approved_network({}, "wifi", self.addresses(address, prefix=prefix)))

    def test_link_scope_rejected(self):
        self.assertIsNone(approved_network({}, "wifi", self.addresses("10.0.0.1", scope="link")))

    def test_disconnected(self):
        for connection in ("", "--", "--\n"):
            self.assertIsNone(approved_network({}, connection, self.addresses("10.0.0.1")))

    def test_unknown_mode_fails_closed(self):
        self.assertIsNone(approved_network({"PULSE_WIFI_MODE": "oops"}, "wifi", self.addresses("10.0.0.1")))

    def test_malformed_address_skipped(self):
        self.assertIsNone(approved_network({}, "wifi", self.addresses("not-an-ip")))

    def test_query_failure_fails_closed(self):
        with patch("home_wifi_name.subprocess.check_output", side_effect=ValueError("bad response")):
            self.assertIsNone(current_network({"PULSE_WIFI_INTERFACE": "wlo1"}))


if __name__ == "__main__":
    unittest.main()
