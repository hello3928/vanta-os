# Vanta UI components

Every screen in the mockup is built from these components. Each one lives in `mockup/js/components/` and extends `VComponent` (`mockup/js/core/VComponent.js`). That gives every component the same focus, sound and haptic behavior. The QML port keeps the same names (`VButton.js` → `VButton.qml`).

## Shared behavior (VComponent)

- **Focus:** `FocusManager` moves focus spatially with the D-pad, stick or arrow keys and sets `.is-focused`. Rows and lists remember their last focused item.
- **Sound and haptics:** moving focus plays the `move` click and a light `tick` rumble. Activating plays `select` and a short pulse. Components can override both.
- **Pointer and touch:** the mouse moves focus only after it really moves, so a resting cursor never steals focus from the controller. On touch, art tiles focus on the first tap and open on the second.
- **Events:** `focus`, `blur`, `activate`, `options` (X button), `change`, `edge`.
- **Settings binding:** `bind(key, apply)` keeps a control in sync with the settings store, wherever else the value changes.

## Components

| Component | What it is | Key options | Notes |
|---|---|---|---|
| `VButton` | Button | `label`, `icon`, `variant` (primary, secondary, ghost, danger), `size` (sm, md, lg), `block` | Focused buttons invert to white. Icon-only when there is no label. |
| `VTile` | Art you can focus: game capsule, landscape tile, card | `game` + `kind`, `fit` (cover, box), `shape` (capsule, landscape, card), `badge`, `glyph` | Lifts on a spring with a light sweep across the art. Retro box art sits whole over a blurred copy. |
| `VRow` | Titled horizontal shelf | `title`, `meta`, `align` (`start` pins focus to the left edge) | A focus group. |
| `VTabs` | Tabs | `tabs`, `value`, `variant` (line, chips, rail), `bumpers` | LB/RB step through tabs. The rail variant is the quick access menu's icon column. |
| `VToggle` | On/off row | `label`, `detail`, `icon`, `bind` | Separate on/off sounds. |
| `VSlider` | Value row | `min`, `max`, `step`, `format`, `bind` | Left/right adjust the value. The tick pitch follows the value. Drag or tap with a pointer. |
| `VChoice` | One-of-many row, drawn like a compact dropdown | `options`, `value`, `bind` | Left/right or A cycle through the options. |
| `VListItem` | Menu or info row | `label`, `detail`, `icon`, `badge`, `trail`, `chevron` | Used for menus, settings categories and status rows. |
| `VBadge` | Small status label | `text`, `tone` (default, accent, good, warn, muted), `icon` | Not focusable. |
| `VPanel` | Drawer from the left or right | `title`, `subtitle`, `side`, `rail`, `header` | Opens its own focus scope. B or tapping outside closes it. |
| `VDialog` | Modal with actions | `title`, `body`, `actions`, `stack`; `VDialog.confirm()` | For "are you sure?" steps. |
| `VToast` | Notification, bottom right | `VToast.show(text, { icon, tone })` | Plays the notify sound and rumble. |
| `VTopBar` | Vanta button and page title, status, quick access button | `title` | Pointer-only. Controllers use the Guide/View and Start buttons. |
| `VTextField` | Text input reachable by controller | `label`, `value`, `placeholder` | A starts typing (on-screen keyboard in the real OS); Enter or Esc finishes. |
| `avatarEl()` | Round profile picture cropped from game art | `profile`, size class | Used in the top bar, menu, setup and "Who's playing?". |
| `VHintBar` | Button prompts in the footer | `hints` | Glyphs match the controller in use (Xbox, PlayStation, Nintendo, Deck) or show keycaps on keyboard. `promptGlyph(action)` draws one anywhere. |

## Core modules

| Module | Job |
|---|---|
| `FocusManager` | Spatial navigation, focus scopes for drawers and dialogs, per-group memory, `data-nav-<dir>` routing |
| `Input` | Keyboard and Gamepad API mapped to console actions, with D-pad/stick auto-repeat |
| `Sound` | UI sound set. Synthesized in the mockup, loads designed WAVs with `Sound.useFiles()` |
| `Haptics` | Rumble patterns through the Gamepad API (SDL3 in the real OS) |
| `Settings` | Small reactive store. Every control and live effect reads from it |
| `GameMusic` | PS5-style game music: the selected game's official trailer fades in as music and a moving hero background, and follows you onto the game page |
| `glyphs` | Button prompt art for Xbox, PlayStation, Nintendo and Steam Deck controllers, plus keyboard keycaps. Detected from the controller, or forced in Settings |
| `i18n` | Interface language: `t(key)` lookups with English fallback, translated setting values, and Intl-based relative dates. English, Spanish, French, German, Portuguese (Brazil) and Japanese |
| `Profiles` | Profiles for "Who's playing?" (name and picture) |
| `motion` | One spring curve for all motion, eased scrolling, staggered entrances, and the sliding list highlight |
| `art/` | Loads real game art (Steam, libretro-thumbnails) with generated stand-ins as the fallback |

## Controls in the mockup

| Action | Controller | Keyboard |
|---|---|---|
| Move | D-pad / left stick | Arrow keys |
| Select | A | Enter / Space |
| Back | B | Esc / Backspace |
| Properties | X | X |
| Quick access menu | Start (☰) | Q |
| Main menu | Guide / View | M |
| Switch tab | LB / RB | [ and ] |
| Power | — | P |
