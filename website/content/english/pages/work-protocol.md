---
title: "Work protocol"
meta_title: "Work protocol: how restoration work is planned, tracked and carried out"
description: "How a restoration moves from an owned copy of a game to a documented, validated rebuild: the stages, the files that track open work, the size of a unit of work, and how people and coding agents hand it on."
draft: false
---

The [methodology](/methodology/) says what counts as evidence and what the rebuild may change. The [documentation standard](/documentation-standard/) says how each finding is written down. Neither says what to do first, where open questions are tracked, how big a piece of work is, or what the next person or agent needs to pick it up. The rules here apply to people and coding agents alike, and to every restoration started from the [project template](https://github.com/kibertoad/refurbished-dinosaurs-template).

## Where it comes from

Six restorations were planned and tracked in six different ways before this page existed, and the same problems came up in most of them.

Plans turned into logs. Implementation plans grew dated checkpoint sections and paragraph-long "next action" items until they passed a thousand lines, and handover notes were appended to after every batch until one reached two thousand. A research log in one project passed 36,000 lines. Nobody could read the current state out of any of them, so each session rebuilt it from the git history instead.

Code ran ahead of evidence, and plans assumed runs of the original that nobody could make. Large parts of several games were implemented and tested before any run of the original confirmed them. In one project, work had started on all nine milestones and none of their gates had passed, because the first gate needed a recorded run of the original and the tool to make one was not available. Most of these games cannot be started, driven and read by an agent without a person at the machine, and nobody found that out until the plan depended on it.

Every project invented its own confidence scale (Confirmed and Provisional in one, low to verified in another, documented to validated in a third), and each project that has moved to the standard so far had to translate every claim into its statuses and IDs.

Some things worked and are kept here. Chaos Overlords split its open questions into those a static reading can settle and those that need someone to run the game, and it closed an item by recording the finding and deleting the item. It also measured how much of the executable the documentation covers, which gave it a number nobody could argue with. Wages Due kept live hypotheses with the test that would settle each, and told long-running agents to stop repeating a dead end without new evidence.

From outside the project, the structure borrows from the way [Anthropic describes long-running coding agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): a list of work whose state is ground truth, one item at a time, and a short progress note and a commit at the end of every session. [Chocolate Doom](https://www.chocolate-doom.org/wiki/index.php/Statcheck) shows the value of a regression corpus recorded from the original, and [decomp.dev](https://decomp.dev/projects) shows progress published as a number a script computes. The split between research and implementation below is the classic clean-room arrangement, in which the people who study the original write a specification and other people implement it from that alone.

## Working files

The files that track the work sit in the game repository next to the spec. They describe the work, never the original, so the spec's rule against naming the rebuild does not apply to them. Each one says what is true now. What was true before is in git, and none of them repeats it.

| File | Holds | Never holds |
|---|---|---|
| `docs/IMPLEMENTATION-PLAN.md` | The game profile, scope and non-goals, the stage the project is in, the slices with their exit criteria, the risks, and the questions only the owner can answer. | Dated checkpoints, status narration, research questions, lists of what was done. |
| `queue/AREA.md` | One file per spec area: the open research questions of that area, grouped by the kind of evidence each one needs. | Anything already answered. An item is deleted when it is settled. |
| `docs/RUNTIME.md` | What can be done with the original running, and who can do it (see [Runtime access](#runtime-access)). | Findings. What a run showed goes in the spec. |
| `docs/HANDOVER.md` | Where the work stands: the branch and whether it is pushed, the last gate result, the goals running, work left unfinished, blockers, and what to pick up next, naming queue items and entries by ID. At most 200 lines, rewritten at the end of every session. | History. The previous session's notes are replaced, not kept below the new ones. What research found or tried, which belongs in the spec and the queue. |
| `docs/goals/NAME.md` | One file per long-running goal while it runs: its condition, its scope, what it must not touch, and the dead ends found so far. Deleted when the goal is met or dropped. | Progress reports. The queue and the commits show progress. |

Decisions the owner makes go in `docs/DECISIONS.md`, dated and newest first. A decision that departs from the original is a deviation as well, in `deviations/`. When the file would pass the size limit below, its oldest entries move to a numbered file in `docs/decisions/`, starting at `001.md`, filled up to the limit and never changed after. `docs/DECISIONS.md` keeps the newest entries and opens with links to the numbered files, and a decision is never renumbered or reworded when it moves.

Every file here is at most 1,000 lines, the same limit the standard sets for its own files. A queue file that would pass it becomes a directory of the same name with one file per kind of evidence that has items, named after the section in lower case with a hyphen for the space: `queue/COMBAT/static.md`, `queue/COMBAT/agent-run.md`. Each file opens with the area and the section as a `#` heading, `# COMBAT: Static`. A file that would still pass is split by the kind of the first entry each item names, `queue/COMBAT/static/RULE.md`, the same way the standard splits its own files.

Tool paths, installed versions and the pitfalls of the local setup go in `docs/GHIDRA.md` and `docs/DEVELOPMENT.md`, so that nobody searches for them twice.

The template's own files are older than this page in one place. Its `docs/IMPLEMENTATION-PLAN.md` has an Open questions section, and its `AGENTS.md` asks every change to update the plan's open questions. Research questions go in `queue/` all the same, the plan's section holds only the questions the owner has to answer, and a change updates the queue where `AGENTS.md` says the plan. Wherever the template's files and this page disagree, this page applies and the template is corrected.

## Stages

The plan records the stage the project is in. The stages come in the order below, and a stage ends when its exit criteria hold, which a script or a reviewer can check without asking anyone. Work from a later stage may start early, but it does not count towards that stage's exit until the earlier stages have ended.

### Intake

Establish which game, which editions the owner has, and whether the game qualifies. Find the latest official version and patch the analysis copy to it. The template's `AGENTS.md` and bootstrap checklist give the steps.

Exit: eligibility and the latest version are recorded, the analysis build has a build entry and a manifest, and each manual, FAQ or earlier tool the work will rely on has a source entry.

### Runtime access

Find out what can be done with the original running, before any plan depends on it. Many of these games cannot be controlled by an agent at all: they need a real display and a person at the keyboard, fight a debugger, take their input only from a device an agent cannot reach, or run only on the one machine that has the disc. For most of them, static reading of the executable and data files is the more reliable evidence, and the protocol plans around that.

`docs/RUNTIME.md` records, for each build that will be run, how it runs (natively, under Wine, in DOSBox-X or another emulator, in a virtual machine), and whether an agent can do each of the following alone, only while a person runs the game, or not at all:

- start the original and bring it to a given state without a person;
- send it input;
- read its memory, set breakpoints and dump structures while it runs;
- load a patched save;
- capture frames and sound;
- play back a recording the original made.

Each answer names the tool and version that was tried and what happened, and, where the answer is no, what would change it. The record says what is true now, and it is updated whenever a tool, a machine or an emulator changes the answer. The methodology asks for a runtime tool that takes text commands and prints text back, and where one works the record says which.

Exit: `docs/RUNTIME.md` answers every capability for the analysis build, and each answer names the attempt it comes from.

The answers decide where a run goes in the queue: an agent run where an agent can make it, a live session where it needs a person. They also set what the project can reach. A rule reaches `established` only when a reading of the files and a run of the original agree, and a rule or screen row reaches `validated` only through tests that compare the rebuild with evidence recorded from the original running. A format row can reach `validated` without any runs, because its evidence is the original files. A project whose record says no agent can run the game plans its slices around that, and keeps the rest for live sessions.

### Survey

Map the whole game shallowly before studying any part of it deeply. List in the manifest every file the game uses, and the rest of the installation under the build entry's Other files. Give the format of every file the manifest lists as `data` an entry, `unknown` where nothing is known yet. A CD audio track has one fixed layout and needs no format entry. Take an inventory of the functions of each file the analysis reads, as [Measuring progress](#measuring-progress) describes. Write down the screens the manual or a playthrough shows, and the rules the manual states, as `sourced` entries. Fix the area list, since areas can never be renamed. Seed the queue with the questions this turns up.

Exit: every file in the manifest with format `data` is listed by a format entry, every screen the manual mentions has a screen entry, a coverage report exists for each analysed file (see [Measuring progress](#measuring-progress)), and every area has a queue file.

A survey keeps later work from being planned around the one subsystem somebody happened to open first, and it makes the size of the game visible before anyone estimates it.

### Slices

Build the game in vertical slices, each of which leaves it playable. The plan lists the slices in order, and each slice names the spec areas or entries it needs and the parity rows it has to bring to `implemented` or `validated`. Each target is one the runtime record makes reachable, and where a row needs a live session nobody has agreed to yet, the plan asks for `implemented` and names the gap in its risks. The first slice gives the rebuild a headless runner that a test drives from a fixture, since every later test that compares the rebuild with the original needs one. Within a slice, research and implementation alternate in small batches, described below.

Exit, per slice: every parity row the slice names has reached the status the plan asked for, and every queue item that blocked the slice is closed or accepted as a known gap in the plan's risks.

### Audit

Close the gaps the slices left. Every function in the inventories is cited by an entry or recorded as out of scope with its reason, every parity row is `validated` or has a note saying why it cannot be, and the queue holds only items the owner has accepted as out of reach.

## The queue

The queue holds the research questions still open. Every item names the spec entries it concerns, so behaviour with no entry gets an `unknown` entry before it gets a queue item, the same way it gets one before any code. The entry's own Open questions section describes what is unknown about it. The queue item says what to do next about it, and an item that duplicates the whole Open questions section is not needed.

A queue file opens with the area as a `#` heading and has one `##` section for each kind of evidence, in this order:

1. Static: a reading of the executable or data files settles it.
2. Agent run: a run of the original that the runtime record says an agent can make alone.
3. Live session: a run that needs a person to run the original while an agent measures it (see [Live sessions](#live-sessions)).
4. Source: a document that has to be found, bought or read.
5. Blocked: work stopped until something else changes.

An item is a single list entry:

```markdown
- RULE-COMBAT-012, FMT-STATE-001: Which of two gangs attacking each other rolls
  first? Settles it: the order of the two calls at the resolver's entry, and one
  experiment from a save where both attack. Blocks: slice 4.
```

It gives the entries, the question as a question, what would settle it, and the slice it blocks or `none`. It goes in the queue file of the area of the first entry it names. When the runtime record changes, the items it affects move between Agent run and Live session in the same commit. An item that has already been worked on adds `Tried:` with what was examined and what it showed, so that nobody repeats it. An item under Blocked adds `Waiting on:` with what has to change first.

An item is closed by recording its answer in the spec (a finding or an experiment, and the status of the entries it concerns) and deleting the item in the same commit. An item that turns out to be two questions becomes two items. A new question found along the way becomes a new item at once, even if nobody will look at it for months.

An attempt that does not settle an item records what it tried under `Tried:`, and the item is taken up again only with something the first attempt did not have: new evidence, a new tool, or a reading of the code nobody has tried. If the second attempt ends in the same place, the item moves to Blocked with what was tried and what would change the outcome, such as a tool, a capture or a second edition.

### Order of work

Items are picked in this order, and an item under Live session is taken up only in a live session, so it never holds up the others:

1. Items that block the current slice.
2. Items that others depend on: the random number generator, the main loop and the order of its phases, the save format and the structures the game keeps. Most other experiments need these.
3. Items where one piece of evidence raises the most entries. Where an agent can run the original, an entry that already has a static finding often needs only an experiment to reach `established`, and that is often the cheapest progress available. The experiment has to cover everything the entry says, every branch of a procedure and, for a random outcome, enough repetitions for its comparison, and a rule stays below `established` while any glossary claim it relies on is `(unknown)`. Where the experiment covers only part of the entry, the entry stays `supported` and its Open questions say which part is left.
4. Items with the cheapest evidence: a data file before a static reading, a static reading before an agent run.

A question that a static reading can settle is settled that way, even where a run could settle it too. A run of the original can then confirm the reading, which is what raises the entry to `established`.

## Batches

A batch is one unit of work and ends in one commit, or one pull request where the repository uses them. It is small enough to review in one sitting, and it leaves the documentation check and the fast validation gate passing. A batch is research, implementation or tooling, and never more than one of them.

### Research batches

A research batch settles one queue item, or a few items about the same entry. It states the question, forms the competing readings, looks for the evidence that could rule each one out, and records the result as findings or experiments under the standard. The entries the evidence concerns take the status it supports, the item is deleted or updated with what was tried, and new questions become new items. The batch leaves the documentation check passing, so it makes the changes elsewhere that the check requires of what it did to the spec, and no others:

- where an entry's status changes, the Spec status and Status columns of its parity row;
- for a new rule, format or screen entry, a parity row with Code `missing`, and for one that is retitled, the Title of its row;
- for an entry it supersedes, its row is removed, every citation of it in `src/`, `tests/`, `tools/`, `parity/` and `deviations/` moves to what replaced it, and where code was written for the old entry, the row of what replaced it takes Code `partial` and a Notes cell naming the old entry, so that an implementation batch checks the code against the new one.

Moving a citation changes an ID and nothing else. Apart from that, code is not changed, beyond tools in `tools/` the research needed.

### Implementation batches

An implementation batch brings parity rows of the current slice up to `implemented` or `validated`. It works from the spec only. It does not open Ghidra, a decompiler listing, a debugger log or research notes, and it learns what the original does by reading spec entries. Where the spec does not say enough to write the code, the batch stops at that point and writes down what the code needs to know as a question in the entry's Open questions section. Where no entry describes the behaviour at all, it creates an `unknown` entry that holds only that question, with its parity row. It then either leaves the row `partial` or writes the code with a `PLACEHOLDER:` comment citing the entry, and it starts the row's Notes with `Spec gap:` and the question. The next research session turns each `Spec gap:` note into a queue item and removes the note in the same commit. An implementation batch never reads the queue, since its items hold what research tried.

This keeps the clean-room separation that the methodology asks for, and it is also a test of the spec. The standard's aim is that someone could build a second engine from the documentation alone, and every implementation batch tries exactly that on a small scale. Under `spec/` the batch only asks: it adds questions and `unknown` entries that hold nothing else, and it never adds evidence or changes a status or a description. With coding agents the separation costs little: an implementation batch runs in a fresh session, or a subagent, that is given the entry IDs and nothing from the research that produced them.

A feature that is not part of a parity row, such as online play, an optional improved AI or an accessibility setting, is ordinary engineering. It goes in implementation batches of its own, and a decision in `docs/DECISIONS.md` says why the project takes it on. It never counts towards a slice's exit.

### Tooling batches

A tooling batch builds something the stages need that has no parity row of its own: the extractor, the Ghidra scripts, the export of the function inventories, the scripts a live session measures with, the rebuild's headless runner and the test harness that replays fixtures. It needs no decision and no approval, because this page already asks for it. A tool that reads the original belongs to the research side, and one that runs the rebuild to the implementation side, and each is built in a session of that side.

### Commits

A commit message says what changed and what evidence it rests on, in plain words. It ends with trailers naming the entries the batch created or changed, so that the git history can be searched by ID:

```text
Settle which gang rolls first in a mutual attack

The resolver calls the attacker's roll before the defender's, and a run of
200 attacks from a patched save agrees.

Spec: RULE-COMBAT-012, FND-COMBAT-031, EXP-COMBAT-009
```

An implementation batch uses the same trailer for the entries it implemented. A batch that changes parity rows adds `Parity:` with the rows whose status it changed.

## Sessions

A session is one sitting of work, by a person or an agent. It may hold several batches, all of the same side: research and tooling that reads the original, or implementation and tooling that runs the rebuild.

At the start: read `docs/HANDOVER.md` and the file of the goal the session works under, if it has one, check the branch and the working tree against what the handover says, and run the documentation check. A research session then turns any `Spec gap:` notes into queue items and picks the next item from its goal or the queue in the order above. An implementation session picks the next rows of the current slice from its goal or the plan, and opens neither the queue nor the files of research goals.

At the end: stop every process the session started (Ghidra, the original game, test hosts), and leave processes that belong to anyone else alone. Rewrite the handover to describe the state now, commit it with everything else in the working tree or discard what is not worth keeping, so that nothing is left half done without a note saying so, and push the branch. Where the repository's `AGENTS.md` says the owner pushes instead, the handover says how many commits the branch is ahead of its remote, counting its own.

## Live sessions

Where the runtime record says a run needs a person, the evidence comes from a live session: the maintainer runs the original on their machine and plays to each point the script names, tells the agent when the game is there, and the agent takes its measurement against the running process (a memory read, a breakpoint, a dump of a structure, a frame capture) before the maintainer carries on. The maintainer's time is the scarcest resource a restoration has, so a session is prepared so that it spends that time only on what needs a person.

A live session is proposed, never assumed. When Live session items block a slice, or enough of them have gathered to fill a sitting, the agent adds an owner question to the plan offering one, with the script ready and how long it expects the session to take. The owner accepts it, sets a time, or declines. Until the owner opts in, the items stay under Live session, the plan keeps the rows that need them at `implemented`, and work goes on with everything a live session does not block. An agent never waits idle for one.

Before a session, the Live session items are collected into a script. Each step gives the entries it concerns, how to reach the starting state (a save patch, or the choices on the way into a new game), the one input to vary, the moment the maintainer signals, what the agent measures then and in which form, and where captures go (`GAME_DIR/captures/`, named by hash). The measurements are written and tried beforehand as far as the original allows without a person, the addresses to read and the breakpoints to set come from the static readings, and the script is ordered so that steps from the same starting state follow each other. Nobody should need to ask a question during the session.

After the session, the recordings are turned into findings and experiments with fixtures, as the standard describes, and the items they settle are deleted from the queue. What the session showed about the tools, such as a measurement that a person has to trigger or one that works unattended after all, goes into the runtime record.

## Measuring progress

Progress is measured by numbers a script computes from the repository, never by numbers someone writes down:

- the parity totals in `PARITY.md`, by Status and by Code;
- the spec's entries by status, from the status index;
- for each analysed file, the share of its functions, and of its bytes, that some entry cites, measured against its function inventory;
- the share of the manifest's data files whose format entry is `supported` or higher;
- the number of queue items of each kind of evidence.

A function inventory lists the functions of one file the analysis reads: the executable that runs the rules, and each DLL, overlay or other file of code the analysis goes into. It is `coverage/` at the root of the game repository, then the build's ID, then the file's path as the manifest writes it with `.tsv` added: `coverage/BLD-GOG-EN-1.1/Chaos Overlords.exe.tsv`. A script in `tools/` exports it from the analysis database, which stays on the researcher's machine as the methodology requires, and exports it again whenever the analysis finds functions it had missed or merged.

Each line gives a function's start address, written the way the standard's notation writes one for that file, its size in bytes, and optionally a name the researcher gave it and the reason it is out of scope. That is a catalogue of where the code is and how much of it there is, and it reproduces none of it, the way a list of a film's scenes with their timestamps shows none of the film. It never holds decompiled code, disassembly, bytes or byte signatures, strings or constants from the original, or names that came from the original, such as debug symbols, RTTI class names or export tables. A function that got its name from one of those is recorded under a name of the researcher's own, or with none. The template's `AGENTS.md` forbids committing broad decompiler exports, and an inventory that holds only these columns is the one export that is committed. The coverage script reads only the inventories and the spec.

A test count is not progress, and neither are lines of code or the number of assets the importer extracts. A percentage of completion is taken from the parity matrix or not given at all.

## What needs the owner

The owner decides eligibility and the supported editions, the scope and the non-goals, any deviation whose default is `on` or `mandatory`, any feature outside the parity matrix such as online play, when a release goes out, and whether and when live sessions happen. Anything else goes ahead without approval, and the owner reviews the result. A question only the owner can answer goes in the plan's owner questions, and the work that depends on it waits under Blocked in the queue.

## Coding agents and long-running goals

A long-running goal, such as Claude Code's [`/goal`](https://code.claude.com/docs/en/goal), keeps an agent working until a condition holds. In Claude Code a second model judges that condition after every turn from what the conversation shows, without running anything itself. A good condition therefore names a state the agent can demonstrate by running something, has a scope, and has a limit:

```text
Every item under Static in queue/COMBAT.md is closed or moved to Blocked with
what was tried, the documentation check passes on the last commit, and each
batch ended with a status block; or stop after 40 turns.
```

```text
Every parity row that slice 3 of docs/IMPLEMENTATION-PLAN.md names has Code
complete, or is partial with a Spec gap note saying what the spec is missing, the
fast validation gate and the documentation check pass on the last commit, and
the only changes under spec/ are added open questions and unknown entries; or
stop after 60 turns.
```

A goal as broad as "finish the combat system" gives the judge nothing to check and the agent no reason to stop. The goal's file in `docs/goals/` holds the same condition with its scope and the areas it must not touch, so a second session can see that the areas are taken.

Every batch ends by printing a status block, which is the evidence the judge reads and a summary the next person can use:

```text
Status
Goal: docs/goals/combat-static.md
Batch: research, RULE-COMBAT-012 supported -> established
Queue COMBAT: static 3, agent run 1, live session 4, source 0, blocked 2
Checks: documentation check passed, fast gate passed
Commit: 3f2a9c1 (not pushed)
Next: RULE-COMBAT-014, the retaliation roll
```

The recurring procedures here suit agent skills, one per procedure: checking runtime access, planning and seeding the queue, starting a session, a research batch, an implementation batch, preparing and ingesting a live session, and ending a session. A repository that adds them keeps them in `.claude/skills/`. A skill holds the steps and points to this page and the standard for the rules, so the rules live in one place. Where a skill and this page disagree, this page applies, and the skill is fixed.

Several agents can work on one game at once when each takes different areas. A goal file claims its areas, and the batches of one goal touch only those areas' entries, queue files and parity rows. A goal takes up a queue item only if every entry the item names is in one of its areas or in an area no running goal claims. Each agent works in its own worktree or branch. Two branches that create the same spec ID are handled the way the standard's [Identifiers](/documentation-standard/#identifiers) section says.

## Versions

This is version 1 of the protocol. A change that would make a repository that follows this version stop following it gets a new version number, listed here with what to change.

| Version | Changes | Converting a repository |
|---|---|---|
| 1 | The first version. | Write `docs/RUNTIME.md`, move open research questions from the plan and handover into `queue/`, cut the handover down to the current state, and move dated checkpoints out of the plan (git keeps them). |
