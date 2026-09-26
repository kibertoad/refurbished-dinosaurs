---
title: "Conqueror A.D. 1086"
meta_title: "Conqueror A.D. 1086 restoration"
description: "Norman England as a fief-management game with real-time battles and first-person jousting. The whole campaign can be played in the rebuild, which does not yet follow the original rule for rule."
status: "limited-fidelity-playable"
weight: 1
date: 2026-09-13T00:00:00Z
repo: "https://github.com/kibertoad/reconqueror1086"
store: "https://www.gog.com/en/game/conqueror_ad_1086"
original:
  title: "Conqueror A.D. 1086"
  year: 1995
  developer: "Software Sorcery"
  publisher: "Activision"
draft: false
---

*Conqueror A.D. 1086* is three games wearing one trenchcoat: a strategic campaign to take England, real-time tactical battles over the fiefs you claim, and a first-person jousting tournament that exists mostly so you can lose your horse in front of your peers. Very little from 1995 tried this much at once, and almost nothing that did survived the move off DOS in playable shape.

[ReConqueror A.D. 1086](https://github.com/kibertoad/reconqueror1086) is the rebuild. It imports the art, music, speech and video from your copy of the original and runs them on its own engine. The campaign can be played from character creation to either ending, through the estate, tournaments, field battles and castle assaults. Parts of it, such as the scheduler that moves armies on the strategic map, still work from what the game was seen to do and are being replaced by rules recovered from the executable.

The repository's [spec](https://github.com/kibertoad/reconqueror1086/tree/main/spec) follows the [documentation standard](/documentation-standard/), and the [parity matrix](https://github.com/kibertoad/reconqueror1086/blob/main/PARITY.md) says how much of each spec entry the rebuild does. In September 2026 it covered 200 rules, formats and screens: the code does all of 56 and part of 122, and none has yet been checked by an automated test against evidence from the original.

There is no release yet. Until there is, the repository's README explains how to run it from source, which needs the .NET SDK. It also needs the [GOG release](https://www.gog.com/en/game/conqueror_ad_1086) of the original and will not start without it.
