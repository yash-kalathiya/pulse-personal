/** Strict provenance gate: unknown/missing metadata never counts as Fitbit. */
export function isFitbitPoint(point: unknown): boolean {
  if (!point || typeof point !== "object" || Array.isArray(point)) return false;
  const source = (point as { dataSource?: { platform?: string; device?: { displayName?: string } } }).dataSource;
  return source?.platform === "FITBIT" && !/pixel\s*watch/i.test(source.device?.displayName ?? "");
}

export const FITBIT_DEVICE_FAMILY = "users/me/dataSourceFamilies/google-wearables";

/** Metadata must be checked before using a device-family aggregate: the family includes Pixel Watch too. */
export function assertFitbitSources(points: unknown[]): void {
  if (points.some((point) => !isFitbitPoint(point))) throw new Error("non_fitbit_rollup_source");
}
