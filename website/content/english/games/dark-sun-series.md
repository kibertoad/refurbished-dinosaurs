---
title: "Dark Sun: Shattered Lands & Wake of the Ravager"
meta_title: "Dark Sun series restoration"
description: "SSI's Athas duology, with its Gladiators, Psionicists and famously hostile desert. Work has started on Wake of the Ravager, which is not playable yet."
status: "early-prototype"
weight: 2
date: 2026-09-13T00:00:00Z
repo: "https://github.com/kibertoad/dark-sun-wake-redux"
store: "https://www.gog.com/en/game/dungeons_dragons_dark_sun_series"
original:
  title: "Dark Sun: Shattered Lands / Wake of the Ravager"
  year: 1993
  developer: "Strategic Simulations, Inc."
  publisher: "Wizards of the Coast / SNEG"
draft: false
---

Athas is a world where water is currency, metal is rare enough to be a plot point, and the sorcerer-kings have been in charge long enough that nobody remembers an alternative. SSI built two games in it: *Shattered Lands* (1993), where escaped slaves turn into a rebellion, and *Wake of the Ravager* (1994), which sends the same party on toward Ur Draxa and the Dragon.

Both use a tactical turn-based engine with a party system that carries characters across the two titles, which makes them an interesting restoration target: the save format has to survive the jump as well.

The work started with the second game, in [Dark Sun: Wake of the Ravager Redux](https://github.com/kibertoad/dark-sun-wake-redux). It reads the resources from your copy into a local pack and runs them on its own engine. So far the game starts in Tyr, the party leader walks the map, and the game menu and the character, inventory and spell screens open, some of them without all of their contents. Conversations, combat and the rest of the campaign are not there yet. *Shattered Lands* has not been started.

The repository's [spec](https://github.com/kibertoad/dark-sun-wake-redux/tree/main/spec) follows the [documentation standard](/documentation-standard/), and the [parity matrix](https://github.com/kibertoad/dark-sun-wake-redux/blob/main/PARITY.md) says how much of each spec entry the rebuild does. In September 2026 it covered 140 rules, formats and screens: the code does all of 25 and part of 49. The work is planned and tracked under the [work protocol](/work-protocol/).

The [GOG bundle](https://www.gog.com/en/game/dungeons_dragons_dark_sun_series) ships both games and is the supported source of assets.
