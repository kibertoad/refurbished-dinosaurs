# Claude Code Instructions

## Development

- **Never run full builds** (`hugo --gc --minify` or `npm run build`)
- The user runs `npm run dev` (Hugo dev server) in the background
- Hugo hot-reloads changes automatically, just edit files
- The website source is in the `website/` directory

## Structure

- `website/config/_default/` - site configuration (params.toml, menus, module imports)
- `website/content/english/` - content pages
- `website/data/` - theme colours, game status definitions, social links
- `website/layouts/` - custom layout overrides
- `workers/subscribe/` - optional Cloudflare Worker for the mailing list

## Theme

- Theme (hugoplate) is managed via **Hugo modules** (see `website/go.mod`)
- `website/themes/` does not exist and is gitignored, Hugo downloads the module
- Override theme templates by creating files in `website/layouts/`, never edit the module
- Hugoplate 3.x uses the Hugo 0.146+ layout structure: partials go in
  `website/layouts/_partials/`, not `website/layouts/partials/`
- Theme colours live in `website/data/theme.json`, but Tailwind reads
  `website/assets/css/generated-theme.css`. Run `npm run theme` after editing the JSON.

## Games

Each game is one file in `website/content/english/games/`. `status` in the front matter must be
a key from `website/data/game_status.json`, which drives the badge and the grouping on the games
page.

## CSS and TailwindCSS

- TailwindCSS v4 uses `hugo_stats.json` for CSS purging (determines which classes to keep)
- This file is auto-generated in CI before production builds
- Locally it is updated by the dev server; to regenerate by hand: `npm run build:stats`

## Gotchas

- Do not add `hugo mod npm pack` to the build. On Hugo 0.166 it ignores `package.hugo.json` and
  wipes the Tailwind dependencies out of `package.json`.
- `relURL`/`relLangURL` leave a leading slash alone, so root-relative paths need
  `strings.TrimPrefix "/"` first or they lose the `/refurbished-dinosaurs/` prefix.
- Markdown links in content go through `website/layouts/_markup/render-link.html` for the same
  reason.

## Troubleshooting

If layout breaks (CSS not loading, navigation vertical), regenerate `hugo_stats.json`:

```bash
cd website
npm run build:stats
```

If Tailwind reports a missing native binding, reinstall from scratch:

```bash
cd website
rm -rf node_modules package-lock.json && npm install
```

If modules are corrupted:

```bash
cd website
hugo mod get -u ./...
```

## Subscription

Email goes through Resend. The mailing list block is
`website/layouts/_partials/subscribe.html`, configured under `[subscription]` in `params.toml`.
Default is `provider = "endpoint"`: the site's own form posts to `workers/subscribe`, a
Cloudflare Worker that creates the Resend contact as `unsubscribed` and flips it to subscribed
when the emailed link is confirmed. `provider = "hosted_form"` embeds a provider-hosted iframe
instead, which Resend does not offer. Confirmations land on `/subscribed/`, which reads a
`status` query parameter.
