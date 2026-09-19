/**
 * Game database providers.
 *
 * A provider turns a search term into wishlist entries and reads a single game
 * back by id (see ./types.ts). Everything else in the worker only sees that
 * interface, so swapping databases is a config change.
 */

import { HttpError } from "../../errors.ts";
import type { WishlistBindings } from "../../env.ts";
import { igdb } from "./igdb.ts";
import { rawg } from "./rawg.ts";
import type { GameDatabase } from "./types.ts";

const PROVIDERS: Record<string, GameDatabase> = { [igdb.name]: igdb, [rawg.name]: rawg };

export const DEFAULT_PROVIDER = igdb.name;

export function selectProvider(env: WishlistBindings): GameDatabase {
  const name = (env.GAME_DB_PROVIDER ?? DEFAULT_PROVIDER).toLowerCase();
  const provider = PROVIDERS[name];

  if (!provider) {
    throw new HttpError(500, "the wishlist is misconfigured", `unknown provider: ${name}`);
  }
  if (!provider.configured(env)) {
    throw new HttpError(500, "the wishlist is misconfigured", `${name} credentials are missing`);
  }

  return provider;
}

export type { GameDatabase, ProviderGame } from "./types.ts";
