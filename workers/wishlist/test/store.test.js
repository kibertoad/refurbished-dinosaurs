import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { castVote, listEntries, retractVote, votesSince } from "../lib/store.js";
import { createDatabase } from "./helpers/d1.js";

const CHAOS = {
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

const CONQUEROR = { ...CHAOS, id: "igdb:2", externalId: "2", title: "Conqueror: A.D. 1086", year: 1995 };

describe("the wishlist store", () => {
  let db;
  beforeEach(() => {
    db = createDatabase();
  });

  it("puts a game on the board with its first vote", async () => {
    assert.deepEqual(await castVote(db, CHAOS, "voter-a"), { added: true });

    const entries = await listEntries(db, { voterHash: "voter-a" });
    assert.equal(entries.length, 1);
    assert.partialDeepStrictEqual(entries[0], {
      id: "igdb:1",
      title: "Chaos Overlords",
      year: 1996,
      developer: "Stick Man Games",
      votes: 1,
      voted: true,
    });
  });

  it("counts one vote per voter, however often they ask", async () => {
    assert.deepEqual(await castVote(db, CHAOS, "voter-a"), { added: true });
    assert.deepEqual(await castVote(db, CHAOS, "voter-a"), { added: false });
    await castVote(db, CHAOS, "voter-b");

    const [entry] = await listEntries(db, { voterHash: "voter-c" });
    assert.equal(entry.votes, 2);
    assert.equal(entry.voted, false, "a voter who has not voted should not be marked as having voted");
  });

  it("ranks by votes, and breaks ties on which game was nominated first", async () => {
    await castVote(db, CHAOS, "voter-a", 1_000_000_000_000);
    await castVote(db, CONQUEROR, "voter-a", 2_000_000_000_000);

    let entries = await listEntries(db, { voterHash: "voter-a" });
    assert.deepEqual(
      entries.map((entry) => entry.id),
      ["igdb:1", "igdb:2"],
      "equal votes: the older nomination leads",
    );

    await castVote(db, CONQUEROR, "voter-b", 2_000_000_000_000);
    entries = await listEntries(db, { voterHash: "voter-a" });
    assert.deepEqual(
      entries.map((entry) => [entry.id, entry.votes]),
      [
        ["igdb:2", 2],
        ["igdb:1", 1],
      ],
    );
  });

  it("refreshes the stored details when a game is voted for again", async () => {
    await castVote(db, CHAOS, "voter-a");
    await castVote(db, { ...CHAOS, title: "Chaos Overlords (1996)", coverUrl: null }, "voter-b");

    const [entry] = await listEntries(db, { voterHash: "voter-a" });
    assert.equal(entry.title, "Chaos Overlords (1996)");
    assert.equal(entry.coverUrl, null);
    assert.equal(entry.votes, 2);
  });

  it("retracts a vote and keeps the entry while anyone still backs it", async () => {
    await castVote(db, CHAOS, "voter-a");
    await castVote(db, CHAOS, "voter-b");

    assert.deepEqual(await retractVote(db, "igdb:1", "voter-a"), { removed: true });

    const [entry] = await listEntries(db, { voterHash: "voter-a" });
    assert.equal(entry.votes, 1);
    assert.equal(entry.voted, false);
  });

  it("drops the entry when the last vote goes", async () => {
    await castVote(db, CHAOS, "voter-a");
    await retractVote(db, "igdb:1", "voter-a");

    assert.deepEqual(await listEntries(db, { voterHash: "voter-a" }), []);
  });

  it("reports nothing removed when there was no vote to retract", async () => {
    await castVote(db, CHAOS, "voter-a");
    assert.deepEqual(await retractVote(db, "igdb:1", "voter-b"), { removed: false });
    assert.equal((await listEntries(db, { voterHash: "voter-a" }))[0].votes, 1);
  });

  it("limits how many entries come back", async () => {
    await castVote(db, CHAOS, "voter-a");
    await castVote(db, CONQUEROR, "voter-a");

    assert.equal((await listEntries(db, { voterHash: "voter-a", limit: 1 })).length, 1);
  });

  it("counts a voter's recent votes for the rate limit", async () => {
    const now = 1_700_000_000_000;
    await castVote(db, CHAOS, "voter-a", now - 2 * 24 * 60 * 60 * 1000);
    await castVote(db, CONQUEROR, "voter-a", now);

    const dayAgo = Math.floor(now / 1000) - 24 * 60 * 60;
    assert.equal(await votesSince(db, "voter-a", dayAgo), 1);
    assert.equal(await votesSince(db, "voter-a", 0), 2);
    assert.equal(await votesSince(db, "voter-b", 0), 0);
  });
});
