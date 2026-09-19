/**
 * IGDB provider.
 *
 * IGDB is the deepest free catalogue of pre-2000 PC releases, which is the
 * part of history this site cares about, and every game has a public page to
 * link out to. Access goes through a Twitch application: a client id and
 * secret exchanged for a bearer token.
 *
 * Bindings:
 *   IGDB_CLIENT_ID      Twitch application client id
 *   IGDB_CLIENT_SECRET  secret, `wrangler secret put IGDB_CLIENT_SECRET`
 */

import { HttpError } from "../http.js";
import { RELEASE_CUTOFF_UNIX, truncate } from "../catalog.js";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const GAMES_URL = "https://api.igdb.com/v4/games";
const COVER_URL = "https://images.igdb.com/igdb/image/upload/t_cover_small";

/**
 * Microsoft Windows (6) and DOS (13). IGDB files 90s PC games under either,
 * and a DOS-only release is exactly the kind of thing this site restores.
 */
const PC_PLATFORMS = [6, 13];

/** Main games only: no DLC, expansions, bundles or ports of a parent entry. */
const MAIN_GAME_CATEGORY = 0;

const FIELDS = [
  "id",
  "name",
  "url",
  "first_release_date",
  "summary",
  "cover.image_id",
  "involved_companies.developer",
  "involved_companies.company.name",
].join(",");

/** Token cache, per isolate. Tokens last ~60 days, so this rarely refetches. */
let cachedToken = null;

export const igdb = {
  name: "igdb",
  label: "IGDB",

  configured(env) {
    return Boolean(env.IGDB_CLIENT_ID && env.IGDB_CLIENT_SECRET);
  },

  /**
   * @param {string} term
   * @param {Record<string, string>} env
   * @param {number} limit
   */
  async search(term, env, limit) {
    const results = await query(searchBody(term, limit), env);
    return results.map(toEntry);
  },

  /**
   * Re-reads a game straight from IGDB at vote time. The browser only sends an
   * id, so the title, year and eligibility that end up in the database come
   * from here rather than from whatever the client claimed.
   *
   * @param {string} externalId
   * @param {Record<string, string>} env
   */
  async lookup(externalId, env) {
    const [result] = await query(lookupBody(externalId), env);
    return result ? toEntry(result) : null;
  },
};

/**
 * The eligibility filter, shared by both queries so a game can never be
 * votable without being findable.
 */
function eligibility() {
  return [
    `platforms = (${PC_PLATFORMS.join(",")})`,
    `category = ${MAIN_GAME_CATEGORY}`,
    "version_parent = null",
    "first_release_date != null",
    `first_release_date < ${RELEASE_CUTOFF_UNIX}`,
  ].join(" & ");
}

/**
 * IGDB queries are a small language of their own, and the term is interpolated
 * into a quoted string, so quotes and backslashes are dropped rather than
 * escaped: they carry no meaning for a title search.
 *
 * @param {string} term
 * @param {number} limit
 */
export function searchBody(term, limit) {
  const safeTerm = term.replace(/["\\]/g, " ").trim();
  return `search "${safeTerm}"; fields ${FIELDS}; where ${eligibility()}; limit ${clampLimit(limit)};`;
}

/** @param {string} externalId */
export function lookupBody(externalId) {
  const id = Number(externalId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "unknown game");
  }
  return `fields ${FIELDS}; where id = ${id} & ${eligibility()}; limit 1;`;
}

function clampLimit(limit) {
  return Math.min(Math.max(Math.trunc(limit) || 1, 1), 50);
}

/** @param {Record<string, unknown>} raw */
export function toEntry(raw) {
  return {
    id: `igdb:${raw.id}`,
    provider: "igdb",
    externalId: String(raw.id),
    title: raw.name,
    year: raw.first_release_date
      ? new Date(raw.first_release_date * 1000).getUTCFullYear()
      : null,
    url: raw.url || `https://www.igdb.com/games/${raw.id}`,
    coverUrl: raw.cover?.image_id ? `${COVER_URL}/${raw.cover.image_id}.jpg` : null,
    developer: developerOf(raw),
    summary: truncate(raw.summary),
  };
}

function developerOf(raw) {
  const companies = raw.involved_companies || [];
  const developer = companies.find((entry) => entry.developer) || companies[0];
  return developer?.company?.name || null;
}

async function query(body, env) {
  const response = await fetch(GAMES_URL, {
    method: "POST",
    headers: {
      "Client-ID": env.IGDB_CLIENT_ID,
      Authorization: `Bearer ${await accessToken(env)}`,
      "Content-Type": "text/plain",
      Accept: "application/json",
    },
    body,
  });

  if (response.status === 401 || response.status === 403) {
    // The cached token was rejected; drop it so the next request re-auths.
    cachedToken = null;
  }

  if (!response.ok) {
    throw new HttpError(502, "the game database is not answering", `igdb ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function accessToken(env) {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const parameters = new URLSearchParams({
    client_id: env.IGDB_CLIENT_ID,
    client_secret: env.IGDB_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TOKEN_URL}?${parameters}`, { method: "POST" });
  if (!response.ok) {
    throw new HttpError(502, "the game database is not answering", `twitch token ${response.status}`);
  }

  const { access_token: value, expires_in: expiresIn } = await response.json();
  // Expire a minute early so a token never dies mid-request.
  cachedToken = { value, expiresAt: Date.now() + Math.max((expiresIn || 3600) - 60, 60) * 1000 };

  return value;
}
