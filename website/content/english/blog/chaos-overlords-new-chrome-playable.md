---
title: "Chaos Overlords: New Chrome plays end to end"
meta_title: "Chaos Overlords: New Chrome is playable end to end"
description: "The 1996 cyberpunk gang-warfare strategy game now runs as a native rebuild on Windows, Linux and macOS, with deterministic turns, replays and online multiplayer."
date: 2026-09-13T00:00:00Z
categories: ["Releases"]
author: "kibertoad"
tags: ["chaos overlords", "monogame", "release"]
draft: false
---

[Chaos Overlords: New Chrome](/games/chaos-overlords-new-chrome/) is now playable from setup through to any of the original victory conditions, on Windows, Linux and macOS. It is a rebuild on MonoGame, written from scratch, reading art, audio and data tables from a copy of the 1996 original that you own.

## What that actually means

A full local match works. You hire gangs out of the mercenary pool, deploy them across the 8x8 sector grid, order moves, attacks, influence and research, and watch the economy decide whether your hiring decisions were clever or expensive. The victory conditions are there, timed and objective both.

Turn resolution is deterministic. That sounds like an implementation detail, and it is the single most useful property the rebuild has: the same inputs produce the same turn, every time, on every platform. Replays are exact rather than approximate. A bug report with a replay attached is a bug that can be reproduced and fixed, which is not something the original could offer.

Online multiplayer runs through a separate coordination service, which is new. The 1996 game spoke to a network stack that has not existed on a consumer machine in twenty years.

## What is not done

It is pre-1.0, and it is not pixel-perfect or rule-perfect against the original.

The repository keeps a parity matrix: every mechanic, with a note on whether it has been verified against the 1996 build, reconstructed from observed behaviour, or is still an open guess. The AI verification work and parts of the visual and input polish are on that list. So is a set of edge cases in combat resolution that only show up in specific gang combinations.

Calling it "high-fidelity playable" rather than "done" is deliberate. You can finish a game in it. You cannot yet assume every number matches.

## Running it

You need the original. The [GOG release](https://www.gog.com/en/game/chaos_overlords) is the straightforward source. The Windows installer from [GitHub Releases](https://github.com/kibertoad/chaos-overlords-new-chrome/releases) will find your install folder or ask for it, verify the assets and import them locally. The original executable is never launched and never needed.

Bug reports, parity disagreements and "actually the 1996 version did X" corrections all belong in [the issue tracker](https://github.com/kibertoad/chaos-overlords-new-chrome/issues). Corrections with a save file attached are worth their weight in chrome.
