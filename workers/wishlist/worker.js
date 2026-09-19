/**
 * Voting wishlist for the Refurbished Dinosaurs site.
 *
 * Visitors search a game database for a PC game released before 2010, put it
 * on the board, and vote for what other people put there. There are no
 * accounts: a vote is tied to a keyed hash of the address and browser it came
 * from (see lib/voter.js), which is enough to keep one browser to one vote per
 * game and to show visitors what they already backed.
 *
 *   GET    /search?q=...   search the game database (PC, pre-2010, proxied so
 *                          the API credentials stay here)
 *   GET    /wishlist       the board, ranked by votes
 *   POST   /votes  {id}    vote, adding the game to the board if it is new
 *   DELETE /votes  {id}    take that vote back
 *
 * Votes and board reads answer with the whole board, so the page never has to
 * follow a write with a read.
 *
 * Bindings (wrangler.toml + `wrangler secret put`):
 *   WISHLIST_DB         D1 database, schema in schema.sql
 *   VOTER_SECRET        secret, any long random string; keys the voter hash
 *   GAME_DB_PROVIDER    "igdb" (default) or "rawg"
 *   IGDB_CLIENT_ID      IGDB: Twitch application client id
 *   IGDB_CLIENT_SECRET  IGDB: secret
 *   RAWG_API_KEY        RAWG: secret
 *   ALLOWED_ORIGIN      origin allowed to call this
 *   BOARD_LIMIT         entries returned per board read
 *   MAX_VOTES_PER_DAY   votes one voter can cast in 24 hours
 */

import { HttpError, corsHeaders, json, originAllowed, readJson } from "./lib/http.js";
import { normalizeQuery, parseEntryId } from "./lib/catalog.js";
import { selectProvider } from "./lib/providers/index.js";
import { castVote, listEntries, retractVote, votesSince } from "./lib/store.js";
import { voterHash } from "./lib/voter.js";

const SEARCH_LIMIT = 8;
const DEFAULT_BOARD_LIMIT = 100;
const DEFAULT_MAX_VOTES_PER_DAY = 25;
const RATE_WINDOW_SECONDS = 60 * 60 * 24;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status >= 500) console.error("wishlist", error.message, error.cause);
        return json({ error: error.message }, error.status, env);
      }

      console.error("wishlist", error);
      return json({ error: "something broke on our side" }, 500, env);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);

  // Every endpoint is called by the site's own page, and a vote carries the
  // visitor's address into the database, so nothing answers another origin.
  if (!originAllowed(request, env)) {
    throw new HttpError(403, "origin not allowed");
  }

  if (request.method === "GET" && url.pathname === "/search") {
    return handleSearch(url, env);
  }
  if (request.method === "GET" && url.pathname === "/wishlist") {
    return handleBoard(request, env);
  }
  if (request.method === "POST" && url.pathname === "/votes") {
    return handleVote(request, env);
  }
  if (request.method === "DELETE" && url.pathname === "/votes") {
    return handleRetraction(request, env);
  }

  throw new HttpError(404, "not found");
}

async function handleSearch(url, env) {
  const term = normalizeQuery(url.searchParams.get("q"));
  if (term.length < 2) {
    return json({ results: [] }, 200, env);
  }

  const provider = selectProvider(env);
  const results = await provider.search(term, env, SEARCH_LIMIT);

  return json({ results }, 200, env, { "Cache-Control": "no-store" });
}

async function handleBoard(request, env) {
  return json(await board(request, env), 200, env, { "Cache-Control": "no-store" });
}

async function handleVote(request, env) {
  const provider = selectProvider(env);
  const { id } = await readJson(request);

  const parsed = parseEntryId(id, provider.name);
  if (!parsed) throw new HttpError(400, "unknown game");

  const voter = await voterHash(request, requireSecret(env));
  await enforceRateLimit(env, voter);

  // The browser sends an id and nothing else. Everything stored about the game
  // is read back from the database here, which also re-checks that it is a PC
  // release from before the cutoff.
  const game = await provider.lookup(parsed.externalId, env);
  if (!game) {
    throw new HttpError(400, "the wishlist only takes PC games released before 2010");
  }

  const { added } = await castVote(requireDatabase(env), game, voter);

  return json({ ok: true, added, ...(await board(request, env, voter)) }, added ? 201 : 200, env, {
    "Cache-Control": "no-store",
  });
}

async function handleRetraction(request, env) {
  const provider = selectProvider(env);
  const { id } = await readJson(request);

  const parsed = parseEntryId(id, provider.name);
  if (!parsed) throw new HttpError(400, "unknown game");

  const voter = await voterHash(request, requireSecret(env));
  const { removed } = await retractVote(requireDatabase(env), id, voter);

  return json({ ok: true, removed, ...(await board(request, env, voter)) }, 200, env, {
    "Cache-Control": "no-store",
  });
}

/**
 * @param {Request} request
 * @param {Record<string, string>} env
 * @param {string} [voter]  reuses the hash when the caller already computed it
 */
async function board(request, env, voter) {
  const entries = await listEntries(requireDatabase(env), {
    voterHash: voter ?? (await voterHash(request, requireSecret(env))),
    limit: Number(env.BOARD_LIMIT) || DEFAULT_BOARD_LIMIT,
  });

  return { entries, total: entries.length };
}

async function enforceRateLimit(env, voter) {
  const allowance = Number(env.MAX_VOTES_PER_DAY) || DEFAULT_MAX_VOTES_PER_DAY;
  const since = Math.floor(Date.now() / 1000) - RATE_WINDOW_SECONDS;

  if ((await votesSince(requireDatabase(env), voter, since)) >= allowance) {
    throw new HttpError(429, "that is a lot of votes for one day. Try again tomorrow.");
  }
}

function requireDatabase(env) {
  if (!env.WISHLIST_DB) {
    throw new HttpError(500, "the wishlist is misconfigured", "the WISHLIST_DB binding is missing");
  }
  return env.WISHLIST_DB;
}

function requireSecret(env) {
  if (!env.VOTER_SECRET) {
    throw new HttpError(500, "the wishlist is misconfigured", "VOTER_SECRET is not set");
  }
  return env.VOTER_SECRET;
}
