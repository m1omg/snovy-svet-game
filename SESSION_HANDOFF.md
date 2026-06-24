# Session Handoff

## Conversation Timeline

1. Created `AGENTS.md` as a contributor guide for the repository.
2. Checked the 3D version and confirmed it had 12 levels.
3. Reviewed unfinished work after Claude ran out mid-task and continued the 3D game changes.
4. Extended the 3D version to the full 12-level progression with boss encounters.
5. Updated enemy behavior and weapons to better match the 2D game, including a hitscan flashlight.
6. Added UI toggles for 3D models vs 2D billboards in the main menu and pause menu.
7. Added FPS to the debug panel.
8. Adjusted boss spawning so bosses appear only near the end of their level.
9. Improved the flashlight beam so it widens instead of looking like a hollow tube.
10. Fixed the 2D protagonist billboard by embedding Oliver's PNG directly into the game code.
11. Cleaned up the temporary local smoke-test files and stopped the temporary HTTP servers.

## Current 3D State

- Build tag is `build 7`.
- The 3D game supports both `3D models` and `2D billboards`.
- Oliver's 2D billboard uses an embedded PNG data URI, not just the loose asset path.
- Debug overlay shows `frames`, `fps`, and the embedded PNG load status.
- Bosses are delayed until the player nears the boss end area.
- The flashlight is a widening cone with a soft end glow and hitscan damage.

## Files Touched

- `snovy-3d/index.html`
- `snovy-3d/js/lang.js`
- `snovy-3d/js/game.js`
- `AGENTS.md`

## Practical Dev Notes

- Use `apply_patch` for edits.
- Prefer `rg` for search and `multi_tool_use.parallel` for parallel reads.
- Keep frontend work verified with a local browser load when possible.
- Avoid unnecessary mention of git unless the user specifically asks for it.
- The project currently lives in `/home/mroz/Dokumenty/snovy svet nový`.

## Verification

- Loaded the 3D game in headless Firefox over local HTTP.
- Confirmed the debug panel reported `no JS errors`.
- Confirmed the embedded Oliver texture loaded and the billboard start path worked.
