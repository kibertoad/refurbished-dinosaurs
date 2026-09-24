/**
 * The voting wishlist.
 *
 * Search a game database for a PC game released before the cutoff, put it on
 * the board, vote for what is already there. Every call goes through a
 * contract from `@refurbished-dinosaurs/wishlist-contracts`, the same
 * definitions the worker mounts its routes from, so the request shapes and the
 * response types here are the ones the endpoint actually implements, checked
 * at build time and validated again at runtime.
 *
 * The markup for a board entry and a search suggestion lives in <template>
 * elements in layouts/_partials/wishlist.html rather than in strings here, so
 * the classes stay where Tailwind looks for them and the markup stays where
 * the rest of the site's markup is.
 */

import {
  MIN_SEARCH_LENGTH,
  RELEASE_CUTOFF_YEAR,
  castVoteContract,
  getWishlistContract,
  retractVoteContract,
  searchGamesContract,
} from "@refurbished-dinosaurs/wishlist-contracts";
import type { Game, WishlistEntry } from "@refurbished-dinosaurs/wishlist-contracts";
import { sendByApiContract } from "@toad-contracts/frontend-http-client";
import wretch from "wretch";

const SEARCH_DEBOUNCE_MS = 250;

const root = document.querySelector<HTMLElement>("[data-wishlist]");
if (root) start(root);

function start(root: HTMLElement): void {
  const client = wretch(root.dataset.endpoint?.replace(/\/$/, "") ?? "");
  const elements = {
    search: required<HTMLInputElement>(root, "[data-wishlist-input]"),
    suggestions: required<HTMLElement>(root, "[data-wishlist-suggestions]"),
    searchStatus: required<HTMLElement>(root, "[data-wishlist-search-status]"),
    board: required<HTMLElement>(root, "[data-wishlist-board]"),
    boardStatus: required<HTMLElement>(root, "[data-wishlist-status]"),
    entryTemplate: required<HTMLTemplateElement>(root, "[data-template='entry']"),
    suggestionTemplate: required<HTMLTemplateElement>(root, "[data-template='suggestion']"),
  };

  /* ---------------------------------------------------------------- board */

  /** The board as it was last rendered, so a vote can be undone in place. */
  let entries: WishlistEntry[] = [];

  /**
   * Redraws the whole board: a vote can reorder it, so patching one row is not
   * enough. `focusId` puts the keyboard back on the button that was just used,
   * which the redraw would otherwise throw away.
   */
  function renderBoard(focusId?: string): void {
    elements.board.textContent = "";

    if (!entries.length) {
      say(elements.boardStatus, "Nothing on the board yet. Put the first game on it.");
      return;
    }

    say(elements.boardStatus, "");
    entries.forEach((entry, index) => elements.board.appendChild(buildEntry(entry, index + 1)));

    if (focusId) {
      root
        .querySelector<HTMLButtonElement>(`[data-entry="${CSS.escape(focusId)}"] [data-vote]`)
        ?.focus();
    }
  }

  function buildEntry(entry: WishlistEntry, rank: number): HTMLElement {
    const node = clone(elements.entryTemplate);
    const link = required<HTMLAnchorElement>(node, "[data-title]");
    const button = required<HTMLButtonElement>(node, "[data-vote]");

    node.dataset.entry = entry.id;
    required(node, "[data-rank]").textContent = `#${rank}`;
    fillCover(required<HTMLImageElement>(node, "[data-cover]"), entry);

    link.textContent = entry.title;
    if (entry.url) {
      link.href = entry.url;
    } else {
      link.replaceWith(entry.title);
    }

    required(node, "[data-meta]").textContent = describe(entry);
    required(node, "[data-summary]").textContent = entry.summary ?? "";

    paintVoteButton(button, entry);
    button.addEventListener("click", () => void toggleVote(entry, button));

    return node;
  }

  function paintVoteButton(button: HTMLButtonElement, entry: WishlistEntry): void {
    required(button, "[data-vote-label]").textContent = entry.voted ? "Voted" : "Vote";
    required(button, "[data-votes]").textContent = countVotes(entry.votes);

    button.setAttribute("aria-pressed", String(entry.voted));
    button.setAttribute(
      "aria-label",
      `${entry.voted ? "Take back your vote for" : "Vote for"} ${entry.title}, ${countVotes(entry.votes)}`,
    );
    button.classList.toggle("btn-primary", entry.voted);
    button.classList.toggle("btn-outline-primary", !entry.voted);
  }

  async function toggleVote(entry: WishlistEntry, button: HTMLButtonElement): Promise<void> {
    button.disabled = true;

    const { result, error } = entry.voted
      ? await sendByApiContract(client, retractVoteContract, { pathParams: { id: entry.id } })
      : await sendByApiContract(client, castVoteContract, { body: { id: entry.id } });

    if (!result) {
      say(elements.boardStatus, messageFrom(error));
      button.disabled = false;
      return;
    }

    entries = result.body.entries;
    renderBoard(entry.id);
  }

  async function loadBoard(): Promise<void> {
    say(elements.boardStatus, "Loading the board…");

    const { result, error } = await sendByApiContract(client, getWishlistContract, {});
    if (!result) {
      say(elements.boardStatus, `The board could not be loaded: ${messageFrom(error)}`);
      return;
    }

    entries = result.body.entries;
    renderBoard();
  }

  /* ------------------------------------------------------------ suggestions */

  /** Results per term, so backspacing through a word costs no requests. */
  const cache = new Map<string, Game[]>();
  let suggestions: Game[] = [];
  let highlighted = -1;
  let pending: AbortController | null = null;
  let debounce = 0;

  function closeSuggestions(): void {
    suggestions = [];
    highlighted = -1;
    elements.suggestions.textContent = "";
    elements.suggestions.classList.add("hidden");
    elements.search.setAttribute("aria-expanded", "false");
    elements.search.removeAttribute("aria-activedescendant");
  }

  function renderSuggestions(results: Game[]): void {
    suggestions = results;
    highlighted = -1;
    elements.suggestions.textContent = "";

    results.forEach((game, index) => {
      const node = clone(elements.suggestionTemplate);
      node.id = `wishlist-suggestion-${index}`;
      required(node, "[data-title]").textContent = game.title;
      required(node, "[data-meta]").textContent = describe(game);
      fillCover(required<HTMLImageElement>(node, "[data-cover]"), game);

      // mousedown, not click: the input's blur would close the list first.
      node.addEventListener("mousedown", (event) => {
        event.preventDefault();
        void nominate(game);
      });
      elements.suggestions.appendChild(node);
    });

    elements.suggestions.classList.toggle("hidden", !results.length);
    elements.search.setAttribute("aria-expanded", String(Boolean(results.length)));
  }

  function highlight(step: number): void {
    if (!suggestions.length) return;

    const options = elements.suggestions.children;
    options[highlighted]?.removeAttribute("aria-selected");

    // With nothing highlighted yet, down starts at the first suggestion and up
    // wraps to the last one.
    const from = highlighted >= 0 ? highlighted : step > 0 ? -1 : 0;
    highlighted = (from + step + suggestions.length) % suggestions.length;

    const option = options[highlighted];
    if (!option) return;

    option.setAttribute("aria-selected", "true");
    option.scrollIntoView({ block: "nearest" });
    elements.search.setAttribute("aria-activedescendant", option.id);
  }

  async function runSearch(term: string): Promise<void> {
    const cached = cache.get(term);
    if (cached) {
      renderSuggestions(cached);
      say(elements.searchStatus, cached.length ? "" : noMatch(term));
      return;
    }

    // Only the newest keystroke matters; the rest are cancelled on the way out.
    pending?.abort();
    pending = new AbortController();

    say(elements.searchStatus, "Searching…");
    const { result, error } = await sendByApiContract(client, searchGamesContract, {
      queryParams: { q: term },
      signal: pending.signal,
    });

    if (!result) {
      if (!isAbort(error)) say(elements.searchStatus, messageFrom(error));
      return;
    }

    cache.set(term, result.body.results);
    renderSuggestions(result.body.results);
    say(elements.searchStatus, result.body.results.length ? "" : noMatch(term));
  }

  function noMatch(term: string): string {
    return `Nothing matching "${term}" in the database, at least not as a PC game from before ${RELEASE_CUTOFF_YEAR}.`;
  }

  async function nominate(game: Game): Promise<void> {
    closeSuggestions();
    elements.search.value = "";
    say(elements.searchStatus, `Adding ${game.title}…`);

    const { result, error } = await sendByApiContract(client, castVoteContract, {
      body: { id: game.id },
    });

    if (!result) {
      say(elements.searchStatus, messageFrom(error));
      return;
    }

    entries = result.body.entries;
    renderBoard();
    // 201 means the vote was new, 200 that this browser had already cast it.
    say(
      elements.searchStatus,
      result.statusCode === 201
        ? `${game.title} has your vote.`
        : `You had already voted for ${game.title}.`,
    );
  }

  /* ------------------------------------------------------------------ wire */

  elements.search.addEventListener("input", () => {
    const term = elements.search.value.trim();
    window.clearTimeout(debounce);

    if (term.length < MIN_SEARCH_LENGTH) {
      closeSuggestions();
      say(elements.searchStatus, "");
      return;
    }

    debounce = window.setTimeout(() => void runSearch(term), SEARCH_DEBOUNCE_MS);
  });

  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      highlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      const game = suggestions[highlighted];
      if (game) void nominate(game);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  elements.search.addEventListener("blur", () => window.setTimeout(closeSuggestions, 100));

  void loadBoard();
}

/* -------------------------------------------------------------- helpers */

function required<T extends Element = HTMLElement>(within: Element, selector: string): T {
  const element = within.querySelector<T>(selector);
  if (!element) throw new Error(`the wishlist markup is missing ${selector}`);
  return element;
}

function clone(template: HTMLTemplateElement): HTMLElement {
  const node = template.content.firstElementChild?.cloneNode(true);
  if (!(node instanceof HTMLElement)) throw new Error("empty wishlist template");
  return node;
}

function say(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function describe(game: Game): string {
  return [game.year, game.developer].filter(Boolean).join(" · ");
}

function countVotes(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

function fillCover(image: HTMLImageElement, game: Game): void {
  if (!game.coverUrl) {
    image.remove();
    return;
  }

  image.src = game.coverUrl;
  image.alt = `${game.title} cover art`;
}

/**
 * A failed call carries either a response the contract declares — the worker's
 * own message — or a transport-level failure with nothing worth showing.
 */
function messageFrom(error: unknown): string {
  const body = (error as { body?: unknown } | undefined)?.body;
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }

  return "that did not go through. Try again in a minute.";
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
