// ==================== LOKALIZÁCIA (portované zo 2D + 3D reťazce) ====================
// LANG / L() / currentLang zdieľané ako globálne const medzi <script> súbormi.
// updateLanguage() je definované v game.js (potrebuje 3D DOM); toggleLanguage ho zavolá.

let currentLang = 'sk'; // 'sk' alebo 'en'

const LANG = {
    sk: {
        title: '🌙 Snový Svet 3D 🌙',
        subtitle: 'Putuj v troch rozmeroch cez snové ríše',
        subtitleSmall: 'Od Fialovej Hmly až po Prebudenie...',
        easy: '🟢 Ľahká',
        medium: '🟡 Stredná',
        hard: '🔴 Ťažká',
        visualMode: 'Vizuál:',
        visual3d: '3D modely',
        visual2d: '2D billboardy',
        controls3d: '🎮 Šípky = pohyb · Space = skok (3×) · Ctrl = baterka',
        touchControls: '👆 Ťahaj = pohyb · Ťukni = skok · Podrž = baterka',
        controlModeLabel: 'Ovládanie dotykom:',
        ctrlSwipe: '👆 Swipe',
        ctrlDpad: '🎮 D-Pad',
        dpadJump: 'SKOK',
        dpadBeam: 'LÚČ',
        mobileMode: 'Mobilný režim',
        joystick: 'Joystick',
        devMode: 'Dev mód',
        on: 'Zap',
        off: 'Vyp',
        startBtn: 'Vstúp do Sna',
        langBtn: '🌐 English',
        gameOver: '💔 Prebudenie...',
        dreamFaded: 'Sen sa rozplynul',
        score: 'Skóre',
        retry: 'Snívaš Znova',
        winTitle: '🌟 Prebudenie! 🌟',
        winText: 'Prešiel si všetkými ríšami',
        playAgain: 'Snívaj Odznova',
        levelComplete: '✨ Snová Brána ✨',
        realmComplete: 'dokončené!',
        nextLevel: 'Ďalší Sen',
        paused: '⏸️ PAUZA',
        resume: 'Pokračovať',
        backToMenu: 'Späť do Menu',
        difficulty: 'Obtiažnosť:',
        combo: 'COMBO!',
        // HUD
        lives: 'Životy',
        realm: 'Ríša',
        energy: 'Energia',
        orbs: 'Orby',
        loading: 'Načítavam sen...',
        themes: [
            'Fialová Hmla', 'Zabudnutá Izba Hračiek', 'Čiernobiely Labyrint',
            'Potopený Chrám', 'Cukríkové Nebo', 'Tichý Les Tieňov',
            'Rozbitý Čas', 'Plyšový Svet', 'Prázdny Cirkus',
            'Hviezdy a Mesiace', 'Zabudnutý Domov', 'Prebudenie'
        ],
        bosses: { shadowKing: 'Temný Kráľ', dreamEater: 'Požierač Snov', voidWalker: 'Prázdny Pútnik' },
        // Predefinovateľné ovládanie
        controlsBtn: '⌨ Ovládanie',
        controlsTitle: '⌨ Ovládanie',
        controlsHint: 'Klikni na kláves a stlač nový. Esc zruší.',
        pressKey: 'Stlač kláves…',
        resetControls: '↺ Predvolené',
        back: 'Späť',
        lifeUp: 'ŽIVOT',
        ctrlActions: { up: 'Hore', down: 'Dole', left: 'Vľavo', right: 'Vpravo', jump: 'Skok', beam: 'Baterka', pause: 'Pauza' },
        credits: 'Ďakujem za obrázok hlavného hrdinu kamarátovi Nerovi 💙'
    },
    en: {
        title: '🌙 Dream World 3D 🌙',
        subtitle: 'Journey in three dimensions through dream realms',
        subtitleSmall: 'From Purple Mist to Awakening...',
        easy: '🟢 Easy',
        medium: '🟡 Medium',
        hard: '🔴 Hard',
        visualMode: 'Visual:',
        visual3d: '3D models',
        visual2d: '2D billboards',
        controls3d: '🎮 Arrows = move · Space = jump (3×) · Ctrl = flashlight',
        touchControls: '👆 Drag = move · Tap = jump · Hold = beam',
        controlModeLabel: 'Touch control:',
        ctrlSwipe: '👆 Swipe',
        ctrlDpad: '🎮 D-Pad',
        dpadJump: 'JUMP',
        dpadBeam: 'BEAM',
        mobileMode: 'Mobile mode',
        joystick: 'Joystick',
        devMode: 'Dev mode',
        on: 'On',
        off: 'Off',
        startBtn: 'Enter the Dream',
        langBtn: '🌐 Slovensky',
        gameOver: '💔 Awakening...',
        dreamFaded: 'The dream has faded',
        score: 'Score',
        retry: 'Dream Again',
        winTitle: '🌟 Awakening! 🌟',
        winText: 'You passed through all realms',
        playAgain: 'Dream Once More',
        levelComplete: '✨ Dream Gate ✨',
        realmComplete: 'completed!',
        nextLevel: 'Next Dream',
        paused: '⏸️ PAUSED',
        resume: 'Resume',
        backToMenu: 'Back to Menu',
        difficulty: 'Difficulty:',
        combo: 'COMBO!',
        // HUD
        lives: 'Lives',
        realm: 'Realm',
        energy: 'Energy',
        orbs: 'Orbs',
        loading: 'Loading dream...',
        themes: [
            'Purple Mist', 'Forgotten Toy Room', 'Black & White Labyrinth',
            'Sunken Temple', 'Candy Sky', 'Silent Forest of Shadows',
            'Broken Time', 'Plush World', 'Empty Circus',
            'Stars and Moons', 'Forgotten Home', 'Awakening'
        ],
        bosses: { shadowKing: 'Shadow King', dreamEater: 'Dream Eater', voidWalker: 'Void Walker' },
        // Redefinable controls
        controlsBtn: '⌨ Controls',
        controlsTitle: '⌨ Controls',
        controlsHint: 'Click a key, then press a new one. Esc cancels.',
        pressKey: 'Press a key…',
        resetControls: '↺ Defaults',
        back: 'Back',
        lifeUp: 'EXTRA LIFE',
        ctrlActions: { up: 'Up', down: 'Down', left: 'Left', right: 'Right', jump: 'Jump', beam: 'Flashlight', pause: 'Pause' },
        credits: 'Thanks to my friend Nero for the main character artwork 💙'
    }
};

function L(key) {
    return LANG[currentLang][key] || LANG['sk'][key] || key;
}

function toggleLanguage() {
    currentLang = currentLang === 'sk' ? 'en' : 'sk';
    if (typeof updateLanguage === 'function') updateLanguage();
}
