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
        controls3d: '🎮 Šípky = pohyb · Space = skok (3×) · Ctrl = lúč',
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
        credits: 'Ďakujem za obrázok hlavného hrdinu kamarátovi Nerovi 💙'
    },
    en: {
        title: '🌙 Dream World 3D 🌙',
        subtitle: 'Journey in three dimensions through dream realms',
        subtitleSmall: 'From Purple Mist to Awakening...',
        easy: '🟢 Easy',
        medium: '🟡 Medium',
        hard: '🔴 Hard',
        controls3d: '🎮 Arrows = move · Space = jump (3×) · Ctrl = beam',
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
