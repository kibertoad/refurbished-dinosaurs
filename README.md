# refurbished-dinosaurs

Website for Refurbished Dinosaurs, a project that rebuilds obscure old games so they run on
current machines. Hugo site with the [Hugoplate](https://github.com/zeon-studio/hugoplate)
theme, deployed to GitHub Pages.

## Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) 0.158 or newer (0.166 is what CI uses)
- [Go](https://go.dev/dl/) 1.25+ (Hugo modules)
- [Node.js](https://nodejs.org/) 24+ (Tailwind CSS, the wishlist worker and its tests)

## Getting started

```bash
cd website
npm install
npm run dev
```

The site is served at http://localhost:1313/refurbished-dinosaurs/ (the path comes from
`baseURL`).

If `npm install` leaves Tailwind unable to find its native binding, delete `node_modules` and
`package-lock.json` and install again. That is [an npm bug with optional
dependencies](https://github.com/npm/cli/issues/4828).

## Content structure

Content lives in `website/content/english/`:

| Path | What it is |
| --- | --- |
| `_index.md` | Home page: hero copy and the three principle blurbs |
| `games/` | One file per game, plus `_index.md` for the section intro |
| `blog/` | Posts |
| `wishlist/_index.md` | Voting wishlist page (the board itself is loaded from the worker) |
| `contact/_index.md` | Contacts page |
| `authors/` | Post author pages |
| `pages/` | Standalone pages (privacy policy, subscription confirmation) |

### Adding a game

Create `website/content/english/games/<slug>.md`:

```yaml
---
title: "Chaos Overlords: New Chrome"
description: "One or two sentences, used on the cards and in search."
status: "high-fidelity-playable"
weight: 1            # ordering inside the status group
engine: "MonoGame (C#)"
platforms: ["Windows", "Linux", "macOS"]
repo: "https://github.com/..."
store: "https://www.gog.com/..."
download: "https://github.com/.../releases"
original:
  title: "Chaos Overlords"
  year: 1996
  developer: "Stick Man Games"
  publisher: "New World Computing"
---
```

`status` has to be a key from `website/data/game_status.json`, which is also where the badge
label, icon and group ordering live. The games page groups by status in `order`, so adding a
status there is enough to make a new group appear.

## Mailing list

Announcements go out through [Resend](https://resend.com), which covers the whole job: Contacts
for the list, Broadcasts for the sending, and unsubscribe handling that drops people out of
future Broadcasts on its own.

Resend has no hosted signup form, so the site renders its own form and posts it to a small
endpoint that holds the API key. Resend also has no built-in double opt-in, so the endpoint
implements the flow Resend documents: the contact is created `unsubscribed`, which keeps it out
of every Broadcast, and confirming from the emailed link flips it to subscribed. The
confirmation link carries the address and an expiry signed with HMAC-SHA256, so there is no
database and no state between the two requests.

`workers/subscribe/worker.js` is that endpoint, as a Cloudflare Worker. The upside over an
embedded third-party form is that the form is genuinely part of the page and matches the site.

### What to configure

In Resend:

1. **Domains**: verify the domain you will send from (DNS records for DKIM and the return path).
   `FROM_EMAIL` has to be on that domain.
2. **API Keys**: create a key with sending access and full access to contacts.
3. Optional: create a **Segment** for announcements if you want Broadcasts targeted at a subset
   rather than every contact, and note its ID.

Then deploy the worker:

```bash
cd workers/subscribe
wrangler secret put RESEND_API_KEY
wrangler secret put CONFIRM_SECRET     # any long random string
wrangler deploy
```

`FROM_EMAIL`, `FROM_NAME`, `SITE_URL`, `ALLOWED_ORIGIN` and the optional
`RESEND_SEGMENT_ID` live in `wrangler.toml`. `ALLOWED_ORIGIN` has to match the site's origin
exactly or the browser's POST is rejected.

Finally, in `website/config/_default/params.toml` under `[subscription]`:

```toml
provider = "endpoint"
endpoint = "https://<worker>.workers.dev/"
```

Confirmation lands on `/subscribed/`, which reads the `status` query parameter. The block is
rendered by `website/layouts/_partials/subscribe.html` above the footer on every page; a page
opts out with `hide_subscribe: true`. Until `endpoint` is set, it degrades to a pointer at the
RSS feed.

When you send the first Broadcast, keep Resend's unsubscribe link in the template. That is what
makes the unsubscribe flow work.

### Alternative: a provider-hosted form

`provider = "hosted_form"` embeds a provider-hosted signup form in an iframe instead, with
`form_url` for the embed and `landing_url` as the fallback link. Resend does not offer one, so
this path only matters if the list ever moves to a provider that does (SendGrid's Marketing
Campaigns signup forms, for instance, which carry their own double opt-in and unsubscribe pages
and need no backend at all). It is kept because it is the one setup that removes the worker.

## Wishlist

`/wishlist` is a voting board: visitors search a game database, put a PC game released before
2010 on the board, and vote for the ones already up there. Same idea as GOG's Dreamlist, with
the counts in the open and no accounts.

The site itself stays static. Everything dynamic runs on Cloudflare: `workers/wishlist` is a
[Hono](https://hono.dev) app on Workers, the board lives in D1, and search results are held in
the edge cache so a burst of typing does not become a burst of game-database traffic.

### Contracts

The API is defined once, in `packages/wishlist-contracts`, with
[`@toad-contracts`](https://github.com/kibertoad/toad-contracts) and valibot schemas. Both sides
consume that package: the worker mounts each contract as a route with `buildHonoRoute`, which
derives the method, path and request validation from it, and the page calls the same contracts
with `sendByApiContract`, which validates what it sends and parses what comes back. Neither side
restates the other's shape, and a change to a schema fails to compile on both.

| Contract | Route | What it does |
| --- | --- | --- |
| `searchGamesContract` | `GET /search?q=` | Searches the database, PC releases from before 2010 |
| `getWishlistContract` | `GET /wishlist` | The board, ranked, with this visitor's votes marked |
| `castVoteContract` | `POST /votes` | Votes, adding the game if it is new (201 new, 200 already cast) |
| `retractVoteContract` | `DELETE /votes/{id}` | Takes that vote back |

Votes and retractions answer with the whole board, so the page never follows a write with a read.

### How a vote is counted

There is no login. A vote is stored against an HMAC of the voter's IP address and user agent,
and only that hash is written down, so a browser gets one vote per game and no address is ever
stored. The trade-off is spelled out in `workers/wishlist/src/lib/voter.ts`: address alone would
merge everyone behind one office or carrier NAT into a single voter, so the browser goes into
the hash, which also means a second browser is a second voter. `MAX_VOTES_PER_DAY` caps what one
voter can do in a day.

A vote never trusts the page. The browser sends a game id and nothing else; the worker re-reads
that game from the database and re-checks that it is a PC release from before 2010 before
anything is stored.

### Game database

`GAME_DB_PROVIDER` picks the source. Both implement the same small interface in
`workers/wishlist/src/lib/providers/`, so adding another one is a file and a line.

- **`igdb`** (default): the deeper catalogue of DOS and early Windows releases, which is the
  era this project works in. IGDB credentials come from a Twitch application, created in the
  [developer console](https://dev.twitch.tv/console/apps): note its client id and secret.
- **`rawg`**: one API key from [rawg.io/apidocs](https://rawg.io/apidocs) and no OAuth
  exchange, but thinner on obscure pre-2000 titles.

### Working on it

```bash
cd packages/wishlist-contracts && npm ci   # both consumers link this package
cd ../../workers/wishlist && npm ci

npm test        # vitest: the store's SQL, the providers, and the app end to end
npm run typecheck
```

The tests need no network and no Cloudflare account. The store runs against `node:sqlite`
through a small D1 stand-in, the game database is stubbed, and `test/roundtrip.test.ts` drives
the real client against the real app over the contracts, which is what catches the two sides
drifting apart.

### Deploying it

```bash
cd workers/wishlist

wrangler d1 create refurbished-dinosaurs-wishlist
# paste the database_id it prints into wrangler.toml, then:
wrangler d1 execute refurbished-dinosaurs-wishlist --file=schema.sql --remote

wrangler secret put VOTER_SECRET         # any long random string
wrangler secret put IGDB_CLIENT_ID       # or RAWG_API_KEY, for GAME_DB_PROVIDER = "rawg"
wrangler secret put IGDB_CLIENT_SECRET
npm run deploy
```

`GAME_DB_PROVIDER`, `ALLOWED_ORIGIN`, `BOARD_LIMIT` and `MAX_VOTES_PER_DAY` live in
`wrangler.toml`. Every endpoint checks the origin, so an `ALLOWED_ORIGIN` that does not match
the site exactly makes the whole board go quiet.

Then point the site at it, in `website/config/_default/params.toml`:

```toml
[wishlist]
enable = true
endpoint = "https://<worker>.workers.dev/"
```

Until `endpoint` is set, the page says voting is not wired up yet and points at GitHub issues.
The headings, placeholder and footnote on the page are the other keys in that block. The board
itself is `website/layouts/_partials/wishlist.html` plus `website/assets/js/wishlist.ts`, which
Hugo bundles with its own esbuild; row markup lives in `<template>` elements in the partial,
because Tailwind's purge only keeps classes it can find in rendered HTML.

## Theme and colours

The theme is a Hugo module, so `website/themes/` does not exist and is not checked in. To update
it:

```bash
cd website
hugo mod get -u ./...
```

Colours and fonts come from `website/data/theme.json`. Hugoplate compiles them from a generated
CSS file rather than reading the JSON at build time, so after editing it:

```bash
npm run theme     # rewrites assets/css/generated-theme.css
```

The favicon and Open Graph image are generated pixel art, placeholders until there is real art:

```bash
npm run images    # rewrites assets/images/{favicon,og-image}.png
```

## Deploying

Every push to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. One-time setup: repository Settings → Pages → Source →
"GitHub Actions".

For a custom domain, add a `CNAME` file to `website/static/`, point DNS at GitHub, and change
`baseURL` in `website/hugo.toml`. `ALLOWED_ORIGIN` and `SITE_URL` in the worker need the same
change, or the subscribe form's POST starts getting rejected.

## Notes on the build

- `hugo mod npm pack` is not used. It ignores `package.hugo.json` on Hugo 0.166 and empties
  `package.json`, so the Tailwind dependencies are declared directly in `website/package.json`
  and CI runs `npm ci`.
- `hugo.toml` adds `tailwindcss` to `security.exec.allow`. Hugo 0.166 does not whitelist it by
  default and `css.TailwindCSS` shells out to it.
- `website/layouts/_markup/render-link.html` resolves root-relative markdown links against
  `baseURL`. Without it, `/games/foo` in a post would break on the Pages subpath.
