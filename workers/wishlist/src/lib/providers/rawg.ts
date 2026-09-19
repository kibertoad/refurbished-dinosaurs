/**
 * RAWG provider.
 *
 * The alternative to IGDB: one API key instead of an OAuth exchange, so it is
 * the quicker thing to stand up. Coverage of obscure DOS-era releases is
 * thinner, which is why IGDB is the default.
 */

import {
  MAX_SUMMARY_LENGTH,
  RELEASE_CUTOFF_YEAR,
} from "@refurbished-dinosaurs/wishlist-contracts";

import type { WishlistBindings } from "../../env.ts";
import { HttpError } from "../../errors.ts";
import { truncate } from "../text.ts";
import type { GameDatabase, ProviderGame } from "./types.ts";

const API_URL = "https://api.rawg.io/api/games";

/** RAWG's parent platform id for PC. */
const PC_PLATFORM = 4;

/** RAWG filters releases by date range rather than an upper bound. */
const RELEASE_RANGE = `1970-01-01,${RELEASE_CUTOFF_YEAR - 1}-12-31`;

type RawgGame = {
  id: number;
  name: string;
  slug?: string;
  released?: string | null;
  background_image?: string | null;
  description_raw?: string;
  developers?: { name?: string }[];
  platforms?: { platform?: { id?: number } }[];
};

export const rawg: GameDatabase = {
  name: "rawg",
  label: "RAWG",

  configured(env) {
    return Boolean(env.RAWG_API_KEY);
  },

  async search(term, env, limit) {
    const results = await query<{ results?: RawgGame[] }>(env, "", {
      search: term,
      search_precise: "true",
      platforms: String(PC_PLATFORM),
      dates: RELEASE_RANGE,
      page_size: String(Math.min(Math.max(Math.trunc(limit) || 1, 1), 40)),
    });

    return (results?.results ?? []).filter(isEligible).map(toProviderGame);
  },

  async lookup(externalId, env) {
    const id = Number(externalId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new HttpError(400, "unknown game");
    }

    const result = await query<RawgGame>(env, `/${id}`, {});
    // The detail endpoint takes no filters, so eligibility is checked here
    // instead: this is what stands between a hand-made request and a modern
    // console game on the board.
    if (!result?.id || !isEligible(result)) return null;

    return toProviderGame(result);
  },
};

export function isEligible(raw: RawgGame): boolean {
  const onPC = (raw.platforms ?? []).some((entry) => entry?.platform?.id === PC_PLATFORM);
  const year = releaseYear(raw.released);

  return onPC && year !== null && year < RELEASE_CUTOFF_YEAR;
}

export function toProviderGame(raw: RawgGame): ProviderGame {
  return {
    id: `rawg:${raw.id}`,
    provider: "rawg",
    externalId: String(raw.id),
    title: raw.name,
    year: releaseYear(raw.released),
    url: `https://rawg.io/games/${raw.slug ?? raw.id}`,
    coverUrl: raw.background_image ?? null,
    developer: raw.developers?.[0]?.name ?? null,
    summary: truncate(raw.description_raw, MAX_SUMMARY_LENGTH),
  };
}

/** RAWG sends `YYYY-MM-DD`. */
function releaseYear(released: string | null | undefined): number | null {
  const year = Number(String(released ?? "").slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

async function query<T>(
  env: WishlistBindings,
  path: string,
  parameters: Record<string, string>,
): Promise<T | null> {
  const url = new URL(`${API_URL}${path}`);
  url.search = new URLSearchParams({ ...parameters, key: env.RAWG_API_KEY as string }).toString();

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new HttpError(502, "the game database is not answering", `rawg ${response.status}`);
  }

  return (await response.json()) as T;
}
