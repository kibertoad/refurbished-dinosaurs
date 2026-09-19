/**
 * What counts as a wishlist-eligible game.
 *
 * The site restores PC games from before the modern era, so the wishlist only
 * accepts those: anything a game database returns outside this window is not
 * something we would ever pick up, and letting it onto the board just makes
 * the votes harder to read.
 */

/** Releases have to predate this year. */
export const RELEASE_CUTOFF_YEAR = 2010;

/** Same cutoff as a Unix timestamp, which is what IGDB filters on. */
export const RELEASE_CUTOFF_UNIX = Date.UTC(RELEASE_CUTOFF_YEAR, 0, 1) / 1000;

/** Longest search term we forward to a provider. */
export const MAX_QUERY_LENGTH = 80;

/** Longest summary we keep; the card only has room for a couple of lines. */
export const MAX_SUMMARY_LENGTH = 280;

/** `<provider>:<external id>`, the shape of every wishlist entry id. */
const ENTRY_ID_PATTERN = /^([a-z]+):([A-Za-z0-9_-]{1,64})$/;

/**
 * Splits an entry id, returning null when it is malformed or belongs to a
 * provider other than the one currently configured. Vote requests carry ids
 * straight from the browser, so this is the gate in front of the database.
 *
 * @param {unknown} value
 * @param {string} providerName
 * @returns {{provider: string, externalId: string} | null}
 */
export function parseEntryId(value, providerName) {
  if (typeof value !== "string") return null;
  const match = ENTRY_ID_PATTERN.exec(value);
  if (!match) return null;

  const [, provider, externalId] = match;
  if (provider !== providerName) return null;

  return { provider, externalId };
}

/**
 * Whether a release year is old enough for the wishlist. Games with no known
 * release date are rejected: an unknown year cannot be checked, and the
 * database is full of unreleased entries that would otherwise slip through.
 *
 * @param {number | null | undefined} year
 */
export function isEligibleYear(year) {
  return Number.isInteger(year) && year < RELEASE_CUTOFF_YEAR;
}

/**
 * Trims a search term to something safe to hand a provider. Returns an empty
 * string for input that is not worth a round trip.
 *
 * @param {unknown} value
 */
export function normalizeQuery(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * @param {string | null | undefined} text
 * @param {number} [limit]
 */
export function truncate(text, limit = MAX_SUMMARY_LENGTH) {
  if (!text) return null;
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= limit) return collapsed;
  return `${collapsed.slice(0, limit - 1).trimEnd()}…`;
}
