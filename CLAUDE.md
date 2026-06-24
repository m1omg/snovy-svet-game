# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Snový Svet" (Dream World / Dreamscape) — a 2D HTML5 canvas platformer. You play as Oliver
journeying through 12 procedurally-built dream realms, ending in "Awakening". The whole game
is a single self-contained `index.html`; the only external asset is `olivershaded.png` (the
intro-screen artwork). The player character is an inline base64 PNG.

## Running, building, testing

There is no build system, package manager, bundler, lint, or test suite. The entire app is
one HTML file with vanilla JavaScript in an IIFE — there is nothing to compile.

- Run it by opening `index.html` in a browser, or serve the folder statically
  (e.g. `python3 -m http.server` then open `http://localhost:8000/index.html`) so
  `olivershaded.png` loads cleanly.
- Debugging is done in the browser devtools console; there is no logging framework.

(Note: `.claude/settings.local.json` grants Gradle/Java permissions, but there is no Java/Gradle
project here — ignore those; they are leftover from another context.)

## File layout inside `index.html`

It is one ~5150-line file with three regions:
- **CSS** in `<style>` (~lines 8–397) — all styling, including responsive/landscape and touch-control layouts.
- **HTML body** (~lines 399–498) — the canvas plus all screen overlays (`#menuScreen`, `#introScreen`,
  `#gameOverScreen`, `#winScreen`, `#levelCompleteScreen`, `#pauseScreen`) and the touch controls.
- **JavaScript** in one IIFE (`<script>` ~lines 500–5147) — all game logic. Section headers are
  marked with `// ==================== NAME ====================` comments; grep for those to navigate.

All edits happen in this one file. There are no modules or imports.

## Language conventions

The game's primary language is Slovak. Code **comments and string literals are in Slovak**;
identifiers are mostly English. Match this when adding code — don't translate existing comments.

All user-facing text is localized (`sk` / `en`). Never hardcode display strings:
- Add the string to both `LANG.sk` and `LANG.en` (the `LANG` object).
- Read it at runtime via `L(key)`.
- If it lives in static DOM, also wire it into `updateLanguage()`, which pushes translated strings
  into the DOM on language toggle. `toggleLanguage()` flips `currentLang`.

## Architecture

**Module-singleton objects** (top of the IIFE) own the cross-cutting systems:
- `AudioMaster` — the Web Audio graph (context, compressor, reverb, limiter, master gain).
- `DreamMusic` — a procedural music scheduler (pentatonic scales, lookahead note timing). No audio files.
- `Sfx` — procedurally synthesized sound effects. Also no audio files; everything is Web Audio.

Everything else is **free functions operating on module-scoped mutable global state**:
`player`, `platforms`, `enemies`, `collectibles`, `particles`, `dreamOrbs`, `powerups`,
`enemyProjectiles`, `checkpoints`, `boss`, plus `cameraX`, `worldWidth`, `lives`, `score`,
`currentLevel`, `combo`, `screenShake`.

**State machine.** `GameState` enum (MENU/PLAYING/PAUSED/GAME_OVER/LEVEL_COMPLETE/WIN/INTRO) with
`currentState`. UI screens are plain `<div>`s shown/hidden via the `.hidden` class; `hideAllScreens()`
plus the per-screen show functions (`showMenu`, `completeLevel`, etc.) drive transitions.

**Game loop.** `gameLoop(timestamp)` runs on `requestAnimationFrame`. It calls `update(dt)` only
when `currentState === PLAYING` (with `dt` clamped to 50ms to survive tab-switch hitches) and
`render()` every frame. Inside `update`, `df = dt / 16.67` normalizes physics to a 60fps frame so
movement is framerate-independent — scale per-frame deltas by `df`.

**Tuning.** Two constant tables: `CONFIG` (engine-wide: gravity, speeds, jump force, canvas size,
particle cap) and `DIFFICULTY` (`EASY`/`MEDIUM`/`HARD` presets). `currentDifficulty` is selected in
the menu/pause screen and read throughout `update` and `generateLevel` — gameplay balance changes
usually belong in one of these tables, not scattered in logic.

**Levels.** 12 themed realms via `getTheme(level)`. `generateLevel(levelNum)` rebuilds *all* the
global entity arrays and procedurally places platforms, enemies, orbs, decorations, checkpoints, and
the exit portal; world width scales with level. `createBoss(levelNum)` spawns a boss on boss levels;
`currentLevel` is **0-indexed**, so the boss levels are indices `3, 7, 11` (the 4th/8th/12th realms)
and `createBoss` maps each to a distinct type via `Math.floor((levelNum - 3) / 4)` →
shadowKing/dreamEater/voidWalker. On a boss level the exit portal stays locked (rendered sealed, with
a 🔒) until `boss.defeated`. Reaching `currentLevel >= 12` triggers the WIN state.

**Theme names come from two separate sources — keep them in sync.** Each realm has a name in *both*
the `themes` constant (which also defines its colors + `decor` type, i.e. the actual visuals) and in
`LANG.sk/en.themes` (the displayed name). The UI shows `L('themes')[i]`, falling back to
`themes[i].name` only if missing — so editing only one side silently desyncs the label from the
visuals (this already happened once: the displayed names had been rewritten while the `themes` const
kept the original dreamcore set). When renaming a realm, change both, or change `LANG` to match the
`themes` const.

**Rendering.** A single 2D canvas context whose **render resolution is decoupled from its display
size**: `calculateCanvasSize()` computes `displayW/displayH` (the physical on-screen size, per
device class) and sets `CONFIG.CANVAS_WIDTH/HEIGHT = display / mobileScale` (the internal buffer).
`applyCanvasSize()` is the *single* place that pushes both to the DOM (`canvas.width/height` = render
res; `canvas.style` + container width = display size) — call it, don't set canvas size inline.
`mobileScale` (default `0.7` on touch devices, `1` on desktop; toggled by the 70%/100% menu selector)
makes the internal canvas larger than the display = a zoom-out: because level generation scales with
`CONFIG.CANVAS_WIDTH/HEIGHT`, a bigger buffer means a roomier world and less platform "clumping" on
phones (portrait would otherwise be a cramped ~392×500). Resizing is debounced via `handleResize()`
(also on `orientationchange`/`visualViewport`). `render()` uses a local sin-based `seededRandom(seed)`
so background stars/decorations are deterministic per level and don't flicker — keep procedural
background placement seeded, not `Math.random()`.

**Input.** `setupInput()` wires keyboard (WASD/arrows, Space/Ctrl beam, Shift/E dash) and
`setupDpadControls()` wires the on-screen D-pad. Touch control mode (swipe vs. D-pad) is chosen in the
menu and applied via `setControlMode()`. `isDesktopDevice()` hides the touch UI on desktop.

**Settings live in two places (menu + pause) and stay in sync.** Control mode, display scale, and the
FPS toggle each appear on both the start menu and the pause screen. Don't track per-screen state:
the click handlers select *all* matching buttons by data-attribute (`.ctrl-btn[data-ctrl]`,
`.scale-btn[data-scale]`) or call a shared setter (`setControlMode` / `setMobileScale` / `setFps`)
that updates every instance at once — same pattern as the difficulty buttons. Desktop hides the
touch-only ones (control mode + scale) but keeps FPS. The in-game HUD (`#ui`) is a single flexbox row
(lives/level/score/energy/**pause button**) so items can't overlap; `#fpsCounter` sits just below it.

**Initialization** happens at the very bottom of the IIFE: `setupInput()`, `setupMenus()`,
`updateLanguage()`, then `requestAnimationFrame(gameLoop)`.
