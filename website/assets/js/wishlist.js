/**
 * The voting wishlist.
 *
 * Search a game database for a PC game released before 2010, put it on the
 * board, vote for what is already there. Everything talks to the endpoint in
 * workers/wishlist, which holds the database credentials and counts the votes;
 * this file is the page around it.
 *
 * The markup for a board entry and a search suggestion lives in <template>
 * elements in layouts/_partials/wishlist.html rather than in strings here, so
 * the classes stay where Tailwind looks for them and the markup stays where
 * the rest of the site's markup is.
 */
(function () {
  const root = document.querySelector("[data-wishlist]");
  if (!root) return;

  const SEARCH_DEBOUNCE_MS = 250;
  const MIN_QUERY_LENGTH = 2;

  const endpoint = root.dataset.endpoint.replace(/\/$/, "");
  const elements = {
    search: root.querySelector("[data-wishlist-input]"),
    suggestions: root.querySelector("[data-wishlist-suggestions]"),
    searchStatus: root.querySelector("[data-wishlist-search-status]"),
    board: root.querySelector("[data-wishlist-board]"),
    boardStatus: root.querySelector("[data-wishlist-status]"),
    entryTemplate: root.querySelector("[data-template='entry']"),
    suggestionTemplate: root.querySelector("[data-template='suggestion']"),
  };

  /* ------------------------------------------------------------------ api */

  async function call(path, options) {
    const response = await fetch(`${endpoint}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || "that did not go through");
    }
    return body;
  }

  const api = {
    search: (term, signal) => call(`/search?q=${encodeURIComponent(term)}`, { signal }),
    board: () => call("/wishlist"),
    vote: (id) => call("/votes", { method: "POST", body: JSON.stringify({ id }) }),
    retract: (id) => call("/votes", { method: "DELETE", body: JSON.stringify({ id }) }),
  };

  /* -------------------------------------------------------------- helpers */

  function say(element, message) {
    element.textContent = message || "";
    element.classList.toggle("hidden", !message);
  }

  function describe(entry) {
    return [entry.year, entry.developer].filter(Boolean).join(" · ");
  }

  function countVotes(votes) {
    return `${votes} ${votes === 1 ? "vote" : "votes"}`;
  }

  function fillCover(image, entry) {
    if (!entry.coverUrl) {
      image.remove();
      return;
    }
    image.src = entry.coverUrl;
    image.alt = `${entry.title} cover art`;
  }

  /* ---------------------------------------------------------------- board */

  /** The board as it was last rendered, so a vote can be undone in place. */
  let entries = [];

  /**
   * Redraws the whole board: a vote can reorder it, so patching one row is not
   * enough. `focusId` puts the keyboard back on the button that was just used,
   * which the redraw would otherwise throw away.
   *
   * @param {string} [focusId]
   */
  function renderBoard(focusId) {
    elements.board.textContent = "";

    if (!entries.length) {
      say(elements.boardStatus, "Nothing on the board yet. Put the first game on it.");
      return;
    }

    say(elements.boardStatus, "");
    entries.forEach((entry, index) => {
      elements.board.appendChild(buildEntry(entry, index + 1));
    });

    if (focusId) {
      const button = elements.board.querySelector(`[data-entry="${CSS.escape(focusId)}"] [data-vote]`);
      if (button) button.focus();
    }
  }

  function buildEntry(entry, rank) {
    const node = elements.entryTemplate.content.firstElementChild.cloneNode(true);
    const link = node.querySelector("[data-title]");
    const button = node.querySelector("[data-vote]");

    node.dataset.entry = entry.id;
    node.querySelector("[data-rank]").textContent = `#${rank}`;
    fillCover(node.querySelector("[data-cover]"), entry);

    link.textContent = entry.title;
    if (entry.url) {
      link.href = entry.url;
    } else {
      link.replaceWith(entry.title);
    }

    node.querySelector("[data-meta]").textContent = describe(entry);
    node.querySelector("[data-summary]").textContent = entry.summary || "";

    paintVoteButton(button, entry);
    button.addEventListener("click", () => toggleVote(entry, button));

    return node;
  }

  function paintVoteButton(button, entry) {
    button.querySelector("[data-vote-label]").textContent = entry.voted ? "Voted" : "Vote";
    button.querySelector("[data-votes]").textContent = countVotes(entry.votes);
    button.setAttribute("aria-pressed", String(entry.voted));
    button.setAttribute(
      "aria-label",
      `${entry.voted ? "Take back your vote for" : "Vote for"} ${entry.title}, ${countVotes(entry.votes)}`,
    );
    button.classList.toggle("btn-primary", entry.voted);
    button.classList.toggle("btn-outline-primary", !entry.voted);
  }

  async function toggleVote(entry, button) {
    button.disabled = true;
    try {
      const result = entry.voted ? await api.retract(entry.id) : await api.vote(entry.id);
      entries = result.entries;
      renderBoard(entry.id);
    } catch (error) {
      say(elements.boardStatus, error.message);
      button.disabled = false;
    }
  }

  async function loadBoard() {
    say(elements.boardStatus, "Loading the board…");
    try {
      entries = (await api.board()).entries;
      renderBoard();
    } catch (error) {
      say(elements.boardStatus, `The board could not be loaded: ${error.message}`);
    }
  }

  /* ------------------------------------------------------------- suggest */

  /** Results per term, so backspacing through a word costs no requests. */
  const cache = new Map();
  let suggestions = [];
  let highlighted = -1;
  let pending = null;
  let debounce = 0;

  function closeSuggestions() {
    suggestions = [];
    highlighted = -1;
    elements.suggestions.textContent = "";
    elements.suggestions.classList.add("hidden");
    elements.search.setAttribute("aria-expanded", "false");
    elements.search.removeAttribute("aria-activedescendant");
  }

  function renderSuggestions(results) {
    suggestions = results;
    highlighted = -1;
    elements.suggestions.textContent = "";

    results.forEach((entry, index) => {
      const node = elements.suggestionTemplate.content.firstElementChild.cloneNode(true);
      node.id = `wishlist-suggestion-${index}`;
      node.querySelector("[data-title]").textContent = entry.title;
      node.querySelector("[data-meta]").textContent = describe(entry);
      fillCover(node.querySelector("[data-cover]"), entry);

      // mousedown, not click: the input's blur would close the list first.
      node.addEventListener("mousedown", (event) => {
        event.preventDefault();
        nominate(entry);
      });
      elements.suggestions.appendChild(node);
    });

    elements.suggestions.classList.toggle("hidden", !results.length);
    elements.search.setAttribute("aria-expanded", String(Boolean(results.length)));
  }

  function highlight(step) {
    if (!suggestions.length) return;

    const options = elements.suggestions.children;
    if (highlighted >= 0) options[highlighted].removeAttribute("aria-selected");

    // With nothing highlighted yet, down starts at the first suggestion and up
    // wraps to the last one.
    const from = highlighted >= 0 ? highlighted : step > 0 ? -1 : 0;
    highlighted = (from + step + suggestions.length) % suggestions.length;
    const option = options[highlighted];
    option.setAttribute("aria-selected", "true");
    option.scrollIntoView({ block: "nearest" });
    elements.search.setAttribute("aria-activedescendant", option.id);
  }

  async function runSearch(term) {
    if (cache.has(term)) {
      renderSuggestions(cache.get(term));
      say(elements.searchStatus, cache.get(term).length ? "" : noMatch(term));
      return;
    }

    // Only the newest keystroke matters; the rest are cancelled on the way out.
    if (pending) pending.abort();
    pending = new AbortController();

    say(elements.searchStatus, "Searching…");
    try {
      const { results } = await api.search(term, pending.signal);
      cache.set(term, results);
      renderSuggestions(results);
      say(elements.searchStatus, results.length ? "" : noMatch(term));
    } catch (error) {
      if (error.name === "AbortError") return;
      say(elements.searchStatus, error.message);
    }
  }

  function noMatch(term) {
    return `Nothing matching "${term}" in the database, at least not as a PC game from before 2010.`;
  }

  async function nominate(entry) {
    closeSuggestions();
    elements.search.value = "";
    say(elements.searchStatus, `Adding ${entry.title}…`);

    try {
      const result = await api.vote(entry.id);
      entries = result.entries;
      renderBoard();
      say(
        elements.searchStatus,
        result.added
          ? `${entry.title} has your vote.`
          : `You had already voted for ${entry.title}.`,
      );
    } catch (error) {
      say(elements.searchStatus, error.message);
    }
  }

  /* ---------------------------------------------------------------- wire */

  elements.search.addEventListener("input", () => {
    const term = elements.search.value.trim();
    window.clearTimeout(debounce);

    if (term.length < MIN_QUERY_LENGTH) {
      closeSuggestions();
      say(elements.searchStatus, "");
      return;
    }

    debounce = window.setTimeout(() => runSearch(term), SEARCH_DEBOUNCE_MS);
  });

  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      highlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      nominate(suggestions[highlighted]);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  elements.search.addEventListener("blur", () => window.setTimeout(closeSuggestions, 100));

  loadBoard();
})();
