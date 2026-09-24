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
  README.md        scope, standard version, integer width, area list, generated indexes
  LICENSE          licence texts and the files each one covers
  glossary.md      the names the spec uses for game concepts
  builds/          BLD-*.md   the exact original files the spec applies to
  sources/         SRC-*.md   manuals, FAQs, earlier tools and other outside sources
  formats/         FMT-*.md   file formats and memory structures, each with a matching .ksy definition
  rules/           RULE-*.md  game rules, formulas and procedures
  findings/        FND-*.md   individual pieces of evidence
  experiments/     EXP-*.md   controlled runs of the original, with EXP-*.json fixtures
    saves/         starting states for experiments, where they can be shared
  bugs/            BUG-*.md   defects in the original
  screens/         SCR-*.md   screens, panels and dialogs, with their input and sound
```

Every entry is one Markdown file named after its ID, with YAML front matter holding its fields and a body holding its sections. One entry per file keeps links stable, gives each entry its own history in git, and lets scripts read the whole spec without parsing prose.

`spec/README.md` holds, in this order: the scope, the version of this standard the spec follows, the default integer width if the game was built for a 16-bit machine, the area list as a table with the columns `Area | Covers`, and the generated indexes. `spec/glossary.md` has one `##` heading per term, spelled the way the pseudocode spells it, followed by what the term means and, where the game shows the concept to the player, the name the game uses for it. A term for a structure gives the ID of its format entry, and a term for a list gives the format ID of its elements and the order it keeps them in. A function or table defined in a rule is a term as well, and its entry gives the ID of that rule. So is every event or message a procedure emits, and its entry lists the arguments it carries, in order.

The front matter schemas, the fixture schema and the check script belong to the standard. They go in [refurbished-dinosaurs-toolkit](https://github.com/kibertoad/refurbished-dinosaurs-toolkit), the toolkit every restoration shares, next to the schemas it already has, and have not been added yet. A game repository starts from the [project template](https://github.com/kibertoad/refurbished-dinosaurs-template) and pins a version of them. The toolkit's major version is the version of this standard it checks, so pinning `1.x` means following version 1, and `spec/README.md` states the same number. This page describes version 1. A change that would make a spec that passes the version 1 checks fail them gets a new version number, listed under [Versions](#versions) with what changed and how to convert an existing spec. A change that every spec passing the old checks still passes, such as a new optional field, a new value in a field's list, or a check that no valid spec can fail, raises the toolkit's minor version and keeps the standard's number. A clarification that no check notices changes neither.

Each game's spec stands on its own, even when games share an engine and file formats. An entry that another game's spec already covers is written again in this one, and cites the other game's entry through a source entry like any other outside document. Until this game's own files or runs confirm it, the entry stays `sourced`.

The spec describes layouts and behaviour. It may quote individual values from the original as evidence, but it does not reproduce content: names, texts, images, sounds, maps, and the per-unit or per-item statistics a designer filled in. Those stay in the player's copy of the game, even when the executable holds them. Constants the code does arithmetic with are part of the rules and are written down in full. That includes the multipliers and thresholds in a formula, and tables in the executable's data that a formula indexes, such as a damage falloff curve or a sine table.

## Identifiers

Every entry has an ID of the form `KIND-AREA-NNN`, for example `RULE-COMBAT-007`. `KIND` is one of the directory prefixes above. `AREA` is a short subsystem name from the area list in `spec/README.md`, such as `RNG`, `COMBAT`, `AI` or `SAVE`, made of upper-case letters and digits and starting with a letter. It never contains a hyphen, so an ID splits into its parts at the hyphens. `NNN` is a number, zero-padded to three digits and written with more once an area passes 999, unique within its kind and area. Builds and sources use a short alias in place of area and number: `BLD-GOG-EN-1.1`, `SRC-MANUAL-1996`. An alias starts with an upper-case letter and contains only upper-case letters, digits, dots and hyphens.

Areas are added to the list and never removed or renamed, because renaming an area would rename every ID in it. An area whose name turns out to be a poor fit keeps it, and its row in the area list says what it covers.

An ID is never reused or renumbered once it is on the main branch. An entry that turns out to be wrong stays in place with status `superseded`, and its `superseded_by` field names what took its place: the corrected entry, the parts it was split into, or the entry it was merged into. When nothing takes its place, because a bug turns out to be intended or a mechanic turns out not to exist, `superseded_by` names the findings or experiments that show it. Anything that cited the old ID can still find out what happened to it. If two branches create the same ID, the one merged second renumbers its entry before it is merged.

## Status

Rules, formats, screens and bugs describe the original, and each carries one of these statuses:

| Status | Meaning | Must cite |
|---|---|---|
| `unknown` | Listed so that it is not forgotten, not yet studied. | Nothing. |
| `sourced` | Described from the manual or another outside source only. | At least one source. |
| `supported` | Backed by direct evidence from the original of one kind: static findings, or dynamic findings and experiments. | At least one finding or experiment. |
| `established` | A reading of the files and a run of the original agree. | At least one static finding, and at least one dynamic finding or experiment. |
| `disputed` | Pieces of evidence contradict each other. The body says which and how. | At least one entry in `conflicting`. |
| `superseded` | Replaced, or shown to be wrong, by the entries in `superseded_by`. | Nothing further. |

The first four form a scale, from `unknown` up to `established`. An entry that is not superseded must not cite a superseded entry in its `evidence`, `conflicting` or `related` fields. A superseded entry keeps the links it had when it was replaced, so its history stays readable.

Status is not tracked per build. An entry's status is what its evidence shows for the first build in its `builds` list, which is the build it was studied in most closely, and another build it lists may rest on less evidence. The entry's Differences between builds section says what was checked in each build.

The spec records how well the original is understood. How well our rebuild matches it is recorded in the [parity matrix](#parity-matrix), which uses the same statuses and adds `implemented` and `validated`. [OpenMW](https://wiki.openmw.org/index.php?title=Template:Formula) keeps the same split between analysis status and implementation status.

There is no separate confidence scale. An entry is as certain as its status says, and when part of an entry is less certain than the rest, that part goes in its own entry or in the entry's Open questions section.

Findings and experiments are evidence rather than claims, so they have a shorter list of their own:

| Status | Meaning |
|---|---|
| `recorded` | Written down by the person who found it. |
| `reproduced` | Repeated by someone other than the person in `recorded_by`, from the entry's own instructions, with the same result, and that person is named in `reproduced_by`. For a random outcome, the same result means a distribution that passes the experiment's own comparison with the recorded one. |
| `superseded` | Shown to be wrong. `superseded_by` names the entries that show it. |

A claim's status does not depend on whether its evidence has been reproduced, because a project with one person working on it could then never establish anything. The status index lists `established` entries that rest only on `recorded` evidence, which shows where a second person's time does the most good.

Builds and sources carry no status.

## Notation

Integer types use the [ModdingWiki names](https://moddingwiki.shikadi.net/wiki/UINT16LE): `UINT8`, `INT8`, `UINT16LE`, `INT16LE`, `UINT32LE`, `INT32LE`, and the `BE` forms where a file is big-endian. Signed types are two's complement. `FLOAT32LE` and `FLOAT64LE` are IEEE 754. `char[n]` is a fixed-length string whose encoding (`CP437`, `Windows-1252`, `ASCII`) and padding are stated in the field's meaning. `char[]` is a string that ends at its first NUL byte, which belongs to the field. `bits[n]` is an unsigned field of `n` bits packed inside a larger integer, with bit 0 as the least significant. `BYTE[n]` is an opaque block.

File offsets and addresses are hexadecimal with a `0x` prefix and upper-case digits. File offsets are padded to at least two digits (`0x1C`). How an address in code is written depends on the executable's format, which the build entry gives for each file:

- PE (32-bit Windows): the full virtual address with the file loaded at the image base its header gives, eight digits (`0x00478CD0`). A DLL that Windows moves elsewhere at run time is still addressed from its header's image base.
- LE and LX (32-bit DOS extenders such as DOS/4GW): the address the code has when each object is placed at the relocation base address its object table gives, in the same eight-digit form.
- MZ (16-bit DOS): `segment:offset` with four digits on each side and no prefix. The segment is the one the code has when the load image is placed at segment `0x1000`, which is where Ghidra puts it by default, so an address can be pasted straight into a Ghidra project (`3D72:0515`).
- COM (16-bit DOS, a program with no header): `segment:offset` in the same form, with the file's first byte at `1000:0100`, where DOS puts it after the program segment prefix. Ghidra imports a COM file as a raw binary, so that address is set as the base when importing it.
- NE (16-bit Windows): `segment:offset` in the same form, with the segment number from the segment table (`0003:0034`).

Overlay code has no fixed load address, so it is located by the name of the file that holds it, which may be the executable itself, and its offset in that file padded to eight digits: `GAME.OVL+0x0003A2F0`. Sizes and counts are decimal. Ranges are half-open and written with two dots, so `0x20..0x3C` covers `0x20` up to but not including `0x3C`.

Screen coordinates are pixels on the game's native canvas, with the origin at the top left. Every screen entry gives the canvas it is drawn on in its `resolution` field, which matters in a game with more than one. A rectangle is written `(x, y, w, h)`.

A resource is referenced by the file that holds it, with its path as the build entry writes it, and its place in that file: `PANELS.RES#12` for the entry at index 12, counted from 0 in the order the file's format entry defines, or `PANELS.RES#COMBAT` for a file whose entries have names. A resource in the resource section of a PE or NE executable is referenced by its type, without the `RT_` prefix, and its numeric ID or name: `Chaos Overlords.exe#BITMAP/132`, `Chaos Overlords.exe#STRING/1024`. Any other resource held in an executable is referenced by its address, or by the file and offset for overlay code.

Durations are in milliseconds or in ticks. A tick is one step of the game's own logic, and the tick rate is defined once, in a rule. A game whose logic runs off the display refresh (70 Hz in VGA mode 13h) says so in that rule.

Things that have not been identified get neutral names derived from where they are: `fn_00478CD0` for a function, `unk_2A` for a field at offset `0x2A`, `g_004C1F20` for a global. In 16-bit code the colon becomes an underscore: `fn_3D72_0515`. In overlay code the file name comes first, with every character in it other than a letter or digit, such as a dot or a space, turned into an underscore: `fn_GAME_OVL_0003A2F0`. Logic the game runs as bytecode in its own interpreter, such as SCUMM scripts or a compiled Lua chunk, sits in a data file, so an unidentified script is named from the file and its offset the same way: `scr_SCRIPTS_DAT_00001A40`. They are renamed only when a finding or experiment shows what they do. The zeldaret projects put it well: it is better to leave something unnamed than to name it wrongly.

A neutral name belongs to one build, since the same function or global usually sits at a different address in another. When a rule has to use something that has not been identified, the glossary gets an entry under its neutral name, giving the build the address comes from and the neutral names it has in other builds, and the rule lists it in its Open questions section. When a finding or experiment shows what it does, the glossary entry and every rule that uses it are renamed in the same change.

## Formulas and procedures

Rules are written in a small pseudocode whose behaviour is fixed:

- Blocks are marked by indentation. `=` assigns, and `let` in front of an assignment declares a local. `and`, `or` and `not` are the logical operators, and `and` and `or` stop at the first operand that decides the result, so a random draw on the right is not made when the left has already decided it. Branches are `if`, `else if` and `else`. Loops are `for each x in list`, which visits the list in its own order as the glossary defines it, `for i in a..b`, which counts from `a` up to but not including `b`, and `while`. `break` leaves the innermost loop, and `continue` starts its next pass. `emit Name(args)` produces an event or message. A line starting with `#` is a comment.
- `a.b` is the field `b` of the structure `a`, and `list[i]` is an element of a list, counted from 0. `[3, 5, 8]` is a list written out in full, and `[]` an empty one. `true` and `false` are the results of comparisons and logical operators, and storing one in an integer gives 1 or 0. A value stored as an integer counts as true when it is not 0, unless the rule says otherwise.
- Integer literals are decimal, or hexadecimal with a `0x` prefix. As in C, a decimal literal has the first of the default type and `INT32` that holds it, and a hexadecimal literal the first of the default type, its unsigned form, `INT32` and `UINT32`. A decimal value too large for `INT32` is written in hexadecimal. A literal with a decimal point is a `FLOAT64`.
- The other operators, from the tightest binding to the loosest: unary `-` and `~`; `*`, `/` and `%`; `+` and `-`; `<<` and `>>`; `&`; `^`; `|`; the comparisons `==`, `!=`, `<`, `<=`, `>` and `>=`; `not`; `and`; `or`. `&`, `|`, `^` and `~` are bitwise. Operators on the same level group from left to right. The bitwise operators bind tighter than the comparisons, as in Python, so `flags & 4 == 4` tests the bit, where C would compare first. Comparisons do not chain the way Python's do, and a rule never writes `a < b < c`. A rule adds parentheses wherever a reader coming from C could misread the grouping.
- `call RULE-COMBAT-012(attacker, defender)` runs another rule, whose Parameters section lists the values it takes, in that order. `return x` ends a procedure and gives `x` as its result, so `let damage = call RULE-COMBAT-012(attacker, defender)` uses it.
- A rule can define a function that other rules use, such as the generator's `roll(n)`, with `define roll(n: UINT16) -> UINT16:` followed by an indented body that ends in `return`. The types of the parameters and the result may be left out when they are the default integer type. Other rules call it as `roll(100)`, without `call`. A call to a rule or function on a line of its own runs it and discards the result.
- A table that more than one rule uses is defined once, in a rule, with `table falloff: UINT8[4] = [100, 75, 50, 25]` before its procedure, and the rule cites the address it was found at in its evidence like any other constant. Other rules use it by name.
- Function and table names are unique across the spec, and the glossary gives each one with the ID of the rule that defines it. The one exception is a rule split into one entry per group of builds: each of the resulting entries defines the same names, and the glossary entry lists all of them. Every rule a procedure calls, and every rule whose functions or tables it uses, is listed in its `related` field.
- The built-in functions are `min`, `max`, `abs`, and `count(list)` for the number of elements in a list. `append(list, x)` adds `x` at the end, `insert(list, i, x)` puts it at index `i` and moves the later elements up, `remove_at(list, i)` takes out the element at `i` and moves the later ones down, and `copy(list)` gives a new list with the same elements. `stable_sort(list, key)` puts a list in ascending order of `key(element)`, where `key` is the name of a function that returns an integer, and elements with equal keys keep the order they had. Many originals sort with an unstable algorithm such as the C library's `qsort`, and then the order of equal elements depends on the algorithm. A rule that sorts either shows that no two keys can be equal, or writes out the original's algorithm as a function of its own, or lists the order of ties in its Open questions section until it knows. A procedure does not change a list while a `for each` loop is visiting it. `floor`, `ceil` and `round_even` take a floating-point value and give an integer of the default type, rounded down, up, or to the nearest integer with ties going to the even one, which is what the x87 does by default.
- A type is given after a name, using the notation's types without the byte order: `count: UINT16`. A structure's type is its format ID: `gang: FMT-DATA-005`. On a `let` it gives the local its type: `let total: UINT8 = a + b`. A type name used as a function converts a value in place, `UINT8(a + b)`, the same way storing it would. Integers are signed 32-bit unless a type is given. Games built for 16-bit machines state their default width in `spec/README.md`.
- Integer operands are widened before an operation the way C widens them. An operand narrower than the default width becomes a signed value of the default width. If the operands still differ in width, the narrower one takes the type of the wider one, so a `UINT16` added to an `INT32` becomes an `INT32`, as C gives when a 16-bit `unsigned int` meets a `long`. Widening uses sign extension if the value's original type is signed and zero extension if it is unsigned. When a signed and an unsigned value of the same width then meet, the signed one is converted to unsigned first, and a rule where that changes the result says so.
- The result has the width of the widened operands and wraps on overflow at that width, as the original machine did. A rule that depends on overflow says so. Storing a value in a name or field of a narrower type keeps its low bits, so 300 stored in a `UINT8` becomes 44.
- `/` on integers truncates toward zero, and `%` takes the sign of the left operand. `>>` is an arithmetic shift on signed values and a logical shift on unsigned ones, so `x >> 1` and `x / 2` differ for negative `x`, as they did in the original. Where a shift count can reach the width of the value, the rule says what the original gives, because the 8086 uses the whole count and later processors keep only its low five bits. Where a divisor can be 0, the rule says what the original does then (a crash, a processor exception the game catches, a fixed result), or lists it as an open question until that is known.
- Floating-point values have the width the original stores them in. When an integer and a floating-point value meet in an operation, the integer is converted to the floating-point type first, and when two floating-point widths meet, the narrower one is widened. Converting a floating-point value to an integer truncates toward zero, and a rule where the original rounds another way uses `floor`, `ceil` or `round_even` at that point. Where the original computes in the x87's 80-bit precision and the result depends on it, the rule says so.
- `draw(gen)` is one raw value from the random number generator `gen`, exactly as the original's generator returns it. Each generator is specified once, in its own rule, and a game with a single generator may leave out the name. The ways the game reduces a raw value to a range, such as `roll(n)` for an integer from 0 to n - 1, are defined in the same rule as functions that do arithmetic on `draw`, because two reductions of the same draw give different numbers. Every draw appears explicitly and in the order the original makes it, because the order of draws decides whether a replay stays in sync. A draw whose result the original ignores is written on a line of its own, `draw(gen)` or `roll(6)`, since it still moves the generator on.
- A local is a parameter, a loop variable, or a name declared with `let` on its first assignment: `let total = a + b`. It lasts until the procedure returns, and it hides any glossary term with the same name, so a rule that needs the term gives its local another name. Since a local is always declared, adding a term to the glossary never turns an existing rule's local into game state. A name assigned without `let` that is not a local comes from the glossary, including the neutral names of things not yet identified, and assigning to it changes the game's state. Event and message names come from the glossary too.
- A field name after a dot comes from the Name column of the format entry for that structure, whose type the glossary or the rule's Parameters section gives. A name that holds a structure or a list refers to the one the game keeps, so `gang.hidden = false` changes the gang itself, and so does the same assignment in a rule that received `gang` as a parameter. Integers and floating-point values are copied, so assigning to an integer parameter changes only the called rule's copy.
- Constants from the executable appear by value, with the address they were found at in the rule's evidence. A table the code indexes is written as a list assigned to a local at the start of the procedure: `let falloff = [100, 75, 50, 25]`.

A procedure in this pseudocode reads like this (the rule is illustrative):

```text
# One detection pass, run at the start of each police phase
for each player in turn_order:
    for each gang in player.roster:
        if gang.hidden and roll(100) < gang.detection_chance:
            gang.hidden = false
            emit GangDetected(gang)
```

Only hidden gangs cost a draw here, which is the kind of detail the order of draws depends on.

The pseudocode describes what the game does in the spec's own terms. It is never a cleaned-up copy of decompiler output, and it never contains decompiler variable names, the structure of the original function, or addresses other than those inside the neutral names from the glossary.

## Entry types

Body sections appear in the order given for each type, each under a `##` heading. The heading is the text before the colon in the list item, or the whole item without its full stop if it has no colon. The examples use Chaos Overlords. The file size and hash in the build example are the real ones for the GOG release, and the other IDs, statuses, addresses and values are illustrative. A section with nothing to say is kept and says `None known.`, so a reader can tell an empty section from a forgotten one. Where it is certain that there is nothing, such as the Parameters of a rule that takes none, it says `None.` instead.

Links between entries go one way: a claim cites its evidence, and evidence does not list the claims that use it. The check script generates the reverse lists into the indexes. Every entry except builds and sources has these fields, and `superseded_by` is always present, as an empty list unless the status is `superseded`:

```yaml
id: FND-COMBAT-011
title: Police detection loop visits gangs in player order, then roster order
status: recorded
builds: [BLD-GOG-EN-1.1]
superseded_by: []
```

Each kind adds fields of its own, and the section for each kind below shows a complete example.

Rules, formats, screens and bugs also have `evidence`, the findings, experiments and sources they rest on, and `conflicting`, the evidence that contradicts them. Both are always present, and `conflicting` may only be non-empty when the status is `disputed`.

Rules, bugs and screens also have `related`, links to other claims, which go one way as well. A rule lists the rules it invokes and the formats it reads or writes. A bug lists the rules, formats and screens it occurs in. A screen lists the rules and screens its effects lead to. Formats have no `related` field: a format's links to other formats are the types in its layout table, and the check script reads them from there. The indexes carry every link in the other direction.

An entry with status `supported` or higher may list a build only if at least one finding or experiment it cites lists that build too. An `unknown` or `sourced` entry lists the builds it is believed to apply to. A finding lists a second build only when it was checked in that build as well, and then gives a location in each, or, for a finding that has no locations, says in its observation how it was checked in each. An experiment lists exactly one build. Running it in another build is a second experiment with its own fixture, and its Question section names the first.

When builds differ in a way that changes what an entry says (a different procedure, a different layout, a different set of states), the entry is split into one entry per group of builds that behave alike, and no build is listed in two of them. Each one's Differences between builds section names the others. That section otherwise records the differences that leave the entry true for every build it lists, such as code or data at another address.

### Builds

A build entry identifies one exact set of original files. Every other entry lists the builds it applies to, the way IESDP pages open with "Applies to" and MAME identifies every ROM chip by hash.

```yaml
id: BLD-GOG-EN-1.1
title: Chaos Overlords 1.1, English, GOG release
publisher_version: "1.1"
distribution: GOG
languages: [en]          # ISO 639-1 codes of the languages the build can be played in
files:
  - path: Chaos Overlords.exe
    format: PE            # MZ, COM, NE, PE, LE, LX, or data for a file that is not an executable
    size: 664576
    sha256: a1430159bbe20869e277a5000311344f4ec141ab77c96b385336617149e97d89
  # every file the spec uses, with its format, size and SHA-256
```

A `path` uses forward slashes and is relative to the directory the game is installed to. A file the game reads from its CD and never installs is written `CD:` followed by its path on the disc, or `CD1:`, `CD2:` and so on for a game on more than one disc.

Body sections:

1. Obtaining: how to get the build.
2. Compared with other builds: how it differs from the other known builds.
3. Other files: the files in the installation that are not game data (installers, wrappers, compatibility shims).

### Sources

A source entry records a document or tool from outside the project: the manual, a FAQ, an earlier reverse-engineering effort, a format page on a wiki.

```yaml
id: SRC-MANUAL-1996
title: Chaos Overlords manual
author: New World Computing
date: "1996"
location: https://archive.org/details/example   # URL or archive location
sha256: null              # set when the source is a file
licence: null             # set when it limits what may be quoted
```

Body sections:

1. Use: what the source is good for.
2. Known errors: where it is known to be wrong.

Sources are leads. A claim that rests only on sources has status `sourced`.

Text from a source is not copied into the spec beyond short quotations. Facts taken from it are restated in our own words and the source is cited. This matters most for wikis under share-alike licences, whose text cannot be relicensed under the [spec's licence](#licence).

### Findings

A finding is one piece of evidence from the original: something read in its files, or something seen while it ran. Rules, formats, screens and bugs cite findings as their evidence.

```yaml
id: FND-COMBAT-011
title: Police detection loop visits gangs in player order, then roster order
status: recorded
builds: [BLD-GOG-EN-1.1]
superseded_by: []
recorded_by: kibertoad
reproduced_by: []
method: static          # static or dynamic
locations:
  - build: BLD-GOG-EN-1.1
    file: Chaos Overlords.exe
    address: 0x00472775..0x00472A10   # or offset: for data files and overlay code
tool: Ghidra 12.1.3
```

`recorded_by` and `reproduced_by` hold GitHub usernames. The check script compares them, so it can tell that a `reproduced` finding was repeated by someone else.

A `static` finding comes from reading the original's files without running them: disassembly, decompilation, or a data file in a hex editor. A `dynamic` finding comes from the original running: a breakpoint, a memory watch, a trace. Dynamic findings also give the `environment`, in the same form as experiments. A run set up to answer a question, with a fixed starting state and repetitions, is an experiment and gets its own entry.

Body sections:

1. Observation: what is present, stated as facts. Constants, branch conditions, the order of calls, which fields are read or written, and the address of each.
2. Interpretation: what the observation means for the game.
3. Alternatives: other readings that were considered and why they were ruled out, or that they have not been.
4. How to reproduce: enough for someone else with the same build to find the same thing, such as the function's entry address and the constant or string reference that leads to it.

A location is a build, a file in that build and a range within it: an `address` range in the notation for the executable's format, or an `offset` range for a data file or for overlay code. A static finding has one location for each build it lists. Memory the game allocates while it runs has no fixed address, so a dynamic finding about it gives the address of the code that reads or writes it, and its observation names the structure and the field, by format entry ID once one exists. Line numbers from a decompiler listing are never used as locations, because they change with the tool version and the analysis settings.

A dynamic finding about what the player sees or hears, such as a frame count measured from a video capture, may have an empty `locations` list. Its observation then says how it was captured in each build it lists and gives the hash of each capture, and describes what was measured closely enough that someone else can record it again. The capture is not committed if it shows the game's images or plays its sound (see [Licence](#licence)). It remains a single observation: once the question needs a fixed starting state or repeated runs, it becomes an experiment.

### Experiments

An experiment is a controlled run of the original, following the protocol in [Methodology](/methodology/#studying-the-original).

```yaml
id: EXP-COMBAT-004
title: Which of two players' hidden gangs is detected first under Crackdown
status: recorded
builds: [BLD-GOG-EN-1.1]
superseded_by: []
recorded_by: kibertoad
reproduced_by: []
environment: Windows 11 24H2, DxWnd 2.06.10 preset "chaos-16bit"
starting_state: saves/EXP-COMBAT-004-before.sav   # new-game, or null when the save cannot be shared
repetitions: 200
fixture: EXP-COMBAT-004.json
```

Body sections:

1. Question: what the experiment is meant to settle.
2. Setup: how the starting state was produced, step by step, so it can be recreated without the save file when the save cannot be shared, and how the random state varies between runs.
3. Procedure: the input that is varied, and everything held constant. For a distribution, the varied input is the generator's state.
4. Observations: what was recorded in each run, with the hashes of captured screenshots and saves.
5. Results: counts and distributions for random outcomes, with the comparison a test applies to them, and exact values otherwise.
6. Conclusion: what the results show, and what they do not.

Running the same save again only gives a different result if the generator's state differs between runs. Many games store that state in the save, and reloading them gives the same outcome every time. The Setup section says how the state varies: the game reseeds itself from the clock when it loads, or the experimenter writes a chosen value into it before each run.

The fixture is a JSON file that follows the standard's fixture schema. It holds the starting state with the SHA-256 of its save, the inputs, and the expected events, by their glossary names, and end state. Where the generator's state can be read, it records the state at the start of each run, so a test can replay single runs as well as compare the distribution. For random outcomes it also holds the tolerance: the statistical test a comparison uses and its significance level. When the save cannot be shared, `starting_state` is `null`, the fixture still records the hash, and the Setup section is the only way to recreate the save. An experiment that starts from a new game has `starting_state: new-game` and no save hash, and its Setup section gives every choice made on the way into the game. The implementation's test suite reads the fixture directly.

### Formats

A format entry describes one file format, one structure inside a file, a structure the game keeps only in memory, such as its state block, or a message it sends over a network or serial link. A memory structure or a message has an empty `files` list, and its evidence locates it by the code that builds or reads it.

```yaml
id: FMT-DATA-002
title: Site records in SITES.DAT
status: sourced
builds: [BLD-GOG-EN-1.1]
superseded_by: []
files: ["SITES.DAT"]      # names or patterns, empty for a memory structure
byte_order: little        # little or big; memory structures use the machine's, little on a PC
size: 28                  # record size, or null when variable
definition: fmt_data_002.ksy   # null only while the status is unknown
evidence: [FND-DATA-002, FND-DATA-004, EXP-DATA-001, SRC-MANUAL-1996]
conflicting: []
```

Each item in `files` is matched against the `path` of the files in the build entries, where `*` stands for any run of characters other than `/`.

Body sections:

1. Layout: a table with one row per field.
2. Enumerations and flags: a table for each, with the columns `Value | Name | Meaning | Status | Evidence`.
3. Differences between builds.
4. Coverage: which files in which builds the definition has been checked against, and with what result.
5. Open questions: the fields whose purpose is still unknown, then anything else.

In the layout table, fields are never grouped into one row, and unknown bytes and padding get rows of their own. The last row of a record table gives the total size:

| Offset | Size | Type | Name | Meaning | Status | Evidence |
|---|---|---|---|---|---|---|
| `0x00` | 20 | `char[20]` | `name` | Site name, ASCII, space-padded, may contain an early NUL | established | FND-DATA-002, EXP-DATA-001 |
| `0x14` | 2 | `INT16LE` | `id` | Site number, 0 to 21 | established | FND-DATA-002, EXP-DATA-001 |
| `0x16` | 2 | `INT16LE` | `resistance` | Starting resistance to Influence | supported | FND-DATA-004 |
| `0x18` | 2 | `INT16LE` | `support` | Support gained when the site is influenced | sourced | SRC-MANUAL-1996 |
| `0x1A` | 2 | `INT16LE` | `unk_1A` | Purpose unknown. 0 in every record of the shipped file, and never read by the executable | established | FND-DATA-002, EXP-DATA-001 |
| `0x1C` | | | | Total size 28 | | |

Each row's status follows the same table as a whole entry, so the `established` rows cite a static finding and an experiment. A row's status covers what the row claims. A row whose purpose is unknown claims its offset, size and type, and whatever has been observed about its values and use, so it can be `established` while its purpose stays in the Open questions section, as `unk_1A` is here. Padding claims that the original never reads the bytes. The entry's own status is the lowest status among the rows of all its tables, layout and enumerations alike, which is why the example is `sourced`, and it is `disputed` if any row is. A `disputed` row's Evidence cell lists the evidence on both sides. The IDs on the side that contradicts the row go in the entry's `conflicting`, and every other ID cited in its tables goes in its `evidence`.

A field that holds another structure has that structure's format ID as its type (`FMT-DATA-003`). An array gives the element type and the count, either a number or the name of an earlier field that holds it (`INT16LE[22]`, `FMT-DATA-003[site_count]`). A field whose size depends on the data has that size in the Size column as an expression in the pseudocode's terms (`name_length`, `site_count * 28`). Every row after such a field leaves the Offset column empty, because its position follows from the rows before it, and the total row gives the size as an expression. A `char[]` field leaves the Size column empty, since only the data says where it ends, and a total row after one says `variable`. A field that exists only under a condition has the condition after its size: `2 if version > 1`.

An integer whose bits hold separate values gets a row of its own, followed by one row per group of bits with type `bits[n]` and the bit range, half-open, in the Offset column: `0x08 bits 0..4`, or only `bits 0..4` after a variable-size field, where the integer's own Offset is empty. Those rows leave the Size column empty and do not add to the total. Unused bits get a row as unknown bytes do.

A compressed block is a `BYTE[n]` row whose meaning names the rule that decompresses it and the format entry for what comes out. The decompression is a procedure like any other, so it is a rule.

The `.ksy` file next to the entry is the machine-readable definition, in [Kaitai Struct](https://doc.kaitai.io/user_guide.html). Kaitai only accepts lower-case identifiers with underscores, so the file and its `meta/id` use the entry ID in that form: `FMT-DATA-002` becomes `fmt_data_002.ksy`, and a definition that uses another one imports it by that name. Its `doc` fields carry the meanings, its `doc-ref` fields carry the entry and finding IDs, and `meta/license` names the licence. An integer split into bit fields is read as those fields, with `bN` types and `meta/bit-endian: le` in a little-endian format so that bit 0 is read first, and a compressed block names its rule in a `process` routine, which each parser implements from that rule. Kaitai can generate parsers in more than a dozen languages and a diagram of the layout from the same file, which is why the standard uses it for every format.

### Rules

A rule entry describes one piece of game behaviour: a formula, a procedure, the order in which something is resolved.

```yaml
id: RULE-COMBAT-007
title: Police detection visits gangs in player order, then roster order
status: established
builds: [BLD-GOG-EN-1.1]
superseded_by: []
evidence: [FND-COMBAT-011, EXP-COMBAT-004]
conflicting: []
related: [RULE-RNG-001, FMT-DATA-005]
```

Body sections:

1. Summary: one or two sentences a player would understand.
2. When it runs: the phase, event or input that triggers it.
3. Parameters: the values a `call` passes to it, in order, with their types.
4. Inputs: the state it reads, by glossary name.
5. Procedure: the rule in pseudocode, including every random draw in order.
6. Outputs: the value it returns and its type, then the state it changes and the events, messages and sounds it produces, in order.
7. Edge cases: limits, ties, empty sets, overflow.
8. What the sources say: each source's description with a page or section reference, and where it disagrees with the executable.
9. Differences between builds.
10. Open questions.

### Bugs

A bug entry records a defect in the original: behaviour the game's own design plainly did not intend. The format follows UESP's bug template, with fields added for what a rebuild needs to decide.

```yaml
id: BUG-COMBAT-002
title: Freeze after the detailed combat sequence ends
status: supported
builds: [BLD-GOG-EN-1.1]
superseded_by: []
impact: crash          # crash, save-corruption, rules, presentation or performance
intent: unintended     # unintended or unclear
player_reliance: unknown   # relied-on, not-relied-on or unknown
evidence: [EXP-COMBAT-006]
conflicting: []
related: [RULE-COMBAT-012, SCR-COMBAT-003]
```

The status says how well the behaviour itself is shown, the way it does for a rule. Whether the designers meant it is a separate judgement, recorded in `intent`. A behaviour that may have been a design decision is still recorded as a bug, with `intent: unclear` and the reasons on both sides in its Mechanism section. One that turns out to be intended is superseded by the findings that show it.

Body sections:

1. Symptom: what the player sees.
2. Trigger conditions: what has to happen for it to occur.
3. Mechanism: what goes wrong in the original.
4. Frequency: how often it happens under those conditions.
5. Player reliance: whether players rely on it, with evidence such as strategy guides or speedrun rules.
6. Fixes elsewhere: official patches, community patches, wrappers.
7. Differences between builds.
8. Open questions.

What our rebuild does about the bug belongs in the implementation's deviation log, because another engine may choose differently.

### Screens

A screen entry describes one screen, panel or dialog: the resources it draws with their positions, its input, its sounds, its states and the transitions between them. Its front matter holds the same fields as a rule's, plus the native canvas it is drawn on. Its tables cite evidence the same way a format's do: the IDs that contradict it go in `conflicting`, and every other ID cited in its tables goes in `evidence`. Its tables have no Status column, so the entry's status covers the whole screen, and a part that is less certain than the rest goes in its Open questions section.

```yaml
id: SCR-COMBAT-003
title: Combat results panel
status: sourced
builds: [BLD-GOG-EN-1.1]
superseded_by: []
resolution: 640x480
evidence: [SRC-MANUAL-1996]
conflicting: []
related: [RULE-COMBAT-012, SCR-MAP-001]
```

Body sections, each table with an `Evidence` column as its last:

1. Drawn elements: `Element | Resource | Position | Shown when`.
2. Mouse input: `Region | Rectangle | Enabled when | Effect`.
3. Keyboard input: `Key | Enabled when | Effect`.
4. Other input: `Device | Input | Enabled when | Effect`, for joysticks and anything else that is not the mouse or keyboard.
5. Sounds: `Sound | Resource | Played when`.
6. States: `State | Entered when | Left when`.
7. Timing: how long animations and transitions take, in milliseconds or ticks.
8. Differences between builds.
9. Open questions.

An effect names a rule or another screen. A key is named by what is printed on it on a US keyboard (`A`, `F1`, `Enter`, `Left`), with modifiers joined by `+` (`Ctrl+S`). Keys that work on every screen are described in a rule, and a game that reads scan codes, or behaves differently with another keyboard layout, says so in that rule. Text shown on the screen is referenced as a resource, in the [notation](#notation) for resources, and never copied into the entry.

## Checks

The check script runs in each game repository on every change, and the build fails if any check fails. Until the script is in the toolkit, reviewers go through the same list by hand:

- every file's front matter validates against the schema for its kind, its file name is its ID, and it sits in the directory for its kind;
- every body has its sections, under the headings given here, in order;
- every ID has the form for its kind, with an area from the area list where the kind has one, every ID cited anywhere resolves to an entry, and no ID is used twice;
- no entry that exists on the main branch has been deleted or renamed, and no area has been removed from the area list or renamed;
- every status is from the list for its kind, every entry cites what its status requires, counting only evidence that lists the first build in its `builds`, and every `reproduced` entry names someone in `reproduced_by` other than its `recorded_by`;
- every build a `supported` or `established` entry lists is covered by the evidence it cites, every static finding has a location for each build it lists, and every experiment lists exactly one build;
- no entry that is not superseded cites a superseded entry, every entry that is not superseded has an empty `superseded_by`, every superseded entry names what replaced or disproved it, and no chain of `superseded_by` links leads back to where it started;
- `conflicting` is empty unless the status is `disputed`, `related` links only to the kinds allowed for the entry, and every rule a procedure calls or takes a function or table from is in its `related` field;
- every name in a procedure that has the form of a neutral name, every name it assigns without `let` that is not a local, every function and table it uses other than the built-in ones, and every event it emits has a glossary entry, every field name whose structure has a known type is in that format entry's layout, and no procedure contains an address outside a neutral name;
- a format entry's status matches the rows of all its tables, the `evidence` and `conflicting` of a format or screen entry together cover every ID in its tables, and every resource a screen references is in a file that a format entry lists;
- every format entry's `definition` exists unless the status is `unknown`, every Kaitai file belongs to the format entry its name and `meta/id` give, every Kaitai file compiles, and its fixed sizes match the layout table in its entry;
- every experiment's `fixture` exists and validates against the fixture schema, every `starting_state` that names a save points to one in `saves/`, and every save there matches the hash in its fixture;
- the standard version in `spec/README.md` is the major version of the toolkit the repository pins;
- the indexes in `spec/README.md` (by kind, by area, by status, and for each entry the entries that cite or relate to it) are regenerated and up to date.

The status index doubles as a progress report: how much of the game is established, how much is still a guess, where the open questions are, and which `established` entries rest only on evidence nobody has reproduced yet.

## Implementation side

The implementation keeps three things that refer to the spec without being part of it. Code comments and tests cite the spec IDs they implement or check, so a search for an ID finds everything that depends on it. The deviation log records every place the rebuild departs from the spec on purpose. The parity matrix records how much of the spec the rebuild does.

The deviation log is `DEVIATIONS.md` at the root of the game repository. It has one `##` heading per deviation, and the heading is the deviation's ID. `DEV` is not a spec kind, but its IDs take the same `DEV-AREA-NNN` form and use the spec's area list. Under the heading comes a list with these items, in this order, and then any explanation in plain paragraphs:

```markdown
## DEV-COMBAT-002

- Departs from: BUG-COMBAT-002, RULE-COMBAT-012
- Reason: The original freezes after the detailed combat sequence ends.
- Setting: none
- Default: always on
- Dropped: no
```

Setting is the name of the setting that controls the deviation, or `none`. A deviation may have no setting only if it adds to the interface, or changes only what happens once the original would have crashed or hung, since nothing after that point can be compared with it. Any other deviation changes game state or something a test compares with the original, so it has a setting. Default is `always on` when there is no setting. Otherwise it is `on` for a fix of a bug whose `intent` is `unintended` and whose `player_reliance` is `not-relied-on`, and `off` for everything else, so a quirk that may be deliberate or that players rely on stays as it was unless the player changes it.

Deviation IDs are never reused or renumbered, the same as spec IDs. A deviation that is dropped keeps its heading, and its Dropped item gives the date and the reason in place of `no`, so a comment or row that cited it can still find out what happened.

### Parity matrix

The parity matrix is `PARITY.md` at the root of the game repository, next to `spec/`. It is a document of its own, outside `spec/`, because it describes our rebuild and the spec never does.

It has one row for every rule, format and screen entry in the spec that is not superseded. Behaviour without a spec entry cannot have a row, so work on anything new starts with an `unknown` entry in the spec. Bugs have no rows of their own: reproducing a bug is part of the rule, format or screen it occurs in, and not reproducing it is a deviation. The file opens with two tables, one counting rows by Status and one counting them by Code, since Status alone shows an `established` row the same way whether its code is missing or half written. After them come the rows, under one `##` heading per area in the order of the area list in `spec/README.md`, sorted by ID within each area. A cell with nothing in it says `None`:

| Spec ID | Title | Spec status | Code | Tests | Deviations | Status | Notes |
|---|---|---|---|---|---|---|---|
| `RULE-COMBAT-007` | Police detection visits gangs in player order, then roster order | established | complete | `tests/Combat.Tests/DetectionOrderTests.cs` | None | validated | None |
| `RULE-COMBAT-012` | Detailed combat resolution | supported | partial | None | `DEV-COMBAT-001` | supported | Hit chance is a placeholder until an experiment measures it. |
| `SCR-COMBAT-003` | Combat results panel | sourced | none | None | None | sourced | None |

Spec ID, Title and Spec status are copied from the spec entry. Code is `none`, `partial` or `complete`, and `complete` means the rebuild does everything the entry describes. A row whose spec status is `unknown` cannot be `complete`, since the entry does not describe anything yet. A placeholder in the code, such as a guessed formula, is marked with a `PLACEHOLDER: <spec ID>` comment, and a row whose ID appears in one cannot be `complete`. Tests lists test files by their path from the repository root, and only files whose tests compare the rebuild with evidence from the original: experiment fixtures, recordings made in the original, and distributions measured in it. For a format row, the evidence is the original files themselves: a test counts if it decodes every file the entry lists from a supported build, reads every byte, and gets the same value for every field as the entry's Kaitai definition. Decoder tests on synthetic files, which cover edge cases the shipped files never reach, compare the rebuild with the spec rather than with the original, and are left out of the column along with tests that compare the rebuild with an earlier version of itself. Listed tests run with every deviation that has a setting switched off. Deviations lists the deviation log entries that touch the row. Notes says in plain words what is missing or wrong.

Status is worked out from the other columns:

| Status | When |
|---|---|
| the spec status | Code is `none` or `partial`. |
| `implemented` | Code is `complete` and Tests is `None`. |
| `validated` | Code is `complete`, Tests lists at least one file, and the spec status is `supported` or `established`. |

A row where Code is `complete`, Tests lists a file and the spec status is `sourced` or `disputed` fails the check. The spec is behind: the evidence behind those tests belongs in the spec entry first.

Manual play never counts as a test. The spec check script also checks `PARITY.md`: every eligible spec entry has exactly one row, the copied columns match the spec, every status follows the table above, every listed test file exists and mentions the row's ID, no `complete` row has its ID in a `PLACEHOLDER:` comment, every listed deviation exists in `DEVIATIONS.md`, and the counts at the top are right. It checks the rest of the implementation's references too. Every spec ID and deviation ID in the code, the tests, `PARITY.md` and `DEVIATIONS.md` must resolve, and a citation of a superseded spec entry fails the check until it is moved to what replaced it, so code does not keep pointing at a claim that was withdrawn. Deviation IDs are unique and follow the ID form, every deviation has its list items in order, its Default follows the rules for deviations above, and no deviation heading that exists on the main branch is removed. Most listed tests need the original game's files, which cannot be committed: the art for a screen, the per-unit statistics a combat fixture depends on, the files a decoder reads. Tests find them in a directory named by the `GAME_DIR` environment variable, check them against the hashes of a supported build, and report themselves as skipped when there is no copy. The test suite runs on every change and writes a report of which tests passed, failed or were skipped. A failing test fails the build. On the main branch, CI runs with a copy that a maintainer owns, kept on a self-hosted runner or in storage only the maintainers can read, never in the repository or a published build artifact, and the check fails if any test listed for a `validated` row was skipped. A pull request from a fork runs without a copy, and there the check lists those rows as unverified without failing, so the merge to main is what confirms them.

## Licence

The Markdown files in `spec/`, entries as well as `README.md` and `glossary.md`, are published under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0). Anyone can copy and adapt them, commercially or not, as long as they credit the project. That includes adding them to a wiki under CC BY-SA, the licence many community wikis use. The licence covers our own text. Short quotations from manuals and other sources, and values quoted from the original, remain under their owners' terms.

The machine-readable parts (Kaitai definitions, experiment fixtures, schemas and scripts) are code, and are published under the MIT licence, the same as the rebuild, so they can go into another engine's source tree without a second licence to track.

Save files in `saves/` are written by the original game, so neither licence covers them. A save that contains the game's own text or images is not committed. Screenshots, video and audio captured from the original are not committed either, since they show the game's images or play its sound. Entries record their hashes, and the entry's text says how to capture them again.

`spec/LICENSE` holds both texts and says which files each covers, and which are covered by neither, so the `spec/` directory keeps its licence when it is copied to a community wiki or into another project.

`PARITY.md` and `DEVIATIONS.md` describe the rebuild and sit outside `spec/`, so they are under the game repository's own licence, the same as the code.

## Versions

| Version | Changes | Converting a spec |
|---|---|---|
| 1 | The first version. | Nothing to convert from. |
