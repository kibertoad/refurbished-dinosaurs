---
title: "Chaos Overlords: New Chrome"
meta_title: "Chaos Overlords: New Chrome - a modern restoration"
description: "A from-scratch rebuild of the 1996 cyberpunk gang-warfare strategy game, playable end to end on Windows, Linux and macOS."
status: "high-fidelity-playable"
weight: 1
date: 2026-09-13T00:00:00Z
engine: "MonoGame (C#)"
platforms: ["Windows", "Linux", "macOS"]
repo: "https://github.com/kibertoad/chaos-overlords-new-chrome"
store: "https://www.gog.com/en/game/chaos_overlords"
original:
  title: "Chaos Overlords"
  year: 1996
  developer: "Stick Man Games"
  publisher: "New World Computing"
draft: false
---

Six crime overlords, an 8x8 grid of city sectors, and a hiring pool of mercenary gangs with wildly uneven loyalty. *Chaos Overlords* came out in 1996, sold modestly, and then quietly became the kind of game people reinstall every few years and cannot quite explain to their friends.

**New Chrome** is a rebuild of it on MonoGame, written from scratch. It reads the art, audio and data tables from a copy of the game you own and runs them under a new engine, which is why it works on machines that stopped shipping 16-bit compatibility two decades ago.

## What works

A full local match is playable from setup through to any of the original victory conditions. Gangs are hired, deployed, moved, ordered to attack, influence or research, and they take their cut of the sector income whether or not you approve of their performance. Turn resolution is deterministic, which makes replays exact rather than approximate, and online multiplayer runs through a separate coordination service.

## What is still being chased

It is not pixel-perfect or rule-perfect against the 1996 build yet. The repository keeps a parity matrix listing exactly which mechanics have been verified against the original, which are reconstructed from observed behaviour, and which corners of the AI still need work. That list is the honest answer to "is it finished": it is broadly playable, pre-1.0, and the gaps are written down rather than glossed over.

## Getting it running

1. Own the original. The [GOG release](https://www.gog.com/en/game/chaos_overlords) is the easiest source.
2. Grab the installer from [GitHub Releases](https://github.com/kibertoad/chaos-overlords-new-chrome/releases).
3. Point the setup at your install folder if it does not find it. Assets are verified and imported locally, and the original executable is never needed.
