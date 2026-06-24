# Repository Guidelines

## Project Structure & Module Organization

This repository contains browser-only game builds for Snovy Svet. The root `index.html` is the 2D canvas version with CSS, DOM, and JavaScript in one file. The `snovy-3d/` directory is the current 3D build: `index.html` loads `js/lang.js`, `js/audio.js`, `js/game.js`, and the vendored `lib/three.min.js`. `snovy-3d-backup-build3/` and `index.backup-*.html` files are historical snapshots; avoid editing them unless you are intentionally preserving or comparing an older build. `snovy-svet-game-spec.md` documents target gameplay behavior, and `CLAUDE.md` contains detailed implementation notes.

## Build, Test, and Development Commands

There is no package manager, bundler, compile step, or automated test suite.

- `python3 -m http.server 8000` starts a static server for local browser testing.
- Open `http://localhost:8000/index.html` to run the 2D version.
- Open `http://localhost:8000/snovy-3d/` to run the 3D version.

Serving over HTTP is preferred because browser APIs and asset loading behave more consistently than with `file://`.

## Coding Style & Naming Conventions

Use vanilla HTML, CSS, and JavaScript. Keep comments and user-facing Slovak strings in Slovak; identifiers are mostly English. For localization, add display text to both `LANG.sk` and `LANG.en`, then read it through `L(key)`. Keep realm names synchronized between the gameplay `themes` array and localized `LANG.*.themes`. In `snovy-3d/`, preserve the global script order: localization first, audio second, game logic last.

## Testing Guidelines

Test manually in a browser after every gameplay or UI change. Check the console for errors, verify keyboard controls, pause/menu flow, language toggle, audio start after user interaction, and win/game-over paths when relevant. For layout changes, test desktop, narrow mobile width, and landscape mobile dimensions. For 3D changes, confirm WebGL renders, resize handling works, and the diagnostic panel remains useful when errors occur.

## Commit & Pull Request Guidelines

No consistent commit history is available in this checkout, so use short imperative commit messages such as `Fix 3D pause menu state` or `Tune boss difficulty`. Pull requests should describe the changed gameplay or UI behavior, list tested browsers/viewports, mention affected build paths, and include screenshots or short recordings for visual changes.

## Agent-Specific Instructions

Do not overwrite `AGENTS.md` if it already exists. Keep edits focused on active source files, avoid changing backup snapshots accidentally, and update `CLAUDE.md` or `snovy-svet-game-spec.md` when behavior changes invalidate their guidance.
