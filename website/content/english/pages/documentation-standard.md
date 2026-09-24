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
  README.md        scope, supported builds, conventions, generated indexes
  LICENSE          MIT licence for the documentation
  glossary.md      the names the spec uses for game concepts
  builds/          BLD-*.md   the exact original files the spec applies to
  sources/         SRC-*.md   manuals, FAQs, earlier tools and other outside sources
  formats/         FMT-*.md   file formats, each with a matching FMT-*.ksy
  rules/           RULE-*.md  game rules, formulas and procedures
  findings/        FND-*.md   individual pieces of evidence
  experiments/     EXP-*.md   controlled runs of the original, with EXP-*.json fixtures
  bugs/            BUG-*.md   defects in the original
  screens/         SCR-*.md   screens, panels and their input regions
```

Every entry is one Markdown file named after its ID, with YAML front matter holding its fields and a body holding its sections. One entry per file keeps links stable, gives each entry its own history in git, and lets scripts read the whole spec without parsing prose.

The spec describes layouts and behaviour. It may quote individual values from the original as evidence, but it does not reproduce whole content tables, texts or images: those stay in the player's copy of the game. Constants found in the executable's code, such as the multipliers and thresholds in a formula, are part of the rules and are written down in full.

## Identifiers

Every entry has an ID of the form `KIND-AREA-NNN`, for example `RULE-COMBAT-007`. `KIND` is one of the directory prefixes above. `AREA` is a short upper-case subsystem name from the list in `spec/README.md`, such as `RNG`, `COMBAT`, `AI` or `SAVE`. `NNN` is a three-digit number, unique within its kind and area. Builds and sources use a short alias in place of area and number: `BLD-GOG-EN-1.1`, `SRC-MANUAL-1996`.

An ID is never reused or renumbered. When an entry turns out to be wrong it stays in place with status `superseded` and a `superseded_by` field pointing at its replacement. When one entry has to be split, the parts get new IDs and the original is superseded by all of them. Anything that cited the old ID can still find out what happened to it.

## Status

Every entry except builds and sources carries one status:

| Status | Meaning |
|---|---|
| `unknown` | Listed so that it is not forgotten, not yet studied. |
| `documented` | Described from the manual or another secondary source only. |
| `observed` | Confirmed by static analysis or by a controlled experiment, but not both. |
| `established` | Static and observed evidence agree. |
| `disputed` | Pieces of evidence contradict each other. The entry says which and how. |
| `superseded` | Replaced by the entries in `superseded_by`. |

The spec records how well the original is understood. How well our rebuild matches it is recorded in the [parity matrix](#parity-matrix), which uses the same statuses and adds `implemented` and `validated`. [OpenMW](https://wiki.openmw.org/index.php?title=Template:Formula) keeps the same split between analysis status and implementation status.

There is no separate confidence scale. An entry is as certain as its status says, and when part of an entry is less certain than the rest, that part goes in its own entry or in the entry's open questions.

## Notation

Integer types use the [ModdingWiki names](https://moddingwiki.shikadi.net/wiki/UINT16LE): `UINT8`, `INT8`, `UINT16LE`, `INT16LE`, `UINT32LE`, `INT32LE`, and the `BE` forms where a file is big-endian. Signed types are two's complement. `FLOAT32LE` and `FLOAT64LE` are IEEE 754. `char[n]` is a fixed-length string whose encoding (`CP437`, `Windows-1252`, `ASCII`) and padding are stated in the field's meaning. `BYTE[n]` is an opaque block.

File offsets and addresses are hexadecimal with a `0x` prefix and upper-case digits. File offsets are padded to at least two digits (`0x1C`), and addresses in an executable are written as full 32-bit virtual addresses (`0x00478CD0`). Sizes and counts are decimal. Ranges are half-open and written with two dots, so `0x20..0x3C` covers `0x20` up to but not including `0x3C`.

Screen coordinates are pixels on the game's native canvas, with the origin at the top left. A rectangle is written `(x, y, w, h)`.

Things that have not been identified get neutral names derived from where they are: `fn_00478CD0` for a function, `unk_2A` for a field at offset `0x2A`, `g_004C1F20` for a global. They are renamed only when their purpose is established. The zeldaret projects put it well: it is better to leave something unnamed than to name it wrongly.

## Formulas and procedures

Rules are written in a small pseudocode whose behaviour is fixed:

- Integers are signed 32-bit unless a type is given. Arithmetic wraps on overflow the way the original machine did, and any rule that depends on overflow says so.
- `/` on integers truncates toward zero, and `%` takes the sign of the left operand. Rounding of floating-point values is stated at each use.
- `roll(n)` is one draw from the game's random number generator, returning an integer from 0 to n - 1. The generator itself is specified once, in its own rule. Every draw appears explicitly and in the order the original makes it, because the order of draws decides whether a replay stays in sync.
- Names come from the glossary. Constants from the executable appear by value, with the address they were found at in the rule's evidence.

The pseudocode describes what the game does in the spec's own terms. It is never a cleaned-up copy of decompiler output, and it never contains addresses, decompiler variable names or the structure of the original function.

## Entry types

Body sections appear in the order given for each type. The examples use Chaos Overlords, but their IDs, statuses and addresses are illustrative. A section with nothing to say is kept and says `None known.`, so a reader can tell an empty section from a forgotten one.

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

A source entry records a document or tool from outside the project: the manual, a FAQ, an earlier reverse-engineering effort, a format page on a wiki. Its front matter gives the title, author, date, a URL or archive location, a SHA-256 where the source is a file, and its licence where that matters. Its body says what the source is good for and where it is known to be wrong. Sources are leads. A claim that rests only on a source has status `documented`.

### Findings

A finding is one piece of evidence: something seen in the executable, in a data file, or in a run of the original. Findings are what every other entry cites.

```yaml
id: FND-COMBAT-011
title: Police detection loop visits gangs in player, then roster order
status: established
method: static          # static, dynamic or black-box
build: BLD-GOG-EN-1.1
location: 0x00472775..0x00472A10
tool: Ghidra 12.1.3
supports: [RULE-COMBAT-007]
```

Body sections:

1. Observation: what is present, stated as facts. Constants, branch conditions, the order of calls, which fields are read or written, and the address of each.
2. Interpretation: what the observation means for the game.
3. Alternatives: other readings that were considered and why they were ruled out, or that they have not been.
4. How to reproduce: enough for someone else with the same build to find the same thing, such as the function's entry address and the constant or string reference that leads to it.

A location is an address range or a file and offset range in the named build. Line numbers from a decompiler listing are never used as locations, because they change with the tool version and the analysis settings.

### Experiments

An experiment is a controlled run of the original, following the protocol in [Methodology](/methodology/#studying-the-original).

```yaml
id: EXP-COMBAT-004
title: Detection rate for a single hidden gang under Crackdown
status: observed
build: BLD-GOG-EN-1.1
environment: Windows 11 24H2, DxWnd 2.06.10 preset "chaos-16bit"
starting_state: saves/exp-combat-004-before.sav   # sha256 in the fixture
repetitions: 200
fixture: EXP-COMBAT-004.json
supports: [RULE-COMBAT-007]
```

Body sections:

1. Question: what the experiment is meant to settle.
2. Setup: how the starting state was produced, step by step, so it can be recreated without the save file when the save cannot be shared.
3. Procedure: the single input that changes, and everything held constant.
4. Observations: what was recorded in each run, with the hashes of captured screenshots and saves.
5. Results: counts and distributions for random outcomes, exact values otherwise.
6. Conclusion: what the results show, and what they do not.

The fixture is a JSON file with a published schema. It holds the starting state, the inputs, and the expected events and end state, and the implementation's test suite reads it directly.

### Formats

A format entry describes one file format, or one structure inside a file. Its front matter gives the file names or pattern it covers, the builds, the byte order, the total or record size, and the Kaitai file that defines it.

The body has a layout table with one row per field. Fields are never grouped into one row, and unknown bytes and padding get rows of their own:

| Offset | Size | Type | Name | Meaning | Status | Evidence |
|---|---|---|---|---|---|---|
| `0x00` | 20 | `char[20]` | `name` | Site name, ASCII, space-padded, may contain an early NUL | established | FND-DATA-002 |
| `0x14` | 2 | `INT16LE` | `id` | Site number, 0 to 21 | established | FND-DATA-002 |
| `0x16` | 2 | `INT16LE` | `resistance` | Starting resistance to Influence | observed | FND-DATA-004 |
| `0x18` | 2 | `INT16LE` | `support` | Support gained when the site is influenced | documented | SRC-MANUAL-1996 |

The last row of a record table gives the total size, which must match the Kaitai definition. After the layout come tables for enumerations and flags (`Value | Name | Meaning | Status | Evidence`), a section on differences between builds, a list of the fields whose purpose is still unknown, and a coverage statement: which files in which builds the definition has been checked against, and with what result.

The `.ksy` file next to the entry is the machine-readable definition, in [Kaitai Struct](https://doc.kaitai.io/user_guide.html). Its `doc` fields carry the meanings and its `doc-ref` fields carry the entry and finding IDs. Kaitai can generate parsers in more than a dozen languages and a diagram of the layout from the same file, which is why the standard uses it for every format.

### Rules

A rule entry describes one piece of game behaviour: a formula, a procedure, the order in which something is resolved. Its front matter gives the status, the builds, the findings and experiments it rests on, and related bugs and screens.

Body sections:

1. Summary: one or two sentences a player would understand.
2. When it runs: the phase, event or input that triggers it.
3. Inputs: the state it reads, by glossary name.
4. Procedure: the rule in pseudocode, including every random draw in order.
5. Outputs: the state it changes and the events or messages it produces, in order.
6. Edge cases: limits, ties, empty sets, overflow.
7. What the manual says: the manual's description with a page reference, and where it disagrees with the executable.
8. Differences between builds.
9. Open questions.

### Bugs

A bug entry records a defect in the original: behaviour the game's own design plainly did not intend. The format follows UESP's bug template, with fields added for what a rebuild needs to decide.

```yaml
id: BUG-COMBAT-002
title: Freeze after the detailed combat sequence ends
status: observed
builds: [BLD-GOG-EN-1.1]
impact: crash          # crash, save-corruption, rules, presentation or performance
player_reliance: none known
related: [RULE-COMBAT-012, SCR-COMBAT-003]
```

Body sections: symptom, trigger conditions, mechanism, how often it happens, whether players rely on it (with evidence, such as strategy guides or speedrun rules), and fixes that exist elsewhere (official patches, community patches, wrappers). What our rebuild does about the bug is recorded in the implementation's deviation log, not here, since another engine may choose differently.

### Screens

A screen entry describes one screen, panel or dialog: the resources it draws with their positions, its input regions, its states and the transitions between them.

The body has a table of drawn elements (`Element | Resource | Position | Shown when | Evidence`) and a table of input regions (`Region | Rectangle | Enabled when | Effect | Evidence`), where the effect names a rule or another screen. Text shown on the screen is referenced by resource and index, not copied. Timing of animations and transitions is given in frames or milliseconds, with its evidence.

## Checks

A script in each repository checks the spec on every change, and the build fails if any check fails:

- every file's front matter validates against the schema for its kind;
- every ID cited anywhere resolves to an entry, and no ID is used twice;
- every status is from the list above, and every entry above `unknown` cites evidence;
- an `established` entry cites at least one static finding and at least one dynamic finding or experiment;
- every Kaitai file compiles, and its sizes match the layout table in its entry;
- the indexes in `spec/README.md` (by kind, by area and by status) are regenerated and up to date.

The status index doubles as a progress report: how much of the game is established, how much is still a guess, and where the open questions are.

## Implementation side

The implementation keeps three things that refer to the spec without being part of it. Code comments and tests cite the spec IDs they implement or check, so a search for an ID finds everything that depends on it. The deviation log records every place the rebuild departs from the spec on purpose, with a `DEV-AREA-NNN` ID, the spec IDs it departs from, the reason, and the name of the setting that controls it, or `none` for a deviation that is always on. The parity matrix records how much of the spec the rebuild does.

### Parity matrix

The parity matrix is `PARITY.md` at the root of the game repository, next to `spec/`. It is a document of its own, outside `spec/`, because it describes our rebuild and the spec never does.

It has one row for every rule, format and screen entry in the spec that is not superseded. Behaviour without a spec entry cannot have a row, so work on anything new starts with an `unknown` entry in the spec. The file opens with a table counting rows by status. After it come the rows, under one `##` heading per area in the order of the area list in `spec/README.md`, sorted by ID within each area:

| Spec ID | Title | Spec status | Code | Tests | Deviations | Status | Notes |
|---|---|---|---|---|---|---|---|
| `RULE-COMBAT-007` | Police detection loop order | established | complete | `tests/combat/detection_order` | None | validated | |
| `RULE-COMBAT-012` | Detailed combat resolution | observed | partial | None | `DEV-COMBAT-001` | observed | Hit chance is a placeholder until EXP-COMBAT-009 is run. |
| `SCR-COMBAT-003` | Combat results panel | documented | none | None | None | documented | |

Spec ID, Title and Spec status are copied from the spec entry. Code is `none`, `partial` or `complete`, and `complete` means the rebuild does everything the entry describes. A placeholder in the code, such as a guessed formula, is marked with a `PLACEHOLDER: <spec ID>` comment, and a row whose ID appears in one cannot be `complete`. Tests lists only tests that compare the rebuild with evidence from the original: experiment fixtures, recordings made in the original, and distributions measured in it. They run with every deviation that has a setting switched off. Tests that compare the rebuild with an earlier version of itself are left out. Deviations lists the deviation log entries that touch the row. Notes says in plain words what is missing or wrong, and stays empty when there is nothing to say.

Status is worked out from the other columns:

| Status | When |
|---|---|
| the spec status | Code is `none` or `partial`. |
| `implemented` | Code is `complete` and Tests is empty. |
| `validated` | Code is `complete` and Tests lists at least one test. |

Manual play never counts as a test. The spec check script also checks `PARITY.md`: every eligible spec entry has exactly one row, the copied columns match the spec, every status follows the table above, every listed test exists and cites the row's ID, and the counts at the top are right. The test suite runs on every change, and a failing test fails the build, so a `validated` row on the main branch has passing tests.

## Licence

The spec is published under the MIT licence, the same as the code. It has its own copy in `spec/LICENSE`, so the `spec/` directory keeps its licence when it is copied to a community wiki or into another project.
