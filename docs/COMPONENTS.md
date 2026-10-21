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
| `VButton` | Button (SteamOS corners) | `label`, `icon`, `variant` (play, primary, secondary, ghost, danger), `size` (sm, md, lg), `block` | Focused buttons invert to near-white; primary and play keep their color and gain a white ring. Icon-only when there is no label. |
| `VTile` | Art you can focus: game capsule, landscape tile, card | `game` + `kind`, `src`, `fit` (cover, box), `shape` (capsule, landscape, card), `badge`, `glyph` | Lifts slightly with a white ring inside the art. Retro box art sits whole over a blurred copy. |
| `VRow` | Titled horizontal shelf | `title`, `meta`, `align` (`start` pins focus to the left edge) | A focus group. |
| `VTabs` | Tabs | `tabs`, `value`, `variant` (line, chips, rail), `bumpers` | LB/RB step through tabs. The rail variant is the quick access menu's icon column. |
| `VToggle` | On/off row | `label`, `detail`, `icon`, `bind` | Separate on/off sounds. |
| `VSlider` | Value row | `min`, `max`, `step`, `format`, `bind` | Left/right adjust the value. The tick pitch follows the value. Drag or tap with a pointer. |
| `VDropdown` | Row with a value that opens a popup list | `options` (strings or `{ value, label }`), `value`, `bind` | A opens the list, up/down moves, A picks, B closes without a change. Opens upward near the bottom of the screen. |
| `VChoice` | Stepper row | `options`, `value`, `bind` | Left/right or A cycle through the options. For short numeric lists. |
| `VListItem` | Menu or info row | `label`, `detail`, `icon`, `badge`, `trail`, `chevron` | Used for menus, settings categories and status rows. |
| `VBadge` | Small status label | `text`, `tone` (default, accent, good, warn, bad, muted), `icon` | Not focusable. |
| `VProgress` | Loading bar | `value` (0 to 1), `indeterminate`, `label`, `showValue`, `size` (sm, md, lg), `tone` (accent, good, light) | `set()`, `setLabel()`, `setIndeterminate()`. The fill moves with a transform. |
| `VSpinner` | Spinning wheel | `size` (sm, md, lg), `tone` (accent, light, muted), `label` | For waits of unknown length. Use `VProgress` when progress is known. |
| `VBanner` | Inline message inside a page | `tone` (error, warning, info, success), `title`, `message`, `action`, `onAction` | Not a popup. |
| `VPanel` | Drawer from the left or right | `title`, `subtitle`, `side`, `rail`, `header` | Opens its own focus scope. B or tapping outside closes it. |
| `VDialog` | Modal with actions | `title`, `body`, `actions`, `stack`, `icon`, `tone`, `code`; `VDialog.confirm()` | For "are you sure?" steps. Error dialogs shake once and play the error sound. |
| `VAlert` | Error and status popups | `VAlert.error / warning / info / success({ title, message, code, actions })` | Resolves with the chosen action id, or `null` when closed with B. |
| `VToast` | Notification, bottom right | `VToast.show(text, { icon, tone })` | Plays the notify sound and rumble. |
| `VTopBar` | Page title and status buttons: notifications, Wi-Fi, battery, clock, profile, quick access | `title` | One bar for the whole app (the shell). Each button opens its panel. Controller: Up from the top of a page enters the bar, Down or B returns. |
| `VTextField` | Text row | `label`, `value`, `placeholder`, `password`, `maxLength` | A opens the on-screen keyboard. The row updates as you type. |
| `Keyboard` (`VKeyboard.js`) | On-screen keyboard | `Keyboard.open({ label, value, password, maxLength, onInput, onDone })` | Letters and symbols layouts, shift and caps lock. Controller: A types, B deletes, X adds a space, LB/RB move the cursor, Start finishes. A physical keyboard types directly while it is open. |
| `avatarEl()` | Round profile picture: the cropped photo, or the name's initial on the profile color | `profile`, size class | Used in the top bar, menu, setup and "Who's playing?". |
| `VHintBar` | Button prompts in the footer | `hints` | Glyphs match the controller in use (Xbox, PlayStation, Nintendo, Deck) or show keycaps on keyboard. `promptGlyph(action)` draws one anywhere. |

## Style classes

| File | Classes |
|---|---|
| `styles/type.css` | `.text-display`, `.text-title`, `.text-heading`, `.text-body`, `.text-label`, `.text-caption`, `.text-eyebrow`, `.text-mono`, plus `.text-muted`, `.text-subtle`, `.text-accent`, `.text-good`, `.text-warn`, `.text-bad`, `.text-center`, `.text-truncate`, `.text-balance` |
| `styles/animations.css` | Entrances `.anim-fade-in`, `.anim-slide-up/-down/-left/-right`, `.anim-scale-in`, `.anim-rise`; exits `.anim-fade-out`, `.anim-slide-out-down`, `.anim-scale-out`; feedback `.anim-press`, `.anim-shake`, `.anim-nudge`; loops `.anim-spin`, `.anim-pulse`, `.skeleton`; delays `.anim-delay-1` to `-4`. From JS: `animate(el, name)` and `animateOut(el, name)` in `core/motion.js` |
| `styles/tokens.css` | Colors, type scale, spacing, radii, shadows and motion durations. Becomes `Theme.qml` |

All animation classes use transform and opacity only, never overshoot, and respect reduced motion.

## Core modules

| Module | Job |
|---|---|
| `FocusManager` | Spatial navigation, focus scopes for drawers and dialogs, per-group memory, `data-nav-<dir>` routing |
| `Input` | Keyboard and Gamepad API mapped to console actions, with D-pad/stick auto-repeat |
| `Sound` | Tactile UI clicks modelled live (a noise strike into tuned resonators, plus a low thump), dry, levels measured with `Sound.render()`. Designed WAVs can replace any of them with `Sound.useFiles()` |
| `Haptics` | Rumble patterns through the Gamepad API (SDL3 in the real OS). Pulses are lifted to a minimum a rumble motor can play |
| `SonyHaptics` | DualSense and DualShock 4 rumble over WebHID (USB and Bluetooth), for browsers that don't pass rumble to Sony controllers |
| `Region` | Time zone, region and clock format, with names from the browser's Intl data |
| `Settings` | Small reactive store. Every control and live effect reads from it |
| `GameMusic` | PS5-style game music: the selected game's official trailer fades in as music and a moving hero background, and follows you onto the game page |
| `glyphs` | Button prompt art for Xbox, PlayStation, Nintendo and Steam Deck controllers, plus keyboard keycaps. Detected from the controller, or forced in Settings |
| `i18n` | Interface language: `t(key)` lookups with English fallback, translated setting values, and Intl-based relative dates. English, Spanish, French, German, Portuguese (Brazil) and Japanese |
| `Profiles` | Profiles for "Who's playing?": name, color, optional photo. Add, edit, delete |
| `motion` | Motion rules and helpers: one-off animations and eased scrolling. Everything else is CSS transitions on state classes |
| `art/` | Loads real game art (Steam, libretro-thumbnails) with generated stand-ins as the fallback |

## Screens worth knowing

| Screen | Job |
|---|---|
| `ProfileEditor` | Picture chooser (colors, upload, remove) and the Edit profile panel, shared by setup, "Who's playing?", Settings and the menu |
| `PhotoCrop` | Positions an uploaded photo in a round mask (drag, wheel, pinch, D-pad, zoom slider) and saves a 320×320 JPEG |
| `Lightbox` | Full-screen screenshot viewer for the game page |

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
