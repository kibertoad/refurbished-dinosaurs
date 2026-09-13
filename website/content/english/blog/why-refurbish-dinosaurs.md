---
title: "Why rebuild a game nobody remembers"
meta_title: "Why rebuild obscure old games from scratch"
description: "Emulation keeps old games running. It does not keep them alive. The case for rebuilding obscure 90s titles on modern engines instead of wrapping them."
date: 2026-09-10T00:00:00Z
categories: ["Restoration"]
author: "kibertoad"
tags: ["restoration", "preservation", "emulation"]
draft: false
---

There are two ways to keep a 1995 game running in 2026. You can wrap it: DOSBox, a compatibility shim, a virtual machine with a frozen driver stack. Or you can rebuild it: read the data files, work out the rules, and implement the thing again on an engine that will still compile in ten years.

Wrapping is cheaper and it is the right call most of the time. GOG has built a business on it, and the results are good enough that most people never think about the layer underneath.

## Where wrapping stops

The trouble starts when you want the game to be anything other than exactly what it was.

A wrapped game runs at the resolution it was written for, with the input assumptions it was written for. It cannot use your second monitor, your gamepad, or your 1440p display without an upscaler making the decision for it. Its multiplayer speaks IPX to a network that no longer exists. Its AI cheats in the specific ways a 1995 CPU budget forced it to cheat, and no one can change that, because the AI is machine code and the person who wrote it moved on three decades ago.

Most importantly: a wrapped game cannot be fixed. Every bug the original shipped with is permanent. For a well-tested classic that is fine. For the obscure stuff, the games that sold twelve thousand copies and got one patch, it is not. Those games are frequently half-finished, and the half that is finished is often excellent.

## What rebuilding buys

A rebuild is a fresh implementation of the original rules against the original data. The art, audio and tables come from the copy you own. Everything else, the turn loop, the combat resolution, the pathing, the AI, gets written again in a language that still has a compiler.

Once that exists, the game stops being a museum piece:

- It runs natively on Windows, Linux and macOS, because the engine is portable and nothing underneath it is x86-specific.
- Multiplayer can speak something other than IPX.
- Deterministic turn resolution makes replays exact, which makes bug reports reproducible, which makes fixing things possible at all.
- The rules are readable. When a mechanic turns out to be broken, you can see why.

## The part where it gets hard

The obvious objection is that this is much more work than it sounds, and the objection is correct.

Reconstructing rules from a binary and a pile of data tables is slow. Some behaviour is documented in a manual that lies. Some is documented in a manual that tells the truth about a version that shipped later. Most of it is not documented at all, and has to be inferred by playing the original, recording what happens, and writing tests that encode the result.

This is why every project here carries a parity matrix: a list of which mechanics have been verified against the original, which are reconstructed from observation, and which are still guesses. A restoration that claims to be faithful without publishing that list is asking to be taken on faith. These will not.

## The scope

Obscure strategy and RPG titles from the 90s, the kind with more systems than budget. First up is [Chaos Overlords](/games/chaos-overlords-new-chrome/), which is already playable end to end. [Conqueror A.D. 1086](/games/conqueror-ad-1086/) and SSI's [Dark Sun duology](/games/dark-sun-series/) are next in the queue.

Nothing here ships original assets. Bring your own copy.
