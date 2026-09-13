---
title: "Subscription"
meta_title: "Mailing list"
description: "Confirmation page for the Refurbished Dinosaurs mailing list."
hide_subscribe: true
draft: false
---

<div data-subscribe-result>Checking...</div>

<script>
  (function () {
    var messages = {
      ok: "Confirmed. You are on the list, and you will hear from us a few times a year.",
      expired: "That confirmation link has expired. Subscribe again and we will send a fresh one.",
      failed: "Something broke on our side and you were not added. Try again, or email us.",
    };
    var status = new URLSearchParams(window.location.search).get("status");
    document.querySelector("[data-subscribe-result]").textContent =
      messages[status] || "Nothing to confirm here.";
  })();
</script>

Every message carries an unsubscribe link. What happens to your address is spelled out in the [privacy policy](/privacy-policy/).
