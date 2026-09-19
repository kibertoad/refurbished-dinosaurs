/**
 * IGDB provider.
 *
 * IGDB is the deepest free catalogue of pre-2000 PC releases, which is the
 * part of history this site cares about, and every game has a public page to
 * link out to. Access goes through a Twitch application: a client id and
 * secret exchanged for a bearer token.
 */

import { RELEASE_CUTOFF_UNIX, MAX_SUMMARY_LENGTH } from "@refurbished-dinosaurs/wishlist-contracts";

import type { WishlistBindings } from "../../env.ts";
import { HttpError } from "../../errors.ts";
import { truncate } from "../text.ts";
import type { GameDatabase, ProviderGame } from "./types.ts";

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

type IgdbGame = {
  id: number;
  name: string;
  url?: string;
  first_release_date?: number;
  summary?: string;
  cover?: { image_id?: string };
  involved_companies?: { developer?: boolean; company?: { name?: string } }[];
};

/** Token cache, per isolate. Tokens last ~60 days, so this rarely refetches. */
let cachedToken: { value: string; expiresAt: number } | null = null;

export const igdb: GameDatabase = {
  name: "igdb",
  label: "IGDB",

  configured(env) {
    return Boolean(env.IGDB_CLIENT_ID && env.IGDB_CLIENT_SECRET);
  },

  async search(term, env, limit) {
    const results = await query(searchBody(term, limit), env);
    return results.map(toProviderGame);
  },

  /**
   * Re-reads a game straight from IGDB at vote time. The browser only sends an
   * id, so the title, year and eligibility that end up in the database come
   * from here rather than from whatever the client claimed.
   */
  async lookup(externalId, env) {
    const [result] = await query(lookupBody(externalId), env);
    return result ? toProviderGame(result) : null;
  },
};

/**
 * The eligibility filter, shared by both queries so a game can never be
 * votable without being findable.
 */
function eligibility(): string {
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
 */
export function searchBody(term: string, limit: number): string {
  const safeTerm = term.replace(/["\\]/g, " ").trim();
  return `search "${safeTerm}"; fields ${FIELDS}; where ${eligibility()}; limit ${clampLimit(limit)};`;
}

export function lookupBody(externalId: string): string {
  const id = Number(externalId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "unknown game");
  }
  return `fields ${FIELDS}; where id = ${id} & ${eligibility()}; limit 1;`;
}

function clampLimit(limit: number): number {
  return Math.min(Math.max(Math.trunc(limit) || 1, 1), 50);
}

export function toProviderGame(raw: IgdbGame): ProviderGame {
  return {
    id: `igdb:${raw.id}`,
    provider: "igdb",
    externalId: String(raw.id),
    title: raw.name,
    year: raw.first_release_date
      ? new Date(raw.first_release_date * 1000).getUTCFullYear()
      : null,
    url: raw.url ?? `https://www.igdb.com/games/${raw.id}`,
    coverUrl: raw.cover?.image_id ? `${COVER_URL}/${raw.cover.image_id}.jpg` : null,
    developer: developerOf(raw),
    summary: truncate(raw.summary, MAX_SUMMARY_LENGTH),
  };
}

function developerOf(raw: IgdbGame): string | null {
  const companies = raw.involved_companies ?? [];
  const developer = companies.find((entry) => entry.developer) ?? companies[0];
  return developer?.company?.name ?? null;
}

async function query(body: string, env: WishlistBindings): Promise<IgdbGame[]> {
  const response = await fetch(GAMES_URL, {
    method: "POST",
    headers: {
      "Client-ID": env.IGDB_CLIENT_ID as string,
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
    throw new HttpError(
      502,
      "the game database is not answering",
      `igdb ${response.status}: ${await response.text()}`,
    );
  }

  return (await response.json()) as IgdbGame[];
}

async function accessToken(env: WishlistBindings): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const parameters = new URLSearchParams({
    client_id: env.IGDB_CLIENT_ID as string,
    client_secret: env.IGDB_CLIENT_SECRET as string,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TOKEN_URL}?${parameters}`, { method: "POST" });
  if (!response.ok) {
    throw new HttpError(502, "the game database is not answering", `twitch token ${response.status}`);
  }

  const { access_token: value, expires_in: expiresIn } = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  // Expire a minute early so a token never dies mid-request.
  cachedToken = { value, expiresAt: Date.now() + Math.max((expiresIn ?? 3600) - 60, 60) * 1000 };

  return value;
}
