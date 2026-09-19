/**
 * RAWG provider.
 *
 * The alternative to IGDB: one API key instead of an OAuth exchange, so it is
 * the quicker thing to stand up. Coverage of obscure DOS-era releases is
 * thinner, which is why IGDB is the default.
 *
 * Bindings:
 *   RAWG_API_KEY  secret, `wrangler secret put RAWG_API_KEY`
 */

import { HttpError } from "../http.js";
import { RELEASE_CUTOFF_YEAR, isEligibleYear, truncate } from "../catalog.js";

const API_URL = "https://api.rawg.io/api/games";

/** RAWG's parent platform id for PC. */
const PC_PLATFORM = 4;

/** RAWG filters releases by date range rather than an upper bound. */
const RELEASE_RANGE = `1970-01-01,${RELEASE_CUTOFF_YEAR - 1}-12-31`;

export const rawg = {
  name: "rawg",
  label: "RAWG",

  configured(env) {
    return Boolean(env.RAWG_API_KEY);
  },

  /**
   * @param {string} term
   * @param {Record<string, string>} env
   * @param {number} limit
   */
  async search(term, env, limit) {
    const results = await query(env, "", {
      search: term,
      search_precise: "true",
      platforms: String(PC_PLATFORM),
      dates: RELEASE_RANGE,
      page_size: String(Math.min(Math.max(Math.trunc(limit) || 1, 1), 40)),
    });

    return (results.results || []).map(toEntry).filter((entry) => isEligibleYear(entry.year));
  },

  /**
   * @param {string} externalId
   * @param {Record<string, string>} env
   */
  async lookup(externalId, env) {
    const id = Number(externalId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new HttpError(400, "unknown game");
    }

    const result = await query(env, `/${id}`, {});
    // The detail endpoint takes no filters, so eligibility is checked here
    // instead: this is what stands between a hand-made request and a modern
    // console game on the board.
    if (!result?.id || !isEligible(result)) return null;

    return toEntry(result);
  },
};

/** @param {Record<string, unknown>} raw */
export function isEligible(raw) {
  const onPC = (raw.platforms || []).some((entry) => entry?.platform?.id === PC_PLATFORM);
  return onPC && isEligibleYear(releaseYear(raw.released));
}

/** @param {Record<string, unknown>} raw */
export function toEntry(raw) {
  return {
    id: `rawg:${raw.id}`,
    provider: "rawg",
    externalId: String(raw.id),
    title: raw.name,
    year: releaseYear(raw.released),
    url: `https://rawg.io/games/${raw.slug || raw.id}`,
    coverUrl: raw.background_image || null,
    developer: raw.developers?.[0]?.name || null,
    summary: truncate(raw.description_raw),
  };
}

/** @param {string | null | undefined} released  RAWG sends `YYYY-MM-DD`. */
function releaseYear(released) {
  const year = Number(String(released || "").slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

async function query(env, path, parameters) {
  const url = new URL(`${API_URL}${path}`);
  url.search = new URLSearchParams({ ...parameters, key: env.RAWG_API_KEY }).toString();

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new HttpError(502, "the game database is not answering", `rawg ${response.status}`);
  }

  return response.json();
}
