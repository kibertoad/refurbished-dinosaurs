# refurbished-dinosaurs

Website for Refurbished Dinosaurs, a project that rebuilds obscure old games so they run on
current machines. Hugo site with the [Hugoplate](https://github.com/zeon-studio/hugoplate)
theme, deployed to GitHub Pages.

## Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) 0.158 or newer (0.166 is what CI uses)
- [Go](https://go.dev/dl/) 1.25+ (Hugo modules)
- [Node.js](https://nodejs.org/) 24+ (Tailwind CSS)

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

Yes, SendGrid can do this on its own. No Mailchimp, Buttondown or Formspree layer needed. There
are two ways to wire it, picked with `provider` under `[subscription]` in
`website/config/_default/params.toml`.

### Option A: SendGrid-hosted signup form (default, no backend)

Marketing Campaigns includes a signup form builder. It hands you an embed URL, and SendGrid then
owns the whole flow: the double opt-in confirmation mail, the contact list, the unsubscribe page
and the suppression handling.

1. SendGrid → Marketing → Signup Forms → create a form, pick the list, enable double opt-in.
2. Actions → Share Code, copy the URL out of the iframe snippet.
3. Put it in `form_url`, keep `provider = "sendgrid_form"`.

This is the right default for a low-traffic announcement list: nothing to deploy, nothing to
keep patched, and consent records live where the mail is sent from. The cost is that the form is
an iframe, so it only inherits as much of the site's styling as SendGrid's own form editor
allows.

### Option B: your own endpoint (`workers/subscribe`)

For a form that is actually part of the page, `workers/subscribe/worker.js` is a Cloudflare
Worker that does the same job against the SendGrid API. The SendGrid Contacts API has no
double opt-in of its own, so the worker implements it: the confirmation link carries the address
and an expiry signed with HMAC-SHA256, and the contact is only added to the list once that link
comes back. No database.

```bash
cd workers/subscribe
wrangler secret put SENDGRID_API_KEY   # needs mail.send + marketing scopes
wrangler secret put CONFIRM_SECRET     # any long random string
wrangler deploy
```

Set `SENDGRID_LIST_ID`, `FROM_EMAIL`, `SITE_URL` and `ALLOWED_ORIGIN` in `wrangler.toml`, then
set `provider = "endpoint"` and `endpoint = "https://<worker>.workers.dev/"` in `params.toml`.
Confirmation lands on `/subscribed/`, which reads the `status` query parameter.

With either option, the block is rendered by `website/layouts/_partials/subscribe.html` above
the footer on every page, and a page can opt out with `hide_subscribe: true`. While neither is
configured it degrades to a pointer at the RSS feed.

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
change, and so does the `form_url` origin if SendGrid's form is restricted to one domain.

## Notes on the build

- `hugo mod npm pack` is not used. It ignores `package.hugo.json` on Hugo 0.166 and empties
  `package.json`, so the Tailwind dependencies are declared directly in `website/package.json`
  and CI runs `npm ci`.
- `hugo.toml` adds `tailwindcss` to `security.exec.allow`. Hugo 0.166 does not whitelist it by
  default and `css.TailwindCSS` shells out to it.
- `website/layouts/_markup/render-link.html` resolves root-relative markdown links against
  `baseURL`. Without it, `/games/foo` in a post would break on the Pages subpath.
