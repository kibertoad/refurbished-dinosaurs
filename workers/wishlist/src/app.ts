/**
 * Voting wishlist for the Refurbished Dinosaurs site.
 *
 * Visitors search a game database for a PC game released before the cutoff,
 * put it on the board, and vote for what other people put there. There are no
 * accounts: a vote is tied to a keyed hash of the address and browser it came
 * from (see lib/voter.ts).
 *
 * Every route is mounted from a contract in
 * `@refurbished-dinosaurs/wishlist-contracts`, which the site calls with the
 * same definitions, so the method, path, request validation and response
 * shapes are stated once for both sides. Votes and board reads answer with the
 * whole board, so the page never has to follow a write with a read.
 */

import {
  RELEASE_CUTOFF_YEAR,
  castVoteContract,
  getWishlistContract,
  retractVoteContract,
  searchGamesContract,
} from "@refurbished-dinosaurs/wishlist-contracts";
import type { Board, Game } from "@refurbished-dinosaurs/wishlist-contracts";
import { buildHonoRoute } from "@toad-contracts/hono";
import { SchemaValidationError } from "@toad-contracts/valibot";
import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { AppEnv, WishlistBindings } from "./env.ts";
import { HttpError } from "./errors.ts";
import { parseEntryId } from "./lib/entryId.ts";
import { selectProvider } from "./lib/providers/index.ts";
import type { ProviderGame } from "./lib/providers/index.ts";
import { cachedSearch } from "./lib/searchCache.ts";
import { castVote, listEntries, retractVote, votesSince } from "./lib/store.ts";
import { voterHash } from "./lib/voter.ts";

/** Suggestions per keystroke: enough to pick from, few enough to read. */
const SEARCH_LIMIT = 8;
const DEFAULT_BOARD_LIMIT = 100;
const DEFAULT_MAX_VOTES_PER_DAY = 25;
const RATE_WINDOW_SECONDS = 60 * 60 * 24;

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // ALLOWED_ORIGIN is a binding, so the middleware is built per request.
  app.use("*", (c, next) =>
    cors({
      origin: c.env.ALLOWED_ORIGIN ?? "*",
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 86400,
    })(c, next),
  );

  // Every endpoint is called by the site's own page, and a vote carries the
  // visitor's address into the database, so nothing answers another origin.
  // Preflights never reach this: the CORS middleware answers them first.
  app.use("*", async (c, next) => {
    const allowed = c.env.ALLOWED_ORIGIN;
    if (allowed && c.req.header("Origin") !== allowed) {
      return c.json({ error: "origin not allowed" }, 403);
    }
    await next();
  });

  buildHonoRoute(app, searchGamesContract, async (c) => {
    const { q } = c.req.valid("query");
    const provider = selectProvider(c.env);

    const results = await cachedSearch(
      provider.name,
      q,
      async () => (await provider.search(q, c.env, SEARCH_LIMIT)).map(toGame),
      (promise) => waitUntil(c, promise),
    );

    return c.json({ results }, 200);
  });

  buildHonoRoute(app, getWishlistContract, async (c) => {
    return c.json(await readBoard(c.env, await voterFor(c.req, c.env)), 200);
  });

  buildHonoRoute(app, castVoteContract, async (c) => {
    const provider = selectProvider(c.env);
    const { id } = c.req.valid("json");

    const parsed = parseEntryId(id, provider.name);
    if (!parsed) throw new HttpError(400, "unknown game");

    const voter = await voterFor(c.req, c.env);
    await enforceRateLimit(c.env, voter);

    // The browser sends an id and nothing else. Everything stored about the
    // game is read back from the database here, which also re-checks that it
    // is a PC release from before the cutoff.
    const game = await provider.lookup(parsed.externalId, c.env);
    if (!game) {
      throw new HttpError(
        400,
        `the wishlist only takes PC games released before ${RELEASE_CUTOFF_YEAR}`,
      );
    }

    const { added } = await castVote(database(c.env), game, voter);
    const board = await readBoard(c.env, voter);

    // 201 for a vote that was not there a moment ago, 200 for one this visitor
    // had already cast: the page says something different for each.
    return added ? c.json(board, 201) : c.json(board, 200);
  });

  buildHonoRoute(app, retractVoteContract, async (c) => {
    const provider = selectProvider(c.env);
    const { id } = c.req.valid("param");

    const parsed = parseEntryId(id, provider.name);
    if (!parsed) throw new HttpError(400, "unknown game");

    const voter = await voterFor(c.req, c.env);
    await retractVote(database(c.env), id, voter);

    return c.json(await readBoard(c.env, voter), 200);
  });

  app.notFound((c) => c.json({ error: "not found" }, 404));

  app.onError((error, c) => {
    // A request that does not match its contract: the schemas said what was
    // expected, so there is nothing useful to add per field.
    if (error instanceof SchemaValidationError) {
      return c.json({ error: "that request did not make sense" }, 400);
    }

    if (error instanceof HttpError) {
      if (error.status >= 500) console.error("wishlist", error.message, error.cause);
      return c.json({ error: error.message }, error.status);
    }

    console.error("wishlist", error);
    return c.json({ error: "something broke on our side" }, 500);
  });

  return app;
}

/** The wire shape of a game: what the provider knows, minus its bookkeeping. */
function toGame({ id, title, year, url, coverUrl, developer, summary }: ProviderGame): Game {
  return { id, title, year, url, coverUrl, developer, summary };
}

async function readBoard(env: WishlistBindings, voter: string): Promise<Board> {
  const entries = await listEntries(database(env), {
    voterHash: voter,
    limit: Number(env.BOARD_LIMIT) || DEFAULT_BOARD_LIMIT,
  });

  return { entries, total: entries.length };
}

/**
 * Takes the request's headers rather than the whole context: inside a
 * contract-mounted route the context carries the contract's own variables, and
 * Hono's `Context` is invariant in its env.
 */
function voterFor(
  request: { header(name: string): string | undefined },
  env: WishlistBindings,
): Promise<string> {
  return voterHash(
    { address: request.header("CF-Connecting-IP"), agent: request.header("User-Agent") },
    requireSecret(env),
  );
}

async function enforceRateLimit(env: WishlistBindings, voter: string): Promise<void> {
  const allowance = Number(env.MAX_VOTES_PER_DAY) || DEFAULT_MAX_VOTES_PER_DAY;
  const since = Math.floor(Date.now() / 1000) - RATE_WINDOW_SECONDS;

  if ((await votesSince(database(env), voter, since)) >= allowance) {
    throw new HttpError(429, "that is a lot of votes for one day. Try again tomorrow.");
  }
}

/** Absent outside the Workers runtime, where there is nothing to keep alive. */
function waitUntil(
  context: { executionCtx: { waitUntil(promise: Promise<unknown>): void } },
  promise: Promise<unknown>,
): void {
  try {
    context.executionCtx.waitUntil(promise);
  } catch {
    void promise;
  }
}

function database(env: WishlistBindings): D1Database {
  if (!env.WISHLIST_DB) {
    throw new HttpError(500, "the wishlist is misconfigured", "the WISHLIST_DB binding is missing");
  }
  return env.WISHLIST_DB;
}

function requireSecret(env: WishlistBindings): string {
  if (!env.VOTER_SECRET) {
    throw new HttpError(500, "the wishlist is misconfigured", "VOTER_SECRET is not set");
  }
  return env.VOTER_SECRET;
}
