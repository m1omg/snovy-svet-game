// ==================== SNOVÝ SVET 3D — JADRO HRY ====================
// Tretia osoba, billboard Oliver v plne 3D svete (Three.js r149, globálny THREE).
// Ovládanie: Šípky = pohyb (relatívne k svetu, do hĺbky -Z), Space = skok (3×), Ctrl = baterka.
// Zdieľa globály: THREE (lib), LANG/L/currentLang (lang.js), AudioMaster/DreamMusic/Sfx (audio.js).

// ---------- Ladiace tabuľky (portované/upravené pre 3D mierku, jednotky = svetové) ----------
const CONFIG = {
    GRAVITY: 22,           // u/s²
    MOVE_SPEED: 9,         // u/s
    JUMP_VELOCITY: 9.5,    // u/s na každý skok
    MAX_JUMPS: 3,
    BEAM_ENERGY_MAX: 100,
    BEAM_DRAIN: 45,        // za sekundu počas streľby
    BEAM_RECHARGE: 28,     // za sekundu
    BEAM_RANGE: 42,        // dĺžka 3D baterky / lúča
    BEAM_START_RADIUS: 0.45,
    BEAM_END_RADIUS: 5.2,
    BEAM_DAMAGE: 106.25,   // +25 %: damage za sekundu na bežných nepriateľov
    BEAM_BOSS_DAMAGE: 57.5,// +25 %: damage za sekundu na bossov
    BOSS_SPAWN_RADIUS: 18,
    FALL_Y: -25,           // pod touto výškou = pád/smrť
    CAM_DIST: 14,
    CAM_HEIGHT: 8.5,
    REALMS_IN_BUILD: 12    // všetkých 12 ríš; bossovia na ríšach 4/8/12 (index 3/7/11)
};
const BOSS_HP_GLOBAL_MULTIPLIER = 1.5;

const DIFFICULTY = {
    EASY:   { name: 'Ľahká',  lives: 15, enemyBase: 2, enemyPerRealm: 1.0, enemySpeed: 0.7, invinc: 2.5, enemySleepTime: 20, bossHpMul: 0.7 },
    MEDIUM: { name: 'Stredná', lives: 12, enemyBase: 3, enemyPerRealm: 1.6, enemySpeed: 1.0, invinc: 1.8, enemySleepTime: 12, bossHpMul: 1.0 },
    HARD:   { name: 'Ťažká',  lives: 10, enemyBase: 5, enemyPerRealm: 2.4, enemySpeed: 1.4, invinc: 1.2, enemySleepTime: 7, bossHpMul: 1.3 },
    CUSTOM: { name: 'Vlastná', lives: 12, enemyBase: 3, enemyPerRealm: 1.6, enemySpeed: 1.0, invinc: 1.8, enemySleepTime: 12, bossHpMul: 1.0 }
};
// Upraviteľné parametre vlastnej obtiažnosti (rozsah + krok pre steppery)
const CUSTOM_PARAMS = [
    { key: 'lives',          min: 1,   max: 30,  step: 1,   dec: 0 },
    { key: 'enemyBase',      min: 0,   max: 12,  step: 1,   dec: 0 },
    { key: 'enemyPerRealm',  min: 0,   max: 4,   step: 0.2, dec: 1 },
    { key: 'enemySpeed',     min: 0.4, max: 2,   step: 0.1, dec: 1 },
    { key: 'invinc',         min: 0.5, max: 4,   step: 0.1, dec: 1 },
    { key: 'enemySleepTime', min: 3,   max: 40,  step: 1,   dec: 0 },
    { key: 'bossHpMul',      min: 0.4, max: 2.5, step: 0.1, dec: 1 }
];
let currentDifficulty = DIFFICULTY.MEDIUM;
let currentDifficultyKey = 'MEDIUM';   // kľúč zvolenej obtiažnosti (pre ukladanie)
let lastBaseDifficulty = 'MEDIUM';   // posledná zvolená prednastavená obtiažnosť (nie CUSTOM) — seeduje vlastnú
let customDiffEdited = false;        // hráč ručne upravil vlastnú obtiažnosť? ak nie, sleduje zvolenú prednastavenú
let jumpHeightMul = 1.0;             // jediný globálny násobič výšky skoku (slider „Výška skoku" + mobilný režim); platí na každú obtiažnosť
const JUMP_MUL_MIN = 0.6, JUMP_MUL_MAX = 2.0, JUMP_MUL_STEP = 0.1;

// Témy ríš (zdieľané s 2D hrou): bg1/bg2 = obloha+hmla, platform = materiál, accent = žiara, musicScale
const themes = [
    { name: 'Fialová Hmla',            bg1: '#0a0015', bg2: '#1a0a2e', platform: '#4a2080', platformTexture: 'purpleMist', accent: '#b060ff', musicScale: 'ethereal',   decor: 'mist',      decorColor: '#8040c0' },
    { name: 'Zabudnutá Izba Hračiek',  bg1: '#1a1525', bg2: '#2a2035', platform: '#8a6050', accent: '#ffb080', musicScale: 'melancholy', decor: 'toys',      decorColor: '#ff9060' },
    { name: 'Čiernobiely Labyrint',    bg1: '#080808', bg2: '#151515', platform: '#404040', accent: '#ffffff', musicScale: 'cosmic',     decor: 'maze',      decorColor: '#606060' },
    { name: 'Potopený Chrám',          bg1: '#001520', bg2: '#003040', platform: '#205060', accent: '#40d0ff', musicScale: 'ethereal',   decor: 'bubbles',   decorColor: '#60c0e0' },
    { name: 'Cukríkové Nebo',          bg1: '#200820', bg2: '#401040', platform: '#c06080', accent: '#ff80c0', musicScale: 'melancholy', decor: 'candy',     decorColor: '#ff60a0' },
    { name: 'Tichý Les Tieňov',        bg1: '#000a05', bg2: '#001a10', platform: '#203020', accent: '#40a060', musicScale: 'cosmic',     decor: 'trees',     decorColor: '#306040' },
    { name: 'Rozbitý Čas',             bg1: '#0a0510', bg2: '#150a20', platform: '#503060', accent: '#c080ff', musicScale: 'ethereal',   decor: 'clocks',    decorColor: '#a060d0' },
    { name: 'Plyšový Svet',            bg1: '#151015', bg2: '#252025', platform: '#806050', accent: '#ffc090', musicScale: 'melancholy', decor: 'plush',     decorColor: '#d0a080' },
    { name: 'Prázdny Cirkus',          bg1: '#100508', bg2: '#200a10', platform: '#602030', accent: '#ff4060', musicScale: 'cosmic',     decor: 'circus',    decorColor: '#c03050' },
    { name: 'Hviezdy a Mesiace',       bg1: '#020008', bg2: '#050015', platform: '#303060', accent: '#8080ff', musicScale: 'ethereal',   decor: 'cosmos',    decorColor: '#6060c0' },
    { name: 'Zabudnutý Domov',         bg1: '#100a08', bg2: '#201510', platform: '#504030', accent: '#c0a080', musicScale: 'melancholy', decor: 'home',      decorColor: '#907050' },
    { name: 'Prebudenie',              bg1: '#150810', bg2: '#301020', platform: '#603050', accent: '#ff60ff', musicScale: 'cosmic',     decor: 'awakening', decorColor: '#d040c0' }
];
function getTheme(i) { return themes[i % themes.length]; }
function isBossRealm(i) { return i === 3 || i === 7 || i === 11; }

// ---------- Stav hry ----------
const GameState = { MENU: 0, PLAYING: 1, PAUSED: 2, GAME_OVER: 3, WIN: 4, REALM_DONE: 5 };
let currentState = GameState.MENU;

let scene, camera, renderer, clock;
let ambient, sun, fillLight;
let player, playerModel, blobShadow, flashlightBeam, flashlightGlow, flashlightLight, flashlightTarget, faceYaw = 0;
let platforms = [], orbs = [], enemies = [], projectiles = [], particles = [], dustField = null;
let decorItems = [], decorGroup = null;
let portal = null;
let boss = null;
let pendingBoss = null;
let currentRealm = 0;
let score = 0, lives = 12;
let combo = 0, comboTimer = 0;
let starsCollected = 0;          // pozbierané orby; každých 15 = extra život
const STARS_PER_LIFE = 15;
let lastCheckpoint = new THREE.Vector3(0, 2, 0);
let groundUnderPlayer = -Infinity;   // pre blob tieň
let oliverTexture = null;
const PLATFORM_TEXTURE_PATHS = { purpleMist: 'assets/platform-purple-mist.png' };
const platformTextureCache = {};
const OLIVER_PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHUAAACLCAYAAABfnNbVAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKdmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDIgNzkuZjM1NGVmYywgMjAyMy8xMS8wOS0xMjo0MDoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI1LjUgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNi0wMS0xM1QwMzo0NDoxNS0wNjowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNi0wMS0xM1QxNzo0NzowMi0wNjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjYtMDEtMTNUMTc6NDc6MDItMDY6MDAiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzY0MDBkOWYtNjhiNS03YTQ0LWFiOTgtODQyMmRhMDhhZDBlIiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MGFmMmYwODUtYTc2My1kZjQ0LTlmYzQtNjQ0MzJmNjZjMTAxIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6ZjQwMWRlNWItZDUxOC0zNzRmLTlhMTgtZmU4MzZmOGQ5MDhjIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgdGlmZjpPcmllbnRhdGlvbj0iMSIgdGlmZjpYUmVzb2x1dGlvbj0iNzIwMDAwLzEwMDAwIiB0aWZmOllSZXNvbHV0aW9uPSI3MjAwMDAvMTAwMDAiIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiIGV4aWY6Q29sb3JTcGFjZT0iNjU1MzUiIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSIxOTIwIiBleGlmOlBpeGVsWURpbWVuc2lvbj0iMTA4MCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZjQwMWRlNWItZDUxOC0zNzRmLTlhMTgtZmU4MzZmOGQ5MDhjIiBzdEV2dDp3aGVuPSIyMDI2LTAxLTEzVDAzOjQ0OjE1LTA2OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjUuNSAoV2luZG93cykiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmMxMDlmYzRlLTI1MjAtYzA0OC05ZGUzLTVlZjFiODJlYjA0ZSIgc3RFdnQ6d2hlbj0iMjAyNi0wMS0xM1QwMzo0NDoxNS0wNjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI1LjUgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDozNDg5ZTYxYS04ZTRkLTVhNGMtYjExNi0zZGJjNzdiMTIzNWEiIHN0RXZ0OndoZW49IjIwMjYtMDEtMTNUMTc6NDc6MDItMDY6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyNS41IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AgdG8gaW1hZ2UvcG5nIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJkZXJpdmVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJjb252ZXJ0ZWQgZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NzY0MDBkOWYtNjhiNS03YTQ0LWFiOTgtODQyMmRhMDhhZDBlIiBzdEV2dDp3aGVuPSIyMDI2LTAxLTEzVDE3OjQ3OjAyLTA2OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjUuNSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjM0ODllNjFhLThlNGQtNWE0Yy1iMTE2LTNkYmM3N2IxMjM1YSIgc3RSZWY6ZG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmM1NGI4MGU0LThlMGItZGM0ZC1hNjI5LTcxNTk4MTU5ZTBkYyIgc3RSZWY6b3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmY0MDFkZTViLWQ1MTgtMzc0Zi05YTE4LWZlODM2ZjhkOTA4YyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PieKk+gAACDiSURBVHja7Z35k+TGld+/72UCqKOrz+k5OUNSJKUhxUOkZC3lDcuxYf+w+quW/qes9f7kiF3ZWtrLMA9xJYriiORw7r6mu+sAkO/5BwDViSygu2c0PawZVUYggKquqq7KD96RL1++tKqKRXu+ml10wQLqoi2gLtoC6qItoC7aAuoC6qItoC7aAuqiLaAu2gLqAuqiLaAu2gLqoi2gLtoC6qItoC6gLtpfL9T/9o//Pk+/h/+Cv8sJ75Wn9SP+4e9f/6uWVD4FtNO8RoLnTwNQnltJnSOI3HJue64NkrQ8xyeAlAXUJweSH/H6tFCl4VpaAD6OpP9VQuUTQHLDY/+glteiBUATQA0eSwvsNsCygHq82gyvbQNE2/B3avmcNikNYebeWYPnmg7+vuHaZwRmeFTAjPfYf86HawKY1PL/Q6l0HkD/Oi8/UwPgTXDF+x3y1wT1tDArcORdWw+if20awLMHlBskVY8B6p+zAK7zoOUNKvq0jtZzA5UfAaYJYEbB2QTX1dk02NlQeqqz86A2wcwCsNU5bYHrguefijq2cyqdTZIYl9dxADTynos8uMZ7L3lw6RjVqwHMzDv7Rxpc2/Jsyvf64Kjh5jlTqbVzAPQ4yYw9eBW4JLgOwRpRdEIVTABJ8XcCwKpKRKRcgAmhChHSBgmdlEfmXUflY+NBJg9u3nAD6VmCtXOkbkPVGjfArIDG1WNRdL3X2QKqdkXRzVWXMqcrmehKJrqWC1ZUtQOgU/12BRwTDizRg8TQ3cTytmXaN4ShIRp70poqkDJhVMJMgen1pIQ6CTRC9dvyQIL1eVG/TUBti3TGHsDEOzreOS6BxgTEJbhB6vTcKJcXctHzCqyD0IuIkoiJkwhkiGGZQHT0RRRALorUKfZTJ6nTEYD7kaEbHcO3EkMPLNO+YRyo0qiEe1h+v3F5RIEXziV4v+VPw3mycwLUt5c+vAQowJXnjij6FXBR7U+cnhvncnHk9AdO9KohrMRMUTc2ZBmwTDBEhf4lOjKoFMhLZYkBdqr9XLQ/yvWlUe7yhyn2LOGrjuWvE8O3I0M7lrFLoGEJNwrsOB8zJj5zsPZ7BBqq24537pQQu9VjUQwAJArtO8FgnMvlg0xezUR/GDHWe5ZNxxhYJjABXAGk9oFp2x8sESwTEgusqLETJxvDTDZGubxzmMmd2NCXXctfdi3fNIw9AnWYsO9BpVOGI59JSX0UoIkHsoLZK2F2FdrLnG4Mc7l2mMmPFXila7mz2jEUldJIAIie3JevPq9rGV3LyEXjUS7X9jO5sjt2b4ys/K4X8e97lr8ByAKImWbGxL5zpOVvzs8yOPG0bWpoQxNPtVZHrzpEsaTQJSdYOczklYNM3oTih0uxSXoRI2Y6XhKftAQwYRAb9CybUa4XH6Zuc3fsXskj/c1SbP5gmYwomI+0vDaEH/WsJwDsU5LSJi838uxnBbNfnUWxLKqDUS7X9lN5Mxd9px/x0iA2iEpH5/tqhgn9iJBYMoepvLQ3ceup6PpKYv4tNnQPIBdIqD9c0gBym5Wfa/UbwowbbGcPwFIpnasA+pnouf3UvTnM5D1r6PK5njWJKdTs02zqXej0UqcU+jGDCcs7E/d3O2PXX+2Yf+kYEqZpRMmPSiWelJrymjxVPddQObgD+RgbWgFdEsWKQgejTK8+TN1/yEXf7kfcH8SF3Xw8norTKGj1ujSE5wOdip/32sgQVmLT2Zu497dHuT3Xjf4pNuSYpuNTP6Rog3CkPEkpfRrqN5w18YMJlQ3tl0BXFTo4SOXVh6n7TwS8tpKYqB8V48q/zN15dHjTs86KkKrWXqda2Nt+zPFBKu9tjfLRZs/+k2XKmGZCjBVgX4vNvU3lY9RvFACd2k8AvYNUXtubuP9qDb24HBnTjR5f3YZQHhWelk9qcDNo7Vqn71UAhgixoc4ol58/TN03ax3zEUCdMgjhhxStF+h/ZiJK3AI0aVC9fQBLh5l7ZS91/yUy9NJKYrhjGKcVUGkBNwOpCV75hLa8RtX7VG17nU6vLRMiosHexP1d1/I3XUujMrRYaamJNwHAx0wyzA3UJikNHaQklNJMdHN3Ir+MmF5eLYGGAnokOVQH2NLRTSqzBi+U1lLy/M85Dl74ukola+kdp7m+8HDi3uhavutPNnjhUPacJP/QeVW/oT2NwiGMKJYADER1sD3O32fS66uJ5cTwbKfW1KY2Oiuhugxfc1rJC1XqrNrV5hvDuylUAQLsQSbvboh+GBva9yTVBOHEZwJq6CQZ7wclXvy2CyDZz+S11OnP1zsmiphqd3wrmAZ7p1qH0uQUtUneDFhPqkPA/k0Rqmn1PlOgyAWXxk7WLZtdppqkhrlVc6t+/S/YNJ0WB0H6bia6+XDi/uMg5n5sOLCNLc6K15kSdPBxnm2b5PkFN33tINqiETx4088JJFnK7yaKTup0HRG+QXNGBp2Fs/SkJdVXIyYYxlRHB0BHob2D1L1iCD/oGIaWnYEWm9emNlW1djM02c02tRna0uMkb9bOak16/eelUsFE5ESXg5u7SUp5nqE2qd6apIqiB6CTOV3bT93P+rExCiDXWWel2Qk66rQj6WzwYI+BV3dw2iWvCV4dujZoAM+uEiA6Y0dNA1g8SRVsn6CE+tEjX0ot6hPfHVHtHWZyjUBXIybk0qTqtKZOJbB5YecDdS8Uj6Q2NZD+2c/TFqcofJ+WqpsBGAPHNB2Phg5kaE/nEio3qF/jeb5RKaVxJrpykMmbESOa2i5tdo4abVsgJY03xElAj4GHFvVb/YG8z7CqYC0iCZEqLBQjZlXDk5j5jmWaKDQCyAS2lJ4V9duken3v1wKIJk7PZyIvRtYgl3pnz4BokgrVxgjQ6dTmrP2s7C15zlbR2wqr5VhMcZQMpVr+IEWkilgUMRSsCjgBGU63bfTFwVLyf+OY75czcaGkUkPggQMrMjeOku/5Gk9KuwASp7o0zORFgPpVbpCGwYEmT1Ub1F2D5M3Yz4bhyNReq79WQ9EBYQlAnwh9AAMmdEHFbD0DPVUkIFhSkChIFSSAiAAiUFEQA7lz8eFYN7/t2Win08llNkW1beXBEwnu2ycMNBzSTCWWCSQKmzpdHjt5kQB20uSRtqjOVjWtxzoxvtNEJbxICV0ClghYZcY6AUvMGBChT0CHqTD+RLAERFRKcfmBzjkICfJMIBCwISgRlBhKgIUSi5w7dzD50TAy2+MkGmm9P/w+mtvYb5ON8G2qLXNxo9Tpau50nQlUqN5wcN/soYYDftETxqGqYBAYWo6jCOtM2GSD84awyoQlw+gSocuMmIrcJAbqMefpzVQBFaR5hjsPHuDB3i5UFWtLA5xbXkUnSsp8GodIKFpN3asPx9mNe1G043jG621anTc3UCkA27aQySjUpk42csUSV0asAYiEMd2TwnfejUB6NGG7RsCmYVywjHVmrFnGgIs0mISqLEOafntqmeqp1LxTwf7BIT783af48PPPcPPeHUCBy5vn8bMfvYGfvPojDLp9GDVQVSSqyyuT/OXdrvtmFJsdTwWHqnhuJRUNUGvrX5ygN3F6TgRWSn2oMzZxVs02gfbHqJXB6oOwwcB5Zly0hURuWoO+YcTMUCgMAU4coIAxtsg69MA2zQYoFCqK8WiCT778Av/jt/8LN27fQppNAAD3dnaxs/8QkY3w7qs/QieKYWAQiTODTK71Mrc2js1trTtJ1CClT2Ru1Z4BUGrw8AyKzPkkFd1wqqSqUEKr/dSm2G3gTFE58F0BcMEQXrKMy8bgXMRYMgYdZhhTQBNVjCYTfLe9ha3dXYCAc6truLhxDr1OF8Zw66SsQiEQbO3t4sPPP8U3d29hkk6mL5tkE3x77w4++uJzvHjhEq6c2wQTw+SgRGSlm2abthtHGc+oW2qZ4cI8OUptMzVMAGeinczpilMl8ZykpviptoxNqbzdOwAuEPCSNXgxYlyyjGVj0DUMa7hI6SulUAHsH+7jw88+xW8/+wTf3rkNIsLVC5fw/ltv42/eehtrKyvgxvk+gEDIncPdnS386eZNjCbZzI8fTzLcuH0LW/u7uLJ5HoYYYCCCxktOzz8Ql2RsCMevdJ/rMGHTl6dMtJer9HNRuBaobbFY0nLcCOAyAa9bwvXIYtMyetbAMsMwg5jA5ZmoMJTD8Qgff/EF/vtv/hlffffdVG3e2drG1t4u4jjG+2+/jaVu70gVB7epQvHw8BAHwyFUZzWkquBgOMT+cFh0gmGICIwyd52uRU67Y9sYHmzqP5knqGHoK4Q6yBziXAAnhZ1sDsEdOScV1Q4UGwT80BDeigyuRIy+NTDMYGaw4SnMKVQQFIr7Ozv4188+xte3v6urzXSCr2/fwr9++jFeeeEq+le6YGoWGhHFaDyBqDsmA0MwSicAE9gwjBgYVcSgnhWJCWCd7asnGiI8iyFNm52FU41y0b4T5VwLSXUNGQlhpIcUWIPiNQbeNIyXLWPFViq2DpQNFyrXU7157nBvZwtffvstxo1qM8WX336Lu9sPcO3SJVhDLcAUaZ5BjpEhUSBzOUDFjaVGYYSJVROjFLX0UzhbI/OofttsLERhlIooklOFOyGwgBLoeyx4iwmXDKFnGLaEaRqAVlKKckGUqGDv4AD7w0NIg9oUFewPD7G7v194xeUqqZkfc8oEOKLyexiGOAExwZSO/iP019xCVf/LEkEJyFWgIhXY5kB89cYYwGsQvMXAJUPomEIKwTiSSD6SzNCWEgqvdzgaF6G8NgkTwXA8hkh7vzMT4igCH5MNZxhI4gjGHmkMMEFFK2RhVv5xtZnmEmptRoxAwkSpAs6ptkCtx3MHhvA6KS4QI6oWQJVAp6qXjmxpDWgpWaoo1aYeA1WRZtmJUHudDpjbHVUmg16nA1NqDcMGDFEwTVyR/+uDbKusNldQ9TioAMQyRkRwAtUcIBGtz5MGH7TGkKsAWVKqbCQhULEBTB8oPcElGoYNVgcDDHp97D7cn1HlRIxBv4fVwaAAT4CSoqw/MHSGx9pcveWZWcqoDaCVptnpBCklVdCc6GUIWLM87Il2GcUAzwdLoPpj79oHehq1eSrVahgXNzbx6rVruL+zjeF4XPt7N4nwygtXcWF9A5GxxYyNEhQkY4OtlGmIeoGtatkFWqR2btWvv+ILROQYyKEKKT1gwaxzBACxJQwivkcpXxaoMZ474Xu4U2mtgFJdQk+lNpnL1xwDnhjn19fxi7d/gtv37+Ormzen4904SvDipSt4/62fYHNtfTqUUgIcU3rIuO2ID1Gv+KLzblM1ULX+ASnCs1olDQiRSjEVCRdIaWVPu8ZIN7F/Hkve74omRfxBp+CgqElmW6LlSWqTiTHo9bE6GMCwOcarJfR7Pbz3+utIsxT/++OP8c2dWwCAqxcv4f233sG716+j1+0CUoRPRFUnhL3DyNzJeFrVxV80dSaq2J6h6m3y2YucnVJSpSETEChU73JshiaxN0fOLq2M3QYAWwFU1VpgbQq7wY6epDY7SYxXr13DxY3N5vhv7QYgrA6W8cv3foYfvvgS7m1vAwqcW1vFhfUNdOMOCMVsjooiJ3UPmb4+YL6r9dpLzgOraC5cOTdQG21pmVsmiaV9y3RYG31TPVkbAGLDWIr5ronM7m5ib6xl+mpEuu7Pa/oDJqpGgfToavOly1fwi7d/gvPr663RpLrkM5Z6PbzcuYKrFy5CVWGNOUqQczJNW52AHm4bfDFh3gN0gvrqN9fiCc/9OFXrEkhpxHxomISJmAigYKkEEdCLWFYSc4MMpXtJdGd3kn+ZZPpuJBpNY8NaHNXjNk/3OLV57eJl/OKdd/De66+j3+s9krds2IAjnk7ISymdlYOUQbMHrF8+MHzDsY5RSGraoILzeZfUJqDTc2xo3IvobmI4tSzWaT0NFCjyXpZjM1xNzLfMyMaJndzvx79fPkhfiCCXDJRUPKBaepmqUwclVMOh2ry/swMA2Fwrp9663dkZmqYfpcGanipdtYQpIhAVZCK6D71/N+JPhxFvidYKalWHr3ox7za1UR0Xy+UpX0nMza7N92JDHafEKoBQEUliAnqWdaVjvu1FvGuInADY6ya3H2T6aTzJlyKRZVaediKV62+gxbiQlMrJ9zrcSm3+oPsCrl28VPx4a8BlWO9UMP1ZpOp/lt+j0hy5CEaq+3eZPt625k9OdYijAlqTBpv6xJ2ls3SUms66FJmdlcR+NcxkhVS7joqkFqcKZcZGx4w2OuYPHcPD6gMzRX6nH/8+UR1ETt9lJ11mAUsxvQUCGEVmw5EzXIdbATZkYGJzeqkMYE6lszpKrSFO4EQwVh3dNfjsu9h8MnH6EAZD1MvdVZL6TNrUxiFOxJRe7Jo/9VN+eY00XnYwCSs5BQ6JVBLeiSJ+wOSLOXQIPvi2Zz+Ohi4h1TdYpEviQEJF5IaKDp5mztamRWnqJT/qrVlbRlkNv8ohy1RKReFEMFQ3ukf4/IbFRweq98Vg5EH0HaXjhjXPjvotbBskcdJ5Lc2vrjOWOpaMsaDCFhaipMD5g1H2yxtM/3MrNvemxoah+3G0/WcyH2KYO1L9cc9JjyE07XRWMDx1qsEkoD76t/fndUPprKDmojpSGd5j+t1XEf/bnsXt0o6OPSn1bak7IQY812HCWuw3Eo1fGmZvXZrkP09Ue8xl99dtWpTk+oo9TGOh+B93IvPA7+O9iLdvdO3/ybJ8dMHpm0vq1iKnbFAArdRsNUlejHYavGM6eYQdOkZTmOXhRDERkSF0757RT74x/NmewZYeAW2S0vSsvN6nOfVWOCoKsznJL26O83cT1Z4BTYP007HmtL/VLAsuX5m4Nw8N/yZlympgLXYzE300St3OpUzeWlFcSYCERckYLdJatP7ZSlpTxcdBnVm57tlRUUXuBJkCh+ryLZXt+8yfbFvzuxHJAUC+VI4bvF7XAPSZKziprEAkYjcn7noHWDVUiOg0CB/MqlCR9hmtO3114PR3O0QPhLybhFlHwPBmYv54aLFzIcf1ZSev9YlXYxUbm6LuAqOovUS13N7mHKQwJbSucovUGyeKsSoeiuCuiGwDO1uMP44Zt2LGiIg1kE5/bOoa1O7cz6eGY9PazhEdp1FH5JxRGA5STqgMpNccGgXFQG/J6eqOxT1vRsOgXAWRgdJ7kb27q5pFTqgn7rUBaH1dhQZM6JXzsIZQAC7HrEWGoTaEMWkqjQDgUESGUihGIthXYJeALVbcFdC2EyXmYaJQEo0ipoyoNlxxDcMXd1Zq92kFH6Y/Ila1DGJincL0MxV8m6flimImkC3mxXM5KohcFQaphqvYJuVDCJNq91xEtELAMoC+Cnqq6JWLnBLiYtUWHXlNdf+J4FDkTqUQpCAMSTEEsM/AnioOGJgQYUSgVLEKJ6uWpw6dBBIZbn9y5lJ6VlDDvV0cgNwRjZVpCGUBkall/nnSenRLqBI0y5j2tLBNecAgUQWJKo1y2RiJXuxZ7mYRYxfAAYqldrESYgU6BHRIi2WIVOQNseciKwBHWkz4EpBSkaqQEmGkijERUm+W2xpCYjkaZvJCrnrLqcZRMeQOi0z6s4vSED6de0dJGqQ0B5ANDe9MmL4TxZsEinxJrcBOP6SwY5IBW0NDd4UwxlGhxmqgEgEwThGnTi8w6Hw/YjJcJkNBkTPjUIqvZYkRUSHeROrVBqbalJ+WgIWq/ONiRZtTwJW/rJrl61mmSS7nMqebYnGnDIopmteYaltMfJ6h+nU4arZECJOUcbgTmU+XVa4nwHUwWSKahukqT7Va4JYrDnYIn+4z3S8ltbKn1VkAmFy0l4ue61pOLJOXEE5FhZTyHpDSW2GSoznZcIijZUUJCjwoqcxCfahjCEgs28NMrmaif+oCJFpUrsUZlNL5PiXV3yOtKq6YOqLDO4n5w7LobyPBco9wmQlWK++Uph2tGXCwR/jklsFHk6KMuX+3sz+EzER7onohNlSGG490tFQrzosp+iK7sHLHjpv1bfmbNFRNi4qZgM2J0w2nertcRRcuegqXej4TUMPdkSRUvwDSMdPe1x3zz5pqel7wn/tE1yKiTumUqgPyCWFrl/Tjm9APdwi3cOQgVcv/pg6GU7XjXM4xUZ/LfOImENOIlepj96h6ej8swhURkkku13LhL40hfx1quHvVE03aflrqN5TUNPhh2Df84KtE/+XA6c1NxRtL0B9YQk+AcUp4sAfcuMf46h7hrjvaGcIEZy6HNZw6vWiZbFGMSmdBKKY21I8dPmbUcPo+/18xE00yeWHidCUxuIXj95x7JiT1NFI6hSqAHjJlXzM9vKP4Y1fRj6EdhcqEMB4Shml9mw9qOZtJroNM9JJlQtYgpeqRqK910FqmuTYr4UZPZ6aEdjUxRBiMMrm4EpsvUd+jxq9U07aMce7HqZWUVhKVNvwtFSAeEYYjwh6a3RagXkzK7yArUDNxsqaKFQDInM6aRm2ICD6hrgzrJRLAIycv5qofRUR7qBcy8VeQn0nl0LP2fhGo4CbgVaqkD8q3N4TZSbTpAmZVRKKwYyebCk384lrUMH7gY6TRfy0FKhannOApYyWUi16e5LJqIrPF1Lj9ZxtYnXdJxTFAqxVIOZoLL/q7FUeob2RbSKgW24A50Wic6yVRcOr0sXqlKemt7TUnvbasSdg7yORyLzJfY3Yb0LbydXPv/YYenb9pnfXAhnX6fBXrUKyNYu/7TSuSUrmzYuq0lzo9r6rIqV3KTpK000jlabaiKMdYZpjJy6L6/5gorBhqvN9DeMZsaqiK88CRcqiX5PF/sASSTJgtWhkLlEe5bGSiy9IiPqHsUlDRu0pSC8/TwL6XS+x/nj/pUL8u/jxycnmU61o/oh2mEwtN0rxD9aU13EXYf97fk8V5UujvK2pDtYtiF8aOQqNxroODTF7OBNbJbNStSfJo5jU6RTL7Lp2+Z9ZOq/dYa5JdhK9pMM5lox/xn9FcXPKkvdHnMqLUNrD2ofqbsVtPc3Lgt0zLtYsiVmgyynR5e5xf38/cKxMnJDo73vCF93EWvlU2tOlx+LfwNaoSTZysKtSWRSaPK4RFz4r6PW7vbQ3AV8GEKJjN8Md2VbW0+CCVC9tj96PdSf7OMNPlzGnjPzitl4sWr5caxqU45rna80o0ynVTFaZaCXJCiJCeBag+zBBu6MITZucW/dpLkSgSJvBhJusPRvmPt8buJ+Nc+pNcyGlzp58E4KxauVicJrlsiDbW86WGodsz4yjV4H7wqzfwwa8/54Y+D6WTAJBTjUSRqKKrQHeSy8X7o/ynD0bunf3M9XOn5JfsCSXMl97QFtBjQNcTpL2WsEjARHSQOkliY/B9tKe21eYHv3pDPvj158clbE6dKFHEuRQVvB9O3A92Ju5vt8f5uweZJJkHNIzHchUIoBbV20Cx6aZAy7CmbdhUXZtS72SiiRbTcFRu5OfPCZxmZPVsQD3mx9Rc/InTjlONJ7kOhrlcfTDK/3Z37N49yFySSglUmzvdtRCpzYULptNxoV1FcEOE5H2w4U1CCihXeU4Qp8qoZz+EWQ/6zEtqC9CZ0neWIQdjXd5L3UuHmfvpw9RdP8hcMs6FcikSwfQEb8Pv+OmG8lr3VOW4ChVNkqpHU75hJVOaRp4IFgoipAyqUnDCdNCmzAh9XqDOtFzUOIU9zN3KJJeNUSaXx7n0UgdKi+LXEH38Owh/QS9Sww3jC2tZuwOWSCLGDtMUajVb1bQZrj5vkjr7ZZjc4URiURgFrBb7DqioqqqSa1l5/tQ8WzruZilqB8eW825kvomKrcCyAKz7a4OqAGQppoP9lIZM2DdE2xFTahlxJkXWC2M2sK5PE2x4TUXaRsSExECWIt7qW/7KEEZcJMz5C6KaCnjo8wQ1XBEnANQQ5YOY76WiWx2rX2fCl3PVawoklCvlqkfpJEGh59P2UNPw5CQJnY63ylKzNLXXBMNAbEiXYjNeivirpYi/ZiJ/xZuf2H2mQJ861A9+9YaWw5omoNNsiZXEbBPRvx9aGnasbCcp/U1i5PphKssTEZM7kINiWlxLi4XL0EfrJT7FWLVatlG46OUW2lPIBMNQS9BubNKl2NxcivizfsS3mHCI0692e67Ub5j0XE2eR8sxby1FnKai9ye5fHl/lP104vTqYaavjHLZTHNNnKrJRKmo9F2U9pGy5IBIfVvOk+Jy4ViVuQBJRIgYaoiUqV6ZzTCpIXKxoVE/opvLCX+00bUfx4Yf4mj1uF/nQTwVrM8z1BCoKTuCmcAdQ9oxZjKIze44l/VMdG2cy/nDXK5kDquZk5VMdSkT7TlBIgrrRK1AjRT7/5AWa67KkUltK86jAoblRFqpXWGIxDDlhuAs08QyxkyUEaC5wmqxeiRnwmHH0HdLsfn9WmJ+vxSbu1yktQ5RXz3ug9WzBGu/J5B+BMVXvYyGZDUAYILrRZyK4uFKYr5zon9wZaA/dbIkRTZERwGTOe1Xw0dRWKeaGKKJqFoiUlVlIhLVArwAUbGbhcZMcEyUoVj1PowYw4hpbJgmKHLDMxQlhFzq1FrGw4hpL7G8EzHt42ihcSipoU09M7D2e5TQCmgVDKqiS2lD/LhKsM+YkAKIDdPIlLtTxcZsoT4JHeYBoeExVEFO1ZSSmTtVY4h8DxXlKrYwQ7LSKtUx8Y5xcE49oE0r3p5NqB/8+vPT2FXXYu7CDk3hbQqI9tQYv+S7f645QdabHC2vFc0LmsKVbHkD2Ka1qXkwpJHn0aZqEJiRY3yYmSx/D6Sf1OWnkIYT0sDpt7Sc2TkbDWttWyTW/46+ym0r2PFc2dQ2uwovnBYOcyKv05oSunyVW8vib5DY0zpvoaQ2rUAIFxj7cMMoUh54+ngeoTap2SavuMow9BPUmiTTNKhafkSgTTYfmJ1t8VeEuwbpdS129LmfpdFj7CejOWGtacfgcNOeJlX7qJl70gJYGsbV0qKeteE9etbDmXkZp4YqmVrgUsuZG7xbDgJHJ8Ue2r4PWmDoCaq5bUbmzIHOS0Bf0Z7v5duftjTLJqhPag81OSZWjQYbGarrNucLzzvUJrihI9WUEnScND6KdJ7WPOgpQLXBeyow5xFqk9prCsuGUlTLZDkG4KPYVXlEFd12E+BpwpxnqDhl59BjSCM9ppSeVpLnov3FUP/h71+fF+9ZsWjPjKQu2gLqoi2gLqAu2gLqoi2gLtoC6qItoC6gLtoC6qItoC7aAuqiLaAuoC66YAF10RZQF20BddEWUBetuf1/jctcvKKjHmEAAAAASUVORK5CYII=';

// ---------- Diagnostika (zobrazí sa v paneli; pomáha ladiť na cudzom stroji) ----------
const BUILD_ID = 'build 33';
let frameCount = 0;
let lastKeyCode = '–';
let texStatus = 'pending';
let lastError = '';
let glInfo = '?';
let lastHitSoundTime = 0;
let diagFps = 0;
let fpsFrames = 0;
let fpsLastTime = performance.now();
let visualMode = 'model';
const enemyBillboardTextures = {};

const keys = {};   // stav klávesnice

// ---------- Predefinovateľné ovládanie (uložené v localStorage) ----------
const CONTROL_ACTIONS = ['up', 'down', 'left', 'right', 'jump', 'beam', 'pause'];
// Každá akcia má primárnu aj sekundárnu väzbu (kláves alebo tlačidlo myši 'Mouse0/1/2').
const DEFAULT_BINDINGS = {
    up:    ['ArrowUp', 'KeyW'],
    down:  ['ArrowDown', 'KeyS'],
    left:  ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    jump:  ['Space', ''],                // medzerník (pravé tlačidlo myši rieši setupMouse: klik = skok)
    beam:  ['ControlLeft', 'ControlRight'],
    pause: ['KeyP', '']
};
function cloneBindings(b) { const o = {}; for (const a of CONTROL_ACTIONS) o[a] = (b[a] || ['', '']).slice(0, 2); return o; }
let controlBindings = cloneBindings(DEFAULT_BINDINGS);
let rebinding = null;            // { action, slot } počas priraďovania, inak null
let controlsReturn = 'menuScreen';

// Drží sa niektorá z väzieb akcie? (primárna alebo sekundárna)
function actionHeld(action) { const b = controlBindings[action]; return !!(keys[b[0]] || keys[b[1]]); }
function actionHasCode(action, code) { const b = controlBindings[action]; return code === b[0] || code === b[1]; }
function anyBoundCode(code) { for (const a of CONTROL_ACTIONS) if (actionHasCode(a, code)) return true; return false; }

function loadBindings() {
    try {
        const s = JSON.parse(localStorage.getItem('snovy3d_controls'));
        if (s) for (const a of CONTROL_ACTIONS) {
            if (Array.isArray(s[a])) controlBindings[a] = [s[a][0] || '', s[a][1] || ''];
            else if (typeof s[a] === 'string') controlBindings[a] = [s[a], ''];   // spätná kompatibilita
        }
    } catch (e) { /* ignoruj poškodené dáta */ }
}
function saveBindings() {
    try { localStorage.setItem('snovy3d_controls', JSON.stringify(controlBindings)); } catch (e) { /* napr. private mode */ }
}
// Pekný názov klávesu/tlačidla pre tlačidlo v menu
function keyLabel(code) {
    if (!code) return '—';
    const map = {
        ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
        Space: 'Space', ControlLeft: 'Ľ-Ctrl', ControlRight: 'P-Ctrl',
        ShiftLeft: 'Ľ-Shift', ShiftRight: 'P-Shift', AltLeft: 'Ľ-Alt', AltRight: 'P-Alt',
        Enter: 'Enter', Tab: 'Tab', Backquote: '`',
        Mouse0: 'Myš-Ľ', Mouse1: 'Myš-S', Mouse2: 'Myš-P'
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    return code;
}

// ---------- Dotykové ovládanie (ťahaj = pohyb, ťukni = skok, podrž = baterka) ----------
let isTouchDevice = false;
const touches = new Map();           // identifier -> { sx, sy, st, mode, dx, dz }
const touchMove = { x: 0, z: 0, active: false };
let touchBeamHeld = false;
const touchBeamPoint = { x: 0, y: 0, active: false };   // kam na obrazovke mieri lúč (swipe, držanie)
const _aimRay = new THREE.Raycaster();
const _aimNdc = new THREE.Vector2();
const _aimHit = new THREE.Vector3();
const _screenAimDir = new THREE.Vector3();
const TOUCH_MOVE_THRESHOLD = 18;     // px, kedy sa ťah stane pohybom
const TOUCH_DEADZONE = 12;           // px, pod tým sa nehýbe (návrat prstu k stredu)
const TOUCH_JOY_RADIUS = 47;         // px ťahu pre plnú rýchlosť (~1.5× menší joystick)
const TOUCH_HOLD_MS = 200;           // podržanie na mieste = baterka
const TOUCH_TAP_MS = 160;            // rýchle ťuknutie = skok

// Režim dotykového ovládania + stav on-screen D-Padu
let controlMode = 'swipe';           // 'swipe' (default) alebo 'dpad'
const dpad = { up: false, down: false, left: false, right: false };
let dpadBeamHeld = false;
let jumpBuffer = 0;                   // jump buffering: ťuknutie/skok tesne pred dopadom
let joystickVisible = true;          // plávajúci joystick (swipe) – voliteľný cez menu
let mobileMode = false;              // mobilný režim: vyšší skok (×1.25)
let devVisible = false;              // diagnostický (dev) panel – default skrytý, prepínateľný v menu
let camPunch = 0;                    // krátky náraz kamery pri dupnutí na nepriateľa
let flashlightPitch = 0;             // vertikálny sklon lúča/baterky (+ = hore)
let camYaw = 0;                      // otáčanie kamery myšou (PC); 0 = za hráčom
const CAM_RADIUS = Math.hypot(CONFIG.CAM_DIST, CONFIG.CAM_HEIGHT);
const CAM_PITCH0 = Math.asin(CONFIG.CAM_HEIGHT / CAM_RADIUS);
let camPitch = CAM_PITCH0;
const _camTarget = new THREE.Vector3();
let rmbDown = false, rmbDownT = 0, rmbMoved = false;   // pravé tlačidlo myši: drž = kamera, klik = skok
let lmbBeam = false;                                    // ľavé tlačidlo myši: drž = baterka
const RMB_HOLD_MS = 350;             // hranica klik vs. držanie pravého tlačidla (veľkorysé — pohyb je hlavný rozlišovač)
const RMB_DRAG_PX = 16;              // koľko px pohybu počas kliku ho zmení na ťahanie kamery (vyššie = klik tolerantnejší)
let captureMouse = false;            // PC voľba: zachytenie myši (pointer lock) — pohyb = kamera, ĽMB = baterka, PMB = skok; Alt uvoľní
let pointerLocked = false;           // skutočný stav pointer locku (podľa prehliadača)
let autoAim = true;                  // zvislé auto-mierenie lúča na najbližšieho nepriateľa; predvolene zap, keď nie je zachytená myš (vtedy mieriš ručne)
let camZoom = 1;                     // násobič vzdialenosti kamery (koliesko myši); <1 = bližšie, >1 = ďalej
const CAM_ZOOM_MIN = 0.55, CAM_ZOOM_MAX = 2.2, CAM_ZOOM_STEP = 0.12;
let mouseSensitivity = 0.7;          // default je o 30 % pomalší než pôvodná hodnota
const MOUSE_SENS_MIN = 0.3, MOUSE_SENS_MAX = 1.6, MOUSE_SENS_STEP = 0.1;
const MOUSE_LOOK_CAPTURE_BASE = 0.0025, MOUSE_LOOK_DRAG_BASE = 0.005;
const MOUSE_AIM_BASE = 0.005, MOUSE_AIM_PITCH_MIN = -0.75, MOUSE_AIM_PITCH_MAX = 0.75;
const MOUSE_AIM_BODY_LIMIT = 0.85;   // voľný švih baterky; telo sa otočí až za hranou oblúka
let invertMouseY = false;
const mouseAimPoint = { x: 0, y: 0, active: false };
let mouseBeamAimActive = false;
let mouseBeamReady = false, mouseBeamYaw = Math.PI, mouseBeamPitch = 0;
const mouseBeamDir = new THREE.Vector3(0, 0, -1);

// Stred tela hráča (chodidlá + ~1.2) pre kolízie s orbami/nepriateľmi/portálom
const _pc = new THREE.Vector3();
const _rayRel = new THREE.Vector3();
const _rayClosest = new THREE.Vector3();
const _beamStart = new THREE.Vector3();
const _beamDir = new THREE.Vector3();
const _bd = new THREE.Vector3();
function playerCenter() { return _pc.set(player.pos.x, player.pos.y + 1.2, player.pos.z); }

// ---------- Inicializácia THREE ----------
function initThree() {
    const canvas = document.getElementById('gl');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // mäkké tiene

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
    camera.position.set(0, CONFIG.CAM_HEIGHT, CONFIG.CAM_DIST);

    ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(8, 20, 12);
    // Vrhanie tieňov: na mobiloch menšia mapa kvôli výkonu. Tieňová kamera sleduje hráča (updateCamera).
    sun.castShadow = true;
    const touchDev = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    sun.shadow.mapSize.set(touchDev ? 1024 : 2048, touchDev ? 1024 : 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -38; sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38; sun.shadow.camera.bottom = -38;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    scene.add(sun.target);
    fillLight = new THREE.PointLight(0xffffff, 0.6, 60);
    scene.add(fillLight);

    clock = new THREE.Clock();
    window.addEventListener('resize', onResize);
}

function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Gradientná obloha (bg1 hore → bg2 dole) ako scene.background textúra
function makeSkyTexture(c1, c2) {
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    g.fillStyle = grad;
    g.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function loadPlatformTextures() {
    const loader = new THREE.TextureLoader();
    for (const key in PLATFORM_TEXTURE_PATHS) {
        const tex = loader.load(PLATFORM_TEXTURE_PATHS[key], () => { tex.needsUpdate = true; }, undefined,
            () => { console.warn('Platform texture failed:', PLATFORM_TEXTURE_PATHS[key]); });
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy)
            tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        platformTextureCache[key] = tex;
    }
}

function platformTextureFor(theme, w, d) {
    const base = theme.platformTexture && platformTextureCache[theme.platformTexture];
    if (!base) return null;
    const tex = base.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(Math.max(1, w / 3.6), Math.max(1, d / 3.6));
    tex.needsUpdate = true;
    tex.userData.platformTextureClone = true;
    return tex;
}

function applyTheme(i) {
    const t = getTheme(i);
    if (scene.background && scene.background.dispose) scene.background.dispose();
    scene.background = makeSkyTexture(t.bg1, t.bg2);
    const fogColor = new THREE.Color(t.bg2);
    scene.fog = new THREE.Fog(fogColor.getHex(), 35, 180);
    const accent = new THREE.Color(t.accent);
    ambient.color = new THREE.Color(t.bg2).lerp(new THREE.Color(0xffffff), 0.55);
    fillLight.color = accent;
    // 1-based: setScaleForLevel(0) by dalo (0-1)%3 = -1 → neplatná škála; ríša 0 = level 1
    if (DreamMusic && DreamMusic.setScaleForLevel) DreamMusic.setScaleForLevel(i + 1);
}

// ---------- Hráč (billboard) ----------
// Verný 3D model Olivera z hladkých primitív (modrá kapucňová kombinéza, ružová tvár, veľké oči).
// Tvár/oči smerujú na +Z. Celé telo je pevná geometria → vždy viditeľné (žiadna závislosť od textúry).
function buildOliverModel() {
    // Verný chibi Oliver (podľa referencie): tyrkysový pyžamový kabát s gombíkmi, ovisnutá
    // spacia čiapka, fialové strapaté ofiny, veľké ospalé oči, holé nohy s ponožkami, držaná baterka.
    const g = new THREE.Group();
    const teal = 0x55aece, tealDk = 0x357f9e, skin = 0xf3c2c9, eye = 0x232140, cheek = 0xff9bb0;
    const hair = 0x9b5fd6, hairDk = 0x6e3fa8, sock = 0xeef0f6, button = 0x191934, metal = 0x3c3c46, lensCol = 0xfff4c0;
    const mat = (col, emi, emiI) => new THREE.MeshStandardMaterial({
        color: col, emissive: emi !== undefined ? emi : col, emissiveIntensity: emiI !== undefined ? emiI : 0.12,
        roughness: 0.6, transparent: true, opacity: 1
    });
    const coatMat = mat(teal, tealDk, 0.16);
    const skinMat = mat(skin, skin, 0.05);
    const hairMat = mat(hair, hairDk, 0.18);

    // Kabát (pyžamový plášť) – zaoblené telo
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 0.35, 8, 24), coatMat);
    body.position.y = 1.05; g.add(body);
    // golier
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 18), coatMat);
    collar.position.set(0, 1.5, 0.16); collar.rotation.x = 1.3; g.add(collar);
    // gombíky (3 tmavé)
    for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mat(button, button, 0));
        b.position.set(0, 1.34 - i * 0.27, 0.56); b.scale.set(1, 1, 0.55); g.add(b);
    }

    // Nohy + ponožky + chodidlá (vykúkajú pod plášťom)
    for (const sx of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), skinMat);
        leg.position.set(sx, 0.27, 0.04); g.add(leg);
        const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.2, 12), mat(sock, sock, 0.04));
        sk.position.set(sx, 0.13, 0.05); g.add(sk);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), skinMat);
        foot.position.set(sx, 0.04, 0.13); foot.scale.set(1, 0.7, 1.25); g.add(foot);
    }

    // Ruky: ľavá spustená cez bruško, pravá zdvihnutá dopredu (drží baterku)
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 12), coatMat);
    armL.position.set(-0.56, 1.0, 0.12); armL.rotation.z = -0.5; g.add(armL);
    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.34, 6, 12), coatMat);
    armR.position.set(0.42, 1.2, 0.32); armR.rotation.set(-0.9, 0, -0.35); g.add(armR);

    // Hlava – ružová
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 30, 24), skinMat);
    head.position.set(0, 1.82, 0.05); g.add(head);

    // Mäkká spacia čiapka chlapca – sedí na hlave (kryje temeno po vlasovú líniu), s jemným záhybom nabok.
    // ŽIADNY visiaci chvost – len mäkký previs pri ľavom spánku, držaný pri hlave.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.67, 28, 22), coatMat);
    cap.position.set(0, 2.1, -0.12); cap.scale.set(1.08, 0.98, 1.06); g.add(cap);
    const fold = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), coatMat);
    fold.position.set(-0.32, 2.34, -0.12); fold.scale.set(0.9, 1.15, 0.95); fold.rotation.z = 0.45; g.add(fold);
    const foldTip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), coatMat);
    foldTip.position.set(-0.46, 2.12, -0.1); g.add(foldTip);

    // Fialové strapaté ofiny na čele (pod čiapkou, nad očami)
    for (let i = 0; i < 5; i++) {
        const t = (i - 2) / 2;                                       // -1..1
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 8), hairMat);
        tuft.position.set(t * 0.36, 2.0, 0.5 - Math.abs(t) * 0.04);
        tuft.rotation.set(0.95, 0, t * 0.45); g.add(tuft);           // špičky dole nad oči
    }
    for (const sx of [-0.52, 0.52]) {                                // bočné chumáče
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), hairMat);
        s.position.set(sx, 1.9, 0.14); s.scale.set(0.7, 1.05, 0.85); g.add(s);
    }

    // Veľké tmavé oči + odlesky + ustarané obočie
    for (const sx of [-0.2, 0.2]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 18), mat(eye, eye, 0));
        e.position.set(sx, 1.82, 0.52); e.scale.set(1, 1.25, 0.7); g.add(e);
        const hl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hl.position.set(sx + 0.05, 1.88, 0.6); g.add(hl);
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.038, 0.05), mat(hairDk, hairDk, 0));
        brow.position.set(sx, 1.97, 0.55); brow.rotation.z = sx > 0 ? -0.22 : 0.22; g.add(brow);
    }
    // Líčka + malé ústa
    for (const sx of [-0.34, 0.34]) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), mat(cheek, cheek, 0.1));
        c.material.opacity = 0.6; c.position.set(sx, 1.68, 0.44); g.add(c);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), mat(0x9a5566, 0x9a5566, 0));
    mouth.position.set(0, 1.62, 0.55); mouth.scale.set(1.4, 0.7, 0.5); g.add(mouth);

    // Baterka v zdvihnutej pravej ruke – pivot v ruke, miери +Z (sklon rieši syncPlayerVisual)
    const fl = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.46, 14), mat(metal, metal, 0.05));
    barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.23; fl.add(barrel);
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.18, 16), mat(0x20202a, 0x20202a, 0));
    bezel.rotation.x = Math.PI / 2; bezel.position.z = 0.52; fl.add(bezel);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), new THREE.MeshBasicMaterial({ color: lensCol }));
    lens.position.z = 0.615; fl.add(lens);
    fl.position.set(0.36, 1.28, 0.44);
    g.add(fl);
    g.userData.flashlight = fl;
    g.userData.flashLens = lens;

    g.traverse(o => { if (o.isMesh) o.castShadow = true; });   // Oliver vrhá tieň (3D model)
    g.scale.setScalar(1.18);   // ~3 jednotky vysoký (zhruba ako kolízny box)
    g.userData.baseScale = 1.18;   // pre squash-stretch pri dupnutí
    return g;
}

function buildPlayerVisual() {
    return visualMode === 'billboard' ? buildPlayerBillboard() : buildOliverModel();
}

function buildPlayerBillboard() {
    const h = 3.2, w = h * (117 / 139);
    const mat = new THREE.MeshBasicMaterial({
        map: oliverTexture, transparent: true, alphaTest: 0.08,
        side: THREE.DoubleSide, depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1000;
    mesh.userData.isBillboard = true;
    mesh.userData.halfH = h / 2;
    mesh.userData.baseScale = 1;   // pre squash-stretch pri dupnutí
    // Tieň aj v 2D režime: silueta podľa alfa kanála Oliverovej textúry
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking, map: oliverTexture, alphaTest: 0.5
    });
    return mesh;
}

function replacePlayerVisual() {
    if (!playerModel) return;
    scene.remove(playerModel);
    disposeObject(playerModel);
    playerModel = buildPlayerVisual();
    playerModel.frustumCulled = false;
    scene.add(playerModel);
    syncPlayerVisual();
}

function buildPlayer() {
    playerModel = buildPlayerVisual();
    playerModel.frustumCulled = false;
    scene.add(playerModel);

    // Mäkký blob tieň pod hráčom
    const shadowTex = blobTexture();
    blobShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
    );
    blobShadow.rotation.x = -Math.PI / 2;
    scene.add(blobShadow);

    player = {
        pos: new THREE.Vector3(0, 2, 0),
        vel: new THREE.Vector3(0, 0, 0),
        half: new THREE.Vector3(0.7, 1.6, 0.7),   // polovičné rozmery AABB
        onGround: false,
        jumpsLeft: CONFIG.MAX_JUMPS,
        facing: 1,
        aim: new THREE.Vector3(0, 0, -1),         // smer lúča
        faceDir: new THREE.Vector3(0, 0, 1),      // model čelom ku kamere na štarte
        beamEnergy: CONFIG.BEAM_ENERGY_MAX,
        beaming: false,
        beamCooldown: 0,
        invincible: 0,
        hp: 3, hpMax: 3, bob: 0, squashT: 0
    };

    buildFlashlightVisual();
}

function makeBlobTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
}
// Zdieľaná blob textúra (hráč aj kontaktné tiene nepriateľov v 2D režime)
let _blobTex = null;
function blobTexture() { return _blobTex || (_blobTex = makeBlobTexture()); }

function buildFlashlightVisual() {
    const mat = new THREE.MeshBasicMaterial({
        color: 0xc7a0ff, transparent: true, opacity: 0.28,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    });
    flashlightBeam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 36, 1, false), mat);
    flashlightBeam.visible = false;
    scene.add(flashlightBeam);

    flashlightGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeFlashlightGlowTexture(), transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending
    }));
    flashlightGlow.visible = false;
    scene.add(flashlightGlow);

    flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlightLight = new THREE.SpotLight(0xdcc8ff, 0, CONFIG.BEAM_RANGE + 8, Math.atan(CONFIG.BEAM_END_RADIUS / CONFIG.BEAM_RANGE), 0.55, 1.1);
    flashlightLight.target = flashlightTarget;
    scene.add(flashlightLight);
}

function makeFlashlightGlowTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 3, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.72)');
    grad.addColorStop(0.28, 'rgba(220,200,255,0.42)');
    grad.addColorStop(0.72, 'rgba(180,130,255,0.16)');
    grad.addColorStop(1, 'rgba(180,130,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function syncFlashlightVisual(active, start, dir, length) {
    if (!flashlightBeam || !flashlightLight) return;
    flashlightBeam.visible = active;
    if (flashlightGlow) flashlightGlow.visible = active;
    flashlightLight.intensity = active ? 1.5 : 0;
    if (!active) return;

    flashlightBeam.position.copy(start).addScaledVector(dir, length * 0.5);
    flashlightBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    flashlightBeam.scale.set(CONFIG.BEAM_END_RADIUS, length, CONFIG.BEAM_END_RADIUS);
    flashlightBeam.material.opacity = 0.18 + Math.sin(performance.now() * 0.012) * 0.04;
    if (flashlightGlow) {
        flashlightGlow.position.copy(start).addScaledVector(dir, length * 0.92);
        flashlightGlow.scale.setScalar(CONFIG.BEAM_END_RADIUS * 2.15);
        flashlightGlow.material.opacity = 0.32 + Math.sin(performance.now() * 0.01) * 0.06;
    }
    flashlightLight.position.copy(start);
    flashlightTarget.position.copy(start).addScaledVector(dir, length);
}

// ---------- Generovanie ríše ----------
function clearRealm() {
    for (const p of platforms) { scene.remove(p.mesh); disposeObject(p.mesh); }
    for (const o of orbs) { scene.remove(o.mesh); disposeObject(o.mesh); }
    for (const e of enemies) { scene.remove(e.mesh); disposeObject(e.mesh); if (e.shadowMesh) { scene.remove(e.shadowMesh); e.shadowMesh.geometry.dispose(); e.shadowMesh.material.dispose(); } }
    for (const pr of projectiles) { scene.remove(pr.mesh); disposeObject(pr.mesh); }
    for (const pa of particles) { scene.remove(pa.mesh); disposeObject(pa.mesh); }
    platforms = []; orbs = []; enemies = []; projectiles = []; particles = [];
    if (portal) { scene.remove(portal.mesh); disposeObject(portal.mesh); portal = null; }
    if (boss) { scene.remove(boss.mesh); disposeObject(boss.mesh); boss = null; }
    pendingBoss = null;
    if (dustField) { scene.remove(dustField); dustField.geometry.dispose(); dustField.material.dispose(); dustField = null; }
    if (decorGroup) { scene.remove(decorGroup); disposeObject(decorGroup); decorGroup = null; }
    decorItems = [];
    document.getElementById('bossBar') && document.getElementById('bossBar').classList.add('hidden');
}

function disposeObject(obj) {
    obj.traverse(o => {
        // POZOR: THREE.Sprite zdieľa jednu globálnu geometriu medzi VŠETKÝMI spritmi; rovnako zdieľame
        // jednu geometriu hviezdy (orby). Disponovanie zdieľaného buffera by rozbilo ostatné kópie.
        if (o.geometry && !o.isSprite && o.geometry !== _starGeo) o.geometry.dispose();
        if (!o.material) return;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of materials) {
            if (mat.map && mat.map.userData && mat.map.userData.platformTextureClone) mat.map.dispose();
            mat.dispose();
        }
    });
}

function addPlatform(x, y, z, w, d, theme) {
    const geo = new THREE.BoxGeometry(w, 1, d);
    const textureMap = platformTextureFor(theme, w, d);
    const mat = new THREE.MeshStandardMaterial({
        color: textureMap ? 0xe2c8ff : new THREE.Color(theme.platform),
        map: textureMap,
        emissive: new THREE.Color(theme.accent).multiplyScalar(textureMap ? 0.08 : 0.12),
        roughness: textureMap ? 0.92 : 0.85,
        metalness: 0.05
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;       // plošiny vrhajú tieň na nižšie plošiny (pomáha orientácii)
    mesh.receiveShadow = true;
    scene.add(mesh);
    const p = { mesh, x, y, z, w, d, top: y + 0.5,
        min: new THREE.Vector3(x - w / 2, y - 0.5, z - d / 2),
        max: new THREE.Vector3(x + w / 2, y + 0.5, z + d / 2) };
    platforms.push(p);
    return p;
}

// Zdieľaná 3D geometria hviezdy (5-cípej, skosenej) – vytvorí sa raz, NIKDY sa nedisponuje (viď disposeObject)
let _starGeo = null;
function starGeometry() {
    if (_starGeo) return _starGeo;
    const shape = new THREE.Shape();
    const spikes = 5, outer = 0.5, inner = 0.21;
    for (let i = 0; i < spikes * 2; i++) {
        const r = (i % 2 === 0) ? outer : inner;
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
    }
    shape.closePath();
    _starGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, steps: 1 });
    _starGeo.center();
    return _starGeo;
}

function addOrb(x, y, z, accent) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffe05a, emissive: 0xffb020, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.25 });
    const mesh = new THREE.Mesh(starGeometry(), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    orbs.push({ mesh, x, y, z, t: Math.random() * 6, collected: false });
}

function addEnemy(type, x, y, z, theme, patrolHalf, levelIndex, groundY) {
    const mesh = makeEnemyModel(type);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const radius = type === 'ghost' ? 1.35 : type === 'amoeba' ? 1.25 : type === 'flyer' ? 1.45 : 1.15;
    enemies.push({
        mesh, type, x, y, z, baseY: y, t: Math.random() * 6, dir: 1,
        health: 100, sleeping: false, sleepTimer: 0, sleepDuration: currentDifficulty.enemySleepTime,
        patrolHalf: patrolHalf || 3, originX: x, originZ: z, speedMultiplier: currentDifficulty.enemySpeed,
        shootTimer: 1 + Math.random() * 2, shootInterval: Math.max(1.1, 2.5 - (levelIndex || 0) * 0.1),
        jumpTimer: Math.random() * 1.6, vy: 0, vx: 0, vz: 0, onGround: true, isJumping: false,
        circleAngle: Math.random() * Math.PI * 2, circleRadius: 3.4 + Math.random() * 2.2,
        half: new THREE.Vector3(radius, radius, radius), radius, dead: false,
        groundY: groundY !== undefined ? groundY : y - 1.2, shadowMesh: null   // kontaktný tieň v 2D režime
    });
}

// Zvislo projektovaný (blob) tieň pod nepriateľom — v 2D aj 3D režime.
// Padá priamo na plochu pod ním (nie šikmý tieň slnka), aby bolo jasné, KDE v priestore nepriateľ je
// (spätná väzba od hráča: šikmý tieň pri letiacich nepriateľoch je posunutý/slabý a sťažuje mierenie/odhad skokov).
function updateEnemyShadow(e) {
    if (e.dead) { if (e.shadowMesh) e.shadowMesh.visible = false; return; }
    let gy = groundUnder(e.mesh.position.x, e.mesh.position.z, e.mesh.position.y);
    if (gy === -Infinity) gy = e.groundY;   // nad medzerou: padni späť na vlastnú zem (bez blikania)
    if (!e.shadowMesh) {
        e.shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity: 0.4, depthWrite: false }));
        e.shadowMesh.rotation.x = -Math.PI / 2;
        scene.add(e.shadowMesh);
    }
    e.shadowMesh.visible = true;
    e.shadowMesh.position.set(e.mesh.position.x, gy + 0.04, e.mesh.position.z);
    const h = Math.max(0, e.mesh.position.y - gy);                       // výška nad zemou = výškový údaj
    const r = (e.radius || 1) * 1.9 * (1 + Math.min(h, 8) * 0.035);      // vyššie = o čosi väčší (mäkší) tieň
    e.shadowMesh.scale.set(r, r, 1);
    e.shadowMesh.material.opacity = Math.max(0.2, 0.5 - h * 0.02);       // čitateľný aj vysoko (min 0.2)
}

function makeEnemyModel(type) {
    if (visualMode === 'billboard') return makeEnemyBillboard(type);

    const group = new THREE.Group();
    const std = (color, emissive, intensity, opacity) => new THREE.MeshStandardMaterial({
        color, emissive: emissive !== undefined ? emissive : color, emissiveIntensity: intensity !== undefined ? intensity : 0.25,
        roughness: 0.55, transparent: opacity !== undefined && opacity < 1, opacity: opacity !== undefined ? opacity : 1
    });
    const basic = (color, opacity) => new THREE.MeshBasicMaterial({
        color, transparent: opacity !== undefined && opacity < 1, opacity: opacity !== undefined ? opacity : 1,
        side: THREE.DoubleSide, depthWrite: opacity === undefined || opacity >= 0.95
    });
    const eyeMat = basic(0x181830);
    const whiteMat = basic(0xffffff);

    // Farby/proporcie zladené s pôvodnými 2D nepriateľmi (viď draw*Billboard funkcie).
    if (type === 'ghost') {
        // Klasický kreslený duch: oblá kupola hore, rovné telo (kapsula), wispy spodný
        // lem z kvapiek dookola, dve veľké oválne oči blízko seba a otvorené ústa.
        const R = 0.56;
        const bodyMat = std(0xe7ecff, 0xaab4ff, 0.5, 0.92);
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(R, 0.7, 14, 26), bodyMat);
        body.scale.set(1.02, 1.0, 0.96); body.position.y = 0.25; group.add(body);
        // vlnitý/wispy spodný lem – prstenec kvapiek smerom dole (čitateľný z každého uhla)
        const ringR = 0.44;
        for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2;
            const drop = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 12, 10), bodyMat);
            drop.position.set(Math.cos(a) * ringR, -0.5, Math.sin(a) * ringR * 0.96);
            drop.scale.set(1, 1.5, 1); group.add(drop);
        }
        // veľké oválne oči blízko seba, vpredu (+Z) + biely odlesk
        const ghostEye = basic(0x20214d);
        for (const sx of [-0.19, 0.19]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 14), ghostEye);
            eye.position.set(sx, 0.62, 0.46); eye.scale.set(1, 1.4, 0.6); group.add(eye);
            const glint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), whiteMat);
            glint.position.set(sx - 0.06, 0.74, 0.54); group.add(glint);
        }
        // otvorené oválne ústa pod očami
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), basic(0x20214d));
        mouth.position.set(0, 0.32, 0.5); mouth.scale.set(0.78, 1.2, 0.5); group.add(mouth);
    } else if (type === 'amoeba') {
        // 2D: zelený rôsolovitý blob s jedným veľkým tmavozeleným okom
        const blobMat = std(0x63bf63, 0x2f7b39, 0.3, 0.88);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 18), blobMat);
        core.scale.set(1.35, 0.62, 1.05); group.add(core);
        for (let i = 0; i < 8; i++) {                       // rôsolovité výbežky
            const a = i / 8 * Math.PI * 2;
            const pod = new THREE.Mesh(new THREE.SphereGeometry(0.28 + (i % 3) * 0.04, 12, 10), blobMat);
            pod.position.set(Math.cos(a) * 0.92, Math.sin(a) * 0.2 - 0.04, Math.sin(a) * 0.58);
            pod.scale.set(1.15, 0.55, 0.85); group.add(pod);
        }
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), std(0x205020, 0x102810, 0.1, 0.98));
        eye.position.set(-0.16, 0.06, 0.6); eye.scale.set(1, 0.82, 0.55); group.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), basic(0x0e260e));
        pupil.position.set(-0.22, 0.03, 0.82); pupil.scale.set(1, 0.85, 0.5); group.add(pupil);
    } else if (type === 'shooter') {
        // 2D: červený kryštál (šesťhran) so svetlým lemom a veľkým čiernym okom + červená zrenica
        const crystalMat = std(0xca4141, 0x751c25, 0.45);
        const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), crystalMat);
        body.scale.set(0.92, 1.0, 0.92); group.add(body);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.05, 8, 6), basic(0xffcaca, 0.6));
        rim.rotation.x = 0.4; group.add(rim);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), basic(0x230006));
        eye.position.set(0, 0.0, 0.66); eye.scale.set(1, 1, 0.6); group.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), basic(0xff2028));
        pupil.position.set(0, 0.0, 0.86); group.add(pupil);
    } else if (type === 'jumper') {
        // 2D: žlté oblé telo, dve veľké biele oči s čiernou zrenicou, dve tenké rozkročené nožičky
        const bodyMat = std(0xc9c84c, 0x767620, 0.3);
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.76, 20, 16), bodyMat);
        body.scale.set(1.0, 0.86, 1.0); group.add(body);
        const legMat = std(0x5f5f18, 0x3a3a10, 0.1);
        for (const sx of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), whiteMat);
            eye.position.set(sx * 0.26, 0.18, 0.5); eye.scale.set(1, 1.25, 0.8); group.add(eye);
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eyeMat);
            pupil.position.set(sx * 0.26, 0.16, 0.63); group.add(pupil);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 8), legMat);
            leg.position.set(sx * 0.34, -0.7, 0.18); leg.rotation.z = sx * 0.5; group.add(leg);
        }
    } else {
        // 2D flyer: zvislé fialové telo, dve veľké priesvitné krídla po stranách, oči hore
        const bodyMat = std(0xb060e0, 0x6020a0, 0.35);
        const wingMat = basic(0xd6a0ff, 0.5);
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), bodyMat);
        body.scale.set(0.46, 1.4, 0.42); group.add(body);
        const wings = [];
        for (const sx of [-1, 1]) {                          // [0] = ľavé, [1] = pravé (poradie kvôli mávaniu)
            const wing = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12), wingMat);
            wing.position.set(sx * 0.62, 0.12, 0);
            wing.scale.set(0.95, 0.62, 0.08);
            wing.rotation.z = sx * 0.28;
            group.add(wing);
            wings.push(wing);
        }
        group.userData.wings = wings;
        for (const sx of [-0.12, 0.12]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), basic(0x3a0068));
            eye.position.set(sx, 0.52, 0.34); group.add(eye);
        }
    }

    const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.035, 8, 22),
        basic(0xc8d8ff, 0.78)
    );
    halo.position.y = 1.15;
    halo.rotation.x = Math.PI / 2;
    halo.visible = false;
    group.add(halo);
    group.userData.sleepHalo = halo;
    group.userData.baseScale = 1;
    group.traverse(o => { if (o.isMesh && o !== halo) o.castShadow = true; });   // nepriatelia vrhajú tieň
    return group;
}

function makeEnemyBillboard(type) {
    const group = new THREE.Group();
    const tex = getEnemyBillboardTexture(type);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, alphaTest: 0.06, depthWrite: false
    }));
    const size = enemyBillboardSize(type);
    sprite.scale.set(size.w, size.h, 1);
    group.add(sprite);
    group.userData.sprite = sprite;
    group.userData.isBillboard = true;

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getSleepTexture(), transparent: true, opacity: 0.9, depthWrite: false
    }));
    halo.scale.set(1.45, 0.62, 1);
    halo.position.y = size.h * 0.48;
    halo.visible = false;
    group.add(halo);
    group.userData.sleepHalo = halo;
    return group;
}

function enemyBillboardSize(type) {
    if (type === 'ghost') return { w: 2.15, h: 2.75 };
    if (type === 'amoeba') return { w: 2.55, h: 1.65 };
    if (type === 'shooter') return { w: 2.1, h: 2.1 };
    if (type === 'jumper') return { w: 1.95, h: 2.15 };
    return { w: 2.8, h: 1.85 };
}

function getEnemyBillboardTexture(type) {
    if (enemyBillboardTextures[type]) return enemyBillboardTextures[type];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    if (type === 'ghost') drawGhostBillboard(ctx);
    else if (type === 'amoeba') drawAmoebaBillboard(ctx);
    else if (type === 'shooter') drawShooterBillboard(ctx);
    else if (type === 'jumper') drawJumperBillboard(ctx);
    else drawFlyerBillboard(ctx);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    enemyBillboardTextures[type] = tex;
    return tex;
}

function getSleepTexture() {
    if (enemyBillboardTextures.sleep) return enemyBillboardTextures.sleep;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(210,225,255,0.95)';
    ctx.font = 'bold 32px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('z Z', 64, 32);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    enemyBillboardTextures.sleep = tex;
    return tex;
}

function drawGhostBillboard(ctx) {
    const aura = ctx.createRadialGradient(128, 120, 10, 128, 124, 105);
    aura.addColorStop(0, 'rgba(255,255,255,0.45)');
    aura.addColorStop(0.55, 'rgba(160,180,255,0.22)');
    aura.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(128, 124, 104, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(112, 84, 8, 128, 120, 82);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.42, '#dce6ff');
    body.addColorStop(0.78, '#aab8ec');
    body.addColorStop(1, 'rgba(145,160,220,0.62)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(61, 134);
    ctx.bezierCurveTo(58, 69, 91, 35, 128, 35);
    ctx.bezierCurveTo(170, 35, 199, 70, 195, 136);
    ctx.bezierCurveTo(196, 164, 187, 191, 177, 206);
    for (let i = 0; i < 5; i++) {
        const x = 171 - i * 22;
        ctx.quadraticCurveTo(x - 10, 224 + (i % 2) * 9, x - 22, 203);
    }
    ctx.bezierCurveTo(79, 188, 62, 165, 61, 134);
    ctx.fill();

    ctx.fillStyle = '#1b1c48';
    ctx.beginPath();
    ctx.ellipse(104, 104, 13, 19, 0, 0, Math.PI * 2);
    ctx.ellipse(151, 104, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(99, 98, 4, 0, Math.PI * 2);
    ctx.arc(146, 98, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#31306a';
    ctx.beginPath();
    ctx.ellipse(128, 134, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawAmoebaBillboard(ctx) {
    ctx.fillStyle = 'rgba(90,190,100,0.28)';
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
        const a = i / 18 * Math.PI * 2;
        const r = 77 + Math.sin(i * 1.7) * 16;
        const x = 128 + Math.cos(a) * r;
        const y = 134 + Math.sin(a) * r * 0.55;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();

    const grad = ctx.createRadialGradient(102, 116, 8, 128, 132, 74);
    grad.addColorStop(0, '#b2f2a6');
    grad.addColorStop(0.52, '#63bf63');
    grad.addColorStop(1, '#2f7b39');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
        const a = i / 14 * Math.PI * 2;
        const r = 59 + Math.sin(i * 2.15) * 10;
        const x = 128 + Math.cos(a) * r;
        const y = 134 + Math.sin(a) * r * 0.58;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#205020';
    ctx.beginPath();
    ctx.ellipse(111, 132, 22, 17, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#103010';
    ctx.beginPath();
    ctx.ellipse(105, 129, 9, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawShooterBillboard(ctx) {
    const grad = ctx.createRadialGradient(128, 116, 4, 128, 128, 78);
    grad.addColorStop(0, '#ff9a9a');
    grad.addColorStop(0.5, '#ca4141');
    grad.addColorStop(1, '#751c25');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 - Math.PI / 2;
        const r = 74 + Math.sin(i * 1.4) * 7;
        const x = 128 + Math.cos(a) * r;
        const y = 128 + Math.sin(a) * r * 0.86;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,210,0.65)';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#230006';
    ctx.beginPath();
    ctx.ellipse(128, 126, 23, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2028';
    ctx.beginPath();
    ctx.arc(128, 126, 11, 0, Math.PI * 2);
    ctx.fill();
}

function drawJumperBillboard(ctx) {
    const grad = ctx.createRadialGradient(108, 102, 8, 128, 130, 75);
    grad.addColorStop(0, '#ffff8c');
    grad.addColorStop(0.6, '#c9c84c');
    grad.addColorStop(1, '#767620');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 138, 65, 54, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5f5f18';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(128 + sx * 29, 170);
        ctx.lineTo(128 + sx * 49, 206);
        ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(105, 112, 15, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(151, 112, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(107, 116, 7, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(149, 116, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawFlyerBillboard(ctx) {
    ctx.fillStyle = 'rgba(214,160,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(91, 126, 47, 29, -0.35, 0, Math.PI * 2);
    ctx.ellipse(165, 126, 47, 29, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,255,0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();

    const grad = ctx.createLinearGradient(128, 84, 128, 177);
    grad.addColorStop(0, '#efb8ff');
    grad.addColorStop(1, '#7030b0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 128, 18, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a0068';
    ctx.beginPath();
    ctx.arc(120, 85, 7, 0, Math.PI * 2);
    ctx.arc(136, 85, 7, 0, Math.PI * 2);
    ctx.fill();
}

function addPortal(x, y, z, accent) {
    const grp = new THREE.Group();
    const accentColor = new THREE.Color(accent);
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.35, 12, 32),
        new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8 })
    );
    const disc = new THREE.Mesh(
        new THREE.CircleGeometry(2.0, 32),
        new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    const seal = new THREE.Group();
    const sealMat = new THREE.MeshBasicMaterial({ color: 0xb8b8d8, transparent: true, opacity: 0.78 });
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 4.4, 0.18), sealMat);
        bar.rotation.z = rot;
        seal.add(bar);
    }
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), sealMat);
    seal.add(core);
    seal.visible = false;
    grp.add(ring); grp.add(disc); grp.add(seal);
    grp.position.set(x, y + 2.6, z);
    scene.add(grp);
    portal = { mesh: grp, ring, disc, seal, x, y: y + 2.6, z, locked: false, accent };
}

function setPortalLocked(locked) {
    if (!portal) return;
    portal.locked = locked;
    const color = locked ? new THREE.Color(0x707088) : new THREE.Color(portal.accent);
    portal.ring.material.color.copy(color);
    portal.ring.material.emissive.copy(color);
    portal.ring.material.emissiveIntensity = locked ? 0.25 : 0.8;
    portal.disc.material.color.copy(color);
    portal.disc.material.opacity = locked ? 0.18 : 0.35;
    portal.seal.visible = locked;
}

// ---------- Bossovia (z pôvodnej 2D hry: shadowKing / dreamEater / voidWalker) ----------
function buildBossModel(type, accent) {
    const g = new THREE.Group();
    const acc = new THREE.Color(accent);
    const std = (col, emi, emiI) => new THREE.MeshStandardMaterial({ color: col, emissive: emi !== undefined ? emi : col, emissiveIntensity: emiI !== undefined ? emiI : 0.4, roughness: 0.55, transparent: true, opacity: 1 });
    if (type === 'shadowKing') {
        // Temný kráľ – pyramída + zlatá koruna + svietiace oči
        const body = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6, 4), std(0x201030, acc.getHex(), 0.5));
        body.position.y = 0; g.add(body);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.8, 8), std(0xffd700, 0xffaa00, 0.5));
        crown.position.y = 3.2; g.add(crown);
        for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 6), std(0xffd700, 0xffaa00, 0.5)); const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 1.4, 3.9, Math.sin(a) * 1.4); g.add(sp); }
        for (const sx of [-0.9, 0.9]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 14), new THREE.MeshBasicMaterial({ color: acc, transparent: true })); e.position.set(sx, 1.2, 2.4); g.add(e); }
    } else if (type === 'dreamEater') {
        // Požierač snov – vznášajúca sa guľa s prstencom-ústami a okom
        const body = new THREE.Mesh(new THREE.SphereGeometry(3, 28, 22), std(0x301840, acc.getHex(), 0.45));
        g.add(body);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.5, 12, 28), std(acc.getHex(), acc.getHex(), 0.7));
        ring.rotation.x = Math.PI / 2.3; ring.position.y = -0.6; g.add(ring);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 18), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); eye.position.set(0, 0.5, 2.4); g.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 14), new THREE.MeshBasicMaterial({ color: 0x200030, transparent: true })); pupil.position.set(0, 0.5, 3.1); g.add(pupil);
    } else {
        // Prázdny pútnik – vysoký temný stĺp s plášťom a svietiacimi očami
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 7, 14), std(0x0a0a18, acc.getHex(), 0.5));
        g.add(body);
        const hood = new THREE.Mesh(new THREE.ConeGeometry(2, 2.6, 14), std(0x05050f, acc.getHex(), 0.4)); hood.position.y = 4; g.add(hood);
        for (const sx of [-0.7, 0.7]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 14), new THREE.MeshBasicMaterial({ color: acc, transparent: true })); e.position.set(sx, 3.6, 1.7); g.add(e); }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });   // boss vrhá tieň
    return g;
}

function createBoss3D(i, x, y, z) {
    const types = ['shadowKing', 'dreamEater', 'voidWalker'];
    const type = types[Math.floor((i - 3) / 4) % 3];
    const t = getTheme(i);
    const maxHp = Math.round((90 + i * 6) * BOSS_HP_GLOBAL_MULTIPLIER * (currentDifficulty.bossHpMul || 1));
    const mesh = buildBossModel(type, t.accent);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    boss = {
        type, mesh, x, y, z, startX: x, startY: y, startZ: z,
        hp: maxHp, maxHp, phase: 1, attackTimer: 2.2, moveT: Math.random() * 6,
        invincible: 0, defeated: false, radius: 4.2, color: t.accent
    };
    const bar = document.getElementById('bossBar');
    if (bar) { bar.classList.remove('hidden'); setText('bossName', (L('bosses') && L('bosses')[type]) || 'BOSS'); }
    updateBossBar();
}

function updateBossSpawn() {
    if (!pendingBoss || boss) return;
    if (playerCenter().distanceTo(new THREE.Vector3(pendingBoss.x, pendingBoss.y, pendingBoss.z)) > pendingBoss.radius) return;
    createBoss3D(pendingBoss.level, pendingBoss.x, pendingBoss.y, pendingBoss.z);
    spawnBurst(pendingBoss.x, pendingBoss.y + 1, pendingBoss.z, boss.color, 28);
    pendingBoss = null;
    setPortalLocked(true);
}

function updateBossBar() {
    const bar = document.getElementById('bossBar');
    const fill = document.getElementById('bossFill');
    if (!bar || !fill) return;
    if (!boss || boss.defeated || (currentState !== GameState.PLAYING && currentState !== GameState.PAUSED)) {
        bar.classList.add('hidden');
        return;
    }
    bar.classList.remove('hidden');
    const names = L('bosses') || {};
    setText('bossName', names[boss.type] || 'BOSS');
    fill.style.width = Math.max(0, Math.min(100, boss.hp / boss.maxHp * 100)) + '%';
}

function updateBoss(dt) {
    if (!boss || boss.defeated) return;
    boss.moveT += dt;
    if (boss.invincible > 0) boss.invincible -= dt;

    const phase = boss.hp < boss.maxHp * 0.25 ? 3 : boss.hp < boss.maxHp * 0.5 ? 2 : 1;
    boss.phase = phase;

    const moveSpeed = 0.75 + phase * 0.35;
    boss.x = boss.startX + Math.sin(boss.moveT * moveSpeed) * (2.2 + phase * 0.9);
    boss.y = boss.startY + Math.sin(boss.moveT * moveSpeed * 0.7) * (0.6 + phase * 0.25);
    boss.z = boss.startZ + Math.cos(boss.moveT * moveSpeed * 0.8) * (1.6 + phase * 0.55);
    boss.mesh.position.set(boss.x, boss.y, boss.z);
    boss.mesh.rotation.y += dt * (0.7 + phase * 0.25);
    boss.mesh.rotation.z = Math.sin(boss.moveT * 1.8) * 0.06;
    setModelOpacity(boss.mesh, boss.invincible > 0 && Math.floor(boss.invincible * 24) % 2 === 0 ? 0.45 : 1);

    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
        boss.attackTimer = Math.max(0.85, 2.2 - phase * 0.36);
        fireBossVolley(phase);
    }

    const dist = boss.mesh.position.distanceTo(playerCenter());
    if (dist < boss.radius + 1.0) {
        if (player.vel.y < -2 && player.pos.y > boss.y + 1.0 && boss.invincible <= 0) {
            damageBoss(22, true);
            player.vel.y = CONFIG.JUMP_VELOCITY * 1.05 * jumpHeightMul;             // väčší odraz pri dupnutí na bossa
            player.jumpsLeft = CONFIG.MAX_JUMPS;
            player.squashT = 0.16;
            camPunch = 0.45;
            spawnBurst(player.pos.x, boss.y + 1.2, player.pos.z, 0xffffff, 14);
            Sfx.play('groundPoundHit');
        } else if (player.invincible <= 0) {
            hurtPlayer(false);
        }
    }

    updateBossBar();
}

function fireBossVolley(phase) {
    const origin = boss.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const baseDir = playerCenter().clone().sub(origin).normalize();
    const count = phase + 1;
    for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.22;
        const dir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread).normalize();
        const radius = 0.42 + phase * 0.08;
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 12, 12),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(boss.color), transparent: true, opacity: 0.9 })
        );
        mesh.position.copy(origin);
        scene.add(mesh);
        projectiles.push({
            mesh,
            vel: dir.multiplyScalar((10 + phase * 2.5) * currentDifficulty.enemySpeed),
            life: 4.2,
            friendly: false,
            radius,
            bossShot: true
        });
    }
    Sfx.play('shoot');
}

function damageBoss(amount, stomp, continuous) {
    if (!boss || boss.defeated || (!continuous && boss.invincible > 0)) return false;
    boss.hp -= amount;
    boss.invincible = continuous ? Math.max(boss.invincible, 0.035) : (stomp ? 0.22 : 0.12);
    if (!continuous || Math.random() < 0.22) spawnBurst(boss.x, boss.y + 1.2, boss.z, boss.color, stomp ? 16 : 6);
    if (!continuous) Sfx.play('hit');
    if (boss.hp <= 0) defeatBoss();
    else updateBossBar();
    return true;
}

function defeatBoss() {
    if (!boss || boss.defeated) return;
    boss.defeated = true;
    pendingBoss = null;
    boss.hp = 0;
    score += 500;
    spawnBurst(boss.x, boss.y + 1.4, boss.z, boss.color, 42);
    Sfx.play('collect');
    for (const pr of projectiles) if (pr.bossShot) pr.life = 0;
    if (boss.mesh) boss.mesh.visible = false;
    setPortalLocked(false);
    updateBossBar();
    updateHUD();
}

function generateRealm(i) {
    clearRealm();
    applyTheme(i);
    const t = getTheme(i);
    const count = 14 + i * 3;
    let x = 0, y = 0, z = 0;
    const d = currentDifficulty;
    const enemyTotal = Math.floor(d.enemyBase + i * d.enemyPerRealm);
    let enemiesPlaced = 0;

    // štartová platforma
    addPlatform(0, 0, 0, 7, 7, t);
    lastCheckpoint.set(0, 2, 0);

    for (let n = 1; n < count; n++) {
        const stepZ = 5 + Math.random() * 3;             // dopredu do hĺbky (o čosi kratšie kroky)
        z -= stepZ;
        x += (Math.sin(n * 0.55) * 6.5) + (Math.random() - 0.5) * 7; // širšie kľukatenie do strán
        x = Math.max(-30, Math.min(30, x));
        // výška osciluje hore/dole, aby sa využil priestor
        const up = (n % 3 === 0) ? 1 : (Math.random() < 0.45 ? 1 : -1);
        y += up * (1 + Math.random() * 1.6);
        y = Math.max(-4, Math.min(14, y));
        const w = 4 + Math.random() * 3, dep = 4 + Math.random() * 3;
        const p = addPlatform(x, y, z, w, dep, t);

        // bočná odbočka: občas plošina nabok s orbami → svet nie je len „tunel dopredu"
        if (n > 1 && n % 4 === 0) {
            const sideDir = x >= 0 ? 1 : -1;                          // smerom von, ostáva dosiahnuteľná skokom
            const sx = Math.max(-34, Math.min(34, x + sideDir * (7 + Math.random() * 3)));
            const sz = z + (Math.random() - 0.5) * 3;
            const sy = y + (Math.random() - 0.5) * 1.6;
            addPlatform(sx, sy, sz, 3.5 + Math.random() * 1.5, 3.5 + Math.random() * 1.5, t);
            addOrb(sx, sy + 2, sz, t.accent);
            if (Math.random() < 0.45) addOrb(sx + 1.4, sy + 2.1, sz, t.accent);
        }

        // orby (niekedy zhluk)
        if (Math.random() < 0.7) {
            const oc = 1 + (Math.random() < 0.3 ? 2 : 0);
            for (let k = 0; k < oc; k++) addOrb(x + (k - 0.5) * 1.6, y + 2 + k * 0.1, z, t.accent);
        }
        // nepriatelia
        if (n > 1 && enemiesPlaced < enemyTotal && Math.random() < 0.5) {
            const r = Math.random();
            let type;
            if (i >= 8 && r < 0.15) type = 'flyer';
            else if (i >= 5 && r < 0.25) type = 'shooter';
            else if (i >= 3 && r < 0.35) type = 'jumper';
            else if (r < 0.6) type = 'ghost';
            else type = 'amoeba';

            const ey = type === 'ghost' ? y + 3.4 + Math.random() * 1.4 :
                type === 'flyer' ? y + 4.2 + Math.random() * 1.8 :
                type === 'jumper' ? y + 1.45 :
                type === 'amoeba' ? y + 1.05 : y + 1.45;
            addEnemy(type, x, ey, z, t, Math.max(1.5, w / 2 - 1), i, p.top);
            enemiesPlaced++;
        }
        // checkpoint cca každých 5 (len posledný uložený sa použije pri respawne)
        if (n % 5 === 0) p.isCheckpoint = true;
    }

    // Bossové ríše dostanú arénu pred zapečateným portálom.
    if (isBossRealm(i)) {
        z -= 8;
        const arena = addPlatform(x, y, z, 16, 11, t);
        arena.isCheckpoint = true;
        pendingBoss = { level: i, x, y: y + 3.6, z, radius: CONFIG.BOSS_SPAWN_RADIUS };

        z -= 10;
        addPlatform(x, y, z, 9, 7, t);
        addPortal(x, y, z, t.accent);
        setPortalLocked(true);
    } else {
        // cieľový portál na poslednej platforme
        addPortal(x, y, z, t.accent);
    }

    // nehádž orby do portálu – pôsobili ako bodky/hviezdičky vnútri brány
    if (portal) {
        for (let k = orbs.length - 1; k >= 0; k--) {
            const o = orbs[k];
            const dx = o.x - portal.x, dz = o.z - portal.z;
            if (dx * dx + dz * dz < 3.4 * 3.4) { scene.remove(o.mesh); disposeObject(o.mesh); orbs.splice(k, 1); }
        }
    }

    // prostredie v štýle 2D ríše
    buildEnvironment(t, z);

    // postav hráča na štart
    player.pos.set(0, 2.5, 0);
    player.vel.set(0, 0, 0);
    player.jumpsLeft = CONFIG.MAX_JUMPS;
    player.beamEnergy = CONFIG.BEAM_ENERGY_MAX;
    player.hp = player.hpMax;                 // čerstvé HP v novej ríši
    jumpBuffer = 0;
    player.faceDir.set(0, 0, 1);
    faceYaw = 0;
    camYaw = 0; camPitch = CAM_PITCH0;   // kamera späť za hráča na začiatku ríše
    camera.position.set(0, CONFIG.CAM_HEIGHT, CONFIG.CAM_DIST);
    syncPlayerVisual();
    updateHUD();
}

// Prostredie v štýle 2D ríš: husté hviezdne pole + tematické vznášajúce sa dekorácie po stranách dráhy.
function buildEnvironment(theme, farZ) {
    // ----- Hviezdne pole (ako v 2D: počet/farba podľa témy) -----
    const starCount = theme.decor === 'cosmos' ? 750 : theme.decor === 'maze' ? 160 : 430;
    const starCol = theme.decor === 'cosmos' ? 0xc8c8ff : theme.decor === 'bubbles' ? 0x9fe0ff : 0xffffff;
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        sp[i * 3]     = (Math.random() - 0.5) * 220;
        sp[i * 3 + 1] = Math.random() * 100 - 24;
        sp[i * 3 + 2] = farZ * Math.random() - 70;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    dustField = new THREE.Points(sg, new THREE.PointsMaterial({
        color: starCol, size: theme.decor === 'cosmos' ? 0.55 : 0.38, transparent: true, opacity: 0.75, depthWrite: false
    }));
    scene.add(dustField);

    // ----- Tematické dekorácie (parallax, mimo širšej dráhy x∈[-34,34]) -----
    decorGroup = new THREE.Group();
    const N = theme.decor === 'maze' ? 28 : 36;
    for (let i = 0; i < N; i++) {
        const item = makeDecorItem(theme);
        if (!item) continue;
        const side = Math.random() < 0.5 ? -1 : 1;
        item.position.set(side * (34 + Math.random() * 40), Math.random() * 32 - 7, (farZ - 10) * Math.random() + 5);
        item.scale.setScalar((0.7 + Math.random() * 1.7) * (item.userData.baseScale || 1));
        item.userData.spin = (Math.random() - 0.5) * 0.5;
        item.userData.by = item.position.y;
        if (!item.userData.noBob) item.userData.bobPhase = Math.random() * 6;
        decorGroup.add(item);
        decorItems.push(item);
    }
    scene.add(decorGroup);
}

function makeDecorItem(theme) {
    const c = new THREE.Color(theme.decorColor), acc = new THREE.Color(theme.accent);
    const std = (col, emi, emiI) => new THREE.MeshStandardMaterial({ color: col, emissive: emi !== undefined ? emi : col, emissiveIntensity: emiI !== undefined ? emiI : 0.25, roughness: 0.7, transparent: true, opacity: 0.92 });
    const glow = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op !== undefined ? op : 0.5, depthWrite: false });
    let m;
    switch (theme.decor) {
        case 'cosmos':
            if (Math.random() < 0.5) m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 22, 16), std(0xccccff, 0x8888cc, 0.4));
            else m = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), glow(0xffffff, 0.8));
            break;
        case 'bubbles':
            m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 14), new THREE.MeshStandardMaterial({ color: acc, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.2 }));
            m.userData.rise = true; break;
        case 'candy':
            if (Math.random() < 0.5) m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 14), std(0xff80c0));
            else { m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12), std(0xffffff, 0xff90c0, 0.3)); m.rotation.z = 0.5; }
            break;
        case 'trees': {
            m = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 8), std(0x5a3a20));
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 10), std(0x2f7a3f, 0x1f4f28, 0.25));
            trunk.position.y = 0.2; leaves.position.y = 1.8; m.add(trunk); m.add(leaves);
            break;
        }
        case 'clocks':
            m = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 10, 24), std(c.getHex(), acc.getHex(), 0.3)); break;
        case 'toys': {
            const cols = [0xff6060, 0x60a0ff, 0xffd060, 0x60ff90, 0xc080ff];
            m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), std(cols[(Math.random() * cols.length) | 0])); break;
        }
        case 'plush':
            m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), std(c.getHex())); break;
        case 'maze':
            m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6 + Math.random() * 9, 0.5), std(0x909090, 0x303030, 0.1));
            m.userData.noBob = true; break;
        case 'circus':
            m = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.8, 12), std(Math.random() < 0.5 ? 0xff4060 : 0xffd040, 0xaa2030, 0.25)); break;
        case 'home':
            m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.2), glow(0xffc070, 0.7)); break;
        case 'awakening':
            m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 44), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
            m.userData.noBob = true; break;
        case 'mist':
        default:
            m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), glow(c.getHex(), 0.12));
            m.userData.baseScale = 1.3; break;
    }
    return m;
}

// ---------- Pohyb + kolízie ----------
function updatePlayer(dt) {
    pollTouch();
    // vstup → smer v rovine XZ (relatívne k svetu: -Z = dopredu/do scény)
    let ix = 0, iz = 0;
    // klávesy/myš (šípky aj WSAD, primárne aj sekundárne väzby); osi sa sčítavajú → diagonála funguje
    if (actionHeld('up')) iz -= 1;
    if (actionHeld('down')) iz += 1;
    if (actionHeld('left')) ix -= 1;
    if (actionHeld('right')) ix += 1;
    // on-screen D-Pad (8 smerov)
    if (controlMode === 'dpad') {
        if (dpad.up) iz -= 1;
        if (dpad.down) iz += 1;
        if (dpad.left) ix -= 1;
        if (dpad.right) ix += 1;
    }
    // swipe joystick s analógovou rýchlosťou (väčší ťah = rýchlejšie)
    let speedScale = 1;
    if (controlMode === 'swipe' && touchMove.active) {
        const mag = Math.min(1, Math.hypot(touchMove.x, touchMove.z));
        speedScale = 0.35 + 0.65 * mag;   // spodný prah, aby aj malý ťah hýbal
        ix += touchMove.x; iz += touchMove.z;
    }
    // pohyb relatívne ku kamere, keď je natočená myšou (camYaw=0 → pôvodné svetové smery)
    if (camYaw !== 0 && (ix !== 0 || iz !== 0)) {
        const c = Math.cos(camYaw), s = Math.sin(camYaw);
        const rx = ix * c + iz * s, rz = -ix * s + iz * c;
        ix = rx; iz = rz;
    }
    const moving = Math.abs(ix) > 0.001 || Math.abs(iz) > 0.001;
    if (moving) {
        const len = Math.hypot(ix, iz);
        ix /= len; iz /= len;
        player.vel.x = ix * CONFIG.MOVE_SPEED * speedScale;
        player.vel.z = iz * CONFIG.MOVE_SPEED * speedScale;
        player.aim.set(ix, 0, iz);
        player.faceDir.set(ix, 0, iz);   // model sa otočí kam ide
        if (Math.abs(ix) > 0.1) player.facing = ix > 0 ? 1 : -1;
    } else {
        player.vel.x *= 0.0001; // okamžité zastavenie v rovine (platformer feel)
        player.vel.z *= 0.0001;
    }

    // gravitácia
    player.vel.y -= CONFIG.GRAVITY * dt;

    // posun po osiach so separáciou kvôli kolíznej rezolúcii
    player.pos.x += player.vel.x * dt;
    resolveAxis('x');
    player.pos.z += player.vel.z * dt;
    resolveAxis('z');
    player.onGround = false;
    player.pos.y += player.vel.y * dt;
    resolveAxis('y');

    // jump buffering: skok vyžiadaný tesne pred dopadom sa vykoná hneď po dopade
    if (jumpBuffer > 0) {
        jumpBuffer -= dt;
        if (player.onGround) { tryJump(); jumpBuffer = 0; }
    }

    // pád / smrť
    if (player.pos.y < CONFIG.FALL_Y) { hurtPlayer(true); }

    if (player.invincible > 0) player.invincible -= dt;
    if (player.squashT > 0) player.squashT -= dt;   // doznievanie squash-stretch po dupnutí

    // lúč (Ctrl)
    updateBeam(dt);

    // blob tieň pod hráčom
    updateBlobShadow();
    syncPlayerVisual();
}

// AABB hráča vs všetky platformy; rieši jednu os (už po pripočítaní pohybu na tej osi)
function resolveAxis(axis) {
    const pmin = new THREE.Vector3().copy(player.pos).sub(player.half);
    const pmax = new THREE.Vector3().copy(player.pos).add(player.half);
    // pivot hráča je na nohách → posuň box: pos.y je päta, telo hore
    pmin.y = player.pos.y; pmax.y = player.pos.y + player.half.y * 2;

    for (const p of platforms) {
        if (pmax.x <= p.min.x || pmin.x >= p.max.x) continue;
        if (pmax.y <= p.min.y || pmin.y >= p.max.y) continue;
        if (pmax.z <= p.min.z || pmin.z >= p.max.z) continue;
        // prekryv → vytlač po danej osi
        if (axis === 'y') {
            if (player.vel.y <= 0) {            // padá → pristane na vrchu
                player.pos.y = p.max.y;
                player.vel.y = 0;
                player.onGround = true;
                player.jumpsLeft = CONFIG.MAX_JUMPS;
                groundUnderPlayer = p.max.y;
                if (p.isCheckpoint) lastCheckpoint.set(p.x, p.max.y + 0.5, p.z);
            } else {                            // stúpa → narazí spodkom
                player.pos.y = p.min.y - player.half.y * 2;
                player.vel.y = 0;
            }
            return;
        } else if (axis === 'x') {
            if (player.vel.x > 0) player.pos.x = p.min.x - player.half.x;
            else if (player.vel.x < 0) player.pos.x = p.max.x + player.half.x;
            player.vel.x = 0;
            return;
        } else {
            if (player.vel.z > 0) player.pos.z = p.min.z - player.half.z;
            else if (player.vel.z < 0) player.pos.z = p.max.z + player.half.z;
            player.vel.z = 0;
            return;
        }
    }
}

function tryJump() {
    if (player.jumpsLeft > 0) {
        player.vel.y = CONFIG.JUMP_VELOCITY * jumpHeightMul;   // jediný násobič výšky skoku (mobilný režim ho nastaví na 1.25)
        player.jumpsLeft--;
        player.onGround = false;
        const which = CONFIG.MAX_JUMPS - player.jumpsLeft;
        Sfx.play(which === 1 ? 'jump' : which === 2 ? 'doubleJump' : 'tripleJump');
        spawnBurst(player.pos.x, player.pos.y + 0.2, player.pos.z, 0xffffff, 6);
        return true;
    }
    return false;
}

function updateBeam(dt) {
    const wantBeam = (actionHeld('beam') || touchBeamHeld || dpadBeamHeld || lmbBeam) && player.beamEnergy > 0;
    mouseBeamAimActive = false;
    if (wantBeam) {
        // Mierenie lúča: touch používa bod prsta, PC myš používa priebežné delta-steering mierenie.
        if (touchBeamPoint.active) aimBeamAtScreen(touchBeamPoint.x, touchBeamPoint.y);
        else if (!isTouchDevice && !autoAim && (lmbBeam || actionHeld('beam'))) ensureMouseBeamAim();   // ručné mierenie myšou len keď je auto-mierenie vyp
        if (!player.beaming) Sfx.play('shoot');
        player.beaming = true;
        player.beamEnergy = Math.max(0, player.beamEnergy - CONFIG.BEAM_DRAIN * dt);
        applyFlashlightHits(dt);
    } else {
        player.beaming = false;
        mouseBeamReady = false;
        syncFlashlightVisual(false);
        player.beamEnergy = Math.min(CONFIG.BEAM_ENERGY_MAX, player.beamEnergy + CONFIG.BEAM_RECHARGE * dt);
        flashlightPitch += (0.22 - flashlightPitch) * 0.12;   // v pokoji drží baterku mierne hore
    }
    const bar = document.getElementById('energyFill');
    if (bar) bar.style.width = player.beamEnergy + '%';
}

// Premietne bod na obrazovke do sveta a nasmeruje lúč. Pri myši si držíme aj plný 3D smer raycastu.
function aimBeamAtScreen(sx, sy, useFullRay) {
    _aimNdc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    _aimRay.setFromCamera(_aimNdc, camera);
    _screenAimDir.copy(_aimRay.ray.direction).normalize();
    if (useFullRay) {
        const h = Math.hypot(_screenAimDir.x, _screenAimDir.z);
        if (h > 1e-4) {
            player.aim.set(_screenAimDir.x / h, 0, _screenAimDir.z / h);
            player.faceDir.copy(player.aim);
        }
        const pitch = Math.max(-0.75, Math.min(0.75, (window.innerHeight * 0.5 - sy) / Math.max(1, window.innerHeight * 0.85)));
        const flat = Math.sqrt(Math.max(0.05, 1 - pitch * pitch));
        mouseBeamDir.set(player.aim.x * flat, pitch, player.aim.z * flat).normalize();
        mouseBeamAimActive = true;
        return;
    }
    const oy = player.pos.y + 1.55;
    let dx, dz;
    const dirY = _aimRay.ray.direction.y;
    if (Math.abs(dirY) > 1e-4) {
        const tHit = (oy - _aimRay.ray.origin.y) / dirY;
        if (tHit > 0) {
            _aimHit.copy(_aimRay.ray.origin).addScaledVector(_aimRay.ray.direction, tHit);
            dx = _aimHit.x - player.pos.x; dz = _aimHit.z - player.pos.z;
        }
    }
    if (dx === undefined) { dx = _aimRay.ray.direction.x; dz = _aimRay.ray.direction.z; }   // záloha
    const len = Math.hypot(dx, dz);
    if (len > 1e-4) { player.aim.set(dx / len, 0, dz / len); player.faceDir.copy(player.aim); }
}

function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

function flatYawFromDir(dir) {
    let x = dir.x, z = dir.z;
    if (x * x + z * z < 1e-6) { x = 0; z = 1; }
    return Math.atan2(x, z);
}

function syncMouseBeamAnglesFromDir(dir) {
    let x = dir.x, y = dir.y || 0, z = dir.z;
    if (x * x + z * z < 1e-6) { x = player.faceDir.x; z = player.faceDir.z; }
    mouseBeamYaw = Math.atan2(x, z);
    mouseBeamPitch = Math.max(MOUSE_AIM_PITCH_MIN, Math.min(MOUSE_AIM_PITCH_MAX, Math.asin(Math.max(-1, Math.min(1, y)))));
    mouseBeamReady = true;
}

function updateMouseBeamDirFromAngles() {
    const sp = Math.sin(mouseBeamPitch), cp = Math.cos(mouseBeamPitch);
    mouseBeamDir.set(Math.sin(mouseBeamYaw) * cp, sp, Math.cos(mouseBeamYaw) * cp).normalize();
    const h = Math.hypot(mouseBeamDir.x, mouseBeamDir.z);
    if (h > 1e-4) {
        player.aim.set(mouseBeamDir.x / h, 0, mouseBeamDir.z / h);
        const bodyYaw = flatYawFromDir(player.faceDir);
        const off = wrapAngle(mouseBeamYaw - bodyYaw);
        if (Math.abs(off) > MOUSE_AIM_BODY_LIMIT) {
            const newBodyYaw = bodyYaw + off - Math.sign(off) * MOUSE_AIM_BODY_LIMIT;
            player.faceDir.set(Math.sin(newBodyYaw), 0, Math.cos(newBodyYaw));
        }
    }
    mouseBeamAimActive = true;
}

function ensureMouseBeamAim() {
    if (!mouseBeamReady) {
        const d = mouseBeamAimActive ? mouseBeamDir : (player.aim.lengthSq() > 1e-6 ? player.aim : player.faceDir);
        syncMouseBeamAnglesFromDir(d);
    }
    updateMouseBeamDirFromAngles();
}

function steerMouseBeam(dx, dy) {
    if (!player) return;
    ensureMouseBeamAim();
    const sens = MOUSE_AIM_BASE * mouseSensitivity;
    const aimDy = invertMouseY ? -dy : dy;
    mouseBeamYaw -= dx * sens;
    mouseBeamPitch = Math.max(MOUSE_AIM_PITCH_MIN, Math.min(MOUSE_AIM_PITCH_MAX, mouseBeamPitch - aimDy * sens));
    updateMouseBeamDirFromAngles();
}

// Smer lúča: na PC je manuálny; dotykový/mobilný režim si ponechá jemné vertikálne dosmerovanie.
function computeBeamDir() {
    if (mouseBeamAimActive) return _bd.copy(mouseBeamDir).normalize();
    let hx = player.aim.x, hz = player.aim.z;
    if (hx * hx + hz * hz < 1e-6) { hx = player.faceDir.x; hz = player.faceDir.z; }
    const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    if (!autoAim) return _bd.set(hx, 0, hz).normalize();   // bez auto-mierenia: lúč ide vodorovne kam mieriš
    const ox = player.pos.x, oy = player.pos.y + 1.55, oz = player.pos.z;
    let bestSlope = null, bestScore = -Infinity;
    const consider = (cx, cy, cz) => {
        const rx = cx - ox, rz = cz - oz, hd = Math.hypot(rx, rz);
        if (hd > CONFIG.BEAM_RANGE || hd < 0.001) return;
        const align = (rx * hx + rz * hz) / hd;          // cos horizontálneho uhla k mieru
        if (align < 0.55) return;                          // mimo ~±57° predného oblúka
        const score = align * 2 - hd * 0.02;
        if (score > bestScore) { bestScore = score; bestSlope = (cy - oy) / hd; }   // rise/run
    };
    for (const e of enemies) if (!e.dead && !e.sleeping) consider(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z);
    if (boss && !boss.defeated) consider(boss.mesh.position.x, boss.mesh.position.y, boss.mesh.position.z);
    const m = bestSlope !== null ? Math.max(-2.2, Math.min(2.2, bestSlope)) : 0;
    return _bd.set(hx, m, hz).normalize();
}

function applyFlashlightHits(dt) {
    _beamDir.copy(computeBeamDir());
    const targetPitch = Math.asin(Math.max(-1, Math.min(1, _beamDir.y)));
    flashlightPitch += (targetPitch - flashlightPitch) * 0.3;   // plynulý sklon baterky v ruke
    // Lúč vychádza zo šošovky baterky (3D model) – nie z hrude. Analyticky podľa pozície baterky.
    if (visualMode === 'model') {
        const S = 1.18, sp = Math.sin(flashlightPitch), cp = Math.cos(flashlightPitch);
        const lx = 0.36 * S, ly = (1.28 + 0.62 * sp) * S, lz = (0.44 + 0.62 * cp) * S;   // šošovka v lokále modelu
        const c = Math.cos(faceYaw), s = Math.sin(faceYaw);                              // otočenie modelu (yaw)
        _beamStart.set(player.pos.x + lx * c + lz * s, (player.pos.y - 0.15) + ly, player.pos.z - lx * s + lz * c);
    } else {
        _beamStart.set(player.pos.x, player.pos.y + 1.55, player.pos.z).addScaledVector(_beamDir, 0.65);
    }
    const range = CONFIG.BEAM_RANGE;
    syncFlashlightVisual(true, _beamStart, _beamDir, range);

    let hitSomething = false;
    for (const e of enemies) {
        if (e.dead || e.sleeping) continue;
        if (beamHitsSphere(_beamStart, _beamDir, e.mesh.position, range, e.radius + 0.25)) {
            damageEnemy(e, CONFIG.BEAM_DAMAGE * dt, false);
            hitSomething = true;
        }
    }
    if (boss && !boss.defeated && beamHitsSphere(_beamStart, _beamDir, boss.mesh.position, range, boss.radius)) {
        damageBoss(CONFIG.BEAM_BOSS_DAMAGE * dt, false, true);
        hitSomething = true;
    }
    if (hitSomething && performance.now() - lastHitSoundTime > 90) {
        Sfx.play('hit');
        lastHitSoundTime = performance.now();
    }
}

function beamHitsSphere(origin, dir, center, range, radius) {
    _rayRel.copy(center).sub(origin);
    const t = _rayRel.dot(dir);
    if (t < 0 || t > range) return false;
    _rayClosest.copy(origin).addScaledVector(dir, t);
    const coneRadius = CONFIG.BEAM_START_RADIUS + (CONFIG.BEAM_END_RADIUS - CONFIG.BEAM_START_RADIUS) * (t / range);
    return _rayClosest.distanceTo(center) <= radius + coneRadius;
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        pr.mesh.position.addScaledVector(pr.vel, dt);
        pr.life -= dt;
        let hit = false;
        if (pr.friendly) {
            for (const e of enemies) {
                if (e.dead) continue;
                if (!e.sleeping && pr.mesh.position.distanceTo(e.mesh.position) < e.radius + 0.35) {
                    damageEnemy(e, 100, false);
                    hit = true;
                    break;
                }
            }
            if (!hit && boss && !boss.defeated && pr.mesh.position.distanceTo(boss.mesh.position) < boss.radius) {
                damageBoss(18, false);
                hit = true;
            }
        } else {
            // nepriateľský projektil → hráč
            const head = new THREE.Vector3(player.pos.x, player.pos.y + 1.6, player.pos.z);
            if (pr.mesh.position.distanceTo(head) < (pr.radius || 0.4) + 0.9) { hurtPlayer(false); hit = true; }
        }
        if (hit || pr.life <= 0) { scene.remove(pr.mesh); pr.mesh.geometry.dispose(); pr.mesh.material.dispose(); projectiles.splice(i, 1); }
    }
}

// ---------- Nepriatelia ----------
function updateEnemies(dt) {
    for (const e of enemies) {
        if (e.dead) continue;
        e.t += dt * e.speedMultiplier;
        updateEnemyShadow(e);

        if (e.sleeping) {
            e.sleepTimer -= dt;
            e.mesh.rotation.z = Math.sin(e.t * 2) * 0.08;
            e.mesh.scale.setScalar(0.9 + Math.sin(e.t * 3) * 0.03);
            if (e.mesh.userData.sleepHalo) e.mesh.userData.sleepHalo.rotation.z += dt * 1.8;
            animateEnemyBillboard(e);
            if (e.sleepTimer <= 0) wakeEnemy(e);
            continue;
        }

        if (e.type === 'ghost') {
            e.mesh.position.x = e.originX + Math.cos(e.t * 0.7) * (e.patrolHalf + 1.6);
            e.mesh.position.y = e.baseY + Math.sin(e.t * 1.45) * 1.15;
            e.mesh.position.z = e.originZ + Math.sin(e.t * 0.55) * 1.2;
            e.mesh.rotation.y = Math.sin(e.t * 0.8) * 0.2;
            setModelOpacity(e.mesh, 0.72 + Math.sin(e.t * 3) * 0.16);
        } else if (e.type === 'amoeba') {
            e.mesh.position.x = e.originX + Math.sin(e.t * 0.85) * (e.patrolHalf + 1.2);
            e.mesh.position.z = e.originZ + Math.sin(e.t * 0.4) * 0.75;
            e.mesh.position.y = e.baseY + Math.sin(e.t * 2.4) * 0.08;
            e.mesh.scale.set(1 + Math.sin(e.t * 2.2) * 0.14, 1 + Math.cos(e.t * 2.7) * 0.08, 1 + Math.sin(e.t * 1.8) * 0.1);
        } else if (e.type === 'shooter') {
            const target = playerCenter();
            e.mesh.lookAt(target.x, e.mesh.position.y, target.z);
            e.mesh.position.y = e.baseY + Math.sin(e.t * 2) * 0.12;
            if (e.mesh.position.distanceTo(player.pos) < 20) {   // strieľa len nablízko – keď ho minieš, prestane
                e.shootTimer -= dt;
                if (e.shootTimer <= 0) {
                    e.shootTimer = Math.max(0.9, e.shootInterval / currentDifficulty.enemySpeed);
                    fireEnemyShot(e);
                }
            }
        } else if (e.type === 'jumper') {
            if (e.onGround) {
                e.jumpTimer -= dt;
                e.mesh.scale.set(1 + Math.sin(e.t * 5) * 0.05, 0.88 + Math.sin(e.t * 5) * 0.04, 1.05);
                if (e.jumpTimer <= 0 && e.mesh.position.distanceTo(player.pos) < 28) {
                    const dir = playerCenter().sub(e.mesh.position); dir.y = 0;
                    if (dir.lengthSq() > 0) dir.normalize();
                    e.vx = dir.x * 5.2 * e.speedMultiplier;
                    e.vz = dir.z * 5.2 * e.speedMultiplier;
                    e.vy = 8.8;
                    e.onGround = false;
                    e.isJumping = true;
                    e.jumpTimer = 1.2 + Math.random() * 0.8;
                }
            } else {
                e.vy -= CONFIG.GRAVITY * dt;
                const prevY = e.mesh.position.y;
                e.mesh.position.x += e.vx * dt;
                e.mesh.position.y += e.vy * dt;
                e.mesh.position.z += e.vz * dt;
                // drž skokana blízko jeho plošiny, nech nepreskočí do/cez inú geometriu
                const stray = (e.patrolHalf || 3) + 3;
                e.mesh.position.x = Math.max(e.originX - stray, Math.min(e.originX + stray, e.mesh.position.x));
                e.mesh.position.z = Math.max(e.originZ - stray, Math.min(e.originZ + stray, e.mesh.position.z));
                e.mesh.scale.set(0.82, 1.24, 0.82);
                // Robustné pristátie: keď klesá, hľadaj najvyššiu plošinu, ktorej vrch NOHY prešli za tento snímok.
                // Swept test (prevFeet→newFeet) chytí aj rýchly pád (tunelovanie) a polomerová tolerancia chytí pristátie pri okraji
                // → koniec prepadávania cez podlahu/okraje. (spätná väzba: žltý skokan prepadával podlahu)
                if (e.vy <= 0) {
                    const foot = e.baseY - e.groundY;                 // konštantná výška ťažiska nad plošinou (≈1.45)
                    const r = (e.radius || 1) * 0.6;                  // tolerancia okraja
                    const prevFeet = prevY - foot, newFeet = e.mesh.position.y - foot;
                    let landTop = null;
                    for (const p of platforms) {
                        if (e.mesh.position.x + r < p.min.x || e.mesh.position.x - r > p.max.x) continue;
                        if (e.mesh.position.z + r < p.min.z || e.mesh.position.z - r > p.max.z) continue;
                        if (prevFeet >= p.top - 0.05 && newFeet <= p.top + 0.05 && (landTop === null || p.top > landTop)) landTop = p.top;
                    }
                    if (landTop === null && newFeet <= e.groundY) landTop = e.groundY;   // záchrana: prepadol vlastnú zem → vráť naň
                    if (landTop !== null) {
                        e.groundY = landTop; e.baseY = landTop + foot;
                        e.mesh.position.y = e.baseY;
                        e.mesh.scale.set(1, 1, 1);                    // reset napnutia, aby model nedip­ol pod plošinu
                        e.vx = e.vz = e.vy = 0;
                        e.onGround = true;
                        e.isJumping = false;
                        spawnBurst(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, enemyColor(e), 5);
                    }
                }
            }
        } else if (e.type === 'flyer') {
            e.circleAngle += dt * (1.25 + e.speedMultiplier * 0.55);
            e.mesh.position.x = e.originX + Math.cos(e.circleAngle) * e.circleRadius;
            e.mesh.position.y = e.baseY + Math.sin(e.circleAngle * 1.4) * 1.25;
            e.mesh.position.z = e.originZ + Math.sin(e.circleAngle) * e.circleRadius * 0.55;
            e.mesh.rotation.y += dt * 1.4;
            if (e.mesh.userData.wings) {
                const flap = Math.sin(e.t * 14) * 0.55;
                e.mesh.userData.wings[0].rotation.z = -0.35 - flap;
                e.mesh.userData.wings[1].rotation.z = 0.35 + flap;
            }
        }

        animateEnemyBillboard(e);
        checkEnemyPlayer(e);
    }
}

function animateEnemyBillboard(e) {
    if (!e.mesh.userData.isBillboard || !e.mesh.userData.sprite) return;
    const sprite = e.mesh.userData.sprite;
    const base = enemyBillboardSize(e.type);
    let sx = base.w, sy = base.h;
    sprite.rotation = 0;
    sprite.material.opacity = e.sleeping ? 0.35 : 0.9;

    if (e.type === 'ghost') {
        sy *= 1 + Math.sin(e.t * 2.2) * 0.035;
        sprite.material.opacity = e.sleeping ? 0.32 : 0.72 + Math.sin(e.t * 3) * 0.14;
    } else if (e.type === 'amoeba') {
        sx *= 1 + Math.sin(e.t * 2.2) * 0.12;
        sy *= 1 + Math.cos(e.t * 2.7) * 0.07;
        sprite.rotation = Math.sin(e.t * 1.4) * 0.04;
    } else if (e.type === 'shooter') {
        sprite.rotation = Math.sin(e.t * 2.4) * 0.08;
        sx *= 1 + Math.sin(e.t * 3.2) * 0.035;
        sy *= 1 + Math.cos(e.t * 3.2) * 0.035;
    } else if (e.type === 'jumper') {
        sx *= e.isJumping ? 0.86 : 1 + Math.sin(e.t * 5) * 0.04;
        sy *= e.isJumping ? 1.24 : 0.96 + Math.sin(e.t * 5) * 0.035;
    } else if (e.type === 'flyer') {
        const flap = Math.sin(e.t * 14);
        sx *= 1 + flap * 0.08;
        sy *= 1 - Math.abs(flap) * 0.1;
        sprite.rotation = Math.sin(e.t * 4) * 0.08;
    }
    sprite.scale.set(sx, sy, 1);
}

function fireEnemyShot(e) {
    const dir = new THREE.Vector3(player.pos.x, player.pos.y + 1.4, player.pos.z).sub(e.mesh.position).normalize();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
    mesh.position.copy(e.mesh.position);
    scene.add(mesh);
    projectiles.push({ mesh, vel: dir.multiplyScalar(16 * currentDifficulty.enemySpeed), life: 4, friendly: false });
}

function checkEnemyPlayer(e) {
    const pc = playerCenter();
    if (e.sleeping || pc.distanceTo(e.mesh.position) > e.radius + 0.9) return;
    const enemyTop = e.mesh.position.y + e.radius;
    // stomp: hráč padá a chodidlá sú nad stredom nepriateľa
    if (player.vel.y < 0 && player.pos.y > e.mesh.position.y - 0.3) {
        damageEnemy(e, 100, true);                                  // combo++ prebehne tu (cez sleepEnemy)
        const chain = Math.min(combo, 6);
        player.vel.y = CONFIG.JUMP_VELOCITY * (0.95 + chain * 0.045) * jumpHeightMul; // väčší odraz, rastie s combom
        player.jumpsLeft = CONFIG.MAX_JUMPS;                        // obnov skoky → reťazenie dupov
        player.squashT = 0.16;
        camPunch = 0.45;
        spawnBurst(player.pos.x, enemyTop, player.pos.z, 0xffffff, 14);   // biely "pop"
        Sfx.play('groundPoundHit');
    } else if (player.invincible <= 0 && player.pos.y < enemyTop + 1.0) {
        hurtPlayer(false);
    }
}

function damageEnemy(e, amount, heavy) {
    if (e.sleeping || e.dead) return;
    e.health -= amount;
    if (Math.random() < 0.18 || heavy) spawnBurst(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, enemyColor(e), heavy ? 12 : 4);
    if (e.health <= 0) sleepEnemy(e, heavy ? 100 : 75);
}

function sleepEnemy(e, points) {
    if (e.sleeping) return;
    e.sleeping = true;
    e.sleepTimer = e.sleepDuration || currentDifficulty.enemySleepTime;
    e.health = 100;
    e.vx = e.vy = e.vz = 0;
    e.onGround = true;
    combo++; comboTimer = 1.6;
    score += points * (1 + Math.floor(combo / 5));
    if (combo >= 2) showToast(L('combo') + ' ×' + combo);   // reťazené dupnutia/kily
    setModelOpacity(e.mesh, 0.38);
    if (e.mesh.userData.sleepHalo) e.mesh.userData.sleepHalo.visible = true;
    spawnBurst(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, enemyColor(e), 16);
    Sfx.play('enemySleep');
    updateHUD();
}

function wakeEnemy(e) {
    e.sleeping = false;
    e.health = 100;
    e.mesh.scale.setScalar(1);
    e.mesh.rotation.z = 0;
    setModelOpacity(e.mesh, 1);
    if (e.mesh.userData.sleepHalo) e.mesh.userData.sleepHalo.visible = false;
}

function enemyColor(e) {
    if (e.type === 'ghost') return 0xc0c8ff;
    if (e.type === 'amoeba') return 0x70e070;
    if (e.type === 'shooter') return 0xff6060;
    if (e.type === 'jumper') return 0xe0d94d;
    return 0xc060ff;
}

// ---------- Orby ----------
function updateOrbs(dt) {
    for (const o of orbs) {
        if (o.collected) continue;
        o.t += dt;
        o.mesh.position.y = o.y + Math.sin(o.t * 3) * 0.25;
        o.mesh.quaternion.copy(camera.quaternion);   // hviezda čelí kamere (aj pri otáčaní kamery myšou)
        o.mesh.rotateZ(o.t * 1.3);                    // jemné trblietavé točenie v rovine
        if (o.mesh.position.distanceTo(playerCenter()) < 2.1) {
            o.collected = true;
            scene.remove(o.mesh);
            combo++; comboTimer = 1.6;
            score += 50 * (1 + Math.floor(combo / 5));
            spawnBurst(o.x, o.y, o.z, 0xffee88, 10);
            Sfx.play('collect');
            // každých 15 pozbieraných orbov = extra život
            starsCollected++;
            if (starsCollected % STARS_PER_LIFE === 0) {
                lives++;
                Sfx.play('levelComplete');
                spawnBurst(o.x, o.y + 1.2, o.z, 0xffe060, 22);
                showLifeUp();
            }
            updateHUD();
        }
    }
}

// ---------- Častice (jednoduché) ----------
function spawnBurst(x, y, z, color, n) {
    if (particles.length > 220) return;
    for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 6, 6),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        );
        mesh.position.set(x, y, z);
        const v = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 1, (Math.random() - 0.5) * 8);
        scene.add(mesh);
        particles.push({ mesh, vel: v, life: 0.6 + Math.random() * 0.4 });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const pa = particles[i];
        pa.vel.y -= 12 * dt;
        pa.mesh.position.addScaledVector(pa.vel, dt);
        pa.life -= dt;
        pa.mesh.material.opacity = Math.max(0, pa.life * 1.6);
        if (pa.life <= 0) { scene.remove(pa.mesh); pa.mesh.geometry.dispose(); pa.mesh.material.dispose(); particles.splice(i, 1); }
    }
}

// ---------- Hráč: zranenie / respawn ----------
// Zásah: pád do prázdna = priama strata života; inak −1 HP (3 zásahy = 1 život)
function hurtPlayer(fell) {
    if (fell) { loseLife(); return; }
    if (player.invincible > 0) return;
    player.hp--;
    combo = 0;
    Sfx.play('damage');
    spawnBurst(player.pos.x, player.pos.y + 1, player.pos.z, 0xff4060, 10);
    player.invincible = currentDifficulty.invinc;
    triggerHitFlash();
    if (player.hp <= 0) { loseLife(); return; }
    player.vel.y = 6;                 // malý odraz pri zásahu
    updateHUD();
}

function loseLife() {
    lives--;
    player.hp = player.hpMax;
    combo = 0;
    Sfx.play('damage');
    spawnBurst(player.pos.x, player.pos.y + 1, player.pos.z, 0xff2040, 16);
    triggerHitFlash();
    if (lives <= 0) { updateHUD(); gameOver(); return; }
    // respawn na poslednom checkpointe s plným HP
    player.pos.copy(lastCheckpoint);
    player.vel.set(0, 0, 0);
    player.invincible = currentDifficulty.invinc;
    player.jumpsLeft = CONFIG.MAX_JUMPS;
    updateHUD();
}

// Krátky červený záblesk obrazovky pri zásahu (DOM)
function triggerHitFlash() {
    const f = document.getElementById('hitFlash');
    if (!f) return;
    f.style.transition = 'none'; f.style.opacity = '0.5';
    requestAnimationFrame(() => { f.style.transition = 'opacity 0.35s'; f.style.opacity = '0'; });
}

// Krátka oznamovacia bublina (napr. získanie extra života)
let _toastTimer = 0;
function showToast(text) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.opacity = '1';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1400);
}
function showLifeUp() { showToast('⭐ +1 ' + (L('lifeUp') || 'EXTRA LIFE')); }

// ---------- Kamera (tretia osoba, vlečená) ----------
function updateCamera(dt) {
    // orbit okolo hráča: camYaw/camPitch ovláda myš (PC). Default = pôvodná pozícia za hráčom.
    const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
    const R = CAM_RADIUS * camZoom;   // koliesko myši priblíži/oddiali kameru
    _camTarget.set(
        player.pos.x + Math.sin(camYaw) * cp * R,
        player.pos.y + sp * R,
        player.pos.z + Math.cos(camYaw) * cp * R
    );
    const k = 1 - Math.exp(-6 * dt);   // plynulé doháňanie nezávislé od fps
    camera.position.lerp(_camTarget, k);
    if (camPunch > 0) camPunch = Math.max(0, camPunch - dt * 3.5);   // rýchle doznenie nárazu
    camera.lookAt(player.pos.x, player.pos.y + 1.5 - camPunch, player.pos.z);
    fillLight.position.set(player.pos.x, player.pos.y + 4, player.pos.z + 3);
    // Tieňová kamera slnka sleduje hráča: svetlo zboku-zhora → tiene padajú nabok (viditeľné, pomáhajú orientácii)
    if (sun.castShadow) {
        sun.position.set(player.pos.x + 26, player.pos.y + 26, player.pos.z + 10);
        sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);
        sun.target.updateMatrixWorld();
    }
}

function setModelOpacity(group, op) {
    group.traverse(o => {
        if (!o.material) return;
        o.material.opacity = op;
        if (op < 1) o.material.transparent = true;
    });
}

function syncPlayerVisual() {
    if (!playerModel) return;
    // jemný bob (chôdza/dýchanie)
    player.bob += 0.12;
    const moving = (Math.abs(player.vel.x) + Math.abs(player.vel.z)) > 0.5 && player.onGround;
    const bobAmt = moving ? Math.abs(Math.sin(player.bob)) * 0.14 : Math.sin(player.bob * 0.35) * 0.05;
    // squash-stretch po dupnutí (širší + plochší, rýchlo dozneje)
    const sq = player.squashT > 0 ? Math.max(0, player.squashT / 0.16) * 0.25 : 0;
    const base = playerModel.userData.baseScale || 1;
    const sxz = base * (1 + sq * 0.8), syy = base * (1 - sq * 1.4);
    if (playerModel.userData.isBillboard) {
        playerModel.position.set(player.pos.x, player.pos.y + playerModel.userData.halfH - 0.05 + bobAmt, player.pos.z);
        playerModel.quaternion.copy(camera.quaternion);
        playerModel.scale.set((player.facing < 0 ? -1 : 1) * sxz, syy, 1);
        const flick = player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0;
        setModelOpacity(playerModel, flick ? 0.35 : 1);
        return;
    }

    playerModel.position.set(player.pos.x, player.pos.y - 0.15 + bobAmt, player.pos.z);
    playerModel.scale.set(sxz, syy, sxz);

    // plynulé otáčanie k smeru pohybu (tvár = +Z)
    const targetYaw = Math.atan2(player.faceDir.x, player.faceDir.z);
    let dy = targetYaw - faceYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    faceYaw += dy * 0.25;
    playerModel.rotation.y = faceYaw;

    // baterka v ruke: kopíruje vertikálne mierenie lúča a svieti, keď je zapnutá
    if (playerModel.userData.flashlight) {
        playerModel.userData.flashlight.rotation.x = -flashlightPitch;
        if (playerModel.userData.flashLens) playerModel.userData.flashLens.material.color.setHex(player.beaming ? 0xfff4c0 : 0x6b6a4e);
    }

    // blikanie pri nesmrteľnosti
    const flick = player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0;
    setModelOpacity(playerModel, flick ? 0.35 : 1);
}

// Vrch najvyššej plošiny priamo pod bodom (x,z), ktorá je pod úrovňou y — pre zvislo projektované (blob) tiene
function groundUnder(x, z, y) {
    let gy = -Infinity;
    for (const p of platforms) {
        if (x >= p.min.x && x <= p.max.x && z >= p.min.z && z <= p.max.z && p.max.y <= y + 0.1) {
            if (p.max.y > gy) gy = p.max.y;
        }
    }
    return gy;
}

function updateBlobShadow() {
    const gy = groundUnder(player.pos.x, player.pos.z, player.pos.y);   // vrch platformy priamo pod hráčom
    if (gy > -Infinity) {
        blobShadow.visible = true;
        blobShadow.position.set(player.pos.x, gy + 0.02, player.pos.z);
        const fade = Math.max(0.1, 1 - (player.pos.y - gy) / 12);
        blobShadow.material.opacity = 0.45 * fade;
    } else {
        blobShadow.visible = false;
    }
}

// ---------- Portál / dokončenie ríše ----------
function updatePortal(dt) {
    if (!portal) return;
    const locked = portal.locked || !!pendingBoss || (boss && !boss.defeated);
    portal.mesh.rotation.z += dt * (locked ? 0.22 : 0.8);
    portal.mesh.children[0].rotation.x += dt * 0.5;
    if (locked) return;
    if (playerCenter().distanceTo(new THREE.Vector3(portal.x, portal.y, portal.z)) < 3.8) {
        realmComplete();
    }
}

function realmComplete() {
    Sfx.play('levelComplete');
    currentRealm++;
    if (currentRealm >= CONFIG.REALMS_IN_BUILD) { winGame(); return; }
    score += 500;
    generateRealm(currentRealm);
    autoSave();                  // autosave pri vstupe do novej ríše
}

// ---------- Slučka ----------
function animate() {
    requestAnimationFrame(animate);
    let dt = clock.getDelta();
    if (dt > 0.05) dt = 0.05;   // ochrana pred skokom po prepnutí karty

    if (currentState === GameState.PLAYING) {
        updatePlayer(dt);
        updateEnemies(dt);
        updateBossSpawn();
        updateBoss(dt);
        updateProjectiles(dt);
        updateOrbs(dt);
        updateParticles(dt);
        updatePortal(dt);
        updateCamera(dt);
        if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
        if (dustField) dustField.rotation.y += dt * 0.015;
        for (const it of decorItems) {
            if (it.userData.spin) it.rotation.y += it.userData.spin * dt;
            if (it.userData.rise) { it.position.y += dt * 1.4; if (it.position.y > 34) it.position.y = -12; }
            else if (!it.userData.noBob) { it.userData.bobPhase += dt; it.position.y = it.userData.by + Math.sin(it.userData.bobPhase) * 0.7; }
        }
    }
    renderer.render(scene, camera);
    frameCount++;
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLastTime >= 500) {
        diagFps = fpsFrames * 1000 / (now - fpsLastTime);
        fpsFrames = 0;
        fpsLastTime = now;
    }
    if (frameCount % 6 === 0) updateDiag();
}

// ---------- Diagnostický panel (DOM – prežije aj zlyhanie WebGL) ----------
function updateDiag() {
    const el = document.getElementById('diag');
    if (!el) return;
    const p = player ? '(' + player.pos.x.toFixed(1) + ', ' + player.pos.y.toFixed(1) + ', ' + player.pos.z.toFixed(1) + ')' : '–';
    el.innerHTML =
        '<b>' + BUILD_ID + '</b> · THREE r' + (typeof THREE !== 'undefined' ? THREE.REVISION : '?') + '<br>' +
        'GL: ' + glInfo + '<br>' +
        'oliver.png: ' + texStatus + '<br>' +
        'state: ' + currentState + ' · onGround: ' + (player ? player.onGround : '–') + ' · HP: ' + (player ? player.hp + '/' + player.hpMax : '–') + ' · lives: ' + lives + '<br>' +
        'pos: ' + p + '<br>' +
        'frames: ' + frameCount + ' · fps: ' + diagFps.toFixed(1) + ' · key: ' + lastKeyCode + '<br>' +
        (lastError ? '<span style="color:#ff7777">ERR: ' + lastError + '</span>' : '<span style="color:#88ff88">no JS errors</span>');
}

// ---------- HUD + obrazovky ----------
function updateHUD() {
    const t = getTheme(currentRealm);
    const hp = player ? player.hp : 3, hpMax = player ? player.hpMax : 3;
    setText('hudHp', '❤'.repeat(Math.max(0, hp)) + '🤍'.repeat(Math.max(0, hpMax - hp)));
    setText('hudLives', '⭐ ' + lives);
    setText('hudRealm', L('realm') + ' ' + (currentRealm + 1) + ': ' + (L('themes')[currentRealm] || t.name));
    setText('hudScore', L('score') + ': ' + score);
    const bar = document.getElementById('energyFill');
    if (bar) bar.style.width = (player ? player.beamEnergy : 100) + '%';
}

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

function showScreen(id) {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    if (id) document.getElementById(id).classList.remove('hidden');
}

function updateLanguage() {
    setText('uiTitle', L('title'));
    setText('uiSubtitle', L('subtitle'));
    setText('uiControls', isTouchDevice ? L('touchControls') : L('controls3d'));
    setText('startBtn', L('startBtn'));
    setText('langBtn', L('langBtn'));
    setText('uiCredits', L('credits'));
    setText('visualLabel', L('visualMode'));
    setText('pauseVisualLabel', L('visualMode'));
    setText('visual3dMenu', L('visual3d'));
    setText('visual2dMenu', L('visual2d'));
    setText('visual3dPause', L('visual3d'));
    setText('visual2dPause', L('visual2d'));
    setText('continueMenu', L('continueBtn'));
    setText('exportSaveMenu', L('exportSave')); setText('importSaveMenu', L('importSave'));
    setText('exportSavePause', L('exportSavePause'));
    // selektor režimu dotykového ovládania + popisky D-Padu
    setText('controlModeLabel', L('controlModeLabel'));
    setText('controlModePauseLabel', L('controlModeLabel'));
    setText('ctrlSwipeMenu', L('ctrlSwipe'));
    setText('ctrlDpadMenu', L('ctrlDpad'));
    setText('ctrlSwipePause', L('ctrlSwipe'));
    setText('ctrlDpadPause', L('ctrlDpad'));
    setText('btn-jump', L('dpadJump'));
    setText('btn-beam', L('dpadBeam'));
    setMobileMode(mobileMode);     // prelož popisky prepínačov (Mobilný režim / Joystick / Dev)
    setJoystick(joystickVisible);
    setDev(devVisible);
    setCaptureMouse(captureMouse);
    setAutoAim(autoAim);
    updateMouseSensitivityUI();
    setInvertMouseY(invertMouseY);
    setText('pausedTitle', L('paused'));
    setText('resumeBtn', L('resume'));
    setText('gameOverTitle', L('gameOver'));
    setText('retryBtn', L('retry'));
    setText('winTitle', L('winTitle'));
    setText('winText', L('winText'));
    setText('playAgainBtn', L('playAgain'));
    // difficulty tlačidlá
    setText('diffEasy', L('easy'));
    setText('diffMedium', L('medium'));
    setText('diffHard', L('hard'));
    setText('diffCustom', L('diffCustom'));
    setText('editCustomBtn', L('customDiffEdit'));
    setText('customDiffTitle', L('customDiffTitle'));
    setText('customDiffResetBtn', L('resetControls'));
    setText('customDiffBackBtn', L('back'));
    buildCustomDiff();
    // menu ovládania
    setText('openControlsMenu', L('controlsBtn'));
    setText('openControlsPause', L('controlsBtn'));
    setText('controlsTitle', L('controlsTitle'));
    setText('controlsHint', L('controlsHint'));
    setText('controlsResetBtn', L('resetControls'));
    setText('controlsBackBtn', L('back'));
    buildControlsMenu();
    updateBossBar();
    if (currentState === GameState.PLAYING || currentState === GameState.PAUSED) updateHUD();
}

// ---------- Tok hry ----------
function startGame() {
    AudioMaster.init();
    DreamMusic.start();
    lives = currentDifficulty.lives;
    score = 0; combo = 0; currentRealm = 0; starsCollected = 0;
    generateRealm(0);
    currentState = GameState.PLAYING;
    camZoom = 1;                                     // reset priblíženia kamery na začiatku hry
    autoSave();                                      // autosave na začiatku ríše
    showScreen(null);
    document.getElementById('hud').classList.remove('hidden');
    updateTouchUI();
    if (captureMouse) lockMouse();                   // štart = klik na tlačidlo = gesto → rovno zachyť myš
}

function gameOver() {
    currentState = GameState.GAME_OVER;
    if (pointerLocked) unlockMouse();
    DreamMusic.stop();
    setText('gameOverScore', L('score') + ': ' + score);
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('bossBar').classList.add('hidden');
    showScreen('gameOverScreen');
    updateTouchUI();
}

function winGame() {
    currentState = GameState.WIN;
    if (pointerLocked) unlockMouse();
    clearSave();                 // hra dohraná → zmaž autosave
    DreamMusic.stop();
    setText('winScore', L('score') + ': ' + score);
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('bossBar').classList.add('hidden');
    showScreen('winScreen');
    updateTouchUI();
}

function togglePause() {
    if (currentState === GameState.PLAYING) {
        currentState = GameState.PAUSED;
        showScreen('pauseScreen');
        if (pointerLocked) unlockMouse();           // uvoľni myš na ovládanie pauzy
    } else if (currentState === GameState.PAUSED) {
        currentState = GameState.PLAYING;
        showScreen(null);
        if (captureMouse) lockMouse();              // znova zamkni (resume = klik = gesto)
    }
    updateTouchUI();
}

function backToMenu() {
    currentState = GameState.MENU;
    if (pointerLocked) unlockMouse();
    DreamMusic.stop();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('bossBar').classList.add('hidden');
    showScreen('menuScreen');
    updateContinueButton();
    updateTouchUI();
}

// ---------- Ukladanie: autosave do prehliadača (localStorage) + manuálny .json export/import ----------
const SAVE_KEY = 'snovy3d_save';
function gatherSave() {
    return {
        v: 1, build: BUILD_ID, time: Date.now(),
        realm: currentRealm, score: score, lives: lives, stars: starsCollected,
        difficulty: currentDifficultyKey,
        custom: currentDifficultyKey === 'CUSTOM' ? Object.assign({}, DIFFICULTY.CUSTOM) : null
    };
}
function autoSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(gatherSave())); } catch (e) { /* ignoruj */ }
    updateContinueButton();
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignoruj */ } updateContinueButton(); }
function readSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.realm === 'number') return s; } catch (e) { /* ignoruj */ }
    return null;
}
function hasSave() { return !!readSave(); }
function applySave(s) {
    if (!s || typeof s.realm !== 'number') return false;
    if (s.difficulty === 'CUSTOM' && s.custom) {
        for (const p of CUSTOM_PARAMS) if (typeof s.custom[p.key] === 'number') DIFFICULTY.CUSTOM[p.key] = Math.max(p.min, Math.min(p.max, s.custom[p.key]));
        customDiffEdited = true;
        setDifficulty('CUSTOM');
    } else if (s.difficulty && DIFFICULTY[s.difficulty]) {
        setDifficulty(s.difficulty);
    }
    currentRealm = Math.max(0, Math.min(CONFIG.REALMS_IN_BUILD - 1, s.realm | 0));
    score = Math.max(0, s.score | 0);
    lives = Math.max(1, s.lives | 0);
    starsCollected = Math.max(0, s.stars | 0);
    combo = 0;
    return true;
}
function continueGame() {
    const s = readSave();
    if (!s) { startGame(); return; }
    AudioMaster.init();
    DreamMusic.start();
    applySave(s);
    generateRealm(currentRealm);
    currentState = GameState.PLAYING;
    camZoom = 1;
    showScreen(null);
    document.getElementById('hud').classList.remove('hidden');
    updateHUD();
    updateTouchUI();
    if (captureMouse) lockMouse();
}
function exportSave() {
    const data = (currentState === GameState.PLAYING || currentState === GameState.PAUSED) ? gatherSave() : (readSave() || gatherSave());
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* ignoruj */ }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'snovy-svet-save-r' + ((data.realm | 0) + 1) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    updateContinueButton();
}
function importSaveFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const s = JSON.parse(reader.result);
            if (!s || typeof s.realm !== 'number') throw new Error('bad');
            localStorage.setItem(SAVE_KEY, JSON.stringify(s));
            continueGame();   // rovno pokračuj v načítanej hre
        } catch (e) { alert(L('saveImportErr')); }
    };
    reader.readAsText(file);
}
function updateContinueButton() {
    const show = hasSave();
    document.querySelectorAll('.continue-btn, .continue-br').forEach(b => { b.style.display = show ? '' : 'none'; });
}

function setDifficulty(name) {
    currentDifficulty = DIFFICULTY[name];
    currentDifficultyKey = name;
    if (name !== 'CUSTOM') {
        lastBaseDifficulty = name;
        // kým hráč vlastnú obtiažnosť ručne neupravil, kopíruje zvolenú prednastavenú
        if (!customDiffEdited) for (const p of CUSTOM_PARAMS) DIFFICULTY.CUSTOM[p.key] = DIFFICULTY[name][p.key];
    }
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === name));
}

// ---------- Vlastná (custom) obtiažnosť ----------
function loadCustomDiff() {
    try {
        const s = JSON.parse(localStorage.getItem('snovy3d_customdiff'));
        if (s) {
            for (const p of CUSTOM_PARAMS) if (typeof s[p.key] === 'number') DIFFICULTY.CUSTOM[p.key] = Math.max(p.min, Math.min(p.max, s[p.key]));
            customDiffEdited = true;   // uložená vlastná = už ručne upravená, nesleduj prednastavenú
        }
    } catch (e) { /* ignoruj */ }
}
function saveCustomDiff() { try { localStorage.setItem('snovy3d_customdiff', JSON.stringify(DIFFICULTY.CUSTOM)); } catch (e) { /* private */ } }
// ---------- Výška skoku (globálny násobič, zdieľaný so sliderom aj mobilným režimom) ----------
function saveJumpHeight() { try { localStorage.setItem('snovy3d_jumpheight', String(jumpHeightMul)); } catch (e) { /* ignoruj */ } }
function loadJumpHeight() {
    try {
        const raw = localStorage.getItem('snovy3d_jumpheight');
        if (raw !== null) { const v = parseFloat(raw); if (!isNaN(v)) jumpHeightMul = Math.max(JUMP_MUL_MIN, Math.min(JUMP_MUL_MAX, v)); }
        else if (mobileMode) jumpHeightMul = 1.25;   // migrácia: starý mobilný režim = vyšší skok (volá sa po loadMobileMode)
    } catch (e) { /* ignoruj */ }
}
function setJumpHeight(v) {
    v = Math.max(JUMP_MUL_MIN, Math.min(JUMP_MUL_MAX, v));
    jumpHeightMul = Math.round(v * 100) / 100;   // 2 desatinné — aby 1.25 (mobilný režim) ostalo presné, nie zaokrúhlené na 1.3
    saveJumpHeight();
    buildCustomDiff();   // ak je editor otvorený, aktualizuj zobrazené číslo
}
function adjustJumpHeight(dir) {
    setJumpHeight(jumpHeightMul + dir * JUMP_MUL_STEP);
    // ručná zmena rozladí mobilný režim → zruš jeho zvýraznenie, ak hodnota nie je 1.25
    if (mobileMode && jumpHeightMul !== 1.25) setMobileMode(false);
}
function adjustCustom(p, dir) {
    let v = DIFFICULTY.CUSTOM[p.key] + dir * p.step;
    v = Math.max(p.min, Math.min(p.max, v));
    DIFFICULTY.CUSTOM[p.key] = parseFloat(v.toFixed(p.dec));   // bez plávajúcej nepresnosti
    customDiffEdited = true;   // od teraz si pamätá ručné hodnoty (nesleduj prednastavenú)
    saveCustomDiff();
    buildCustomDiff();
}
function resetCustomDiff() {
    // „Predvolené" = vráť sa k aktuálne zvolenej prednastavenej obtiažnosti a znova ju sleduj
    const base = DIFFICULTY[lastBaseDifficulty] || DIFFICULTY.MEDIUM;
    for (const p of CUSTOM_PARAMS) DIFFICULTY.CUSTOM[p.key] = base[p.key];
    customDiffEdited = false;
    try { localStorage.removeItem('snovy3d_customdiff'); } catch (e) { /* ignoruj */ }
    buildCustomDiff();
}
function buildCustomDiff() {
    const list = document.getElementById('customDiffList');
    if (!list) return;
    list.innerHTML = '';
    const labels = L('diffParams') || {};
    const addRow = (labelTxt, valueTxt, onMinus, onPlus) => {
        const row = document.createElement('div'); row.className = 'ctrl-row';
        const lab = document.createElement('span'); lab.className = 'ctrl-label'; lab.textContent = labelTxt;
        const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex; gap:8px; align-items:center';
        const minus = document.createElement('button'); minus.className = 'ctrl-key'; minus.textContent = '−'; minus.style.minWidth = '40px';
        const val = document.createElement('span'); val.style.cssText = 'min-width:46px; text-align:center; font:bold 14px monospace; color:#fff';
        val.textContent = valueTxt;
        const plus = document.createElement('button'); plus.className = 'ctrl-key'; plus.textContent = '+'; plus.style.minWidth = '40px';
        minus.addEventListener('click', onMinus);
        plus.addEventListener('click', onPlus);
        wrap.appendChild(minus); wrap.appendChild(val); wrap.appendChild(plus);
        row.appendChild(lab); row.appendChild(wrap); list.appendChild(row);
    };
    for (const p of CUSTOM_PARAMS) addRow(labels[p.key] || p.key, DIFFICULTY.CUSTOM[p.key].toFixed(p.dec), () => adjustCustom(p, -1), () => adjustCustom(p, 1));
    // Výška skoku = globálny násobič (zdieľaný s mobilným režimom), platí na každú obtiažnosť
    addRow(labels.jumpMul || 'Jump height (×)', jumpHeightMul.toFixed(2).replace(/0$/, ''), () => adjustJumpHeight(-1), () => adjustJumpHeight(1));
}
function showCustomDiff() {
    // kým nie je ručne upravená, zobraz hodnoty obtiažnosti zvolenej v menu
    if (!customDiffEdited) for (const p of CUSTOM_PARAMS) DIFFICULTY.CUSTOM[p.key] = (DIFFICULTY[lastBaseDifficulty] || DIFFICULTY.MEDIUM)[p.key];
    setDifficulty('CUSTOM');     // otvorenie editora rovno zvolí vlastnú obtiažnosť
    buildCustomDiff();
    showScreen('customDiffScreen');
}
function closeCustomDiff() { showScreen('menuScreen'); }

function setVisualMode(mode) {
    if (mode !== 'model' && mode !== 'billboard') return;
    const changed = visualMode !== mode;
    visualMode = mode;
    document.querySelectorAll('.visual-btn').forEach(b => b.classList.toggle('active', b.dataset.visual === mode));
    if (!changed) return;
    if (playerModel) replacePlayerVisual();
    for (const e of enemies) replaceEnemyVisual(e);
}

function replaceEnemyVisual(e) {
    const pos = e.mesh.position.clone();
    scene.remove(e.mesh);
    disposeObject(e.mesh);
    e.mesh = makeEnemyModel(e.type);
    e.mesh.position.copy(pos);
    scene.add(e.mesh);
    if (e.sleeping) {
        setModelOpacity(e.mesh, 0.38);
        if (e.mesh.userData.sleepHalo) e.mesh.userData.sleepHalo.visible = true;
    }
}

// ---------- Menu predefinovateľného ovládania ----------
function buildControlsMenu() {
    const list = document.getElementById('controlsList');
    if (!list) return;
    list.innerHTML = '';
    const labels = L('ctrlActions') || {};
    for (const a of CONTROL_ACTIONS) {
        const row = document.createElement('div'); row.className = 'ctrl-row';
        const lab = document.createElement('span'); lab.className = 'ctrl-label';
        lab.textContent = labels[a] || a;
        row.appendChild(lab);
        const keysWrap = document.createElement('div');
        keysWrap.style.cssText = 'display:flex; gap:8px';
        for (let slot = 0; slot < 2; slot++) {       // primárna + sekundárna väzba
            const btn = document.createElement('button'); btn.className = 'ctrl-key';
            if (rebinding && rebinding.action === a && rebinding.slot === slot) {
                btn.textContent = L('pressKey'); btn.classList.add('listening');
            } else btn.textContent = keyLabel(controlBindings[a][slot]);
            btn.addEventListener('click', () => { rebinding = { action: a, slot }; buildControlsMenu(); });
            keysWrap.appendChild(btn);
        }
        row.appendChild(keysWrap); list.appendChild(row);
    }
}
function applyRebind(code) {
    if (!rebinding) return;
    const action = rebinding.action, slot = rebinding.slot;
    // žiadne duplicity: odober kód z iných slotov/akcií
    for (const a of CONTROL_ACTIONS) for (let s = 0; s < 2; s++)
        if (!(a === action && s === slot) && controlBindings[a][s] === code) controlBindings[a][s] = '';
    controlBindings[action][slot] = code;
    rebinding = null;
    saveBindings();
    buildControlsMenu();
}
function resetControls() {
    controlBindings = cloneBindings(DEFAULT_BINDINGS);
    rebinding = null;
    saveBindings();
    buildControlsMenu();
}
function showControls(from) {
    controlsReturn = from || 'menuScreen';
    rebinding = null;
    buildControlsMenu();
    showScreen('controlsScreen');
}
function closeControls() {
    rebinding = null;
    showScreen(controlsReturn);
}

// ---------- Vstup ----------
function setupInput() {
    window.addEventListener('keydown', (e) => {
        // Režim priraďovania klávesu (menu Ovládanie) má prednosť pred všetkým ostatným
        if (rebinding) {
            e.preventDefault();
            if (e.code === 'Escape') { rebinding = null; buildControlsMenu(); }
            else applyRebind(e.code);
            return;
        }
        keys[e.code] = true; keys[e.key] = true;
        lastKeyCode = e.code;

        // Alt (ľavý/pravý) uvoľní zachytenú myš → kurzor sa vráti
        if ((e.code === 'AltLeft' || e.code === 'AltRight') && pointerLocked) {
            e.preventDefault(); unlockMouse(); return;
        }

        // Esc v menu Ovládanie ho zatvorí (skôr než pauza/diagnostika)
        const controlsEl = document.getElementById('controlsScreen');
        if (e.code === 'Escape' && controlsEl && !controlsEl.classList.contains('hidden')) {
            e.preventDefault(); closeControls(); return;
        }
        if (e.code === 'Backquote' || e.code === 'F1') {
            e.preventDefault();
            setDev(!devVisible);
            return;
        }
        // zabráň skrolovaniu/strate fokusu pri navigačných aj namapovaných klávesoch
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
            anyBoundCode(e.code)) e.preventDefault();

        if (currentState === GameState.PLAYING) {
            if (actionHasCode('jump', e.code) && !e.repeat) requestJump();
            if (actionHasCode('pause', e.code) || e.code === 'Escape') togglePause();
        } else if (e.code === 'Escape' && currentState === GameState.PAUSED) {
            togglePause();
        }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; keys[e.key] = false; });
}

// ---------- Myš (PC): ľavé = baterka · pravé drž = kamera · pravé klik = skok ----------
function setupMouse() {
    const canvas = document.getElementById('gl');
    document.addEventListener('contextmenu', (e) => e.preventDefault());   // pravé tlačidlo neотvára kontextové menu
    let rmbAcc = 0;

    // Pointer Lock: drž skutočný stav zachytenia myši (prehliadač môže odomknúť aj sám, napr. Esc)
    document.addEventListener('pointerlockchange', () => {
        pointerLocked = (document.pointerLockElement === canvas);
        if (!pointerLocked) { lmbBeam = false; rmbDown = false; }   // pri uvoľnení vynuluj držané tlačidlá
    });
    document.addEventListener('pointerlockerror', () => { pointerLocked = false; });

    window.addEventListener('mousedown', (e) => {
        keys['Mouse' + e.button] = true;
        if (!pointerLocked) { mouseAimPoint.x = e.clientX; mouseAimPoint.y = e.clientY; mouseAimPoint.active = true; }
        // priraďovanie myšieho tlačidla v menu Ovládanie (klik na slot-tlačidlo ho len „nabije")
        if (rebinding) {
            if (e.target && e.target.closest && e.target.closest('#controlsList')) return;
            e.preventDefault(); applyRebind('Mouse' + e.button); return;
        }
        if (currentState !== GameState.PLAYING) return;
        // Režim zachytenej myši: prvý klik (do plátna) len zamkne kurzor; potom ĽMB = baterka, PMB = skok (bez držania)
        if (captureMouse) {
            if (!pointerLocked) { if (e.target === canvas) lockMouse(); return; }   // klik do HUD nechaj prejsť (neuzamkni)
            if (e.button === 0) { lmbBeam = true; ensureMouseBeamAim(); }        // ľavé = baterka
            else if (e.button === 2) requestJump();                            // pravé = skok
            else if (actionHasCode('jump', 'Mouse' + e.button)) requestJump();
            return;
        }
        // Klasický režim (bez zachytenia): pravé drž = kamera / rýchly klik = skok, ľavé = baterka
        if (e.button === 2) { rmbDown = true; rmbDownT = performance.now(); rmbMoved = false; rmbAcc = 0; }
        else if (e.button === 0) { lmbBeam = true; ensureMouseBeamAim(); }
        else if (actionHasCode('jump', 'Mouse' + e.button)) requestJump();
    });
    window.addEventListener('mousemove', (e) => {
        if (!pointerLocked) { mouseAimPoint.x = e.clientX; mouseAimPoint.y = e.clientY; mouseAimPoint.active = true; }
        if (currentState !== GameState.PLAYING) return;
        if ((lmbBeam || actionHeld('beam')) && player && player.beamEnergy > 0) {
            steerMouseBeam(e.movementX || 0, e.movementY || 0);
            return;
        }
        if (pointerLocked) {                                       // zachytená myš: pohyb vždy otáča kameru
            const sens = MOUSE_LOOK_CAPTURE_BASE * mouseSensitivity;
            const lookDy = invertMouseY ? -e.movementY : e.movementY;
            camYaw -= e.movementX * sens;
            camPitch = Math.max(0.12, Math.min(1.4, camPitch - lookDy * sens));
            return;
        }
        if (!rmbDown) return;                                      // klasický režim: otáča iba držané pravé tlačidlo
        const sens = MOUSE_LOOK_DRAG_BASE * mouseSensitivity;
        const lookDy = invertMouseY ? -e.movementY : e.movementY;
        camYaw -= e.movementX * sens;
        camPitch = Math.max(0.12, Math.min(1.4, camPitch - lookDy * sens));
        rmbAcc += Math.abs(e.movementX) + Math.abs(e.movementY);
        if (rmbAcc > RMB_DRAG_PX) rmbMoved = true;
    });
    window.addEventListener('mouseup', (e) => {
        keys['Mouse' + e.button] = false;
        if (captureMouse && pointerLocked) { if (e.button === 0) lmbBeam = false; return; }
        if (e.button === 2) {
            if (currentState === GameState.PLAYING && rmbDown && !rmbMoved && performance.now() - rmbDownT < RMB_HOLD_MS) requestJump();  // rýchly klik = skok
            rmbDown = false;
        } else if (e.button === 0) lmbBeam = false;
    });
    // Koliesko myši = priblíženie/oddialenie kamery (funguje v oboch režimoch)
    window.addEventListener('wheel', (e) => {
        if (currentState !== GameState.PLAYING) return;
        e.preventDefault();
        camZoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, camZoom + Math.sign(e.deltaY) * CAM_ZOOM_STEP));
    }, { passive: false });
}

// Pointer Lock pomocníky + prepínač režimu zachytenia myši
function lockMouse() {
    if (!captureMouse || isTouchDevice) return;
    const canvas = document.getElementById('gl');
    if (canvas && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (e) { /* ignoruj */ } }
}
function unlockMouse() {
    if (document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) { /* ignoruj */ } }
}
function setCaptureMouse(on) {
    captureMouse = !!on;
    try { localStorage.setItem('snovy3d_capturemouse', captureMouse ? '1' : '0'); } catch (e) { /* ignoruj */ }
    document.querySelectorAll('.cap-toggle').forEach(b => {
        b.classList.toggle('active', captureMouse);
        b.textContent = '🖱 ' + L('captureMouse') + ': ' + (captureMouse ? L('on') : L('off'));
    });
    if (!captureMouse && pointerLocked) unlockMouse();
    else if (captureMouse && currentState === GameState.PLAYING) lockMouse();   // v hre rovno zamkni (klik je gesto)
    // popis ovládania v menu odráža zvolený režim myši (na PC)
    if (!isTouchDevice) setText('uiControls', captureMouse ? L('captureHint') : L('controls3d'));
}
function loadCaptureMouse() { try { if (localStorage.getItem('snovy3d_capturemouse') === '1') captureMouse = true; } catch (e) { /* ignoruj */ } }
// Klik používateľa na „Zachytiť myš": prepni ho a podľa toho nastav auto-mierenie (zachytená myš = ručné mierenie)
function toggleCaptureMouse() {
    setCaptureMouse(!captureMouse);
    setAutoAim(!captureMouse);
}

// Auto-mierenie lúča (zvislé) — voľba; predvolene zap, keď nie je zachytená myš
function setAutoAim(on) {
    autoAim = !!on;
    try { localStorage.setItem('snovy3d_autoaim', autoAim ? '1' : '0'); } catch (e) { /* ignoruj */ }
    document.querySelectorAll('.aim-toggle').forEach(b => {
        b.classList.toggle('active', autoAim);
        b.textContent = '🎯 ' + L('autoAim') + ': ' + (autoAim ? L('on') : L('off'));
    });
}
function loadAutoAim() {
    try {
        const raw = localStorage.getItem('snovy3d_autoaim');
        autoAim = (raw === '1' || raw === '0') ? (raw === '1') : !captureMouse;   // predvolené: opak zachytenia myši
    } catch (e) { autoAim = !captureMouse; }
}

function clampMouseSensitivity(v) {
    return Math.max(MOUSE_SENS_MIN, Math.min(MOUSE_SENS_MAX, v));
}
function loadMouseSensitivity() {
    try {
        const v = parseFloat(localStorage.getItem('snovy3d_mouse_sensitivity'));
        if (Number.isFinite(v)) mouseSensitivity = clampMouseSensitivity(v);
    } catch (e) { /* ignoruj */ }
}
function saveMouseSensitivity() {
    try { localStorage.setItem('snovy3d_mouse_sensitivity', mouseSensitivity.toFixed(1)); } catch (e) { /* ignoruj */ }
}
function updateMouseSensitivityUI() {
    setText('mouseSensMenuLabel', L('mouseSensitivity'));
    setText('mouseSensPauseLabel', L('mouseSensitivity'));
    const value = Math.round(mouseSensitivity * 100) + '%';
    setText('mouseSensMenuValue', value);
    setText('mouseSensPauseValue', value);
}
function adjustMouseSensitivity(dir) {
    mouseSensitivity = parseFloat(clampMouseSensitivity(mouseSensitivity + dir * MOUSE_SENS_STEP).toFixed(1));
    saveMouseSensitivity();
    updateMouseSensitivityUI();
}
function loadInvertMouseY() {
    try { if (localStorage.getItem('snovy3d_invert_mouse_y') === '1') invertMouseY = true; } catch (e) { /* ignoruj */ }
}
function setInvertMouseY(on) {
    invertMouseY = !!on;
    try { localStorage.setItem('snovy3d_invert_mouse_y', invertMouseY ? '1' : '0'); } catch (e) { /* ignoruj */ }
    document.querySelectorAll('.mouse-invert-y').forEach(b => {
        b.classList.toggle('active', invertMouseY);
        b.textContent = L('invertMouseY') + ': ' + (invertMouseY ? L('on') : L('off'));
    });
}

// ---------- Dotykové ovládanie ----------
function setupTouch() {
    const surf = document.getElementById('gl');
    if (!surf) return;

    surf.addEventListener('touchstart', (e) => {
        if (currentState !== GameState.PLAYING || controlMode !== 'swipe') return;   // menu/pauza/D-Pad → dotyk inam
        e.preventDefault();
        for (const t of e.changedTouches)
            touches.set(t.identifier, { sx: t.clientX, sy: t.clientY, cx: t.clientX, cy: t.clientY, st: performance.now(), mode: 'pending', dx: 0, dz: 0 });
    }, { passive: false });

    surf.addEventListener('touchmove', (e) => {
        if (currentState !== GameState.PLAYING || controlMode !== 'swipe') return;
        e.preventDefault();
        for (const t of e.changedTouches) {
            const rec = touches.get(t.identifier); if (!rec) continue;
            rec.cx = t.clientX; rec.cy = t.clientY;
            const dx = t.clientX - rec.sx, dy = t.clientY - rec.sy;
            const dist = Math.hypot(dx, dy);
            if (rec.mode === 'pending' && dist > TOUCH_MOVE_THRESHOLD) {
                // prvý ťahajúci prst riadi pohyb; ďalšie ťahy pohyb neovplyvnia
                rec.mode = [...touches.values()].some(r => r.mode === 'move') ? 'ignore' : 'move';
            }
            if (rec.mode === 'move') {
                if (dist < TOUCH_DEADZONE) { rec.dx = 0; rec.dz = 0; }
                else {
                    const mag = Math.min(1, dist / TOUCH_JOY_RADIUS);
                    rec.dx = (dx / dist) * mag;     // +x = vpravo
                    rec.dz = (dy / dist) * mag;     // hore(-) = dopredu(-z), dole(+) = dozadu(+z)
                }
            }
        }
    }, { passive: false });

    const endTouch = (e) => {
        const playing = currentState === GameState.PLAYING && controlMode === 'swipe';
        if (playing) e.preventDefault();
        for (const t of e.changedTouches) {
            const rec = touches.get(t.identifier); if (!rec) continue;
            if (playing && rec.mode === 'pending') {
                const dur = performance.now() - rec.st;
                const dist = Math.hypot(t.clientX - rec.sx, t.clientY - rec.sy);
                if (dur < TOUCH_TAP_MS && dist < TOUCH_MOVE_THRESHOLD) requestJump();   // ťuknutie = skok
            }
            touches.delete(t.identifier);
        }
    };
    surf.addEventListener('touchend', endTouch, { passive: false });
    surf.addEventListener('touchcancel', endTouch, { passive: false });
}

// Vyhodnotí dotyky každý frame: pohyb (joystick) + držanie (baterka)
function pollTouch() {
    let mx = 0, mz = 0, mover = false, beam = false, moverRec = null, beamRec = null;
    const now = performance.now();
    for (const rec of touches.values()) {
        if (rec.mode === 'pending' && now - rec.st > TOUCH_HOLD_MS) rec.mode = 'beam';   // podržanie = baterka
        if (rec.mode === 'move') { mx = rec.dx; mz = rec.dz; mover = true; moverRec = rec; }
        if (rec.mode === 'beam') { beam = true; beamRec = rec; }
    }
    const swipe = controlMode === 'swipe';
    touchMove.x = mx; touchMove.z = mz;
    touchMove.active = swipe && mover && (Math.abs(mx) + Math.abs(mz) > 0.01);
    touchBeamHeld = swipe && beam;
    touchBeamPoint.active = swipe && !!beamRec;
    if (beamRec) { touchBeamPoint.x = beamRec.cx; touchBeamPoint.y = beamRec.cy; }
    updateJoystickVisual(swipe ? moverRec : null);
}

// Plávajúci joystick (DOM, len swipe režim): prstenec na štarte ťahu + knob pri prste
function updateJoystickVisual(rec) {
    const base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
    if (!base || !knob) return;
    if (!rec || !joystickVisible) { base.style.display = 'none'; knob.style.display = 'none'; return; }
    const cx = rec.cx !== undefined ? rec.cx : rec.sx;
    const cy = rec.cy !== undefined ? rec.cy : rec.sy;
    let dx = cx - rec.sx, dy = cy - rec.sy;
    const dist = Math.hypot(dx, dy);
    if (dist > TOUCH_JOY_RADIUS) { const k = TOUCH_JOY_RADIUS / dist; dx *= k; dy *= k; }
    base.style.display = 'block'; knob.style.display = 'block';
    base.style.left = rec.sx + 'px'; base.style.top = rec.sy + 'px';
    knob.style.left = (rec.sx + dx) + 'px'; knob.style.top = (rec.sy + dy) + 'px';
}

// ---------- On-screen D-Pad ----------
// Univerzálny handler tlačidla (dotyk + myš na testovanie), .pressed štýl
function addButtonEvents(el, onPress, onRelease) {
    if (!el) return;
    const press = (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('pressed'); onPress(); };
    const release = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } el.classList.remove('pressed'); if (onRelease) onRelease(); };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', (e) => { if (el.classList.contains('pressed')) release(e); });
}

function setupDpad() {
    const g = (id) => document.getElementById(id);
    const dirs = [
        ['dpad-up',    () => { dpad.up = true; },                    () => { dpad.up = false; }],
        ['dpad-down',  () => { dpad.down = true; },                  () => { dpad.down = false; }],
        ['dpad-left',  () => { dpad.left = true; },                  () => { dpad.left = false; }],
        ['dpad-right', () => { dpad.right = true; },                 () => { dpad.right = false; }],
        ['dpad-ul',    () => { dpad.up = true; dpad.left = true; },  () => { dpad.up = false; dpad.left = false; }],
        ['dpad-ur',    () => { dpad.up = true; dpad.right = true; }, () => { dpad.up = false; dpad.right = false; }],
        ['dpad-dl',    () => { dpad.down = true; dpad.left = true; },() => { dpad.down = false; dpad.left = false; }],
        ['dpad-dr',    () => { dpad.down = true; dpad.right = true; },() => { dpad.down = false; dpad.right = false; }],
    ];
    for (const [id, on, off] of dirs) addButtonEvents(g(id), on, off);
    addButtonEvents(g('btn-jump'), () => { if (currentState === GameState.PLAYING) requestJump(); }, null);
    addButtonEvents(g('btn-beam'), () => { dpadBeamHeld = true; }, () => { dpadBeamHeld = false; });
}

// ---------- Režim ovládania (Swipe / D-Pad) — rovnaký vzor ako setVisualMode ----------
function setControlMode(mode) {
    if (mode !== 'swipe' && mode !== 'dpad') return;
    controlMode = mode;
    document.querySelectorAll('.ctrl-btn[data-ctrl]').forEach(b => b.classList.toggle('active', b.dataset.ctrl === mode));
    try { localStorage.setItem('snovy3d_controlmode', mode); } catch (e) { /* private mode */ }
    if (mode !== 'dpad') { dpad.up = dpad.down = dpad.left = dpad.right = false; dpadBeamHeld = false; }
    updateTouchUI();
}
function loadControlMode() {
    try { const m = localStorage.getItem('snovy3d_controlmode'); if (m === 'swipe' || m === 'dpad') controlMode = m; } catch (e) { /* ignoruj */ }
}

// Zobraz/skry D-Pad overlay + selektor režimu (selektor len na dotykových zariadeniach)
function updateTouchUI() {
    const tc = document.getElementById('touchControls');
    if (tc) tc.classList.toggle('active', controlMode === 'dpad' && isTouchDevice && currentState === GameState.PLAYING);
    if (controlMode !== 'swipe' || currentState !== GameState.PLAYING) updateJoystickVisual(null);
    document.querySelectorAll('.ctrlmode-block').forEach(b => { b.style.display = isTouchDevice ? 'block' : 'none'; });
    document.querySelectorAll('.pc-only').forEach(b => { b.style.display = isTouchDevice ? 'none' : 'flex'; });
}

// Skok zo všetkých zdrojov; ak sa nepodaril (minuté všetky skoky), nabufferuj ho na dopad
function requestJump() {
    if (!tryJump()) jumpBuffer = 0.13;
}

// Detekcia telefónu/tabletu (nie len dotykového desktopu) — dotykové možnosti sa ukážu len tu
function detectMobile() {
    const ua = navigator.userAgent || '';
    const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook/i.test(ua);
    const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;   // iPad sa tvári ako desktop
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    return uaMobile || iPadOS || coarse;
}

// Voliteľný plávajúci joystick (swipe režim)
function setJoystick(on) {
    joystickVisible = !!on;
    try { localStorage.setItem('snovy3d_joystick', joystickVisible ? '1' : '0'); } catch (e) { /* ignoruj */ }
    document.querySelectorAll('.joy-toggle').forEach(b => {
        b.classList.toggle('active', joystickVisible);
        b.textContent = '🕹 ' + L('joystick') + ': ' + (joystickVisible ? L('on') : L('off'));
    });
    if (!joystickVisible) updateJoystickVisual(null);
}
function loadJoystick() { try { if (localStorage.getItem('snovy3d_joystick') === '0') joystickVisible = false; } catch (e) { /* ignoruj */ } }

// Mobilný režim = skratka pre vyšší skok: zap → Výška skoku 1.25, vyp → 1.0 (jeden viditeľný násobič)
function setMobileMode(on) {
    mobileMode = !!on;
    try { localStorage.setItem('snovy3d_mobilemode', mobileMode ? '1' : '0'); } catch (e) { /* ignoruj */ }
    document.querySelectorAll('.mm-toggle').forEach(b => {
        b.classList.toggle('active', mobileMode);
        b.textContent = '📱 ' + L('mobileMode') + ': ' + (mobileMode ? L('on') : L('off'));
    });
}
// Klik používateľa: prepni mobilný režim a podľa toho nastav výšku skoku (1.25 / 1.0)
function toggleMobileMode() {
    setMobileMode(!mobileMode);
    setJumpHeight(mobileMode ? 1.25 : 1.0);
}
function loadMobileMode() { try { if (localStorage.getItem('snovy3d_mobilemode') === '1') mobileMode = true; } catch (e) { /* ignoruj */ } }

// Diagnostický (dev) panel – prepínateľný v menu (aj klávesami ` / F1 na desktope)
function setDev(on) {
    devVisible = !!on;
    try { localStorage.setItem('snovy3d_dev', devVisible ? '1' : '0'); } catch (e) { /* ignoruj */ }
    const d = document.getElementById('diag'); if (d) d.style.display = devVisible ? '' : 'none';
    const h = document.getElementById('diagHint'); if (h) h.style.display = devVisible ? '' : 'none';
    document.querySelectorAll('.dev-toggle').forEach(b => {
        b.classList.toggle('active', devVisible);
        b.textContent = '🛠 ' + L('devMode') + ': ' + (devVisible ? L('on') : L('off'));
    });
}
function loadDev() { try { if (localStorage.getItem('snovy3d_dev') === '1') devVisible = true; } catch (e) { /* ignoruj */ } }

function setupMenus() {
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('langBtn').addEventListener('click', toggleLanguage);
    document.getElementById('resumeBtn').addEventListener('click', togglePause);
    document.getElementById('menuBtn').addEventListener('click', backToMenu);
    document.getElementById('retryBtn').addEventListener('click', startGame);
    document.getElementById('playAgainBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.querySelectorAll('.diff-btn').forEach(b => b.addEventListener('click', () => setDifficulty(b.dataset.diff)));
    document.getElementById('editCustomBtn').addEventListener('click', showCustomDiff);
    document.getElementById('customDiffResetBtn').addEventListener('click', resetCustomDiff);
    document.getElementById('customDiffBackBtn').addEventListener('click', closeCustomDiff);
    document.querySelectorAll('.visual-btn').forEach(b => b.addEventListener('click', () => setVisualMode(b.dataset.visual)));
    document.querySelectorAll('.continue-btn').forEach(b => b.addEventListener('click', continueGame));
    document.getElementById('exportSaveMenu').addEventListener('click', exportSave);
    document.getElementById('exportSavePause').addEventListener('click', exportSave);
    document.getElementById('importSaveMenu').addEventListener('click', () => document.getElementById('importSaveInput').click());
    document.getElementById('importSaveInput').addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) importSaveFile(e.target.files[0]); e.target.value = ''; });
    document.querySelectorAll('.ctrl-btn[data-ctrl]').forEach(b => b.addEventListener('click', () => setControlMode(b.dataset.ctrl)));
    document.querySelectorAll('.mm-toggle').forEach(b => b.addEventListener('click', toggleMobileMode));
    document.querySelectorAll('.joy-toggle').forEach(b => b.addEventListener('click', () => setJoystick(!joystickVisible)));
    document.querySelectorAll('.dev-toggle').forEach(b => b.addEventListener('click', () => setDev(!devVisible)));
    document.querySelectorAll('.cap-toggle').forEach(b => b.addEventListener('click', toggleCaptureMouse));
    document.querySelectorAll('.aim-toggle').forEach(b => b.addEventListener('click', () => setAutoAim(!autoAim)));
    document.querySelectorAll('.mouse-sens-dec').forEach(b => b.addEventListener('click', () => adjustMouseSensitivity(-1)));
    document.querySelectorAll('.mouse-sens-inc').forEach(b => b.addEventListener('click', () => adjustMouseSensitivity(1)));
    document.querySelectorAll('.mouse-invert-y').forEach(b => b.addEventListener('click', () => setInvertMouseY(!invertMouseY)));
    document.getElementById('openControlsMenu').addEventListener('click', () => showControls('menuScreen'));
    document.getElementById('openControlsPause').addEventListener('click', () => showControls('pauseScreen'));
    document.getElementById('controlsResetBtn').addEventListener('click', resetControls);
    document.getElementById('controlsBackBtn').addEventListener('click', closeControls);
}

// ---------- Bootstrap ----------
function boot() {
    // Zachyť bežné chyby a ukáž ich v paneli (vzdialený používateľ nevidí konzolu)
    window.addEventListener('error', (e) => { lastError = (e.message || 'error') + (e.lineno ? ' :' + e.lineno : ''); updateDiag(); });
    window.addEventListener('unhandledrejection', (e) => { lastError = 'promise: ' + ((e.reason && e.reason.message) || e.reason); updateDiag(); });

    initThree();

    // Info o GL (renderer/verzia) do diagnostiky
    try {
        const gl = renderer.getContext();
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        glInfo = (renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1') + ' · ' + r;
    } catch (e) { glInfo = 'GL info chyba: ' + e.message; }

    texStatus = 'loading embedded oliver.png';
    oliverTexture = new THREE.TextureLoader().load(OLIVER_PNG_DATA_URI,
        (tex) => {
            texStatus = 'loaded embedded ' + (tex.image ? tex.image.width + 'x' + tex.image.height : '?');
            updateDiag();
        },
        undefined,
        () => { texStatus = 'ERROR (embedded PNG sa nenačítal)'; updateDiag(); }
    );
    oliverTexture.colorSpace = THREE.SRGBColorSpace;
    oliverTexture.minFilter = THREE.LinearFilter;
    oliverTexture.generateMipmaps = false;
    oliverTexture.wrapS = oliverTexture.wrapT = THREE.ClampToEdgeWrapping;
    loadPlatformTextures();

    buildPlayer();
    applyTheme(0);
    loadBindings();
    loadControlMode();
    loadCustomDiff();
    loadMobileMode();
    loadJumpHeight();
    loadJoystick();
    loadDev();
    loadCaptureMouse();
    loadAutoAim();
    loadMouseSensitivity();
    loadInvertMouseY();
    setupInput();
    isTouchDevice = detectMobile();   // dotykové možnosti len na telefóne/tablete
    setupTouch();
    setupDpad();
    setupMouse();
    setupMenus();
    updateLanguage();
    setDifficulty('MEDIUM');
    setVisualMode('model');
    setControlMode(controlMode);   // synchronizuj tlačidlá + zobraz/skry D-Pad podľa zariadenia
    setMobileMode(mobileMode);
    setJoystick(joystickVisible);
    setDev(devVisible);
    setCaptureMouse(captureMouse);
    setAutoAim(autoAim);
    setInvertMouseY(invertMouseY);
    updateContinueButton();
    setText('buildTag', BUILD_ID);
    setText('buildBadge', 'Snový Svet 3D · ' + BUILD_ID);   // rohový odznak sa už neaktualizuje ručne
    showScreen('menuScreen');
    updateDiag();
    animate();
}

window.addEventListener('DOMContentLoaded', boot);
