# Claude Code Instructions

## Development

- **Never run full builds** (`hugo --gc --minify` or `pnpm build`)
- The user runs `pnpm dev` (Hugo dev server) in the background
- Hugo hot-reloads changes automatically, just edit files
- The website source is in the `website/` directory

## Workspace

- pnpm workspace + Turborepo. pnpm's version is pinned by `packageManager` in the root
  `package.json`; `corepack enable` is how you get it. Never use npm here.
- `pnpm check` (typecheck + test + bundle the page script) is the one command before a push.
  `pnpm --filter <package> <task>` for one package.
- pnpm blocks install scripts and day-old releases. Exceptions for the native binaries and the
  contracts stack live in `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAgeExclude`);
  add to them by name rather than turning either policy off.

## Structure

- `pnpm-workspace.yaml`, `turbo.json` - workspace members, pnpm policies, task graph
- `website/config/_default/` - site configuration (params.toml, menus, module imports)
- `website/content/english/` - content pages
- `website/data/` - theme colours, game status definitions, social links
- `website/layouts/` - custom layout overrides
- `website/assets/js/` - page scripts (loaded through Hugo's asset pipeline)
- `workers/subscribe/` - optional Cloudflare Worker for the mailing list
- `workers/wishlist/` - Hono app on Cloudflare Workers behind the voting wishlist (D1 + game database)
- `packages/wishlist-contracts/` - API contracts shared by that worker and the page script

## Theme

- Theme (hugoplate) is managed via **Hugo modules** (see `website/go.mod`)
- `website/themes/` does not exist and is gitignored, Hugo downloads the module
- Override theme templates by creating files in `website/layouts/`, never edit the module
- Hugoplate 3.x uses the Hugo 0.146+ layout structure: partials go in
  `website/layouts/_partials/`, not `website/layouts/partials/`
- Theme colours live in `website/data/theme.json`, but Tailwind reads
  `website/assets/css/generated-theme.css`. Run `pnpm theme` after editing the JSON.

## Games

Each game is one file in `website/content/english/games/`. `status` in the front matter must be
a key from `website/data/game_status.json`, which drives the badge and the grouping on the games
page.

## Wishlist

- `/wishlist` is a voting board. The page is `website/layouts/wishlist.html` +
  `website/layouts/_partials/wishlist.html`, the behaviour is `website/assets/js/wishlist.ts`
  (bundled by Hugo's `js.Build`), and the backend is `workers/wishlist`: a Hono app on
  Cloudflare Workers with D1 behind it.
- The API is defined once in `packages/wishlist-contracts` (`@toad-contracts` + valibot). The
  worker mounts contracts with `buildHonoRoute`, the page calls them with `sendByApiContract`.
  Change a schema there, not on one side.
- Both consumers link that package with `workspace:*`; pnpm gives it its own `node_modules`,
  which is how esbuild (Hugo's and wrangler's alike) resolves valibot through it.
- Row markup for entries and suggestions lives in `<template>` elements in the partial, not in
  strings in the script: Tailwind purges classes it cannot find in rendered HTML.
- Worker tests run inside workerd (`@cloudflare/vitest-pool-workers`) against a real D1
  database, migrated from `workers/wishlist/migrations/` by `test/setup.ts`, which also calls
  `reset()` per test. The schema belongs in a migration, never in test setup code.
- `pnpm check` covers all of it, including `website check:js`, which bundles the page script
  the way Hugo does — Hugo is the only other thing that bundles it.
- Game databases sit behind `src/lib/providers/` (`igdb` by default, `rawg` as the
  alternative). Eligibility (PC, released before 2010) is enforced in the provider queries *and*
  again when a vote is cast, since the browser only sends an id.

## CSS and TailwindCSS

- TailwindCSS v4 uses `hugo_stats.json` for CSS purging (determines which classes to keep)
- This file is auto-generated in CI before production builds
- Locally it is updated by the dev server; to regenerate by hand: `pnpm build:stats`

## Gotchas

- Do not add `hugo mod npm pack` to the build. On Hugo 0.166 it ignores `package.hugo.json` and
  wipes the Tailwind dependencies out of `package.json`.
- pnpm's binary shims run through node, so a package whose `bin` is a native executable (esbuild
  after its postinstall) cannot be called as a CLI from a script. Use its JS API instead, the
  way `website/scripts/check-js.js` does.
- `relURL`/`relLangURL` leave a leading slash alone, so root-relative paths need
  `strings.TrimPrefix "/"` first or they lose the `/refurbished-dinosaurs/` prefix.
- Markdown links in content go through `website/layouts/_markup/render-link.html` for the same
  reason.

## Troubleshooting

If layout breaks (CSS not loading, navigation vertical), regenerate `hugo_stats.json`:

```bash
cd website
pnpm build:stats
```

If Tailwind reports a missing native binding, or a dependency looks half-installed, reinstall
the workspace from scratch:

```bash
pnpm clean --lockfile && pnpm install
```

If modules are corrupted:

```bash
cd website
hugo mod get -u ./...
```

## Subscription

Email goes through Resend, not SendGrid. The mailing list block is
`website/layouts/_partials/subscribe.html`, configured under `[subscription]` in `params.toml`.
Default is `provider = "endpoint"`: the site's own form posts to `workers/subscribe`, a
Cloudflare Worker that creates the Resend contact as `unsubscribed` and flips it to subscribed
when the emailed link is confirmed. `provider = "hosted_form"` embeds a provider-hosted iframe
instead, which Resend does not offer. Confirmations land on `/subscribed/`, which reads a
`status` query parameter.
