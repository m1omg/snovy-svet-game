// ==================== SNOVÝ SVET 3D — JADRO HRY ====================
// Tretia osoba, billboard Oliver v plne 3D svete (Three.js r149, globálny THREE).
// Ovládanie: Šípky = pohyb (relatívne k svetu, do hĺbky -Z), Space = skok (3×), Ctrl = lúč.
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
    FALL_Y: -25,           // pod touto výškou = pád/smrť
    CAM_DIST: 14,
    CAM_HEIGHT: 8.5,
    REALMS_IN_BUILD: 4     // koľko ríš je zapojených do postupu (generátor zvládne všetkých 12)
};

const DIFFICULTY = {
    EASY:   { name: 'Ľahká',  lives: 15, enemyBase: 2, enemyPerRealm: 1.0, enemySpeed: 0.7, invinc: 2.5 },
    MEDIUM: { name: 'Stredná', lives: 12, enemyBase: 3, enemyPerRealm: 1.6, enemySpeed: 1.0, invinc: 1.8 },
    HARD:   { name: 'Ťažká',  lives: 10, enemyBase: 5, enemyPerRealm: 2.4, enemySpeed: 1.4, invinc: 1.2 }
};
let currentDifficulty = DIFFICULTY.MEDIUM;

// Témy ríš (zdieľané s 2D hrou): bg1/bg2 = obloha+hmla, platform = materiál, accent = žiara, musicScale
const themes = [
    { name: 'Fialová Hmla',            bg1: '#0a0015', bg2: '#1a0a2e', platform: '#4a2080', accent: '#b060ff', musicScale: 'ethereal' },
    { name: 'Zabudnutá Izba Hračiek',  bg1: '#1a1525', bg2: '#2a2035', platform: '#8a6050', accent: '#ffb080', musicScale: 'melancholy' },
    { name: 'Čiernobiely Labyrint',    bg1: '#080808', bg2: '#151515', platform: '#404040', accent: '#ffffff', musicScale: 'cosmic' },
    { name: 'Potopený Chrám',          bg1: '#001520', bg2: '#003040', platform: '#205060', accent: '#40d0ff', musicScale: 'ethereal' },
    { name: 'Cukríkové Nebo',          bg1: '#200820', bg2: '#401040', platform: '#c06080', accent: '#ff80c0', musicScale: 'melancholy' },
    { name: 'Tichý Les Tieňov',        bg1: '#000a05', bg2: '#001a10', platform: '#203020', accent: '#40a060', musicScale: 'cosmic' },
    { name: 'Rozbitý Čas',             bg1: '#0a0510', bg2: '#150a20', platform: '#503060', accent: '#c080ff', musicScale: 'ethereal' },
    { name: 'Plyšový Svet',            bg1: '#151015', bg2: '#252025', platform: '#806050', accent: '#ffc090', musicScale: 'melancholy' },
    { name: 'Prázdny Cirkus',          bg1: '#100508', bg2: '#200a10', platform: '#602030', accent: '#ff4060', musicScale: 'cosmic' },
    { name: 'Hviezdy a Mesiace',       bg1: '#020008', bg2: '#050015', platform: '#303060', accent: '#8080ff', musicScale: 'ethereal' },
    { name: 'Zabudnutý Domov',         bg1: '#100a08', bg2: '#201510', platform: '#504030', accent: '#c0a080', musicScale: 'melancholy' },
    { name: 'Prebudenie',              bg1: '#150810', bg2: '#301020', platform: '#603050', accent: '#ff60ff', musicScale: 'cosmic' }
];
function getTheme(i) { return themes[i % themes.length]; }

// ---------- Stav hry ----------
const GameState = { MENU: 0, PLAYING: 1, PAUSED: 2, GAME_OVER: 3, WIN: 4, REALM_DONE: 5 };
let currentState = GameState.MENU;

let scene, camera, renderer, clock;
let ambient, sun, fillLight;
let player, playerSprite, playerBody, blobShadow;
let platforms = [], orbs = [], enemies = [], projectiles = [], particles = [], dustField = null;
let portal = null;
let currentRealm = 0;
let score = 0, lives = 12;
let combo = 0, comboTimer = 0;
let lastCheckpoint = new THREE.Vector3(0, 2, 0);
let groundUnderPlayer = -Infinity;   // pre blob tieň
let oliverTexture = null;

// ---------- Diagnostika (zobrazí sa v paneli; pomáha ladiť na cudzom stroji) ----------
const BUILD_ID = 'build 3';
let frameCount = 0;
let lastKeyCode = '–';
let texStatus = 'pending';
let lastError = '';
let glInfo = '?';

const keys = {};   // stav klávesnice

// Stred tela hráča (chodidlá + ~1.2) pre kolízie s orbami/nepriateľmi/portálom
const _pc = new THREE.Vector3();
function playerCenter() { return _pc.set(player.pos.x, player.pos.y + 1.2, player.pos.z); }

// ---------- Inicializácia THREE ----------
function initThree() {
    const canvas = document.getElementById('gl');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
    camera.position.set(0, CONFIG.CAM_HEIGHT, CONFIG.CAM_DIST);

    ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(8, 20, 12);
    scene.add(sun);
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
function buildPlayer() {
    const h = 3.2, w = h * (117 / 139);

    // PEVNÉ TELO – vždy viditeľné, nezávislé od načítania PNG (rovnaký typ materiálu ako nepriatelia,
    // ktorí sa používateľovi vykresľujú). Záruka, že hráč nikdy nezmizne ani pri probléme s textúrou.
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x4ecdc4, emissive: 0x2aa39b, emissiveIntensity: 0.6, roughness: 0.5,
        transparent: true, opacity: 1
    });
    playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.5, 6, 14), bodyMat);
    playerBody.frustumCulled = false;
    playerBody._halfH = 1.45;          // od chodidiel k stredu kapsuly
    scene.add(playerBody);

    // Billboard sprite (Oliverova tvár) – prekrytie; zobrazí sa AŽ keď sa textúra načíta (boot onLoad)
    const mat = new THREE.MeshBasicMaterial({ map: oliverTexture, transparent: true, alphaTest: 0.12, side: THREE.DoubleSide });
    playerSprite = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    playerSprite.frustumCulled = false;
    playerSprite._halfH = h / 2;
    playerSprite.visible = false;      // kým nie je textúra, ukazuje sa kapsula
    scene.add(playerSprite);

    // Mäkký blob tieň pod hráčom
    const shadowTex = makeBlobTexture();
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
        aim: new THREE.Vector3(0, 0, -1),
        beamEnergy: CONFIG.BEAM_ENERGY_MAX,
        beaming: false,
        beamCooldown: 0,
        invincible: 0
    };
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

// ---------- Generovanie ríše ----------
function clearRealm() {
    for (const p of platforms) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    for (const o of orbs) scene.remove(o.mesh);
    for (const e of enemies) scene.remove(e.mesh);
    for (const pr of projectiles) scene.remove(pr.mesh);
    for (const pa of particles) scene.remove(pa.mesh);
    platforms = []; orbs = []; enemies = []; projectiles = []; particles = [];
    if (portal) { scene.remove(portal.mesh); portal = null; }
    if (dustField) { scene.remove(dustField); dustField.geometry.dispose(); dustField.material.dispose(); dustField = null; }
}

function addPlatform(x, y, z, w, d, theme) {
    const geo = new THREE.BoxGeometry(w, 1, d);
    const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(theme.platform),
        emissive: new THREE.Color(theme.accent).multiplyScalar(0.12),
        roughness: 0.85, metalness: 0.05
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const p = { mesh, x, y, z, w, d, top: y + 0.5,
        min: new THREE.Vector3(x - w / 2, y - 0.5, z - d / 2),
        max: new THREE.Vector3(x + w / 2, y + 0.5, z + d / 2) };
    platforms.push(p);
    return p;
}

function addOrb(x, y, z, accent) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffee88) });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    orbs.push({ mesh, x, y, z, t: Math.random() * 6, collected: false });
}

function addEnemy(type, x, y, z, theme, patrolHalf) {
    let geo;
    if (type === 'walker') geo = new THREE.IcosahedronGeometry(0.9, 0);
    else if (type === 'flyer') geo = new THREE.OctahedronGeometry(0.9, 0);
    else geo = new THREE.ConeGeometry(0.9, 1.8, 6); // shooter
    const col = type === 'walker' ? 0x60ff60 : type === 'flyer' ? 0xc060ff : 0xff6060;
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    enemies.push({
        mesh, type, x, y, z, baseY: y, t: Math.random() * 6, dir: 1,
        patrolHalf: patrolHalf || 3, originX: x, shootTimer: 1 + Math.random() * 2,
        half: new THREE.Vector3(0.9, 0.9, 0.9), dead: false
    });
}

function addPortal(x, y, z, accent) {
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.35, 12, 32),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), emissive: new THREE.Color(accent), emissiveIntensity: 0.8 })
    );
    const disc = new THREE.Mesh(
        new THREE.CircleGeometry(2.0, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    grp.add(ring); grp.add(disc);
    grp.position.set(x, y + 2.6, z);
    scene.add(grp);
    portal = { mesh: grp, x, y: y + 2.6, z };
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
        const stepZ = 6 + Math.random() * 3;             // dopredu do hĺbky
        z -= stepZ;
        x += (Math.sin(n * 0.7) * 4) + (Math.random() - 0.5) * 5; // kľukatenie
        x = Math.max(-22, Math.min(22, x));
        // výška osciluje hore/dole, aby sa využil priestor
        const up = (n % 3 === 0) ? 1 : (Math.random() < 0.45 ? 1 : -1);
        y += up * (1 + Math.random() * 1.6);
        y = Math.max(-4, Math.min(14, y));
        const w = 4 + Math.random() * 3, dep = 4 + Math.random() * 3;
        const p = addPlatform(x, y, z, w, dep, t);

        // orby (niekedy zhluk)
        if (Math.random() < 0.7) {
            const oc = 1 + (Math.random() < 0.3 ? 2 : 0);
            for (let k = 0; k < oc; k++) addOrb(x + (k - 0.5) * 1.6, y + 2 + k * 0.1, z, t.accent);
        }
        // nepriatelia
        if (n > 1 && enemiesPlaced < enemyTotal && Math.random() < 0.5) {
            const r = Math.random();
            const type = r < 0.45 ? 'walker' : r < 0.75 ? 'flyer' : 'shooter';
            const ey = type === 'flyer' ? y + 4 : y + 1.4;
            addEnemy(type, x, ey, z, t, Math.max(1.5, w / 2 - 1));
            enemiesPlaced++;
        }
        // checkpoint cca každých 5 (len posledný uložený sa použije pri respawne)
        if (n % 5 === 0) p.isCheckpoint = true;
    }

    // cieľový portál na poslednej platforme
    addPortal(x, y, z, t.accent);

    // atmosférický prach
    buildDust(t.accent, z);

    // postav hráča na štart
    player.pos.set(0, 2.5, 0);
    player.vel.set(0, 0, 0);
    player.jumpsLeft = CONFIG.MAX_JUMPS;
    player.beamEnergy = CONFIG.BEAM_ENERGY_MAX;
    camera.position.set(0, CONFIG.CAM_HEIGHT, CONFIG.CAM_DIST);
    syncPlayerVisual();
    updateHUD();
}

function buildDust(accent, farZ) {
    const N = 260;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 60;
        pos[i * 3 + 1] = Math.random() * 24 - 4;
        pos[i * 3 + 2] = Math.random() * (farZ - 8) + 4; // pozdĺž dráhy
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(accent), size: 0.18, transparent: true, opacity: 0.5, depthWrite: false });
    dustField = new THREE.Points(geo, mat);
    scene.add(dustField);
}

// ---------- Pohyb + kolízie ----------
function updatePlayer(dt) {
    // vstup → smer v rovine XZ (relatívne k svetu: -Z = dopredu/do scény)
    let ix = 0, iz = 0;
    if (keys['ArrowUp']) iz -= 1;
    if (keys['ArrowDown']) iz += 1;
    if (keys['ArrowLeft']) ix -= 1;
    if (keys['ArrowRight']) ix += 1;
    const moving = ix !== 0 || iz !== 0;
    if (moving) {
        const len = Math.hypot(ix, iz);
        ix /= len; iz /= len;
        player.vel.x = ix * CONFIG.MOVE_SPEED;
        player.vel.z = iz * CONFIG.MOVE_SPEED;
        player.aim.set(ix, 0, iz);
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

    // pád / smrť
    if (player.pos.y < CONFIG.FALL_Y) { hurtPlayer(true); }

    if (player.invincible > 0) player.invincible -= dt;

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
        player.vel.y = CONFIG.JUMP_VELOCITY;
        player.jumpsLeft--;
        player.onGround = false;
        const which = CONFIG.MAX_JUMPS - player.jumpsLeft;
        Sfx.play(which === 1 ? 'jump' : which === 2 ? 'doubleJump' : 'tripleJump');
        spawnBurst(player.pos.x, player.pos.y + 0.2, player.pos.z, 0xffffff, 6);
    }
}

function updateBeam(dt) {
    const wantBeam = (keys['Control'] || keys['ControlLeft'] || keys['ControlRight']) && player.beamEnergy > 0;
    if (wantBeam) {
        player.beamEnergy = Math.max(0, player.beamEnergy - CONFIG.BEAM_DRAIN * dt);
        player.beamCooldown -= dt;
        if (player.beamCooldown <= 0) {
            player.beamCooldown = 0.12;
            fireBeam();
        }
    } else {
        player.beamEnergy = Math.min(CONFIG.BEAM_ENERGY_MAX, player.beamEnergy + CONFIG.BEAM_RECHARGE * dt);
    }
}

function fireBeam() {
    const dir = player.aim.lengthSq() > 0 ? player.aim.clone().normalize() : new THREE.Vector3(0, 0, -1);
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xa060ff })
    );
    const start = new THREE.Vector3(player.pos.x, player.pos.y + 1.6, player.pos.z).addScaledVector(dir, 1.0);
    mesh.position.copy(start);
    scene.add(mesh);
    projectiles.push({ mesh, vel: dir.multiplyScalar(26), life: 1.2, friendly: true });
    Sfx.play('shoot');
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
                if (pr.mesh.position.distanceTo(e.mesh.position) < 1.3) { defeatEnemy(e); hit = true; break; }
            }
        } else {
            // nepriateľský projektil → hráč
            const head = new THREE.Vector3(player.pos.x, player.pos.y + 1.6, player.pos.z);
            if (pr.mesh.position.distanceTo(head) < 1.3) { hurtPlayer(false); hit = true; }
        }
        if (hit || pr.life <= 0) { scene.remove(pr.mesh); pr.mesh.geometry.dispose(); pr.mesh.material.dispose(); projectiles.splice(i, 1); }
    }
}

// ---------- Nepriatelia ----------
function updateEnemies(dt) {
    for (const e of enemies) {
        if (e.dead) continue;
        e.t += dt;
        if (e.type === 'walker') {
            e.mesh.position.x += e.dir * 2.2 * currentDifficulty.enemySpeed * dt;
            if (e.mesh.position.x > e.originX + e.patrolHalf) e.dir = -1;
            if (e.mesh.position.x < e.originX - e.patrolHalf) e.dir = 1;
            e.mesh.position.y = e.baseY + Math.abs(Math.sin(e.t * 4)) * 0.3;
            e.mesh.rotation.y += dt * 2;
        } else if (e.type === 'flyer') {
            e.mesh.position.y = e.baseY + Math.sin(e.t * 2) * 1.5;
            // jemné nasledovanie hráča v X
            e.mesh.position.x += Math.sign(player.pos.x - e.mesh.position.x) * 1.2 * currentDifficulty.enemySpeed * dt;
            e.mesh.rotation.y += dt * 3;
        } else { // shooter
            e.mesh.rotation.y += dt * 1.5;
            const distToPlayer = e.mesh.position.distanceTo(player.pos);
            if (distToPlayer < 45) {
                e.shootTimer -= dt;
                if (e.shootTimer <= 0) {
                    e.shootTimer = 2.2 / currentDifficulty.enemySpeed;
                    fireEnemyShot(e);
                }
            }
        }
        // kolízia s hráčom
        checkEnemyPlayer(e);
    }
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
    const dx = Math.abs(pc.x - e.mesh.position.x);
    const dz = Math.abs(pc.z - e.mesh.position.z);
    if (dx > 1.9 || dz > 1.9) return;
    const enemyTop = e.mesh.position.y + e.half.y;
    // stomp: hráč padá a chodidlá sú nad stredom nepriateľa
    if (player.vel.y < 0 && player.pos.y > e.mesh.position.y - 0.3) {
        defeatEnemy(e);
        player.vel.y = CONFIG.JUMP_VELOCITY * 0.8; // odraz
    } else if (player.invincible <= 0 && player.pos.y < enemyTop + 1.0) {
        hurtPlayer(false);
    }
}

function defeatEnemy(e) {
    e.dead = true;
    scene.remove(e.mesh);
    combo++; comboTimer = 1.6;
    const mult = 1 + Math.floor(combo / 5);
    score += 100 * mult;
    spawnBurst(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, e.mesh.material.color.getHex(), 14);
    Sfx.play('hit');
    updateHUD();
}

// ---------- Orby ----------
function updateOrbs(dt) {
    for (const o of orbs) {
        if (o.collected) continue;
        o.t += dt;
        o.mesh.position.y = o.y + Math.sin(o.t * 3) * 0.25;
        o.mesh.rotation.y += dt * 2;
        if (o.mesh.position.distanceTo(playerCenter()) < 2.1) {
            o.collected = true;
            scene.remove(o.mesh);
            combo++; comboTimer = 1.6;
            score += 50 * (1 + Math.floor(combo / 5));
            spawnBurst(o.x, o.y, o.z, 0xffee88, 10);
            Sfx.play('collect');
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
function hurtPlayer(fell) {
    if (!fell && player.invincible > 0) return;
    lives--;
    combo = 0;
    Sfx.play('damage');
    spawnBurst(player.pos.x, player.pos.y + 1, player.pos.z, 0xff4060, 12);
    updateHUD();
    if (lives <= 0) { gameOver(); return; }
    // respawn na poslednom checkpointe
    player.pos.copy(lastCheckpoint);
    player.vel.set(0, 0, 0);
    player.invincible = currentDifficulty.invinc;
    player.jumpsLeft = CONFIG.MAX_JUMPS;
}

// ---------- Kamera (tretia osoba, vlečená) ----------
function updateCamera(dt) {
    const target = new THREE.Vector3(player.pos.x, player.pos.y + CONFIG.CAM_HEIGHT, player.pos.z + CONFIG.CAM_DIST);
    const k = 1 - Math.exp(-6 * dt);   // plynulé doháňanie nezávislé od fps
    camera.position.lerp(target, k);
    camera.lookAt(player.pos.x, player.pos.y + 1.5, player.pos.z);
    fillLight.position.set(player.pos.x, player.pos.y + 4, player.pos.z + 3);
}

function syncPlayerVisual() {
    // pozičuj obe reprezentácie (kapsula aj sprite); viditeľnosť rieši stav textúry
    playerBody.position.set(player.pos.x, player.pos.y + playerBody._halfH, player.pos.z);
    playerSprite.position.set(player.pos.x, player.pos.y + playerSprite._halfH, player.pos.z);
    playerSprite.quaternion.copy(camera.quaternion);   // billboard
    playerSprite.scale.x = player.facing;              // horizontálny flip podľa smeru
    // blikanie pri nesmrteľnosti (na oboch materiáloch)
    const flick = player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0;
    const op = flick ? 0.35 : 1;
    playerSprite.material.opacity = op;
    playerBody.material.opacity = op;
}

function updateBlobShadow() {
    // nájdi vrch platformy priamo pod hráčom
    let gy = -Infinity;
    for (const p of platforms) {
        if (player.pos.x >= p.min.x && player.pos.x <= p.max.x &&
            player.pos.z >= p.min.z && player.pos.z <= p.max.z && p.max.y <= player.pos.y + 0.1) {
            if (p.max.y > gy) gy = p.max.y;
        }
    }
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
    portal.mesh.rotation.z += dt * 0.8;
    portal.mesh.children[0].rotation.x += dt * 0.5;
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
}

// ---------- Slučka ----------
function animate() {
    requestAnimationFrame(animate);
    let dt = clock.getDelta();
    if (dt > 0.05) dt = 0.05;   // ochrana pred skokom po prepnutí karty

    if (currentState === GameState.PLAYING) {
        updatePlayer(dt);
        updateEnemies(dt);
        updateProjectiles(dt);
        updateOrbs(dt);
        updateParticles(dt);
        updatePortal(dt);
        updateCamera(dt);
        if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
        if (dustField) dustField.rotation.y += dt * 0.02;
    }
    renderer.render(scene, camera);
    frameCount++;
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
        'state: ' + currentState + ' · onGround: ' + (player ? player.onGround : '–') + '<br>' +
        'pos: ' + p + '<br>' +
        'frames: ' + frameCount + ' · key: ' + lastKeyCode + '<br>' +
        (lastError ? '<span style="color:#ff7777">ERR: ' + lastError + '</span>' : '<span style="color:#88ff88">no JS errors</span>');
}

// ---------- HUD + obrazovky ----------
function updateHUD() {
    const t = getTheme(currentRealm);
    setText('hudLives', '❤ ' + lives);
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
    setText('uiControls', L('controls3d'));
    setText('startBtn', L('startBtn'));
    setText('langBtn', L('langBtn'));
    setText('uiCredits', L('credits'));
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
    if (currentState === GameState.PLAYING || currentState === GameState.PAUSED) updateHUD();
}

// ---------- Tok hry ----------
function startGame() {
    AudioMaster.init();
    DreamMusic.start();
    lives = currentDifficulty.lives;
    score = 0; combo = 0; currentRealm = 0;
    generateRealm(0);
    currentState = GameState.PLAYING;
    showScreen(null);
    document.getElementById('hud').classList.remove('hidden');
}

function gameOver() {
    currentState = GameState.GAME_OVER;
    DreamMusic.stop();
    setText('gameOverScore', L('score') + ': ' + score);
    document.getElementById('hud').classList.add('hidden');
    showScreen('gameOverScreen');
}

function winGame() {
    currentState = GameState.WIN;
    DreamMusic.stop();
    setText('winScore', L('score') + ': ' + score);
    document.getElementById('hud').classList.add('hidden');
    showScreen('winScreen');
}

function togglePause() {
    if (currentState === GameState.PLAYING) {
        currentState = GameState.PAUSED;
        showScreen('pauseScreen');
    } else if (currentState === GameState.PAUSED) {
        currentState = GameState.PLAYING;
        showScreen(null);
    }
}

function backToMenu() {
    currentState = GameState.MENU;
    DreamMusic.stop();
    document.getElementById('hud').classList.add('hidden');
    showScreen('menuScreen');
}

function setDifficulty(name) {
    currentDifficulty = DIFFICULTY[name];
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === name));
}

// ---------- Vstup ----------
function setupInput() {
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true; keys[e.key] = true;
        lastKeyCode = e.code;
        if (e.code === 'Backquote' || e.code === 'F1') {
            e.preventDefault();
            const d = document.getElementById('diag'); if (d) d.classList.toggle('hidden');
            return;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        if (currentState === GameState.PLAYING) {
            if (e.code === 'Space' && !e.repeat) tryJump();
            if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
        } else if (e.code === 'Escape' && currentState === GameState.PAUSED) {
            togglePause();
        }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; keys[e.key] = false; });
}

function setupMenus() {
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('langBtn').addEventListener('click', toggleLanguage);
    document.getElementById('resumeBtn').addEventListener('click', togglePause);
    document.getElementById('menuBtn').addEventListener('click', backToMenu);
    document.getElementById('retryBtn').addEventListener('click', startGame);
    document.getElementById('playAgainBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.querySelectorAll('.diff-btn').forEach(b => b.addEventListener('click', () => setDifficulty(b.dataset.diff)));
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

    // Textúra Oliver: onLoad → prepni z kapsuly na sprite; onError → kapsula ostáva
    oliverTexture = new THREE.TextureLoader().load('assets/oliver.png',
        (tex) => {
            texStatus = 'loaded ' + (tex.image ? tex.image.width + 'x' + tex.image.height : '?');
            if (playerSprite && playerBody) { playerSprite.visible = true; playerBody.visible = false; }
            updateDiag();
        },
        undefined,
        () => { texStatus = 'ERROR (PNG sa nenačítal) – kapsula ostáva'; updateDiag(); }
    );
    // 117×139 = NPOT → bez mipmáp + clamp, inak je textúra „incomplete" a vykreslí sa prázdna
    oliverTexture.colorSpace = THREE.SRGBColorSpace;   // neškodné aj na r149
    oliverTexture.minFilter = THREE.LinearFilter;
    oliverTexture.generateMipmaps = false;
    oliverTexture.wrapS = oliverTexture.wrapT = THREE.ClampToEdgeWrapping;

    buildPlayer();
    applyTheme(0);
    setupInput();
    setupMenus();
    updateLanguage();
    setDifficulty('MEDIUM');
    setText('buildTag', BUILD_ID);
    showScreen('menuScreen');
    updateDiag();
    animate();
}

window.addEventListener('DOMContentLoaded', boot);
