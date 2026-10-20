# Vanta OS

A console-style gaming OS for x86 PCs and handhelds. It boots straight into a controller-first interface, plays Steam games through Proton, and keeps emulated games in the same library.

**Status:** design phase. This repo holds the tech stack, the interactive UI mockup and the logo directions.

## What's here

| Path | What it is |
|---|---|
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | Recommended stack, gaming tweaks, interface direction, roadmap |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | The reusable UI components and controls |
| [mockup/](mockup/) | Clickable UI mockup (plain HTML/CSS/JS modules, no build step) |
| [brand/](brand/) | Logo directions as SVG, generated from `mockup/js/brand.js` |
| [tools/export-logos.mjs](tools/export-logos.mjs) | Regenerates `brand/` |

## Run the mockup

The mockup uses ES modules, so serve it over HTTP rather than opening the file directly:

```bash
npx http-server@14.1.1 mockup -p 4173 -c-1
```

Then open http://localhost:4173. Use a controller, the keyboard (arrows, Enter, Esc, Q, M, [ ]), a mouse or touch. `logos.html` compares the three logo directions.

## Regenerate the logo files

```bash
node tools/export-logos.mjs
```

All game titles and art in the mockup are made up and generated in code.
