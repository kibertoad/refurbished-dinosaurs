import type { Game } from "@refurbished-dinosaurs/wishlist-contracts";

import type { WishlistBindings } from "../../env.ts";

/**
 * A game as the provider hands it over: the shape the site sees, plus the two
 * fields only the database layer cares about.
 */
export type ProviderGame = Game & {
  provider: string;
  externalId: string;
};

/**
 * A game database.
 *
 * `search` powers the page's autocompletion and `lookup` is what a vote is
 * checked against; both return only wishlist-eligible games, so eligibility
 * cannot be bypassed by voting for something search would never have offered.
 * `lookup` returns null for a game that exists but does not qualify.
 */
export type GameDatabase = {
  readonly name: string;
  readonly label: string;
  configured(env: WishlistBindings): boolean;
  search(term: string, env: WishlistBindings, limit: number): Promise<ProviderGame[]>;
  lookup(externalId: string, env: WishlistBindings): Promise<ProviderGame | null>;
};
