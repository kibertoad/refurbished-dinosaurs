---
title: "Work protocol"
meta_title: "Work protocol: how restoration work is planned, tracked and carried out"
description: "How a restoration moves from an owned copy of a game to a documented, validated rebuild: the stages, the files that track open work, the size of a unit of work, and how people and coding agents hand it on."
draft: false
---

The [methodology](/methodology/) says what counts as evidence and what the rebuild may change. The [documentation standard](/documentation-standard/) says how each finding is written down. This page says how the work itself is organised: what to do first, how open questions are tracked, how big a piece of work is, and what the next person or agent needs to pick it up. It applies to people and coding agents alike, and to every restoration started from the [project template](https://github.com/kibertoad/refurbished-dinosaurs-template).

## Where it comes from

Six restorations were planned and tracked in six different ways before this page existed, and the same problems came up in most of them.

Plans turned into logs. Implementation plans grew dated checkpoint sections and paragraph-long "next action" items until they passed a thousand lines, and handover notes were appended to after every batch until one reached two thousand. A research log in one project passed 36,000 lines. Nobody could read the current state out of any of them, so each session rebuilt it from the git history instead.

Code ran ahead of evidence. Large parts of several games were implemented and tested before any run of the original confirmed them. In one project, work had started on all nine milestones and none of their gates had passed, because the first gate needed a recorded run of the original and the tool to make one was not available.

Every project invented its own confidence scale (Confirmed and Provisional in one, low to verified in another, documented to validated in a third), and each project that has moved to the standard so far had to translate every claim into its statuses and IDs.

Some things worked and are kept here. Chaos Overlords split its open questions into those a static reading can settle and those that need someone to run the game, and it closed an item by recording the finding and deleting the item. It also measured how much of the executable the documentation covers, which gave it a number nobody could argue with. Wages Due kept live hypotheses with the test that would settle each, and told long-running agents to stop repeating a dead end without new evidence.

From outside the project, the structure borrows from the way [Anthropic describes long-running coding agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): a list of work whose state is ground truth, one item at a time, and a short progress note and a commit at the end of every session. [Chocolate Doom](https://www.chocolate-doom.org/wiki/index.php/Statcheck) shows the value of a regression corpus recorded from the original, and [decomp.dev](https://decomp.dev/projects) shows progress published as a number a script computes. The split between research and implementation below is the classic clean-room arrangement, in which the people who study the original write a specification and other people implement it from that alone.

## Working files

Four kinds of file track the work. They sit in the game repository next to the spec and describe the work, never the original, so the spec's rule against naming the rebuild does not apply to them. Each one says what is true now. What was true before is in git, and none of them repeats it.

| File | Holds | Never holds |
|---|---|---|
| `docs/IMPLEMENTATION-PLAN.md` | The game profile, scope and non-goals, the stage the project is in, the slices with their exit criteria, the risks, and the questions only the owner can answer. | Dated checkpoints, status narration, research questions, lists of what was done. |
| `queue/AREA.md` | One file per spec area: the open research questions of that area, grouped by the kind of evidence each one needs. | Anything already answered. An item is deleted when it is settled. |
| `docs/HANDOVER.md` | Where the work stands: the branch and whether it is pushed, the last gate result, the goals running, work left unfinished, blockers, and what to pick up next. At most 200 lines, rewritten at the end of every session. | History. The previous session's notes are replaced, not kept below the new ones. |
| `docs/goals/NAME.md` | One file per long-running goal while it runs: its condition, its scope, what it must not touch, and the dead ends found so far. Deleted when the goal is met or dropped. | Progress reports. The queue and the commits show progress. |

Decisions the owner makes go in `docs/DECISIONS.md`, dated and newest first. A decision that departs from the original is a deviation as well, in `deviations/`.

Every file here is at most 1,000 lines, the same limit the standard sets for its own files. A queue file that would pass it has too many open questions in one area, and the area's items are split into `queue/AREA/KIND.md` by the kind of evidence they need.

Tool paths, installed versions and the pitfalls of the local setup go in `docs/GHIDRA.md` and `docs/DEVELOPMENT.md`, so that nobody searches for them twice.

## Stages

A project passes through five stages in order. The plan records the stage it is in, and a stage ends when its exit criteria hold, which a script or a reviewer can check without asking anyone. Work from a later stage may start early, but it does not count towards that stage's exit until the earlier stages have ended.

### Intake

Establish which game, which editions the owner has, and whether the game qualifies. Find the latest official version and patch the analysis copy to it. The template's `AGENTS.md` and bootstrap checklist give the steps.

Exit: eligibility and the latest version are recorded, the analysis build has a build entry and a manifest, and each manual, FAQ or earlier tool the work will rely on has a source entry.

### Survey

Map the whole game shallowly before studying any part of it deeply. List every file the build ships and give each file format an entry, `unknown` where nothing is known yet. Take an inventory of the executable's functions. Write down the screens the manual or a playthrough shows, and the rules the manual states, as `sourced` entries. Fix the area list, since areas can never be renamed. Seed the queue with the questions this turns up.

Exit: every file in the build manifest is named by a format entry, every screen the manual mentions has a screen entry, a coverage report of the executable exists (see [Measuring progress](#measuring-progress)), and every area has a queue file.

A survey keeps later work from being planned around the one subsystem somebody happened to open first, and it makes the size of the game visible before anyone estimates it.

### Harness

Build what every later experiment and test depends on. That is four things: the random number generator specified as a rule, the save format understood well enough to patch the fields experiments need, a way to observe the original running that takes text commands and prints text back (the methodology's requirement), and a headless run of the rebuild that replays an experiment fixture.

Exit: one experiment has been run on the original from a save patch, recorded with its fixture, and replayed by a test of the rebuild that compares the result. If the tool for observing the original cannot be run by an agent, the exit also needs one maintainer session carried out under [Maintainer sessions](#maintainer-sessions).

This is the stage the earlier projects skipped. Without it, everything after rests on static readings alone, and entries can rise no higher than `supported`.

### Slices

Build the game in vertical slices, each of which leaves it playable. The plan lists the slices in order, and each slice names the spec areas or entries it needs and the parity rows it has to bring to `implemented` or `validated`. Within a slice, research and implementation alternate in small batches, described below.

Exit, per slice: every parity row the slice names has reached the status the plan asked for, and every queue item that blocked the slice is closed or accepted as a known gap in the plan's risks.

### Audit

Close the gaps the slices left. Every function in the executable's inventory is cited by an entry or recorded as out of scope with its reason, every parity row is `validated` or has a note saying why it cannot be, and the queue holds only items the owner has accepted as out of reach.

## The queue

The queue holds the research questions still open. Every item names the spec entries it concerns, so behaviour with no entry gets an `unknown` entry before it gets a queue item, the same way it gets one before any code. The entry's own Open questions section describes what is unknown about it. The queue item says what to do next about it, and an item that duplicates the whole Open questions section is not needed.

A queue file opens with the area as a `#` heading and has one `##` section for each kind of evidence, in this order:

1. Static: a reading of the executable or data files settles it.
2. Agent run: a run of the original that an agent can make with the tools the repository has.
3. Maintainer run: a run that needs a person, a licensed copy on a particular machine, or anything else an agent cannot reach.
4. Source: a document that has to be found, bought or read.
5. Blocked: work stopped until something else changes.

An item is a single list entry:

```markdown
- RULE-COMBAT-012, FMT-STATE-001: Which of two gangs attacking each other rolls
  first? Settles it: the order of the two calls at the resolver's entry, and one
  experiment from a save where both attack. Blocks: slice 4.
```

It gives the entries, the question as a question, what would settle it, and the slice it blocks or `none`. An item that has already been worked on adds `Tried:` with what was examined and what it showed, so that nobody repeats it. An item under Blocked adds `Waiting on:` with what has to change first.

An item is closed by recording its answer in the spec (a finding or an experiment, and the status of the entries it concerns) and deleting the item in the same commit. An item that turns out to be two questions becomes two items. A new question found along the way becomes a new item at once, even if nobody will look at it for months.

Nobody works an item twice without new evidence. After two attempts that end in the same place, the item moves to Blocked with what was tried and what would change the outcome, such as a tool, a capture or a second edition.

### Order of work

Items are picked in this order:

1. Items that block the current slice.
2. Items that others depend on: the random number generator, the main loop and the order of its phases, the save format and the structures the game keeps. Most other experiments need these.
3. Items where one piece of evidence raises the most entries. A single run of the original beside a static finding that already exists moves an entry to `established`, and that is often the cheapest progress available.
4. Items with the cheapest evidence: a data file before a static reading, a static reading before an agent run, an agent run before a maintainer run.

## Batches

A batch is one unit of work and ends in one commit, or one pull request where the repository uses them. It is small enough to review in one sitting, and it leaves the documentation check and the fast validation gate passing. A batch is either research or implementation, never both.

### Research batches

A research batch settles one queue item, or a few items about the same entry. It states the question, forms the competing readings, looks for the evidence that could rule each one out, and records the result as findings or experiments under the standard. The entries the evidence concerns take the status it supports, the item is deleted or updated with what was tried, and new questions become new items. Code is not changed, apart from tools in `tools/` the research needed.

### Implementation batches

An implementation batch brings parity rows of the current slice up to `implemented` or `validated`. It works from the spec only. It does not open Ghidra, a decompiler listing, a debugger log or research notes, and it learns what the original does by reading spec entries. Where the spec does not say enough to write the code, the batch stops at that point, adds the gap to the entry's Open questions and a queue item, and either leaves the row `partial` or writes the code with a `PLACEHOLDER:` comment citing the entry.

This keeps the clean-room separation that the methodology asks for, and it is also a test of the spec. The standard's aim is that someone could build a second engine from the documentation alone, and every implementation batch tries exactly that on a small scale. With coding agents the separation costs little: an implementation batch runs in a fresh session, or a subagent, that is given the entry IDs and nothing from the research that produced them.

Implementation that is not part of a parity row, such as the installer, online play, an optional improved AI or an accessibility setting, is ordinary engineering. It still goes in its own batches, and a decision in `docs/DECISIONS.md` says why the project takes it on. It never counts towards a slice's exit.

### Commits

A commit message says what changed and what evidence it rests on, in plain words. It ends with trailers naming the entries the batch created or changed, so that the git history can be searched by ID:

```text
Settle which gang rolls first in a mutual attack

The resolver calls the attacker's roll before the defender's, and a run of
200 attacks from a patched save agrees.

Spec: RULE-COMBAT-012, FND-COMBAT-031, EXP-COMBAT-009
```

An implementation batch uses the same trailer for the entries it implemented, and adds `Parity:` with the rows whose status it changed.

## Sessions

A session is one sitting of work, by a person or an agent, and may hold several batches.

At the start: read `docs/HANDOVER.md` and any goal file it names, check the branch and the working tree against what the handover says, run the documentation check, and pick the next item from the goal, the current slice or the queue in the order above.

At the end: commit or discard everything in the working tree, so that nothing is left half done without a note saying so. Rewrite the handover to describe the state now. Stop every process the session started (Ghidra, the original game, test hosts), and leave processes that belong to anyone else alone. Whether the session pushes is set by the repository's `AGENTS.md`, and the handover records which commits are not pushed yet.

## Maintainer sessions

Some evidence needs a person: a run of the original on the one machine that has it, a capture a tool cannot take, a judgement about what the screen shows. The maintainer's time is the scarcest resource a restoration has, so it is prepared for.

Before a session, the Maintainer run items are collected into a script. Each step gives the entries it concerns, how to reach the starting state (a save patch, or the choices on the way into a new game), the one input to vary, what to record and in which form, and where captures go (`GAME_DIR/captures/`, named by hash). The script is ordered so that steps from the same starting state follow each other. Nobody should need to ask a question during the session.

After the session, the recordings are turned into findings and experiments with fixtures, as the standard describes, and the items they settle are deleted from the queue.

## Measuring progress

Progress is measured by numbers a script computes from the repository, never by numbers someone writes down:

- the parity totals in `PARITY.md`, by Status and by Code;
- the spec's entries by status, from the status index;
- the share of the executable's functions, and of its bytes, that some entry cites, measured against a function inventory from the build's analysis database;
- the share of the build's files whose format entry is `supported` or higher;
- the number of queue items of each kind of evidence.

A test count is not progress, and neither are lines of code or the number of assets the importer extracts. A percentage of completion is taken from the parity matrix or not given at all.

## What needs the owner

The owner decides eligibility and the supported editions, the scope and the non-goals, any deviation whose default is `on` or `mandatory`, any work outside the parity matrix such as online play, when a release goes out, and when maintainer sessions happen. Anything else goes ahead without approval, and the owner reviews the result. A question only the owner can answer goes in the plan's owner questions, and the work that depends on it waits under Blocked in the queue.

## Coding agents and long-running goals

The protocol does not change for an agent, but three things help an agent follow it.

A long-running goal, such as Claude Code's [`/goal`](https://code.claude.com/docs/en/goal), keeps an agent working until a condition holds. In Claude Code a second model judges that condition after every turn from what the conversation shows, without running anything itself. A good condition therefore names a state the agent can demonstrate by running something, has a scope, and has a limit:

```text
Every item under Static in queue/COMBAT.md is closed or moved to Blocked with
what was tried, the documentation check passes on the last commit, and each
batch ended with a status block; or stop after 40 turns.
```

```text
Every parity row that slice 3 of docs/IMPLEMENTATION-PLAN.md names has Code
complete, the fast validation gate and the documentation check pass on the last
commit, and no file under spec/ changed; or stop after 60 turns.
```

A goal as broad as "finish the combat system" gives the judge nothing to check and the agent no reason to stop. The goal's file in `docs/goals/` holds the same condition with its scope and the areas it must not touch, so a second session can see that the areas are taken.

Every batch ends by printing a status block, which is the evidence the judge reads and a summary the next person can use:

```text
Status
Goal: docs/goals/combat-static.md
Batch: research, RULE-COMBAT-012 supported -> established
Queue COMBAT: static 3, agent run 1, maintainer run 4, source 0, blocked 2
Checks: documentation check passed, fast gate passed
Commit: 3f2a9c1 (not pushed)
Next: RULE-COMBAT-014, the retaliation roll
```

The template ships the protocol as [agent skills](https://github.com/kibertoad/refurbished-dinosaurs-template/tree/main/.claude/skills), one per recurring procedure: planning and seeding the queue, starting a session, a research batch, an implementation batch, preparing and ingesting a maintainer session, and ending a session. A skill holds the steps and points to this page and the standard for the rules, so the rules live in one place. Where a skill and this page disagree, this page wins, and the skill is fixed.

Several agents can work on one game at once when each takes different areas. A goal file claims its areas, and the batches of one goal touch only those areas' entries, queue files and parity rows. Each agent works in its own worktree or branch. Two branches that create the same spec ID are handled the way the standard's [Identifiers](/documentation-standard/#identifiers) section says.

## Versions

This is version 1 of the protocol. A change that would make a repository that follows this version stop following it gets a new version number, listed here with what to change.

| Version | Changes | Converting a repository |
|---|---|---|
| 1 | The first version. | Move open research questions from the plan and handover into `queue/`, cut the handover down to the current state, and move dated checkpoints out of the plan (git keeps them). |
