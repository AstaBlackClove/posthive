// The IANA timezone names a browser knows, for the timezone picker (settings, library).

const FALLBACK = ["UTC", "Asia/Jakarta"];

function supported(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
    return list && list.length > 0 ? list : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/**
 * All timezones, with UTC first (Intl leaves it out of its list in some browsers) and the saved
 * value kept even when the browser does not list it, so an existing setting never disappears
 * from the picker or silently turns into a different zone.
 */
export function timezoneOptions(current?: string | null, all: string[] = supported()): string[] {
  const rest = all.filter((z) => z !== "UTC");
  const list = ["UTC", ...rest];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

/** "America/New_York" → "America / New York": easier to read and to search. */
export function timezoneLabel(zone: string): string {
  return zone.replace(/_/g, " ").replace(/\//g, " / ");
}
