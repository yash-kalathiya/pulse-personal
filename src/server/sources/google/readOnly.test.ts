import { describe, expect, it, vi } from "vitest";
import type { Db } from "../../db";

vi.mock("../../config", () => ({ getConfig: () => ({ googleReadOnly: true }) }));

import { createGoogleClient } from "./client";
import { authUrl, missingScopes, SCOPES } from "./oauth";

describe("read-only Google deployment", () => {
  it("requests no write scopes and accepts an existing read-only grant", async () => {
    const url = new URL(authUrl({ clientId: "test", redirectUri: "http://localhost:3000/oauth/callback", state: "test", prompt: "consent" }));
    const scopes = url.searchParams.get("scope")!.split(" ");
    expect(scopes.some((s) => s.endsWith(".writeonly"))).toBe(false);
    expect(scopes.filter((s) => s.includes("googlehealth"))).toEqual(SCOPES.filter((s) => s.endsWith(".readonly")));
    const db = { select: () => ({ from: () => ({ where: async () => [{ scope: SCOPES.filter((s) => s.endsWith(".readonly")).join(" ") }] }) }) } as unknown as Db;
    expect(await missingScopes(db, 1)).toEqual([]);
  });

  it("rejects both health write operations before any network or token lookup", async () => {
    const fetch = vi.fn();
    const client = createGoogleClient({ db: {} as Db, userId: 1, google: { clientId: "test", clientSecret: "test" }, timeZone: "UTC", fetch });
    await expect(client.create("weight", {})).rejects.toMatchObject({ code: "read_only", status: 403 });
    await expect(client.batchDelete("weight", ["users/me/dataTypes/weight/dataPoints/test"])).rejects.toMatchObject({ code: "read_only", status: 403 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
