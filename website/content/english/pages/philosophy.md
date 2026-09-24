---
title: "Philosophy"
meta_title: "Philosophy: why and for whom these games are rebuilt"
description: "The project has two goals of equal weight: getting overlooked games played again, and writing down how they work in enough detail that anyone can check or build on the result."
draft: false
---

This page will grow as the projects do. The two goals on it are already settled, and every restoration is judged against both.

## Get the games played again

Plenty of good games from the 90s and early 2000s sold modestly and dropped out of sight. Many of them are hard to get running well today. Chaos Overlords is a good example. On Windows 10 and 11, the GOG release in 16-bit colour mode draws white boxes where the artwork should be, and the detailed combat scenes turn into [white boxes making sounds](https://www.gog.com/forum/chaos_overlords/so_does_this_game_currently_work_on_modern_systems). Players [report](https://www.gog.com/forum/chaos_overlords/has_anyone_managed_to_get_this_working_on_windows_11_yet) that it only starts after they lower the colour depth and resolution, and that even then the taskbar covers part of the window or the bottom of the map is cut off. The CD music often does not play. The in-game help is a WinHelp file, a format Windows [stopped supporting after XP](https://www.gog.com/forum/chaos_overlords/help_menu_function_removed), and the multiplayer was written for IPX, which no current operating system ships. People who do get it working mostly rely on DxWnd presets passed around the forums. The first goal is to make games like that playable again, running natively on current machines without an evening spent on compatibility settings.

## Write down how they work

The second goal is complete and accurate technical documentation of each game's internals: file formats, rules, formulas, AI behaviour, timing, and the bugs that shipped. With that documentation, anyone can check whether a reimplementation matches the original instead of taking our word for it. It also outlives our code. Someone improving an existing runtime can use it to fix a mismatch, and someone starting a new engine can use it without repeating the reverse engineering.

## Both count equally

If we shipped a playable rebuild without the documentation, nobody could check it, and everything we learned would be locked inside one codebase. If we wrote the documentation and never shipped a game, hardly anyone would play the result. A release is unfinished until it has both.

## Using what we publish

The runtimes and their source code are published under the MIT licence. The technical documentation is published under Creative Commons Attribution 4.0, except for its machine-readable parts (format definitions, test fixtures and schemas), which are under MIT like the code. Anyone can use all of it without asking us, including in commercial products, as long as they credit the project.

One thing is forbidden: distributing a runtime from this project together with copyrighted assets from the original game, such as its art, audio, text, data tables or executables. That covers installers, archives, disk images and any other bundle. Our licence cannot permit this, because the assets were never ours to license. They belong to the game's copyright holders, and the only people who may bundle them are those holders and anyone who has their written permission. Everyone else ships the runtime alone, and players supply the game from a copy they own.

If you hold the rights to one of these games, you are welcome to bring it back to market on our runtime. We would be glad to help, and to provide technical support for the games if you would like us to. You can reach us through [Contacts](/contact/).

Game developers are welcome to study our source code and documentation and build commercial games on what they learn there.

How the work is done is described under [Methodology](/methodology/).
