// ==================== ZVUK / HUDBA (portované zo 2D index.html, logika nezmenená) ====================
// AudioMaster, DreamMusic, Sfx — Web Audio, žiadne zvukové súbory. Globálne const zdieľané medzi <script>.

    // ==================== DREAMCORE AUDIO SYSTEM ====================
    const AudioMaster = {
        ctx: null,
        compressor: null,
        masterGain: null,
        reverb: null,
        reverbGain: null,
        limiter: null,

        init() {
            if (this.ctx) return this.ctx;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;

            this.ctx = new AudioContext();

            // Pre-gain pre úpravu úrovne pred spracovaním
            const preGain = this.ctx.createGain();
            preGain.gain.value = 0.9;

            // Master compressor - jemné nastavenia
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -15;
            this.compressor.knee.value = 15;       // Mäkké koleno
            this.compressor.ratio.value = 2.5;     // Jemný ratio
            this.compressor.attack.value = 0.01;   // Pomalší attack - menej pumpovania
            this.compressor.release.value = 0.15;

            // Master gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;

            // Reverb for dreamy sound
            this.reverbGain = this.ctx.createGain();
            this.reverbGain.gain.value = 0.35;
            this.createReverb();

            // Limiter - ochrana pred clippingom
            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -1.5;
            this.limiter.knee.value = 0;
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.001;
            this.limiter.release.value = 0.05;

            // Output gain
            const outputGain = this.ctx.createGain();
            outputGain.gain.value = 1.0;

            // Jednoduchý routing: masterGain -> preGain -> compressor -> limiter -> outputGain -> destination
            this.masterGain.connect(preGain);
            preGain.connect(this.compressor);
            this.compressor.connect(this.limiter);
            this.limiter.connect(outputGain);
            outputGain.connect(this.ctx.destination);

            return this.ctx;
        },

        createReverb() {
            const ctx = this.ctx;
            const length = ctx.sampleRate * 3;
            const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
            for (let ch = 0; ch < 2; ch++) {
                const data = impulse.getChannelData(ch);
                for (let i = 0; i < length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
                }
            }
            this.reverb = ctx.createConvolver();
            this.reverb.buffer = impulse;
            this.reverbGain.connect(this.reverb);
            this.reverb.connect(this.masterGain);
        },

        getContext() {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            return this.ctx;
        },

        getDestination() {
            return this.masterGain || this.ctx?.destination;
        },

        getReverbSend() {
            return this.reverbGain;
        }
    };

    // ==================== DREAMCORE MUSIC ENGINE ====================
    const DreamMusic = {
        isPlaying: false,
        enabled: true,
        timerID: null,
        nextNoteTime: 0,
        currentStep: 0,
        musicBus: null,
        
        // Dreamy pentatonic scales
        scales: {
            ethereal: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25], // C pentatonic
            melancholy: [220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33], // A minor pentatonic
            cosmic: [196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00, 523.25] // G mixolydian-ish
        },

        currentScale: 'ethereal',
        tempo: 65,
        
        init() {
            if (this.musicBus) return;
            const ctx = AudioMaster.getContext();
            if (!ctx) return;

            this.musicBus = ctx.createGain();
            this.musicBus.gain.value = 0.45;
            this.musicBus.connect(AudioMaster.getDestination());
            this.musicBus.connect(AudioMaster.getReverbSend());
        },

        start() {
            if (this.isPlaying || !this.enabled) return;
            this.init();
            const ctx = AudioMaster.getContext();
            if (!ctx) return;

            this.isPlaying = true;
            this.nextNoteTime = ctx.currentTime + 0.1;
            this.scheduler();
        },

        stop() {
            this.isPlaying = false;
            if (this.timerID) {
                clearTimeout(this.timerID);
                this.timerID = null;
            }
        },

        toggle() {
            this.enabled = !this.enabled;
            if (this.enabled) this.start();
            else this.stop();
            return this.enabled;
        },

        setScaleForLevel(level) {
            const scaleNames = ['ethereal', 'melancholy', 'cosmic'];
            this.currentScale = scaleNames[(level - 1) % 3];
            this.tempo = 60 + (level % 4) * 5;
        },

        scheduler() {
            if (!this.isPlaying) return;
            const ctx = AudioMaster.getContext();
            if (!ctx) return;

            while (this.nextNoteTime < ctx.currentTime + 0.2) {
                this.playStep(this.nextNoteTime);
                const secondsPerBeat = 60.0 / this.tempo;
                this.nextNoteTime += secondsPerBeat;
                this.currentStep++;
            }

            this.timerID = setTimeout(() => this.scheduler(), 50);
        },

        playStep(time) {
            const ctx = AudioMaster.getContext();
            const scale = this.scales[this.currentScale];
            const step = this.currentStep;

            // Ambient pad drone
            if (step % 16 === 0) {
                this.playPad(time, scale[0] / 2, 4);
                this.playPad(time, scale[4] / 2, 4);
            }

            // Ethereal melody - sparse and dreamy
            if (step % 4 === 0 && Math.random() > 0.3) {
                const noteIdx = Math.floor(Math.random() * scale.length);
                const octave = Math.random() > 0.5 ? 1 : 2;
                this.playMelody(time, scale[noteIdx] * octave, 0.8 + Math.random() * 0.5);
            }

            // Bass pulse on 1 and 3
            if (step % 8 === 0) {
                this.playBass(time, scale[0] / 4);
            } else if (step % 8 === 4) {
                this.playBass(time, scale[4] / 4);
            }

            // Gentle percussion
            if (step % 8 === 0) {
                this.playKick(time);
            }
            if (step % 4 === 2) {
                this.playHihat(time);
            }
        },

        playPad(time, freq, dur) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sine';
            osc2.type = 'triangle';
            osc.frequency.value = freq;
            osc2.frequency.value = freq * 1.002;

            filter.type = 'lowpass';
            filter.frequency.value = 400;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.08, time + 1);
            gain.gain.linearRampToValueAtTime(0.06, time + dur - 1);
            gain.gain.linearRampToValueAtTime(0, time + dur);

            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicBus);

            osc.start(time);
            osc.stop(time + dur);
            osc2.start(time);
            osc2.stop(time + dur);
        },

        playMelody(time, freq, dur) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, time);
            filter.frequency.exponentialRampToValueAtTime(300, time + dur);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicBus);
            gain.connect(AudioMaster.getReverbSend());

            osc.start(time);
            osc.stop(time + dur + 0.1);
        },

        playBass(time, freq) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

            osc.connect(gain);
            gain.connect(this.musicBus);

            osc.start(time);
            osc.stop(time + 1);
        },

        playKick(time) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, time);
            osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);

            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

            osc.connect(gain);
            gain.connect(this.musicBus);

            osc.start(time);
            osc.stop(time + 0.4);
        },

        playHihat(time) {
            const ctx = AudioMaster.getContext();
            const bufferSize = ctx.sampleRate * 0.05;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 8000;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.06, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicBus);

            noise.start(time);
        }
    };

    // ==================== SOUND EFFECTS ====================
    const Sfx = {
        bus: null,
        enabled: true,

        init() {
            if (this.bus) return;
            const ctx = AudioMaster.getContext();
            if (!ctx) return;

            this.bus = ctx.createGain();
            this.bus.gain.value = 0.8;
            this.bus.connect(AudioMaster.getDestination());
        },

        toggle() {
            this.enabled = !this.enabled;
            return this.enabled;
        },

        play(type) {
            if (!this.enabled) return;
            AudioMaster.init();
            this.init();

            const ctx = AudioMaster.getContext();
            if (!ctx) return;

            const t = ctx.currentTime;

            switch(type) {
                case 'jump': this.playJump(t); break;
                case 'doubleJump': this.playDoubleJump(t); break;
                case 'tripleJump': this.playTripleJump(t); break;
                case 'shoot': this.playShoot(t); break;
                case 'hit': this.playHit(t); break;
                case 'collect': this.playCollect(t); break;
                case 'enemySleep': this.playEnemySleep(t); break;
                case 'damage': this.playDamage(t); break;
                case 'levelComplete': this.playLevelComplete(t); break;
                case 'fadeWarning': this.playFadeWarning(t); break;
                case 'dash': this.playDash(t); break;
                case 'wallJump': this.playWallJump(t); break;
                case 'groundPound': this.playGroundPound(t); break;
                case 'groundPoundHit': this.playGroundPoundHit(t); break;
            }
        },

        playJump(t) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(500, t + 0.1);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            osc.connect(gain);
            gain.connect(this.bus);
            osc.start(t);
            osc.stop(t + 0.12);
        },

        playDoubleJump(t) {
            const ctx = AudioMaster.getContext();
            [400, 600].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const startT = t + i * 0.05;
                gain.gain.setValueAtTime(0.1, startT);
                gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.1);
                osc.connect(gain);
                gain.connect(this.bus);
                gain.connect(AudioMaster.getReverbSend());
                osc.start(startT);
                osc.stop(startT + 0.12);
            });
        },

        playTripleJump(t) {
            const ctx = AudioMaster.getContext();
            [500, 700, 900].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const startT = t + i * 0.04;
                gain.gain.setValueAtTime(0.08, startT);
                gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.15);
                osc.connect(gain);
                gain.connect(this.bus);
                gain.connect(AudioMaster.getReverbSend());
                osc.start(startT);
                osc.stop(startT + 0.18);
            });
        },

        playShoot(t) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(600, t);
            osc2.frequency.exponentialRampToValueAtTime(150, t + 0.15);

            const osc2Gain = ctx.createGain();
            osc2Gain.gain.value = 0.25;

            gain.gain.setValueAtTime(0.07, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.connect(gain);
            osc2.connect(osc2Gain);
            osc2Gain.connect(gain);
            gain.connect(this.bus);

            osc.start(t);
            osc.stop(t + 0.18);
            osc2.start(t);
            osc2.stop(t + 0.18);
        },

        playHit(t) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(250, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(gain);
            gain.connect(this.bus);
            osc.start(t);
            osc.stop(t + 0.15);
        },

        playCollect(t) {
            const ctx = AudioMaster.getContext();
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const startT = t + i * 0.07;
                gain.gain.setValueAtTime(0.08, startT);
                gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.2);
                osc.connect(gain);
                gain.connect(this.bus);
                gain.connect(AudioMaster.getReverbSend());
                osc.start(startT);
                osc.stop(startT + 0.25);
            });
        },

        playEnemySleep(t) {
            const ctx = AudioMaster.getContext();
            [440, 330, 220, 165].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const startT = t + i * 0.12;
                gain.gain.setValueAtTime(0.08, startT);
                gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.3);
                osc.connect(gain);
                gain.connect(this.bus);
                gain.connect(AudioMaster.getReverbSend());
                osc.start(startT);
                osc.stop(startT + 0.35);
            });
        },

        playDamage(t) {
            const ctx = AudioMaster.getContext();
            
            const bufferSize = ctx.sampleRate * 0.2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 500;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
            oscGain.gain.setValueAtTime(0.06, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.bus);

            osc.connect(oscGain);
            oscGain.connect(this.bus);

            noise.start(t);
            osc.start(t);
            osc.stop(t + 0.3);
        },

        playLevelComplete(t) {
            const ctx = AudioMaster.getContext();
            const notes = [392, 494, 587, 784, 988, 1175];
            
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                osc.type = 'sine';
                osc2.type = 'triangle';
                osc.frequency.value = freq;
                osc2.frequency.value = freq * 1.003;

                filter.type = 'lowpass';
                filter.frequency.value = 2000;

                const startT = t + i * 0.12;
                const dur = 0.4 + i * 0.1;

                gain.gain.setValueAtTime(0.06, startT);
                gain.gain.linearRampToValueAtTime(0.05, startT + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);

                const osc2Gain = ctx.createGain();
                osc2Gain.gain.value = 0.3;

                osc.connect(filter);
                osc2.connect(osc2Gain);
                osc2Gain.connect(filter);
                filter.connect(gain);
                gain.connect(this.bus);
                gain.connect(AudioMaster.getReverbSend());

                osc.start(startT);
                osc.stop(startT + dur + 0.1);
                osc2.start(startT);
                osc2.stop(startT + dur + 0.1);
            });
        },

        playFadeWarning(t) {
            const ctx = AudioMaster.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.setValueAtTime(400, t + 0.1);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            osc.connect(gain);
            gain.connect(this.bus);
            osc.start(t);
            osc.stop(t + 0.25);
        },

        // Dash - rýchly "whoosh" zvuk
        playDash(t) {
            const ctx = AudioMaster.getContext();

            // Šum pre whoosh efekt
            const bufferSize = ctx.sampleRate * 0.15;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const envelope = Math.sin((i / bufferSize) * Math.PI);
                data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1500, t);
            filter.frequency.exponentialRampToValueAtTime(800, t + 0.1);
            filter.Q.value = 2;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            // Tónová zložka
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
            oscGain.gain.setValueAtTime(0.05, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.bus);

            osc.connect(oscGain);
            oscGain.connect(this.bus);

            noise.start(t);
            osc.start(t);
            osc.stop(t + 0.15);
        },

        // Wall Jump - odrazový zvuk s echo
        playWallJump(t) {
            const ctx = AudioMaster.getContext();

            // Hlavný odrazový tón
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(gain);
            gain.connect(this.bus);
            gain.connect(AudioMaster.getReverbSend());
            osc.start(t);
            osc.stop(t + 0.15);

            // Druhý vyšší tón
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(600, t + 0.02);
            osc2.frequency.exponentialRampToValueAtTime(800, t + 0.1);
            gain2.gain.setValueAtTime(0.06, t + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc2.connect(gain2);
            gain2.connect(this.bus);
            gain2.connect(AudioMaster.getReverbSend());
            osc2.start(t + 0.02);
            osc2.stop(t + 0.15);
        },

        // Ground Pound štart - padajúci tón
        playGroundPound(t) {
            const ctx = AudioMaster.getContext();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, t);
            filter.frequency.exponentialRampToValueAtTime(300, t + 0.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bus);
            osc.start(t);
            osc.stop(t + 0.25);
        },

        // Ground Pound dopad - mohutný náraz
        playGroundPoundHit(t) {
            const ctx = AudioMaster.getContext();

            // Hlboký basový úder
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(this.bus);
            osc.start(t);
            osc.stop(t + 0.5);

            // Šum pre náraz
            const bufferSize = ctx.sampleRate * 0.2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.15, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.bus);
            noise.start(t);
        }
    };

