---
title: "Technology"
meta_title: "Technology: the engine, tools and servers behind the restorations"
description: "What the restorations are built with: C# on .NET 10 and MonoGame, xUnit tests, Ghidra for reading the original executables, and a TypeScript server for online play."
draft: false
---

Every restoration uses the same stack. They all start from one [project template](https://github.com/kibertoad/refurbished-dinosaurs-template), so a fix to the build, the installers or the tests in one repository can be carried over to the others.

## The game

The games are written in C# on .NET 10 with [MonoGame](https://monogame.net) 3.8. We use its DesktopGL target, which draws through OpenGL and plays sound through OpenAL, and the same code builds for Windows, Linux and macOS.

Each game is split into the same projects. The rules live in a core library with no reference to MonoGame, so the whole simulation can run in tests and command-line tools without opening a window. A second library reads the original file formats. The MonoGame project on top draws the screens and handles input, and separate command-line tools import and inspect the original files.

MonoGame's content pipeline goes unused, because there is no content of our own to build. Textures and sounds are created at runtime from the files the importer took from your copy of the game. The formats of the era get decoders written in C#: Smacker video, PCX images, WinHelp help files, and CD images in ISO 9660 and CUE/BIN form.

For everything else we use the .NET standard library where it can do the job: System.Text.Json for settings and data, Brotli for replay files, and XxHash128 to fingerprint the game state. A fingerprint is how two machines, or the rebuild and a recording, show that they reached the same state.

## Importing the original

The importer checks every file against a SHA-256 manifest of the supported editions before it copies anything, and writes the result to a folder outside the repository. A script in each repository fails CI if original assets or analysis output ever end up in git.

## Tests

Tests use [xUnit](https://xunit.net) 4 on Microsoft Testing Platform, with xUnit's own assertions and no mocking library. Because the core has no graphics dependency, most tests run the real rules on a real game state.

Files from the original cannot be committed, so the decoders are tested on synthetic files that the tests build themselves.

Two build rules apply everywhere: compiler warnings are errors, and a source file over 1,000 lines fails the build.

## Reverse engineering

[Ghidra](https://github.com/NationalSecurityAgency/ghidra) runs headless, driven by small Java scripts kept in the repositories. The scripts write size-capped reports into a folder git ignores, and the Ghidra project itself stays on the researcher's machine. Other scripts compare two editions of the same executable with Ghidra's Version Tracking, which is how a finding from one release gets carried over to another.

Some executables need more than Ghidra. DOS games built with a DOS extender ship as 32-bit LE executables, which Ghidra's importer maps wrongly, so for those we use our own LE loader and the [Iced](https://github.com/icedland/iced) disassembler. When a behaviour has to be watched rather than read, a small harness built on the Windows debugging API launches the original executable, sets breakpoints at chosen addresses and writes what it sees as JSON. A Python script checks that every address cited in the documentation exists in the executable it is said to come from.

The general-purpose runtime tools we are still trying out are listed under [Methodology](/methodology/#studying-the-original).

## Online play

Chaos Overlords is the first restoration with online play, and its server is written to be reused by the others. It is TypeScript on [Hono](https://hono.dev). Matches run in lockstep: every player's machine runs the full simulation, and the server runs none of it. The server collects each turn's orders until every player has submitted, releases them all at once, and compares the state fingerprints the clients report back. If they disagree, the host uploads a snapshot and the other players resync from it. Orders go up as HTTP requests, and the match log comes down as server-sent events.

The same server code runs in two places. The public server at chaos-overlords.dinorefurb.com is a Cloudflare Worker that keeps matches in D1, uses one Durable Object per match to push events and enforce turn deadlines, and stores uploaded bug reports in R2. The Node.js build runs on SQLite or PostgreSQL, so anyone can host their own server. Both use [Drizzle](https://orm.drizzle.team) for the database.

The API is defined once as [valibot](https://valibot.dev) schemas with [toad-contracts](https://github.com/kibertoad/toad-contracts). The C# types the game uses to talk to the server are generated from those schemas, and CI fails if the generated code is out of date. Server tests run on [Vitest](https://vitest.dev), against SQLite, PostgreSQL and a local copy of the Cloudflare runtime. The server packages are published to npm under `@chaos-overlords`.

## Builds and releases

GitHub Actions builds and tests every push on Windows, Linux, and macOS on both Intel and Apple Silicon. Releases are self-contained, so you do not need .NET installed to play. Windows gets an [Inno Setup](https://jrsoftware.org/isinfo.php) installer, Linux a `.deb` package and macOS a `.pkg`, and CI installs and uninstalls each one before a release goes out.

The Chaos Overlords Windows builds are code-signed, and its Linux packages will have detached GPG signature in the future. The macOS packages are not signed or notarized yet, so macOS will warn you before opening them.
