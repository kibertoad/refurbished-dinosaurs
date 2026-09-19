import { RELEASE_CUTOFF_UNIX } from "@refurbished-dinosaurs/wishlist-contracts";
import { describe, expect, it } from "vitest";

import { HttpError } from "../src/errors.ts";
import { parseEntryId } from "../src/lib/entryId.ts";
import { lookupBody, searchBody, toProviderGame as igdbGame } from "../src/lib/providers/igdb.ts";
import { selectProvider } from "../src/lib/providers/index.ts";
import { isEligible, toProviderGame as rawgGame } from "../src/lib/providers/rawg.ts";
import { truncate } from "../src/lib/text.ts";

describe("igdb queries", () => {
  it("filters searches to PC releases before the cutoff", () => {
    const body = searchBody("chaos overlords", 8);

    expect(body).toContain("platforms = (6,13)");
    expect(body).toContain(`first_release_date < ${RELEASE_CUTOFF_UNIX}`);
    expect(body).toContain("limit 8;");
  });

  it("strips quotes and backslashes out of the term", () => {
    expect(searchBody('sid meier\\"s "pirates"', 8)).toContain('search "sid meier  s  pirates";');
  });

  it("clamps the limit", () => {
    expect(searchBody("doom", 500)).toContain("limit 50;");
    expect(searchBody("doom", 0)).toContain("limit 1;");
  });

  it("looks up by numeric id only, with the same eligibility filter", () => {
    expect(lookupBody("1234")).toContain("where id = 1234 & platforms = (6,13)");

    for (const bad of ["1234; drop", "abc", "-1", "0", ""]) {
      expect(() => lookupBody(bad), bad).toThrow(HttpError);
    }
  });
});

describe("igdb entries", () => {
  it("normalizes a game", () => {
    expect(
      igdbGame({
        id: 1234,
        name: "Chaos Overlords",
        url: "https://www.igdb.com/games/chaos-overlords",
        first_release_date: 852076800, // 1997-01-01
        summary: "Gang   warfare\non a cyberpunk city grid.",
        cover: { image_id: "co1abc" },
        involved_companies: [
          { developer: false, company: { name: "New World Computing" } },
          { developer: true, company: { name: "Stick Man Games" } },
        ],
      }),
    ).toEqual({
      id: "igdb:1234",
      provider: "igdb",
      externalId: "1234",
      title: "Chaos Overlords",
      year: 1997,
      url: "https://www.igdb.com/games/chaos-overlords",
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_small/co1abc.jpg",
      developer: "Stick Man Games",
      summary: "Gang warfare on a cyberpunk city grid.",
    });
  });

  it("copes with a game that is missing everything optional", () => {
    const entry = igdbGame({ id: 7, name: "Untitled" });

    expect(entry).toMatchObject({
      year: null,
      coverUrl: null,
      developer: null,
      summary: null,
      url: "https://www.igdb.com/games/7",
    });
  });
});

describe("rawg entries", () => {
  const game = {
    id: 42,
    slug: "conqueror-ad-1086",
    name: "Conqueror: A.D. 1086",
    released: "1995-06-01",
    background_image: "https://media.rawg.io/cover.jpg",
    developers: [{ name: "Sierra" }],
    description_raw: "Norman England, in real time.",
    platforms: [{ platform: { id: 4 } }],
  };

  it("normalizes a game", () => {
    expect(rawgGame(game)).toEqual({
      id: "rawg:42",
      provider: "rawg",
      externalId: "42",
      title: "Conqueror: A.D. 1086",
      year: 1995,
      url: "https://rawg.io/games/conqueror-ad-1086",
      coverUrl: "https://media.rawg.io/cover.jpg",
      developer: "Sierra",
      summary: "Norman England, in real time.",
    });
  });

  it("accepts pre-cutoff PC releases only", () => {
    expect(isEligible(game)).toBe(true);
    expect(isEligible({ ...game, released: "2015-01-01" })).toBe(false);
    expect(isEligible({ ...game, released: null })).toBe(false);
    expect(isEligible({ ...game, platforms: [{ platform: { id: 18 } }] })).toBe(false);
    expect(isEligible({ ...game, platforms: [] })).toBe(false);
  });
});

describe("selectProvider", () => {
  it("defaults to IGDB", () => {
    expect(selectProvider({ IGDB_CLIENT_ID: "id", IGDB_CLIENT_SECRET: "secret" } as never).name).toBe(
      "igdb",
    );
  });

  it("honours the configured provider", () => {
    expect(
      selectProvider({ GAME_DB_PROVIDER: "rawg", RAWG_API_KEY: "key" } as never).name,
    ).toBe("rawg");
  });

  it("refuses an unknown provider or missing credentials", () => {
    expect(() => selectProvider({ GAME_DB_PROVIDER: "mobygames" } as never)).toThrow(
      /misconfigured/,
    );
    expect(() => selectProvider({ GAME_DB_PROVIDER: "igdb" } as never)).toThrow(/misconfigured/);
  });
});

describe("parseEntryId", () => {
  it("splits an id belonging to the configured provider", () => {
    expect(parseEntryId("igdb:1234", "igdb")).toEqual({ provider: "igdb", externalId: "1234" });
  });

  it("rejects ids minted by another provider, or with nothing after the colon", () => {
    expect(parseEntryId("rawg:1234", "igdb")).toBeNull();
    expect(parseEntryId("igdb:", "igdb")).toBeNull();
    expect(parseEntryId("1234", "igdb")).toBeNull();
  });
});

describe("truncate", () => {
  it("collapses whitespace and leaves short text alone", () => {
    expect(truncate("a   b\nc", 280)).toBe("a b c");
  });

  it("cuts long text to the limit, ellipsis included", () => {
    const cut = truncate("word ".repeat(200), 280);

    expect(cut).toHaveLength(280);
    expect(cut?.endsWith("…")).toBe(true);
  });

  it("passes empty input through as null", () => {
    expect(truncate("", 280)).toBeNull();
    expect(truncate(null, 280)).toBeNull();
    expect(truncate("   ", 280)).toBeNull();
  });
});
