---
title: "Chaos Overlords: New Chrome"
meta_title: "Chaos Overlords: New Chrome - the 1996 strategy game on Windows, Linux and macOS"
description: "A rewrite of the 1996 turn-based gang-war strategy game, playable start to finish on Windows, Linux and macOS."
status: "high-fidelity-playable"
weight: 1
date: 2026-09-13T00:00:00Z
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

*Chaos Overlords* is a turn-based gang war. You hire gangs, send them out into a cyberpunk city, and try to end up owning more of it than the other five overlords before the payroll bankrupts you. It came out in 1996, and the people who played it have been reinstalling it every few years since.

New Chrome is a rewrite of the game. It loads the art, audio and data tables from your copy of the original and runs them on its own engine, so it plays natively on Windows, Linux and macOS.

## What works

You can play a full match in any of the ten original scenarios, against computer players, hot-seat, or online. Hiring, movement, combat, sector control, influence, research, bribes and upkeep follow the original rules as far as they have been recovered from the manual and the executable. Turns resolve deterministically, so a replay plays back the same game move for move. Online matches go through a separate coordination service.

## What is missing

It does not yet match the 1996 build rule for rule or pixel for pixel. The repository keeps a parity matrix that lists which mechanics have been checked against the original, which were reconstructed from watching it play, and which parts of the computer players still need work. The game is playable from setup to the end screen and has not reached 1.0.

## Getting it running

1. Own the original. The [GOG release](https://www.gog.com/en/game/chaos_overlords) is the easiest source.
2. Download the installer from [GitHub Releases](https://github.com/kibertoad/chaos-overlords-new-chrome/releases).
3. If setup does not find your install folder, point it there. It checks the original files and imports them locally. The original executable is never run.
