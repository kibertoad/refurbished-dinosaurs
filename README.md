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

SendGrid does this on its own. No Mailchimp, Buttondown or Formspree layer in between.

The site uses a SendGrid signup form embedded in the page, which is the recommended setup for
a static site: SendGrid sends the double opt-in confirmation mail, holds the contact list, serves
the unsubscribe page and keeps the consent records, and no API key goes anywhere near the
browser. The block is rendered by `website/layouts/_partials/subscribe.html` above the footer on
every page; a page opts out with `hide_subscribe: true`. Until it is configured, the block
degrades to a pointer at the RSS feed.

### What to configure

In SendGrid:

1. **Marketing → Contacts → Lists**: create the list, e.g. "Announcements".
2. **Marketing → Signup Forms → Create Signup Form**: point it at that list. Ask for the email
   address only; every extra field costs subscribers.
3. In the form's settings, turn on double opt-in and edit the confirmation email. Its "from"
   address has to be a [verified sender](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification).
4. Set the form's **Sign Up Confirmation** redirect to
   `https://kibertoad.github.io/refurbished-dinosaurs/subscribed/?status=ok`, so confirming lands
   back on the site instead of a SendGrid page.
5. **Actions → Share Code**. Copy two things: the `src="..."` URL out of the *Direct Embed*
   iframe snippet, and the *Landing Page* URL.

Then in `website/config/_default/params.toml` under `[subscription]`:

```toml
provider = "sendgrid_form"
form_url = "<the Direct Embed src URL>"
landing_url = "<the Landing Page URL>"
form_height = "460px"   # the embed cannot self-size, so match the form
```

`landing_url` is the fallback: if the iframe is blocked, the block offers a link to the hosted
form instead. That is all. Nothing to deploy, no secrets in the repo.

The one cost of this approach is that the form renders inside an iframe, so it only picks up as
much styling as SendGrid's form editor offers. It sits in a light card for that reason, rather
than inheriting the dark page and looking half-broken.

### Alternative: your own endpoint

If the form has to look native, `workers/subscribe/worker.js` is a Cloudflare Worker that does
the same job against the SendGrid API, and the site then renders its own styled form. The
SendGrid Contacts API has no double opt-in of its own, so the worker implements it: the
confirmation link carries the address and an expiry signed with HMAC-SHA256, and the contact is
only added to the list once that link comes back. No database.

```bash
cd workers/subscribe
wrangler secret put SENDGRID_API_KEY   # needs mail.send + marketing scopes
wrangler secret put CONFIRM_SECRET     # any long random string
wrangler deploy
```

Set `SENDGRID_LIST_ID`, `FROM_EMAIL`, `SITE_URL` and `ALLOWED_ORIGIN` in `wrangler.toml`, then
set `provider = "endpoint"` and `endpoint = "https://<worker>.workers.dev/"` in `params.toml`.
Confirmation lands on `/subscribed/`, which reads the `status` query parameter.

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
