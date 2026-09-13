/**
 * Mailing-list endpoint for the Refurbished Dinosaurs site.
 *
 * Only needed if params.toml uses `provider = "endpoint"`. With
 * `provider = "sendgrid_form"` the SendGrid-hosted signup form does all of
 * this and there is nothing to deploy.
 *
 * Double opt-in without a database: the confirmation link carries the address
 * and an expiry signed with HMAC-SHA256, so the worker can verify its own
 * token on the way back. A contact only reaches the SendGrid list after the
 * link is clicked.
 *
 *   POST /            {"email": "..."}  -> sends the confirmation mail
 *   GET  /confirm?token=...             -> adds the contact, then redirects
 *
 * Bindings (wrangler.toml + `wrangler secret put`):
 *   SENDGRID_API_KEY  secret, needs the mail.send and marketing scopes
 *   CONFIRM_SECRET    secret, any long random string
 *   SENDGRID_LIST_ID  marketing list the confirmed contact joins
 *   FROM_EMAIL        verified sender address
 *   FROM_NAME         sender name
 *   SITE_URL          site root, used for the redirect targets
 *   ALLOWED_ORIGIN    origin allowed to POST here
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 3;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method === "POST" && url.pathname === "/") {
      return handleSubscribe(request, env);
    }

    if (request.method === "GET" && url.pathname === "/confirm") {
      return handleConfirm(url, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleSubscribe(request, env) {
  if (env.ALLOWED_ORIGIN && request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
    return json({ error: "origin not allowed" }, 403, env);
  }

  let email;
  try {
    ({ email } = await request.json());
  } catch {
    return json({ error: "expected JSON" }, 400, env);
  }

  email = String(email || "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return json({ error: "invalid email" }, 400, env);
  }

  const token = await sign(email, env.CONFIRM_SECRET);
  const confirmURL = `${new URL(request.url).origin}/confirm?token=${encodeURIComponent(token)}`;

  const sent = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: env.FROM_EMAIL, name: env.FROM_NAME },
      personalizations: [{ to: [{ email }] }],
      subject: "Confirm your Refurbished Dinosaurs subscription",
      content: [
        {
          type: "text/plain",
          value: [
            "Confirm you want release announcements from Refurbished Dinosaurs:",
            "",
            confirmURL,
            "",
            "The link stops working in three days. If you did not ask for this, ignore it;",
            "nothing is stored until the link is used.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!sent.ok) {
    console.error("sendgrid mail/send failed", sent.status, await sent.text());
    return json({ error: "could not send confirmation" }, 502, env);
  }

  return json({ ok: true }, 202, env);
}

async function handleConfirm(url, env) {
  const email = await verify(url.searchParams.get("token") || "", env.CONFIRM_SECRET);
  if (!email) {
    return Response.redirect(`${env.SITE_URL}/subscribed/?status=expired`, 302);
  }

  const added = await fetch("https://api.sendgrid.com/v3/marketing/contacts", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      list_ids: [env.SENDGRID_LIST_ID],
      contacts: [{ email }],
    }),
  });

  if (!added.ok) {
    console.error("sendgrid contacts failed", added.status, await added.text());
    return Response.redirect(`${env.SITE_URL}/subscribed/?status=failed`, 302);
  }

  return Response.redirect(`${env.SITE_URL}/subscribed/?status=ok`, 302);
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(email, secret) {
  const payload = `${email}:${Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(payload));
  return `${base64url(new TextEncoder().encode(payload))}.${base64url(new Uint8Array(signature))}`;
}

async function verify(token, secret) {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  let payload;
  try {
    payload = new TextDecoder().decode(fromBase64url(payloadPart));
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    fromBase64url(signaturePart),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;

  const separator = payload.lastIndexOf(":");
  const email = payload.slice(0, separator);
  const expiry = Number(payload.slice(separator + 1));
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return null;

  return email;
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}
