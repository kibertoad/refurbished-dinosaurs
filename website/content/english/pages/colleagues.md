---
title: "Colleagues"
meta_title: "Colleagues of Refurbished Dinosaurs"
description: "Other projects that keep old PC games running, including a DOS emulator, open-source engines, a community fork of Machines: Wired for War and a remaster of Midwinter."
draft: false
---

We are not the only people keeping old PC games alive. These are projects we follow and recommend.

## rust-dos

[rust-dos](https://github.com/dividebysandwich/rust-dos) is a DOS emulator written in Rust that covers everything from early DOS games to Windows 95. It emulates CPUs from the 386 to the Pentium II, with a dynamic recompiler for x86-64 and ARM64 hosts, and it brings its own DOS, so you do not need DOS or BIOS images. It boots Windows 3.x and 95 from a disk image. The hardware it emulates goes as far as the Gravis Ultrasound, the MT-32 and 3dfx Voodoo cards, and IPX networking lets you play over a LAN or the internet. It runs as a desktop program, in a browser through WebAssembly, and as a libretro core. It also supports VR headsets. The author describes it as a work in progress.

An emulator keeps the original program running as it was shipped, which a reimplementation cannot do. If a game you care about is not on our list, rust-dos is a good place to try it.

## Reimplementations

Each of these projects writes a new engine for a game or a series and loads the data files from a copy you own. Two of them follow clean-room rules, as we do:

- [nanolathe](https://github.com/nanolathe-gg/nanolathe) reimplements Total Annihilation (1997) in Go, with skirmish, campaign and online play. It is under active development, and online play and save compatibility are not finished.
- [openlem3d](https://github.com/danlehmann/openlem3d) reimplements Lemmings 3D (1995) in Rust with Bevy. All 100 levels and the 20 practice levels are playable, and its behaviour is still being checked against the original.

The others are independent open-source engines that do not describe their work as clean-room:

- [openblack](https://github.com/openblack/openblack) is an engine for Black & White (2001).
- [OpenEnroth](https://github.com/OpenEnroth/OpenEnroth) is an engine for Might and Magic VI, VII and VIII (1998 to 2000).
- [OpenLoco](https://github.com/OpenLoco/OpenLoco) is an engine for Chris Sawyer's Locomotion (2004).
- [CorsixTH](https://github.com/CorsixTH/CorsixTH) is an engine for Theme Hospital (1997).
- [OpenXcom](https://github.com/OpenXcom/OpenXcom) is an engine for UFO: Enemy Unknown (1994) and X-COM: Terror from the Deep (1995).
- [fheroes2](https://github.com/ihhub/fheroes2) is an engine for Heroes of Might and Magic II (1996).
- [VCMI](https://github.com/vcmi/vcmi) is an engine for Heroes of Might and Magic III (1999).
- [OpenApoc](https://github.com/OpenApoc/OpenApoc) is an engine for X-COM: Apocalypse (1997).
- [OpenMW](https://gitlab.com/OpenMW/openmw) is an engine for The Elder Scrolls III: Morrowind (2002).
- [OpenRCT2](https://github.com/OpenRCT2/OpenRCT2) is an engine for RollerCoaster Tycoon 2 (2002).
- [Exult](https://github.com/Exult/exult) is an engine for Ultima VII: The Black Gate (1992) and Serpent Isle (1993).
- [UAlbion](https://github.com/csinkers/ualbion) reimplements Albion (1995) in C#. Exploration, dialogue, inventory, saving and music work; combat, magic and most of the 3D areas' event handling do not yet.
- [Overtone](https://github.com/ForNeVeR/overtone) is a remake of The Tone Rebellion (1997) in F#. It is early in development: so far it extracts and renders the game's resources and documents their file formats, and the game itself is not playable yet.

## Source ports

[Machines: Wired for War](https://github.com/WiredForWar/machines) is a community fork of the game's released source code, published with permission from rights holder Night Dive Studios. It adds UI scaling and keyboard shortcuts, fixes LAN play issues and crashes, and provides Windows builds and a Linux Flatpak.

[JA2 Stracciatella](https://github.com/ja2-stracciatella/ja2-stracciatella) ports Jagged Alliance 2 (1999) using its released source code. It fixes bugs, improves stability and supports mod development. You need the data files from a copy of the original game to play.

[JonoF's Witchaven Port](https://github.com/jonof/jfwhaven) ports Capstone Software's Witchaven using the released game code and JonoF's version of the Build engine. It runs on Windows, Linux, BSD and macOS, and needs the original game's data files.

[JonoF's TekWar Port](https://github.com/jonof/jftekwar) does the same for William Shatner's TekWar, also by Capstone Software. It uses JonoF's Build engine port, supports Windows, Linux, BSD and macOS, and needs the original game's data files. JonoF describes both as "no-promises" ports.

## Remasters

[Midwinter Fan Remaster](https://store.steampowered.com/app/5056170/Midwinter_Fan_Remaster/) rebuilds Mike Singleton's Midwinter (1989) in Unreal Engine 5. It is one person's work, made with the permission of the Singleton family, and it sells on Steam as a standalone game for Windows. You can switch between the original pixel art and new artwork. It entered Early Access in September 2026, and the developer plans about six more months of work on enemies and balance before 1.0.
