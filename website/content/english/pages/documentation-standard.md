---
title: "Documentation standard"
meta_title: "Documentation standard for reverse-engineered game internals"
description: "The exact structure every restoration uses to record what reverse engineering reveals about a game: builds, file formats, rules, findings, experiments, bugs and screens, each with a stable ID, a status and its evidence."
draft: false
---

Every restoration records a game's internals in the format below, down to file names, field lists and number formatting, so that the documentation of one game reads like the documentation of any other and tools can check it. What has to be documented, and why, is covered in [Methodology](/methodology/).

The format borrows from projects that have done parts of this well. The layout tables follow [IESDP](https://gibberlings3.github.io/iesdp/) and the [ModdingWiki](https://moddingwiki.shikadi.net/wiki/UINT16LE), the canonical format definitions are [Kaitai Struct](https://doc.kaitai.io/user_guide.html), the formula entries follow the [OpenMW research wiki](https://wiki.openmw.org/index.php?title=Research), the bug records follow UESP's [bug template](https://en.uesp.net/wiki/Template:Bug), and the way a claim is tied to an address in a hashed binary comes from [reccmp](https://github.com/isledecomp/reccmp/blob/master/docs/annotations.md) and the [zeldaret](https://github.com/zeldaret/oot/blob/main/docs/Documenting.md) projects. None of them gives every claim a stable ID, a status from a fixed list and a link to its evidence, so this standard adds those.

Our first two projects, Chaos Overlords and Dark Sun, were documented before this standard existed. Their documentation will be converted to it.

## Where it lives

Each game repository has a `spec/` directory. It describes the original game and nothing else. It never names a class, file or setting from our implementation, so that someone writing a different engine can use it as it is. The implementation points the other way: code comments, tests and the parity matrix cite spec IDs.

```text
spec/
  README.md        scope, standard version, area list, generated indexes
  LICENSE          licence texts and the files each one covers
  glossary.md      the names the spec uses for game concepts
  builds/          BLD-*.md   the exact original files the spec applies to
  sources/         SRC-*.md   manuals, FAQs, earlier tools and other outside sources
  formats/         FMT-*.md   file formats, each with a matching .ksy definition
  rules/           RULE-*.md  game rules, formulas and procedures
  findings/        FND-*.md   individual pieces of evidence
  experiments/     EXP-*.md   controlled runs of the original, with EXP-*.json fixtures
    saves/         starting states for experiments, where they can be shared
  bugs/            BUG-*.md   defects in the original
  screens/         SCR-*.md   screens, panels and dialogs, with their input and sound
```

Every entry is one Markdown file named after its ID, with YAML front matter holding its fields and a body holding its sections. One entry per file keeps links stable, gives each entry its own history in git, and lets scripts read the whole spec without parsing prose.

The front matter schemas, the fixture schema and the check script belong to the standard and are kept in one repository shared by every project. A game repository pins a version of them, and `spec/README.md` records which version of this standard its spec follows. This page describes version 1.

The spec describes layouts and behaviour. It may quote individual values from the original as evidence, but it does not reproduce whole content tables, texts or images: those stay in the player's copy of the game. Constants found in the executable's code, such as the multipliers and thresholds in a formula, are part of the rules and are written down in full.

## Identifiers

Every entry has an ID of the form `KIND-AREA-NNN`, for example `RULE-COMBAT-007`. `KIND` is one of the directory prefixes above. `AREA` is a short upper-case subsystem name from the list in `spec/README.md`, such as `RNG`, `COMBAT`, `AI` or `SAVE`. `NNN` is a three-digit number, unique within its kind and area. Builds and sources use a short alias in place of area and number: `BLD-GOG-EN-1.1`, `SRC-MANUAL-1996`.

An ID is never reused or renumbered once it is on the main branch. When an entry turns out to be wrong it stays in place with status `superseded` and a `superseded_by` field pointing at its replacement. When one entry has to be split, the parts get new IDs and the original is superseded by all of them. When two entries are merged, both are superseded by the new one. Anything that cited the old ID can still find out what happened to it. If two branches create the same ID, the one merged second renumbers its entry before it is merged.

## Status

Rules, formats, screens and bugs describe the original, and each carries one of these statuses:

| Status | Meaning | Must cite |
|---|---|---|
| `unknown` | Listed so that it is not forgotten, not yet studied. | Nothing. |
| `sourced` | Described from the manual or another outside source only. | At least one source. |
| `supported` | Backed by direct evidence from the original of one kind: static findings, or dynamic findings and experiments. | At least one finding or experiment. |
| `established` | A reading of the files and a run of the original agree. | At least one static finding, and at least one dynamic finding or experiment. |
| `disputed` | Pieces of evidence contradict each other. The body says which and how. | At least one entry in `conflicting`. |
| `superseded` | Replaced by the entries in `superseded_by`. | Nothing further. |

The first four form a scale, from `unknown` up to `established`. Evidence cited in support of a claim must not itself be superseded.

The spec records how well the original is understood. How well our rebuild matches it is recorded in the [parity matrix](#parity-matrix), which uses the same statuses and adds `implemented` and `validated`. [OpenMW](https://wiki.openmw.org/index.php?title=Template:Formula) keeps the same split between analysis status and implementation status.

There is no separate confidence scale. An entry is as certain as its status says, and when part of an entry is less certain than the rest, that part goes in its own entry or in the entry's open questions.

Findings and experiments are evidence rather than claims, so they have a shorter list of their own:

| Status | Meaning |
|---|---|
| `recorded` | Written down by the person who found it. |
| `reproduced` | Repeated by someone else from the entry's own instructions, with the same result. |
| `superseded` | Shown to be wrong. `superseded_by` names the entries that show it. |

Builds and sources carry no status.

## Notation

Integer types use the [ModdingWiki names](https://moddingwiki.shikadi.net/wiki/UINT16LE): `UINT8`, `INT8`, `UINT16LE`, `INT16LE`, `UINT32LE`, `INT32LE`, and the `BE` forms where a file is big-endian. Signed types are two's complement. `FLOAT32LE` and `FLOAT64LE` are IEEE 754. `char[n]` is a fixed-length string whose encoding (`CP437`, `Windows-1252`, `ASCII`) and padding are stated in the field's meaning. `BYTE[n]` is an opaque block.

File offsets and addresses are hexadecimal with a `0x` prefix and upper-case digits. File offsets are padded to at least two digits (`0x1C`), and addresses in 32-bit executables are written as full virtual addresses (`0x00478CD0`). In 16-bit code, an address is `segment:offset` with four digits on each side and no prefix. For a DOS executable the segment is the one the code has when the load image is placed at segment `0x1000`, which is where Ghidra puts it by default, so an address can be pasted straight into a Ghidra project (`3D72:0515`). For a Windows NE executable the segment is the segment number from the segment table (`0003:0034`). Overlay code has no fixed load address, so it is located by its offset in the file that holds it, which may be the executable itself. Sizes and counts are decimal. Ranges are half-open and written with two dots, so `0x20..0x3C` covers `0x20` up to but not including `0x3C`.

Screen coordinates are pixels on the game's native canvas, with the origin at the top left. A game with more than one native resolution states in each screen entry which one it uses. A rectangle is written `(x, y, w, h)`.

Things that have not been identified get neutral names derived from where they are: `fn_00478CD0` for a function, `unk_2A` for a field at offset `0x2A`, `g_004C1F20` for a global. In 16-bit code the colon becomes an underscore: `fn_3D72_0515`. They are renamed only when their purpose is established. The zeldaret projects put it well: it is better to leave something unnamed than to name it wrongly.

## Formulas and procedures

Rules are written in a small pseudocode whose behaviour is fixed:

- Integers are signed 32-bit unless a type is given. Games built for 16-bit machines state their default in `spec/README.md`. Arithmetic wraps on overflow the way the original machine did, and any rule that depends on overflow says so.
- `/` on integers truncates toward zero, and `%` takes the sign of the left operand. `>>` is an arithmetic shift on signed values and a logical shift on unsigned ones, so `x >> 1` and `x / 2` differ for negative `x`, as they did in the original.
- Floating-point values have the width the original stores them in. Rounding is stated at each use. Where the original computes in the x87's 80-bit precision and the result depends on it, the rule says so.
- `draw(gen)` is one raw value from the random number generator `gen`, exactly as the original's generator returns it. Each generator is specified once, in its own rule, and a game with a single generator may leave out the name. The ways the game reduces a raw value to a range, such as `roll(n)` for an integer from 0 to n - 1, are defined in the same rule as arithmetic on `draw`, because two reductions of the same draw give different numbers. Every draw appears explicitly and in the order the original makes it, because the order of draws decides whether a replay stays in sync.
- Names come from the glossary. Constants from the executable appear by value, with the address they were found at in the rule's evidence.

The pseudocode describes what the game does in the spec's own terms. It is never a cleaned-up copy of decompiler output, and it never contains addresses, decompiler variable names or the structure of the original function.

## Entry types

Body sections appear in the order given for each type. The examples use Chaos Overlords. The file size and hash in the build example are the real ones for the GOG release, and the other IDs, statuses, addresses and values are illustrative. A section with nothing to say is kept and says `None known.`, so a reader can tell an empty section from a forgotten one.

Links between entries go one way: a claim cites its evidence, and evidence does not list the claims that use it. The check script generates the reverse lists into the indexes. Every entry except builds and sources has these fields:

```yaml
id: RULE-COMBAT-007
title: Police detection visits gangs in player order, then roster order
status: established
builds: [BLD-GOG-EN-1.1]
superseded_by: []         # required when status is superseded
```

Rules, formats, screens and bugs also have `evidence`, the findings, experiments and sources they rest on, and `conflicting`, the evidence that contradicts them, which may only be non-empty when the status is `disputed`.

### Builds

A build entry identifies one exact set of original files. Every other entry lists the builds it applies to, the way IESDP pages open with "Applies to" and MAME identifies every ROM chip by hash.

```yaml
id: BLD-GOG-EN-1.1
title: Chaos Overlords 1.1, English, GOG release
publisher_version: "1.1"
distribution: GOG
files:
  - path: Chaos Overlords.exe
    size: 664576
    sha256: a1430159bbe20869e277a5000311344f4ec141ab77c96b385336617149e97d89
  # every file the spec uses, with size and SHA-256
```

Body: how to obtain the build, how it differs from other known builds, and which files in the installation are not game data (installers, wrappers, compatibility shims).

### Sources

A source entry records a document or tool from outside the project: the manual, a FAQ, an earlier reverse-engineering effort, a format page on a wiki.

```yaml
id: SRC-MANUAL-1996
title: Chaos Overlords manual
author: New World Computing
date: 1996
location: https://archive.org/details/example   # URL or archive location
sha256: null              # when the source is a file
licence: null             # when it matters for what may be quoted
```

Body: what the source is good for, and where it is known to be wrong. Sources are leads. A claim that rests only on sources has status `sourced`.

Text from a source is not copied into the spec beyond short quotations. Facts taken from it are restated in our own words and the source is cited. This matters most for wikis under share-alike licences, whose text cannot be relicensed under the [spec's licence](#licence).

### Findings

A finding is one piece of evidence from the original: something read in its files, or something seen while it ran. Rules, formats, screens and bugs cite findings as their evidence.

```yaml
id: FND-COMBAT-011
title: Police detection loop visits gangs in player order, then roster order
status: recorded
builds: [BLD-GOG-EN-1.1]
method: static          # static or dynamic
location:
  file: Chaos Overlords.exe
  range: 0x00472775..0x00472A10
tool: Ghidra 12.1.3
```

A `static` finding comes from reading the original's files without running them: disassembly, decompilation, or a data file in a hex editor. A `dynamic` finding comes from the original running: a breakpoint, a memory watch, a trace. Dynamic findings also give the `environment`, in the same form as experiments. A run set up to answer a question, with a fixed starting state and repetitions, is an experiment and gets its own entry.

Body sections:

1. Observation: what is present, stated as facts. Constants, branch conditions, the order of calls, which fields are read or written, and the address of each.
2. Interpretation: what the observation means for the game.
3. Alternatives: other readings that were considered and why they were ruled out, or that they have not been.
4. How to reproduce: enough for someone else with the same build to find the same thing, such as the function's entry address and the constant or string reference that leads to it.

A location is a file in the named build and an address or offset range within it. Line numbers from a decompiler listing are never used as locations, because they change with the tool version and the analysis settings.

### Experiments

An experiment is a controlled run of the original, following the protocol in [Methodology](/methodology/#studying-the-original).

```yaml
id: EXP-COMBAT-004
title: Detection rate for a single hidden gang under Crackdown
status: recorded
builds: [BLD-GOG-EN-1.1]
environment: Windows 11 24H2, DxWnd 2.06.10 preset "chaos-16bit"
starting_state: saves/EXP-COMBAT-004-before.sav   # sha256 in the fixture
repetitions: 200
fixture: EXP-COMBAT-004.json
```

Body sections:

1. Question: what the experiment is meant to settle.
2. Setup: how the starting state was produced, step by step, so it can be recreated without the save file when the save cannot be shared.
3. Procedure: the single input that changes, and everything held constant.
4. Observations: what was recorded in each run, with the hashes of captured screenshots and saves.
5. Results: counts and distributions for random outcomes, exact values otherwise.
6. Conclusion: what the results show, and what they do not.

The fixture is a JSON file that follows the standard's fixture schema. It holds the starting state, the inputs, and the expected events and end state, and the implementation's test suite reads it directly.

### Formats

A format entry describes one file format, or one structure inside a file.

```yaml
id: FMT-DATA-002
title: Site records in SITES.DAT
status: sourced
builds: [BLD-GOG-EN-1.1]
files: ["SITES.DAT"]      # names or patterns
byte_order: little
size: 26                  # record size, or null when variable
definition: fmt_data_002.ksy
evidence: [FND-DATA-002, FND-DATA-004, SRC-MANUAL-1996]
conflicting: []
```

The body has a layout table with one row per field. Fields are never grouped into one row, and unknown bytes and padding get rows of their own. The last row of a record table gives the total size:

| Offset | Size | Type | Name | Meaning | Status | Evidence |
|---|---|---|---|---|---|---|
| `0x00` | 20 | `char[20]` | `name` | Site name, ASCII, space-padded, may contain an early NUL | established | FND-DATA-002 |
| `0x14` | 2 | `INT16LE` | `id` | Site number, 0 to 21 | established | FND-DATA-002 |
| `0x16` | 2 | `INT16LE` | `resistance` | Starting resistance to Influence | supported | FND-DATA-004 |
| `0x18` | 2 | `INT16LE` | `support` | Support gained when the site is influenced | sourced | SRC-MANUAL-1996 |
| `0x1A` | | | | Total size 26 | | |

Each row's status follows the same table as a whole entry. The entry's own status is the lowest status among its rows, which is why the example is `sourced`, and it is `disputed` if any row is. Its `evidence` lists every ID cited in the table.

After the layout come tables for enumerations and flags (`Value | Name | Meaning | Status | Evidence`), a section on differences between builds, a list of the fields whose purpose is still unknown, and a coverage statement: which files in which builds the definition has been checked against, and with what result.

The `.ksy` file next to the entry is the machine-readable definition, in [Kaitai Struct](https://doc.kaitai.io/user_guide.html). Kaitai only accepts lower-case identifiers with underscores, so the file and its `meta/id` use the entry ID in that form: `FMT-DATA-002` becomes `fmt_data_002.ksy`, and a definition that uses another one imports it by that name. Its `doc` fields carry the meanings, its `doc-ref` fields carry the entry and finding IDs, and `meta/license` names the licence. Kaitai can generate parsers in more than a dozen languages and a diagram of the layout from the same file, which is why the standard uses it for every format.

### Rules

A rule entry describes one piece of game behaviour: a formula, a procedure, the order in which something is resolved. Its front matter holds the common fields, `evidence` and `conflicting`, and `related`, a list of the bugs and screens connected to it.

Body sections:

1. Summary: one or two sentences a player would understand.
2. When it runs: the phase, event or input that triggers it.
3. Inputs: the state it reads, by glossary name.
4. Procedure: the rule in pseudocode, including every random draw in order.
5. Outputs: the state it changes and the events, messages and sounds it produces, in order.
6. Edge cases: limits, ties, empty sets, overflow.
7. What the sources say: each source's description with a page or section reference, and where it disagrees with the executable.
8. Differences between builds.
9. Open questions.

### Bugs

A bug entry records a defect in the original: behaviour the game's own design plainly did not intend. The format follows UESP's bug template, with fields added for what a rebuild needs to decide.

```yaml
id: BUG-COMBAT-002
title: Freeze after the detailed combat sequence ends
status: supported
builds: [BLD-GOG-EN-1.1]
impact: crash          # crash, save-corruption, rules, presentation or performance
player_reliance: none known
evidence: [EXP-COMBAT-006]
conflicting: []
related: [RULE-COMBAT-012, SCR-COMBAT-003]
```

Body sections: symptom, trigger conditions, mechanism, how often it happens, whether players rely on it (with evidence, such as strategy guides or speedrun rules), and fixes that exist elsewhere (official patches, community patches, wrappers). What our rebuild does about the bug belongs in the implementation's deviation log, because another engine may choose differently.

### Screens

A screen entry describes one screen, panel or dialog: the resources it draws with their positions, its input, its sounds, its states and the transitions between them. Its front matter holds the common fields, `evidence` and `conflicting`, and `related`, a list of the rules and other screens it leads to.

The body has these tables, each with an `Evidence` column:

- drawn elements: `Element | Resource | Position | Shown when`
- mouse input: `Region | Rectangle | Enabled when | Effect`
- keyboard input: `Key | Enabled when | Effect`
- sounds: `Sound | Resource | Played when`

An effect names a rule or another screen. Keys that work on every screen are described in a rule. Text shown on the screen is referenced by resource and index and never copied into the entry. Timing of animations and transitions is given in frames or milliseconds, with its evidence.

## Checks

A script in each repository checks the spec on every change, and the build fails if any check fails:

- every file's front matter validates against the schema for its kind, and every body has its sections in order;
- every ID cited anywhere resolves to an entry, and no ID is used twice;
- every status is from the list for its kind, and every entry cites what its status requires;
- no claim cites superseded evidence in support, and every superseded entry names what replaced it;
- a format entry's status matches its rows, and its `evidence` covers every ID in its tables;
- every Kaitai file compiles, and its sizes match the layout table in its entry;
- the indexes in `spec/README.md` (by kind, by area, by status, and for each piece of evidence the entries that cite it) are regenerated and up to date.

The status index doubles as a progress report: how much of the game is established, how much is still a guess, and where the open questions are.

## Implementation side

The implementation keeps three things that refer to the spec without being part of it. Code comments and tests cite the spec IDs they implement or check, so a search for an ID finds everything that depends on it. The deviation log records every place the rebuild departs from the spec on purpose, with a `DEV-AREA-NNN` ID, the spec IDs it departs from, the reason, and the name of the setting that controls it, or `none` for a deviation that is always on. The parity matrix records how much of the spec the rebuild does.

A deviation that is always on may only add to the interface. It must not change game state, or anything a test compares with the original. A deviation that would needs a setting.

### Parity matrix

The parity matrix is `PARITY.md` at the root of the game repository, next to `spec/`. It is a document of its own, outside `spec/`, because it describes our rebuild and the spec never does.

It has one row for every rule, format and screen entry in the spec that is not superseded. Behaviour without a spec entry cannot have a row, so work on anything new starts with an `unknown` entry in the spec. The file opens with a table counting rows by status. After it come the rows, under one `##` heading per area in the order of the area list in `spec/README.md`, sorted by ID within each area:

| Spec ID | Title | Spec status | Code | Tests | Deviations | Status | Notes |
|---|---|---|---|---|---|---|---|
| `RULE-COMBAT-007` | Police detection loop order | established | complete | `tests/combat/detection_order` | None | validated | |
| `RULE-COMBAT-012` | Detailed combat resolution | supported | partial | None | `DEV-COMBAT-001` | supported | Hit chance is a placeholder until EXP-COMBAT-009 is run. |
| `SCR-COMBAT-003` | Combat results panel | sourced | none | None | None | sourced | |

Spec ID, Title and Spec status are copied from the spec entry. Code is `none`, `partial` or `complete`, and `complete` means the rebuild does everything the entry describes. A row whose spec status is `unknown` cannot be `complete`, since the entry does not describe anything yet. A placeholder in the code, such as a guessed formula, is marked with a `PLACEHOLDER: <spec ID>` comment, and a row whose ID appears in one cannot be `complete`. Tests lists only tests that compare the rebuild with evidence from the original: experiment fixtures, recordings made in the original, and distributions measured in it. They run with every deviation that has a setting switched off. Tests that compare the rebuild with an earlier version of itself are left out. Deviations lists the deviation log entries that touch the row. Notes says in plain words what is missing or wrong, and stays empty when there is nothing to say.

Status is worked out from the other columns:

| Status | When |
|---|---|
| the spec status | Code is `none` or `partial`. |
| `implemented` | Code is `complete` and Tests is empty. |
| `validated` | Code is `complete`, Tests lists at least one test, and the spec status is `supported` or `established`. |

A row with tests against the original and a spec status of `sourced` or `disputed` means the spec is behind: the evidence behind those tests belongs in the spec entry first.

Manual play never counts as a test. The spec check script also checks `PARITY.md`: every eligible spec entry has exactly one row, the copied columns match the spec, every status follows the table above, every listed test exists and cites the row's ID, and the counts at the top are right. The test suite runs on every change, and a failing test fails the build, so a `validated` row on the main branch has passing tests.

## Licence

The Markdown entries are published under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0). Anyone can copy and adapt them, commercially or not, as long as they credit the project. That includes adding them to a wiki under CC BY-SA, the licence many community wikis use.

The machine-readable parts (Kaitai definitions, experiment fixtures, schemas and scripts) are code, and are published under the MIT licence, the same as the rebuild, so they can go into another engine's source tree without a second licence to track.

`spec/LICENSE` holds both texts and says which files each covers, so the `spec/` directory keeps its licence when it is copied to a community wiki or into another project.
