/**
 * Mailing-list endpoint for the Refurbished Dinosaurs site, backed by Resend.
 *
 * Resend has no hosted signup form, so the site's own form posts here. Resend
 * also has no built-in double opt-in, so this implements the flow Resend
 * documents: the contact is created unsubscribed, which keeps it out of every
 * Broadcast, and confirming flips it to subscribed. The confirmation link
 * carries the address and an expiry signed with HMAC-SHA256, so no state is
 * stored between the two requests.
 *
 *   POST /            {"email": "..."}  -> creates a pending contact, mails the link
 *   GET  /confirm?token=...             -> flips the contact to subscribed
 *
 * Unsubscribes are handled by Resend: Broadcasts carry the unsubscribe link
 * and drop contacts who use it, so nothing here has to.
 *
 * Bindings (wrangler.toml + `wrangler secret put`):
 *   RESEND_API_KEY      secret, needs send access and full access to contacts
 *   CONFIRM_SECRET      secret, any long random string
 *   RESEND_SEGMENT_ID   optional, segment the contact joins
 *   FROM_EMAIL          address on a domain verified in Resend
 *   FROM_NAME           sender name
 *   SITE_URL            site root, used for the redirect targets
 *   ALLOWED_ORIGIN      origin allowed to POST here
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 3;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_API = "https://api.resend.com";

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

  const created = await resend(env, "POST", "/contacts", {
    email,
    unsubscribed: true,
    ...(env.RESEND_SEGMENT_ID ? { segments: [env.RESEND_SEGMENT_ID] } : {}),
  });

  // A repeat signup from an address that never confirmed is expected, and
  // should still get a fresh link rather than an error.
  if (!created.ok && created.status !== 409) {
    console.error("resend create contact failed", created.status, await created.text());
    return json({ error: "could not subscribe" }, 502, env);
  }

  const token = await sign(email, env.CONFIRM_SECRET);
  const confirmURL = `${new URL(request.url).origin}/confirm?token=${encodeURIComponent(token)}`;

  const sent = await resend(env, "POST", "/emails", {
    from: `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
    to: [email],
    subject: "Confirm your Refurbished Dinosaurs subscription",
    text: [
      "Confirm you want release announcements from Refurbished Dinosaurs:",
      "",
      confirmURL,
      "",
      "The link stops working in three days. If you did not ask for this, ignore it;",
      "you will not hear from us again.",
    ].join("\n"),
  });

  if (!sent.ok) {
    console.error("resend send failed", sent.status, await sent.text());
    return json({ error: "could not send confirmation" }, 502, env);
  }

  return json({ ok: true }, 202, env);
}

async function handleConfirm(url, env) {
  const email = await verify(url.searchParams.get("token") || "", env.CONFIRM_SECRET);
  if (!email) {
    return Response.redirect(`${env.SITE_URL}/subscribed/?status=expired`, 302);
  }

  const updated = await resend(env, "PATCH", `/contacts/${encodeURIComponent(email)}`, {
    unsubscribed: false,
  });

  if (!updated.ok) {
    console.error("resend confirm failed", updated.status, await updated.text());
    return Response.redirect(`${env.SITE_URL}/subscribed/?status=failed`, 302);
  }

  return Response.redirect(`${env.SITE_URL}/subscribed/?status=ok`, 302);
}

function resend(env, method, path, body) {
  return fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
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
