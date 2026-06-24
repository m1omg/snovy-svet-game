# Snový Svet (Dreamscape) — Full Game Specification for AI Recreation

> Purpose: a complete, implementation-ready spec so an LLM can recreate **this exact game** from scratch.
> The reference implementation is a single self-contained `index.html` (vanilla JS, HTML5 Canvas 2D,
> Web Audio API — no libraries, no build step, no network). **Two DISTINCT Oliver images** (do not
> conflate them): (1) `olivershaded.png` — a detailed **688×619** illustration shown ONLY on the intro
> screen; (2) the **in-game player sprite** — a small **117×139** chibi PNG embedded inline as a base64
> data-URI, used for the gameplay character. They are different artworks; never reuse the intro picture
> as the gameplay sprite. All audio is synthesized at runtime.
> Default/primary language is Slovak with an English toggle. Numbers below are authoritative — match them.

---

## 1. Concept

A 2D side-scrolling platformer. You are **Oliver**, a child who falls asleep and explores a strange,
dreamlike world. Travel left→right through **12 procedurally generated dream realms**, collect dream
orbs, put enemies to sleep with a "dream beam", survive 3 boss fights, and reach the exit portal of
each realm until you wake up ("Prebudenie / Awakening"). Tone: cozy, surreal, neon "dreamcore".

---

## 2. Tech & structure

- Single `index.html`: `<style>` (all CSS), `<body>` (canvas + HUD + overlay screens), one `<script>`
  wrapping everything in an IIFE (`(function(){ 'use strict'; ... })();`).
- Rendering: one `<canvas>` 2D context. Font: Google Font **Comfortaa**.
- Audio: Web Audio API only (procedural music + SFX). No audio files.
- No frameworks, no bundler. Runs from `file://` or any static host.
- Code comments/strings in Slovak; identifiers in English.

---

## 3. Global config (`CONFIG`)

| Key | Value | Meaning |
|---|---|---|
| CANVAS_WIDTH | 1400 | base render width (overridden by responsive sizing) |
| CANVAS_HEIGHT | 800 | base render height |
| GRAVITY | 0.6 | (difficulty overrides) |
| PLAYER_SPEED | 6 | (difficulty overrides) |
| JUMP_FORCE | -14 | jump velocity |
| MAX_JUMPS | 3 | triple jump |
| BEAM_ENERGY_MAX | 100 | beam energy cap |
| BEAM_DRAIN | 35 | (difficulty overrides) |
| BEAM_RECHARGE | 20 | (difficulty overrides) |
| WORLD_WIDTH_MULTIPLIER | 4 | base world width factor |
| MAX_PARTICLES | 150 | particle cap for perf |

Dash constants: `DASH_SPEED = 20`, `DASH_DURATION = 0.12s`, `DASH_COOLDOWN = 0.6s`.

---

## 4. Difficulty presets (`DIFFICULTY`, selectable EASY/MEDIUM/HARD; default MEDIUM)

| Param | EASY | MEDIUM | HARD |
|---|---|---|---|
| name | Ľahká | Stredná | Ťažká |
| lives | 15 | 12 | 10 |
| gravity | 0.5 | 0.6 | 0.7 |
| playerSpeed | 6.5 | 6 | 5.5 |
| enemyCountBase | 3 | 5 | 7 |
| enemyCountPerLevel | 1.5 | 2.5 | 3.5 |
| enemySpeedMultiplier | 0.6 | 1.0 | 1.4 |
| fadingPlatformChance | 0.06 | 0.10 | 0.18 |
| fadingPlatformTime | 3.0 | 2.2 | 1.6 |
| beamDrain | 20 | 30 | 40 |
| beamRecharge | 35 | 25 | 18 |
| invincibilityTime | 2.5 | 1.8 | 1.2 |
| enemySleepTime | 20 | 12 | 7 |
| gapMultiplier | 0.7 | 1.0 | 1.15 |
| bossHealthMultiplier | 0.7 | 1.0 | 1.3 |
| comboTimeBonus | 0.5 | 0 | -0.3 |

Difficulty can be changed on the **main menu** and the **pause** screen; both sets of buttons stay
in sync (select all `.diff-btn[data-diff=X]`). Lives cap is always 15.

---

## 5. Game states & flow

`GameState = { MENU, PLAYING, PAUSED, GAME_OVER, LEVEL_COMPLETE, WIN, INTRO }`. One `currentState`.
Overlay screens are `<div>`s toggled via a `.hidden` class; `hideAllScreens()` + per-screen show fns.

Flow: MENU → (Start) → INTRO (Oliver story) → PLAYING → on reaching a realm's portal: LEVEL_COMPLETE
→ next realm → … → after realm 12: WIN. Death → GAME_OVER. Pause toggles PLAYING⇄PAUSED.

Screens & key copy (SK):
- **Menu**: title, language toggle, subtitle "Putuj cez 12 snových ríš", difficulty selector,
  touch-control selector, display-scale selector, FPS toggle, "Vstúp do Sna" start button, credits
  ("Ďakujem za obrázok hlavného hrdinu kamarátovi Nerovi 💙").
- **Intro**: `olivershaded.png` + story text ("Si Oliver, a keď si išiel spať, objavil si nový,
  čudesný… Prejdi 12 snovými svetmi a prebuď sa, nech nemeškáš do školy :-)") + "Pokračovať".
- **Game Over**: "💔 Prebudenie...", "Sen sa rozplynul", final score, "Snívaš Znova".
- **Win**: "🌟 Prebudenie! 🌟" (EN "Awakening!"), "Prešiel si všetkými ríšami", score, "Snívaj Odznova".
- **Level Complete**: "✨ Snová Brána ✨", "<RealmName> - dokončené!", "Ďalší Sen".
- **Pause**: "⏸️ PAUZA", Resume, difficulty + controls + scale selectors, FPS toggle, language, "Späť do Menu".

---

## 6. Localization (sk default, en)

All UI text goes through `L(key)` reading a `LANG.sk` / `LANG.en` object; `updateLanguage()` pushes
translated strings into the DOM; `toggleLanguage()` flips `currentLang`. Add every new string to both.

**Critical dual-name rule:** each realm name exists in **two** places that must match: the `themes`
constant (which also defines colors/decor = the actual visuals) and `LANG.*.themes` (the displayed
name). The HUD shows `L('themes')[i]` falling back to `themes[i].name`. Keep them in sync (see §13).

---

## 7. Responsive canvas (render res decoupled from display size)

`calculateCanvasSize()` first computes physical on-screen size `displayW/displayH` by device class,
then sets render resolution `CONFIG.CANVAS_WIDTH/HEIGHT = round(display / mobileScale)`.
`applyCanvasSize()` is the single place that writes both: `canvas.width/height` = render res;
`canvas.style.width/height` + container width = display size. (Aspect ratios match → no distortion.)

Device classes (from `visualViewport` or `window.inner*`):
- landscapeMobile: `h<600 && w>h` → display `w-6 × h-6`
- portraitMobile: `w<900` → display `min(w-20,800) × min(h-100,700)`
- is1440p: `w≥2560 || h≥1440` → `min(w-80,2200) × min(h-120,1100)`
- largeMonitor: `w≥1920 && h≥900` → `min(w-60,1800) × min(h-100,950)`
- else desktop: `min(w-40,1400) × min(h-80,800)`

`mobileScale`: **0.7 on touch devices (zoom out → more world visible, less platform clumping), 1 on
desktop**. Because level generation scales with `CONFIG.CANVAS_*`, a larger render buffer = roomier
world. Re-applied on `resize`/`orientationchange`/`visualViewport` (debounced).
`isDesktopDevice()` = large screen + fine pointer + non-mobile UA; hides touch-only selectors.

---

## 8. Controls & in-game settings

- **Keyboard:** ←/→ or A/D move; ↑/W or click Jump; Space/Ctrl = beam (hold); Shift/E = dash; ↓/S = ground pound (in air); pause button toggles pause.
- **Touch — Swipe mode:** swipe to move, swipe up = jump, swipe down = ground pound, two-finger tap = dash.
- **Touch — D-Pad mode:** on-screen ▲▼◀▶ + action buttons (SKOK/LÚČA/DASH).
- Settings present on **both** menu and pause, kept in sync via shared setters / data-attribute selection:
  control mode (`setControlMode`), display scale 70%/100% (`setMobileScale`), FPS counter on/off
  (`setFps`). Touch-only selectors (control mode, scale) are hidden on desktop; FPS stays everywhere.

---

## 9. Player

Created at `(100, CANVAS_HEIGHT-150)`. Size **35×50**. Fields: `vx, vy, onGround, jumpsLeft(=3),
facing(±1), beamActive, beamEnergy(100), beamCooldown, invincible, animTimer, legAngle/armAngle,
squash/stretch, trail[], isDashing/dashTimer/dashCooldown, touchingWall, wallSliding, isGroundPounding`.

Mechanics (per-frame scaled by `df = dt/16.67`, i.e. 60fps-normalized; loop clamps dt ≤ 50ms):
- **Move:** `vx = moveX * difficulty.playerSpeed`. Facing follows move dir.
- **Gravity:** `vy += difficulty.gravity * df`, terminal `vy = 20`. Applied as `x += vx*df; y += vy*df`.
- **Triple jump:** if `jumpsLeft>0`: `vy = JUMP_FORCE(-14)`, decrement; distinct SFX per jump #
  (jump/doubleJump/tripleJump). `jumpsLeft` resets to 3 on landing. A 3-pip indicator shows jumps left.
- **Wall slide / wall jump:** while airborne touching a platform's side, `wallSliding=true`,
  `touchingWall=±1`. Jumping then sets `vy = -14*0.9`, `vx = -touchingWall*8`, grants 1 jump.
- **Dash:** if cooldown ≤0 and moving: `isDashing` for 0.12s, `vx = facing*20`, `vy=0` (ignores gravity),
  cooldown 0.6s, grants i-frames; contact does **30** dmg to enemies / **20** to boss.
- **Ground pound:** in air, not dashing: `vy=22`, `vx=0`; on landing → screen shake + AoE: enemies
  within `|dx|<100 && |dy|<80` take **50** dmg; contact during pound also damages enemies (40).
- **Dream beam:** hold while `beamEnergy>10` → `beamActive`. Horizontal beam from player toward facing,
  `range = 400 + min(combo.count*10, 200)`. Per frame it deals **40*df** to any enemy in range
  (vertical band = player center), **25*df** to boss (boss gets 0.1s i-frame per hit). Beam **drains**
  energy at `beamDrain`/s while active, **recharges** at `beamRecharge`/s otherwise.

Player sprite: a small **117×139** chibi PNG (Oliver in a blue nightcap), embedded inline as a base64
data-URI and credited to "Nero". **This is a separate asset from the 688×619 `olivershaded.png` intro
illustration — do NOT use the intro picture as the in-game sprite.** Drawn ~0.7 scale with a fading
**ghost trail** (last ~10 positions), `facing` flips it horizontally, plus squash/stretch + run/jump
animation. (In a recreation, supply an equivalent small character sprite, not the intro art.)

---

## 10. Enemies

Spawned on random mid-level platforms; `count = enemyCountBase + levelNum*enemyCountPerLevel`. All have
`health=100`. On defeat they **sleep** for `enemySleepTime` (then wake with health reset to 100) — i.e.
they are pacified, not destroyed. Contact with an awake enemy costs **1 life** (unless player is
invincible/dashing/ground-pounding). Type unlock + spawn roll:

- roll<0.15 & level≥8 → **flyer**; else roll<0.25 & level≥5 → **shooter**; else roll<0.35 & level≥3
  → **jumper**; else roll<0.6 → **ghost**; else → **amoeba**.

| Type | Size | Behavior |
|---|---|---|
| ghost | 40×50 | floats: `y=startY+sin*35`, `x=startX+cos(0.7t)*60` (×speedMult) |
| amoeba | 50×30 | horizontal patrol: `x=startX+sin(0.8t)*70` |
| shooter | 45×45 | stationary, bobs; when player within 500px, fires a projectile every `2.5 - levelNum*0.1`s, speed `5*enemySpeedMult`, life 3s, size 8 |
| jumper | 35×40 | when grounded & player within 300px: hops `vy=-12` toward player (`vx=±4*speedMult`), own gravity 0.5 |
| flyer | 50×30 | circles a point: angle += `0.03*speedMult*df`, radius 60–100, y-scale 0.5 |

Kill score: **beam 75**, dash 60, ground pound 50. Enemy projectiles damage the player on hit
(removed on contact/expiry/offscreen).

---

## 11. Bosses

Spawn on realm indices **3, 7, 11** (the 4th/8th/12th realms). Type =
`['shadowKing','dreamEater','voidWalker'][ floor((levelNum-3)/4) % 3 ]` → realm 4 Shadow King,
realm 8 Dream Eater, realm 12 Void Walker (each has its own draw routine + localized name).

- Size 120×150 at `(worldWidth-350, CANVAS_HEIGHT/2-75)`.
- `health = floor((200 + levelNum*30) * bossHealthMultiplier)`.
- **Phases by HP:** >50% = 1, 25–50% = 2, <25% = 3. Movement amplitude/speed grow with phase.
- **Attack:** every `2 - phase*0.4`s fire `phase+1` projectiles aimed at player with 0.3 spread,
  speed `(4+phase)*(enemySpeedMult*0.8+0.2)`, size `10+phase*2`, life 3s. Projectiles damage player.
- **Damage to boss:** beam `25*df` (0.1s i-frame/hit); dash contact 20 (0.3s i-frame). Boss contact
  otherwise damages player.
- On defeat: `boss.defeated=true`, **score +500**, big shake/particles.
- **Exit portal is LOCKED while a boss is alive** — rendered as a dim grey sealed portal with a 🔒;
  it only completes the level once `boss.defeated`. (Non-boss realms: portal always open.)

---

## 12. Level generation (`generateLevel(levelNum)`, 0-indexed 0–11)

Rebuilds ALL entity arrays each call. `worldWidth = 1400 * (4 + levelNum*0.3)`. `groundY = CANVAS_HEIGHT-40`.

1. **Start platform** `x0 w250 h40` at groundY; **end platform** `worldWidth-250, w250` at groundY.
2. **Procedural path:** walk `currentX` from 200 to `worldWidth-400`. Each step pick up/down/straight:
   - up (roll<0.35, y>200): `nextY = currentY-80-rand*80`, gap `(60+rand*80)*gapMult`
   - down (roll<0.55): `nextY = min(groundY, currentY+60+rand*100)`, gap `(80+rand*100)*gapMult`
   - straight: `nextY = clamp(currentY±30, 150, groundY)`, gap `(50+rand*80)*gapMult`
   - width 100–250, height 25. Cap drop so jumps stay possible (`maxJumpHeight=180`). Skip platforms
     overlapping the reserved portal zone. 30% chance to also add an alternate higher/lower platform.
3. **Platform types** (roll): `fading` if `< fadingPlatformChance + levelNum*0.01`; else `moving` if
   `< fadingPlatformChance + 0.06 + levelNum*0.008`; else `solid`.
   - **fading:** when stepped on → "warning" for `fadingPlatformTime`s (SFX) → "faded" (gone 4s) → solid again.
   - **moving:** horizontal `x = startX + sin(moveTimer)*moveRange` (range 50–110), carries the player.
   - **hidden:** invisible (alpha 0) until its secret area is discovered, then fades in.
4. **Exit portal** collectible at `(worldWidth-180, groundY-100)`, 60×80; reached when player center is
   within 50px → `completeLevel()`.
5. **Dream orbs:** `12 + levelNum*2`, placed near platforms avoiding overlap. Collect radius 35.
6. **Hearts (powerups):** `2 + floor(levelNum/3)`, ≥400px apart. +1 life (cap 15). Radius 35.
7. **Checkpoints:** ~every 1500px on a solid platform; sets respawn point on fall death.
8. **Secret areas:** 1–2 per level; a hidden platform + 3–5 bonus orbs (+30% chance a heart).
9. Music scale set from theme; tempo `55 + (levelNum%4)*8`.

Camera: `cameraX` follows the player horizontally, clamped `[0, worldWidth - CANVAS_WIDTH]`. No vertical
camera — the full render height is shown. Fall death when `player.y > CANVAS_HEIGHT + 100`.

---

## 13. Realms / themes (12) — names MUST match visuals

`themes[i]` (visuals) and `LANG.*.themes[i]` (labels). Realm index = boss at 3/7/11.

| # | SK name | EN name | bg1/bg2 | platform | accent | decor | musicScale |
|---|---|---|---|---|---|---|---|
| 1 | Fialová Hmla | Purple Mist | #0a0015/#1a0a2e | #4a2080 | #b060ff | mist | ethereal |
| 2 | Zabudnutá Izba Hračiek | Forgotten Toy Room | #1a1525/#2a2035 | #8a6050 | #ffb080 | toys | melancholy |
| 3 | Čiernobiely Labyrint | Black & White Labyrinth | #080808/#151515 | #404040 | #ffffff | maze | cosmic |
| 4 | Potopený Chrám | Sunken Temple | #001520/#003040 | #205060 | #40d0ff | bubbles | ethereal |
| 5 | Cukríkové Nebo | Candy Sky | #200820/#401040 | #c06080 | #ff80c0 | candy | melancholy |
| 6 | Tichý Les Tieňov | Silent Forest of Shadows | #000a05/#001a10 | #203020 | #40a060 | trees | cosmic |
| 7 | Rozbitý Čas | Broken Time | #0a0510/#150a20 | #503060 | #c080ff | clocks | ethereal |
| 8 | Plyšový Svet | Plush World | #151015/#252025 | #806050 | #ffc090 | plush | melancholy |
| 9 | Prázdny Cirkus | Empty Circus | #100508/#200a10 | #602030 | #ff4060 | circus | cosmic |
| 10 | Hviezdy a Mesiace | Stars and Moons | #020008/#050015 | #303060 | #8080ff | cosmos | ethereal |
| 11 | Zabudnutý Domov | Forgotten Home | #100a08/#201510 | #504030 | #c0a080 | home | melancholy |
| 12 | Prebudenie | Awakening | #150810/#301020 | #603050 | #ff60ff | awakening | cosmic |

**Decorations:** background gradient from bg1→bg2; seeded star field (deterministic via a sin-based
`seededRandom(seed)` so it never flickers); per-`decor` themed shapes drawn in `renderDecorations`,
with **parallax layers** (farther = slower) and horizontal **wrapping** so the background repeats.

---

## 14. Collectibles, combo & scoring

- **Dream orb:** base **25** pts × combo multiplier.
- **Combo:** collecting an orb while `combo.timer>0` increments `combo.count`; `multiplier = 1 +
  floor(count/5)*0.5`; timer resets to `maxTime = 1.5 + comboTimeBonus`. Every 10 in a combo → +1 life.
  Combo also boosts beam range (`+10/orb`, cap +200) and thus effective damage uptime.
- **Heart:** +1 life (cap 15).
- **Score sources:** orb 25×mult · beam-kill 75 · dash-kill 60 · pound-kill 50 · boss 500 · level
  complete `200 + currentLevel*50`.
- **Lives:** start `difficulty.lives` (cap 15). Lose 1 on enemy/projectile/boss contact (`takeDamage`:
  i-frames `invincibilityTime`, knockback `vy=-8, vx=-facing*5`) or on falling (`loseLife`: respawn at
  active checkpoint or start, longer i-frames). `lives<=0` → GAME_OVER.
- **Win:** `completeLevel` increments level; `currentLevel >= 12` → WIN.

---

## 15. HUD / on-screen UI (no overlaps)

- **Top bar** (`#ui`): a single flexbox row, `space-between`: 💜 lives · "N. RealmName" · ✨ score ·
  energy bar · ⏸ pause button. (Pause lives *inside* the row so it can't overlap the energy bar.)
- **FPS counter** (optional): small panel top-right just below the bar; rolling average over ~250ms.
- **Jump pips:** 3 dots bottom-right showing remaining jumps.
- **Audio toggle** 🔊/🔇 bottom-right; **dash button** + D-pad/action buttons on touch.
- Energy bar = horizontal fill (`#energyFill` width = beamEnergy%), purple→blue gradient.

Visual identity: deep purple/indigo space gradient body; rounded translucent panels with violet glow
borders; heavy neon glow (text-shadow / shadowBlur); soft particles. Overlay screens are scrollable
(`overflow-y:auto`, `touch-action: pan-y`) and centered when they fit (`justify-content: safe center`).

---

## 16. Audio (Web Audio, fully synthesized)

- **AudioMaster:** builds the graph — context, compressor, convolver **reverb** + send, **limiter**,
  master gain. Lazily initialized on first user interaction.
- **DreamMusic:** generative ambient music using a lookahead note scheduler. Three scales:
  `ethereal` = C major pentatonic `[261.63,293.66,329.63,392,440,523.25,587.33,659.25]`;
  `melancholy` = A minor pentatonic `[220,246.94,293.66,329.63,392,440,493.88,587.33]`;
  `cosmic` = G mixolydian-ish `[196,220,261.63,293.66,349.23,392,440,523.25]`. Scale chosen per realm;
  `tempo = 55 + (levelNum%4)*8` (menu base ~65). Soft pads/plucks + bass through reverb.
- **Sfx:** synthesized one-shots (osc + envelope), names: `jump, doubleJump, tripleJump, dash, shoot,
  hit, enemySleep, collect, damage, groundPound, groundPoundHit, wallJump, fadeWarning, levelComplete`,
  plus per-theme ambient stingers keyed by decor (`mist, toys, maze, bubbles, candy, trees, clocks,
  plush, circus, cosmos, home, awakening`). Rate-limited (hit ~80ms, shoot ~100ms, collect ~120ms).
- A single 🔊 toggle mutes music + SFX.

---

## 17. Game loop & particles

- `requestAnimationFrame(gameLoop)`. `dt = now - lastTime`. `update(Math.min(dt,50))` only when PLAYING;
  `render()` every frame. `df = dt/16.67` normalizes physics to 60fps. FPS counter computed here.
- Particle system (cap `MAX_PARTICLES=150`): types include `circle, spark, star, ring, smoke, heart`,
  with optional `gravity, friction, rotation/rotationSpeed, glow, shrink/fadeSpeed`. Used richly for
  jumps (color per jump #), dash, ground-pound impact, hits, enemy/boss death, damage, pickups.
- Screen shake: `triggerShake(intensity, duration)`; decays each frame, offsets the render transform.

---

## 18. Fidelity checklist (acceptance)

- [ ] Single self-contained HTML file; runs offline; SK default + EN toggle (all strings localized).
- [ ] 12 realms with the exact names/colors/decor/scale in §13; names match visuals in both languages.
- [ ] Triple jump, wall jump, dash, ground pound, hold-beam with combo-scaled range; values per §9.
- [ ] 5 enemy types with the unlock thresholds & behaviors in §10; defeated enemies *sleep* then revive.
- [ ] Bosses on realms 4/8/12 (Shadow King / Dream Eater / Void Walker), phase logic, **portal locked
      until boss defeated** (sealed 🔒 visual).
- [ ] Procedural levels: solid/fading/moving/hidden platforms, gaps scaled by difficulty, orbs, hearts,
      checkpoints, 1–2 secret areas, exit portal; world width grows with realm.
- [ ] Combo multiplier + HP regen every 10; scoring values per §14; lives cap 15; checkpoint respawn.
- [ ] Procedural Web Audio music (3 scales, per-realm) + synthesized SFX; one audio toggle.
- [ ] Responsive: render-res decoupled from display size; mobile 70% zoom toggle (default on touch);
      portrait height uses up to 700px; HUD is one non-overlapping flex row; FPS toggle; menus scroll on touch.
- [ ] HUD: lives/realm/score/energy/pause + jump pips + audio toggle; dreamcore neon styling.
- [ ] Two distinct Oliver assets: 688×619 intro illustration (intro screen ONLY) vs. a small ~117×139
      chibi gameplay sprite — the intro picture is never used as the in-game sprite.
```
