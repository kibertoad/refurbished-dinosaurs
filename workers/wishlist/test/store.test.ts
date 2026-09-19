import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import type { ProviderGame } from "../src/lib/providers/index.ts";
import { castVote, listEntries, retractVote, votesSince } from "../src/lib/store.ts";

const CHAOS: ProviderGame = {
  id: "igdb:1",
  provider: "igdb",
  externalId: "1",
  title: "Chaos Overlords",
  year: 1996,
  url: "https://www.igdb.com/games/chaos-overlords",
  coverUrl: "https://images.igdb.com/cover.jpg",
  developer: "Stick Man Games",
  summary: "Gang warfare on a city grid.",
};

const CONQUEROR: ProviderGame = {
  ...CHAOS,
  id: "igdb:2",
  externalId: "2",
  title: "Conqueror: A.D. 1086",
  year: 1995,
};

/** The real D1 database the worker deploys against, migrated and per-test. */
const db = env.WISHLIST_DB;

describe("the wishlist store", () => {
  it("puts a game on the board with its first vote", async () => {
    expect(await castVote(db, CHAOS, "voter-a")).toEqual({ added: true });

    const entries = await listEntries(db, { voterHash: "voter-a" });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "igdb:1",
      title: "Chaos Overlords",
      year: 1996,
      developer: "Stick Man Games",
      votes: 1,
      voted: true,
    });
  });

  it("counts one vote per voter, however often they ask", async () => {
    expect(await castVote(db, CHAOS, "voter-a")).toEqual({ added: true });
    expect(await castVote(db, CHAOS, "voter-a")).toEqual({ added: false });
    await castVote(db, CHAOS, "voter-b");

    const [entry] = await listEntries(db, { voterHash: "voter-c" });
    expect(entry?.votes).toBe(2);
    expect(entry?.voted).toBe(false);
  });

  it("ranks by votes, and breaks ties on which game was nominated first", async () => {
    await castVote(db, CHAOS, "voter-a", 1_000_000_000_000);
    await castVote(db, CONQUEROR, "voter-a", 2_000_000_000_000);

    let entries = await listEntries(db, { voterHash: "voter-a" });
    expect(entries.map((entry) => entry.id)).toEqual(["igdb:1", "igdb:2"]);

    await castVote(db, CONQUEROR, "voter-b", 2_000_000_000_000);
    entries = await listEntries(db, { voterHash: "voter-a" });
    expect(entries.map((entry) => [entry.id, entry.votes])).toEqual([
      ["igdb:2", 2],
      ["igdb:1", 1],
    ]);
  });

  it("refreshes the stored details when a game is voted for again", async () => {
    await castVote(db, CHAOS, "voter-a");
    await castVote(db, { ...CHAOS, title: "Chaos Overlords (1996)", coverUrl: null }, "voter-b");

    const [entry] = await listEntries(db, { voterHash: "voter-a" });
    expect(entry?.title).toBe("Chaos Overlords (1996)");
    expect(entry?.coverUrl).toBeNull();
    expect(entry?.votes).toBe(2);
  });

  it("retracts a vote and keeps the entry while anyone still backs it", async () => {
    await castVote(db, CHAOS, "voter-a");
    await castVote(db, CHAOS, "voter-b");

    expect(await retractVote(db, "igdb:1", "voter-a")).toEqual({ removed: true });

    const [entry] = await listEntries(db, { voterHash: "voter-a" });
    expect(entry?.votes).toBe(1);
    expect(entry?.voted).toBe(false);
  });

  it("drops the entry when the last vote goes", async () => {
    await castVote(db, CHAOS, "voter-a");
    await retractVote(db, "igdb:1", "voter-a");

    expect(await listEntries(db, { voterHash: "voter-a" })).toEqual([]);
  });

  it("reports nothing removed when there was no vote to retract", async () => {
    await castVote(db, CHAOS, "voter-a");

    expect(await retractVote(db, "igdb:1", "voter-b")).toEqual({ removed: false });
    expect((await listEntries(db, { voterHash: "voter-a" }))[0]?.votes).toBe(1);
  });

  it("limits how many entries come back", async () => {
    await castVote(db, CHAOS, "voter-a");
    await castVote(db, CONQUEROR, "voter-a");

    expect(await listEntries(db, { voterHash: "voter-a", limit: 1 })).toHaveLength(1);
  });

  it("counts a voter's recent votes for the rate limit", async () => {
    const now = 1_700_000_000_000;
    await castVote(db, CHAOS, "voter-a", now - 2 * 24 * 60 * 60 * 1000);
    await castVote(db, CONQUEROR, "voter-a", now);

    const dayAgo = Math.floor(now / 1000) - 24 * 60 * 60;
    expect(await votesSince(db, "voter-a", dayAgo)).toBe(1);
    expect(await votesSince(db, "voter-a", 0)).toBe(2);
    expect(await votesSince(db, "voter-b", 0)).toBe(0);
  });
});
