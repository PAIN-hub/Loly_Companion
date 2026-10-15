/**
 * Loly — AI Agent Screen Companion & Notch Island
 * Layout matching exact Coucou hardware screenshots with automatic mascot reaction engine
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. AUTOMATIC MASCOT REACTION ENGINE (NO MANUAL BUTTONS)
  // =========================================================================

  const EXPRESSIONS = {
    neutral: {
      leftEyebrow: 'translate(0px, 0px) rotate(0deg)',
      rightEyebrow: 'translate(0px, 0px) rotate(0deg)',
      mouthD: 'M 196 220 Q 200 222 204 220',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 1,
      pupilScale: 1,
      headTilt: 0,
      sleeveLeft: 'rotate(0deg) translate(0px, 0px)',
      sleeveRight: 'rotate(0deg) translate(0px, 0px)',
      bodyPose: 'translate(0px, 0px) rotate(0deg)',
      activeFx: null
    },
    happy: {
      leftEyebrow: 'translate(0px, -4px) rotate(-2deg)',
      rightEyebrow: 'translate(0px, -4px) rotate(2deg)',
      mouthD: 'M 194 218 Q 200 228 206 218 Z',
      mouthFill: '#f43f5e',
      mouthStroke: '#be123c',
      mouthOpenOpacity: '0.9',
      eyeScaleY: 0.52,
      pupilScale: 1,
      headTilt: 1.2,
      sleeveLeft: 'rotate(-16deg) translate(-4px, -14px)',
      sleeveRight: 'rotate(16deg) translate(4px, -14px)',
      bodyPose: 'translate(0px, -3px) scale(1.02, 1)',
      activeFx: null
    },
    curious: {
      leftEyebrow: 'translate(-1px, -7px) rotate(-8deg)',
      rightEyebrow: 'translate(1px, 2px) rotate(5deg)',
      mouthD: 'M 197 220 Q 200 224 203 220 Q 200 217 197 220 Z',
      mouthFill: '#be123c',
      mouthStroke: '#9f1239',
      mouthOpenOpacity: '0.6',
      eyeScaleY: 1.05,
      pupilScale: 1.05,
      headTilt: 2.2,
      sleeveLeft: 'rotate(-14deg) translate(-6px, -8px)',
      sleeveRight: 'rotate(-4deg) translate(-2px, 0px)',
      bodyPose: 'rotate(1deg)',
      activeFx: 'curious'
    },
    thinking: {
      leftEyebrow: 'translate(0px, -3px) rotate(4deg)',
      rightEyebrow: 'translate(0px, -4px) rotate(-4deg)',
      mouthD: 'M 195 221 Q 198 219 201 222 Q 204 220 206 221',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.95,
      pupilScale: 0.95,
      headTilt: -2.0,
      sleeveLeft: 'rotate(4deg) translate(2px, 2px)',
      sleeveRight: 'rotate(-30deg) translate(-16px, -24px)',
      bodyPose: 'rotate(-1.4deg)',
      activeFx: 'thinking'
    },
    surprised: {
      leftEyebrow: 'translate(0px, -9px) rotate(0deg)',
      rightEyebrow: 'translate(0px, -9px) rotate(0deg)',
      mouthD: 'M 196 217 Q 200 227 204 217 Q 200 213 196 217 Z',
      mouthFill: '#4c0519',
      mouthStroke: '#be123c',
      mouthOpenOpacity: '0.8',
      eyeScaleY: 1.15,
      pupilScale: 0.82,
      headTilt: 0,
      sleeveLeft: 'rotate(12deg) translate(6px, -4px)',
      sleeveRight: 'rotate(-12deg) translate(-6px, -4px)',
      bodyPose: 'translate(0px, 3px) scale(0.98, 1.01)',
      activeFx: 'surprised'
    },
    sleepy: {
      leftEyebrow: 'translate(0px, 2px) rotate(2deg)',
      rightEyebrow: 'translate(0px, 2px) rotate(-2deg)',
      mouthD: 'M 197 221 Q 200 223 203 221',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.22,
      pupilScale: 0.9,
      headTilt: 1.4,
      sleeveLeft: 'rotate(-6deg) translate(-2px, 12px)',
      sleeveRight: 'rotate(6deg) translate(2px, 12px)',
      bodyPose: 'translate(0px, 2px) rotate(0.8deg)',
      activeFx: 'sleepy'
    },
    working: {
      leftEyebrow: 'translate(0px, -2px) rotate(6deg)',
      rightEyebrow: 'translate(0px, -2px) rotate(-6deg)',
      mouthD: 'M 195 220 Q 200 223 205 219',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.92,
      pupilScale: 1,
      headTilt: 0,
      sleeveLeft: 'rotate(15deg) translate(12px, -8px)',
      sleeveRight: 'rotate(-15deg) translate(-12px, -8px)',
      bodyPose: 'translate(0px, -2px)',
      activeFx: 'working'
    }
  };

  class LolyAutoMascot {
    constructor() {
      this.currentExpression = 'working';
      this.maxEyeOffset = { x: 5.5, y: 3.8 };
      this.blinkTimer = null;
      this.idleTimer = null;

      this._cacheDom();
      this._bindEvents();
      this._startBlinkCycle();
      this._resetIdleTimer();
      this.setExpression('working');
    }

    _cacheDom() {
      this.wrapper = document.getElementById('characterWrapper');
      this.svg = document.getElementById('loly-svg');
      if (!this.svg) return;

      this.dom = {
        character: this.svg.querySelector('#loly-character'),
        head: this.svg.querySelector('#loly-head'),
        sleeveLeft: this.svg.querySelector('#loly-sleeve-left'),
        sleeveRight: this.svg.querySelector('#loly-sleeve-right'),
        pupilLeft: this.svg.querySelector('#loly-pupil-left'),
        pupilRight: this.svg.querySelector('#loly-pupil-right'),
        eyeLeft: this.svg.querySelector('#loly-eye-left'),
        eyeRight: this.svg.querySelector('#loly-eye-right'),
        eyebrowLeft: this.svg.querySelector('#loly-eyebrow-left'),
        eyebrowRight: this.svg.querySelector('#loly-eyebrow-right'),
        mouth: this.svg.querySelector('#loly-mouth'),
        mouthOpen: this.svg.querySelector('#loly-mouth-open'),
        fxThinking: this.svg.querySelector('#fx-thinking'),
        fxCurious: this.svg.querySelector('#fx-curious'),
        fxSurprised: this.svg.querySelector('#fx-surprised'),
        fxSleepy: this.svg.querySelector('#fx-sleepy'),
        fxWorking: this.svg.querySelector('#fx-working')
      };
    }

    _bindEvents() {
      window.addEventListener('mousemove', (e) => {
        this._onMouseMove(e);
        this._resetIdleTimer();
      }, { passive: true });

      document.addEventListener('mouseleave', () => this._onMouseLeave());

      // Interactive poke reaction
      const stageBox = document.getElementById('mascotStageBox');
      if (stageBox) {
        stageBox.addEventListener('click', () => {
          this.triggerBounce();
          this.setExpression('happy');
          playChimeSound(680, 0.12);
          setTimeout(() => this.setExpression('working'), 2500);
        });
      }
    }

    _onMouseMove(event) {
      if (!this.wrapper) return;
      const rect = this.wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.38;

      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 0.5;
      const factor = Math.min(distance / maxDistance, 1);

      const angle = Math.atan2(deltaY, deltaX);
      const offsetX = Math.cos(angle) * factor * this.maxEyeOffset.x;
      const offsetY = Math.sin(angle) * factor * this.maxEyeOffset.y;

      this._applyPupilPosition(offsetX, offsetY);

      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth * 0.35)));
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;

      if (this.dom && this.dom.head) {
        const headTilt = normX * 1.5 + (expr.headTilt || 0);
        this.dom.head.style.transform = `rotate(${headTilt.toFixed(2)}deg)`;
      }

      if (this.dom && this.dom.character) {
        const bodyShiftX = normX * 1.2;
        this.dom.character.style.transform = `translate(${bodyShiftX.toFixed(1)}px, 0px)`;
      }
    }

    _onMouseLeave() {
      this._applyPupilPosition(0, 0);
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
      if (this.dom && this.dom.head) {
        this.dom.head.style.transform = `rotate(${expr.headTilt || 0}deg)`;
      }
    }

    _applyPupilPosition(x, y) {
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
      const scale = expr.pupilScale || 1;
      const transformStr = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale})`;

      if (this.dom && this.dom.pupilLeft) this.dom.pupilLeft.style.transform = transformStr;
      if (this.dom && this.dom.pupilRight) this.dom.pupilRight.style.transform = transformStr;
    }

    _startBlinkCycle() {
      clearTimeout(this.blinkTimer);
      const nextInterval = 2500 + Math.random() * 3500;
      this.blinkTimer = setTimeout(() => {
        this._executeBlink();
        this._startBlinkCycle();
      }, nextInterval);
    }

    _executeBlink() {
      if (this.currentExpression === 'sleepy') return;
      if (!this.dom || !this.dom.eyeLeft || !this.dom.eyeRight) return;

      this.dom.eyeLeft.style.transform = 'scaleY(0.08)';
      this.dom.eyeRight.style.transform = 'scaleY(0.08)';

      setTimeout(() => {
        const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
        this.dom.eyeLeft.style.transform = `scaleY(${expr.eyeScaleY})`;
        this.dom.eyeRight.style.transform = `scaleY(${expr.eyeScaleY})`;

        if (Math.random() < 0.25) {
          setTimeout(() => {
            this.dom.eyeLeft.style.transform = 'scaleY(0.08)';
            this.dom.eyeRight.style.transform = 'scaleY(0.08)';
            setTimeout(() => {
              this.dom.eyeLeft.style.transform = `scaleY(${expr.eyeScaleY})`;
              this.dom.eyeRight.style.transform = `scaleY(${expr.eyeScaleY})`;
            }, 90);
          }, 120);
        }
      }, 110);
    }

    _resetIdleTimer() {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        if (this.currentExpression === 'working') {
          this.setExpression('neutral');
        } else if (this.currentExpression === 'neutral') {
          this.setExpression('sleepy');
        }
      }, 45000); // 45s of inactivity
    }

    setExpression(name) {
      const expr = EXPRESSIONS[name] || EXPRESSIONS.neutral;
      this.currentExpression = name in EXPRESSIONS ? name : 'neutral';

      if (!this.dom || !this.dom.eyebrowLeft) return;

      this.dom.eyebrowLeft.style.transform = expr.leftEyebrow;
      this.dom.eyebrowRight.style.transform = expr.rightEyebrow;

      if (this.dom.mouth) {
        this.dom.mouth.setAttribute('d', expr.mouthD);
        this.dom.mouth.setAttribute('stroke', expr.mouthStroke);
        this.dom.mouth.setAttribute('fill', expr.mouthFill);
      }
      if (this.dom.mouthOpen) {
        this.dom.mouthOpen.style.opacity = expr.mouthOpenOpacity;
      }

      if (this.dom.eyeLeft && this.dom.eyeRight) {
        this.dom.eyeLeft.style.transform = `scaleY(${expr.eyeScaleY})`;
        this.dom.eyeRight.style.transform = `scaleY(${expr.eyeScaleY})`;
      }

      if (this.dom.sleeveLeft && expr.sleeveLeft) this.dom.sleeveLeft.style.transform = expr.sleeveLeft;
      if (this.dom.sleeveRight && expr.sleeveRight) this.dom.sleeveRight.style.transform = expr.sleeveRight;

      const allFx = [this.dom.fxThinking, this.dom.fxCurious, this.dom.fxSurprised, this.dom.fxSleepy, this.dom.fxWorking];
      allFx.forEach(fx => {
        if (fx) {
          fx.style.display = 'none';
          fx.style.opacity = '0';
        }
      });

      if (expr.activeFx) {
        let activeElem = null;
        if (expr.activeFx === 'thinking') activeElem = this.dom.fxThinking;
        if (expr.activeFx === 'curious') activeElem = this.dom.fxCurious;
        if (expr.activeFx === 'surprised') activeElem = this.dom.fxSurprised;
        if (expr.activeFx === 'sleepy') activeElem = this.dom.fxSleepy;
        if (expr.activeFx === 'working') activeElem = this.dom.fxWorking;

        if (activeElem) {
          activeElem.style.display = 'block';
          activeElem.style.opacity = '1';
        }
      }
    }

    triggerBounce() {
      if (!this.wrapper) return;
      this.wrapper.classList.remove('hopping');
      void this.wrapper.offsetWidth;
      this.wrapper.classList.add('hopping');
      setTimeout(() => this.wrapper.classList.remove('hopping'), 500);
    }

    startSpeaking() {
      if (this.speakingInterval) return;
      if (this.dom.fxThinking) this.dom.fxThinking.style.display = 'none';
      let state = false;
      this.speakingInterval = setInterval(() => {
        state = !state;
        if (this.dom.mouthOpen && this.dom.mouth) {
          this.dom.mouthOpen.style.opacity = state ? '0.9' : '0.1';
          this.dom.mouth.style.opacity = state ? '0.1' : '1';
        }
      }, 150);
    }

    stopSpeaking() {
      if (this.speakingInterval) {
        clearInterval(this.speakingInterval);
        this.speakingInterval = null;
      }
      if (this.dom.mouthOpen && this.dom.mouth) {
        this.dom.mouthOpen.style.opacity = '0';
        this.dom.mouth.style.opacity = '1';
      }
    }
  }

  // =========================================================================
  // 2. INTERNAL STORAGE AUDIO DB (HOUSED IN SETTINGS)
  // =========================================================================

  class InternalAudioStorage {
    constructor() {
      this.dbName = 'LolyAudioStorage';
      this.version = 1;
      this.db = null;
    }

    async init() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, this.version);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('tracks')) {
            db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async addTrack(file) {
      if (!this.db) await this.init();
      const track = {
        name: file.name.replace(/\.[^/.]+$/, ""),
        fileName: file.name,
        type: file.type || 'audio/mpeg',
        blob: file,
        addedAt: Date.now()
      };
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        const req = store.add(track);
        req.onsuccess = () => resolve({ id: req.result, ...track });
        req.onerror = () => reject(req.error);
      });
    }

    async getAllTracks() {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('tracks', 'readonly');
        const store = tx.objectStore('tracks');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    }

    async deleteTrack(id) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }

    async clearAll() {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('tracks', 'readwrite');
        const store = tx.objectStore('tracks');
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
  }

  const AMBIENT_PRESETS = [
    { title: 'Midnight Lo-Fi', rootFreq: 196.00 },
    { title: 'Cyber Synthwave', rootFreq: 220.00 },
    { title: 'Chill Coffee Beats', rootFreq: 261.63 },
    { title: 'Rain Focus', rootFreq: 174.61 }
  ];

  class SettingsMusicPlayer {
    constructor(audioDb) {
      this.db = audioDb;
      this.audioElem = document.getElementById('internalAudioPlayer');
      this.tracks = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.volume = 0.7;
      this.currentObjectUrl = null;
      this.synthInterval = null;

      this._cacheDom();
      this._bindEvents();
      this.loadLibrary();
    }

    _cacheDom() {
      this.disc = document.getElementById('artworkDisc');
      this.mainTitle = document.getElementById('mainTrackTitle');
      this.mainArtist = document.getElementById('mainTrackArtist');
      this.progressBar = document.getElementById('musicProgressBar');
      this.currentTimeElem = document.getElementById('trackCurrentTime');
      this.durationElem = document.getElementById('trackTotalDuration');
      this.playBtn = document.getElementById('fullPlayBtn');
      this.prevBtn = document.getElementById('fullPrevBtn');
      this.nextBtn = document.getElementById('fullNextBtn');
      this.volSlider = document.getElementById('musicVolumeSlider');
      this.volText = document.getElementById('volValText');
      this.muteBtn = document.getElementById('btnMuteToggle');
      this.playlistUl = document.getElementById('playlistItems');
      this.emptyMsg = document.getElementById('emptyPlaylistMsg');
      this.fullEq = document.getElementById('fullEqualizer');
      this.pillWave = document.getElementById('pillWave');
    }

    _bindEvents() {
      if (this.playBtn) this.playBtn.addEventListener('click', () => this.togglePlay());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextTrack());
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prevTrack());

      if (this.audioElem) {
        this.audioElem.addEventListener('timeupdate', () => {
          if (!this.audioElem.duration) return;
          const pct = (this.audioElem.currentTime / this.audioElem.duration) * 100;
          if (this.progressBar) this.progressBar.value = pct;
          if (this.currentTimeElem) this.currentTimeElem.textContent = this._formatTime(this.audioElem.currentTime);
          if (this.durationElem) this.durationElem.textContent = this._formatTime(this.audioElem.duration);
        });
        this.audioElem.addEventListener('ended', () => this.nextTrack());
      }

      if (this.progressBar) {
        this.progressBar.addEventListener('input', (e) => {
          if (this.audioElem && this.audioElem.duration) {
            this.audioElem.currentTime = (e.target.value / 100) * this.audioElem.duration;
          }
        });
      }

      if (this.volSlider) {
        this.volSlider.addEventListener('input', (e) => {
          this.setVolume(parseInt(e.target.value, 10) / 100);
        });
      }

      if (this.muteBtn) {
        this.muteBtn.addEventListener('click', () => {
          this.setVolume(this.volume > 0 ? 0 : 0.7);
        });
      }

      // Pickers
      const btnFiles = document.getElementById('btnSelectFiles');
      const inputFiles = document.getElementById('internalStorageInput');
      if (btnFiles && inputFiles) {
        btnFiles.addEventListener('click', () => inputFiles.click());
        inputFiles.addEventListener('change', (e) => this._handleFilesSelected(e.target.files));
      }

      const btnFolder = document.getElementById('btnSelectFolder');
      const inputFolder = document.getElementById('internalStorageFolderInput');
      if (btnFolder && inputFolder) {
        btnFolder.addEventListener('click', () => inputFolder.click());
        inputFolder.addEventListener('change', (e) => this._handleFilesSelected(e.target.files));
      }

      const btnClear = document.getElementById('btnClearPlaylist');
      if (btnClear) {
        btnClear.addEventListener('click', async () => {
          if (confirm('Clear local audio library?')) {
            await this.db.clearAll();
            this.pause();
            await this.loadLibrary();
          }
        });
      }

      // Ambient Presets
      document.querySelectorAll('.track-chip[data-preset]').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.track-chip[data-preset]').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const idx = parseInt(chip.getAttribute('data-preset'), 10);
          this.playAmbientPreset(idx);
        });
      });
    }

    _formatTime(sec) {
      if (isNaN(sec) || sec < 0) return '00:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, val));
      if (this.audioElem) this.audioElem.volume = this.volume;
      if (this.volSlider) this.volSlider.value = Math.round(this.volume * 100);
      if (this.volText) this.volText.textContent = `${Math.round(this.volume * 100)}%`;
    }

    async _handleFilesSelected(files) {
      if (!files || !files.length) return;
      for (const file of files) {
        if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
          await this.db.addTrack(file);
        }
      }
      await this.loadLibrary();
      if (!this.isPlaying && this.tracks.length) {
        this.playTrack(0);
      }
    }

    async loadLibrary() {
      this.tracks = await this.db.getAllTracks();
      if (this.emptyMsg) {
        this.emptyMsg.style.display = this.tracks.length ? 'none' : 'block';
      }

      if (!this.playlistUl) return;
      this.playlistUl.innerHTML = '';

      this.tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = `playlist-item ${index === this.currentIndex && this.isPlaying ? 'active' : ''}`;
        li.innerHTML = `
          <span>${track.name}</span>
          <div>
            <button type="button" class="btn btn-subtle btn-play-item">▶</button>
            <button type="button" class="btn btn-subtle btn-del-item">&times;</button>
          </div>
        `;

        li.querySelector('.btn-play-item').addEventListener('click', () => this.playTrack(index));
        li.querySelector('.btn-del-item').addEventListener('click', async () => {
          await this.db.deleteTrack(track.id);
          await this.loadLibrary();
        });
        this.playlistUl.appendChild(li);
      });
    }

    playTrack(index) {
      if (!this.tracks || !this.tracks.length) return;
      this.currentIndex = (index + this.tracks.length) % this.tracks.length;
      const track = this.tracks[this.currentIndex];

      clearInterval(this.synthInterval);
      if (this.currentObjectUrl) URL.revokeObjectURL(this.currentObjectUrl);

      this.currentObjectUrl = URL.createObjectURL(track.blob);
      this.audioElem.src = this.currentObjectUrl;
      this.audioElem.volume = this.volume;

      this.audioElem.play().then(() => {
        this.isPlaying = true;
        this._updateUiActive(track.name, 'Internal Storage Audio');
      }).catch(() => {});
    }

    playAmbientPreset(idx) {
      const preset = AMBIENT_PRESETS[idx] || AMBIENT_PRESETS[0];
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (this.audioElem) this.audioElem.pause();
      this.isPlaying = true;
      this._updateUiActive(preset.title, 'Ambient Focus Synthesizer');

      clearInterval(this.synthInterval);
      const chord = () => {
        if (!this.isPlaying) return;
        const root = preset.rootFreq;
        [root, root * 1.25, root * 1.5, root * 1.875].forEach(f => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.05 * this.volume, ctx.currentTime + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 5.0);
        });
      };
      chord();
      this.synthInterval = setInterval(chord, 5000);
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        if (this.tracks && this.tracks.length) {
          this.playTrack(this.currentIndex);
        } else {
          this.playAmbientPreset(0);
        }
      }
    }

    pause() {
      this.isPlaying = false;
      clearInterval(this.synthInterval);
      if (this.audioElem) this.audioElem.pause();
      if (this.playBtn) this.playBtn.textContent = '▶';
      if (this.disc) this.disc.classList.remove('spinning');
      if (this.fullEq) this.fullEq.classList.remove('active');
      if (this.pillWave) this.pillWave.classList.remove('active');
    }

    nextTrack() {
      if (this.tracks && this.tracks.length) {
        this.playTrack(this.currentIndex + 1);
      } else {
        this.playAmbientPreset((this.currentIndex + 1) % AMBIENT_PRESETS.length);
      }
    }

    prevTrack() {
      if (this.tracks && this.tracks.length) {
        this.playTrack(this.currentIndex - 1);
      } else {
        this.playAmbientPreset((this.currentIndex - 1 + AMBIENT_PRESETS.length) % AMBIENT_PRESETS.length);
      }
    }

    _updateUiActive(title, artist) {
      if (title && this.mainTitle) this.mainTitle.textContent = title;
      if (artist && this.mainArtist) this.mainArtist.textContent = artist;
      if (this.playBtn) this.playBtn.textContent = '⏸';
      if (this.disc) this.disc.classList.add('spinning');
      if (this.fullEq) this.fullEq.classList.add('active');
      if (this.pillWave) this.pillWave.classList.add('active');
    }
  }

  function playChimeSound(freq = 600, duration = 0.15) {
    const soundToggle = document.getElementById('soundEffectsToggle');
    if (soundToggle && !soundToggle.checked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  // =========================================================================
  // 3. MAIN UI APP INITIALIZER
  // =========================================================================

  document.addEventListener('DOMContentLoaded', async () => {
    // Instantiate Mascot with automatic reactions
    const loly = new LolyAutoMascot();

    // Instantiate Internal Music Player
    const audioDb = new InternalAudioStorage();
    await audioDb.init();
    const musicPlayer = new SettingsMusicPlayer(audioDb);

    // Expand/Collapse Island
    const wrapper = document.getElementById('islandWrapper');
    const pill = document.getElementById('islandPill');
    const toggleBtn = document.getElementById('toggleDrawerBtn');
    const collapseBtn = document.getElementById('btnCollapseDrawer');
    let isExpanded = true; // Open expanded as requested by user

    function setExpanded(expand) {
      isExpanded = expand;
      if (isExpanded) {
        wrapper.classList.add('is-expanded');
      } else {
        wrapper.classList.remove('is-expanded');
      }

      if (window.desktopAPI && window.desktopAPI.resizeIsland) {
        window.desktopAPI.resizeIsland(isExpanded);
      } else {
        fetch('/api/resize-island', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expanded: isExpanded })
        }).catch(() => {});
      }
    }

    // Start expanded initially to match screenshot
    setExpanded(true);

    if (pill) {
      pill.addEventListener('click', (e) => {
        if (e.target.closest('.pill-controls') || e.target.closest('.pill-quick-actions')) return;
        setExpanded(true);
      });
    }

    if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); setExpanded(true); });
    if (collapseBtn) collapseBtn.addEventListener('click', () => setExpanded(false));

    // Desktop window controls
    const minBtn = document.getElementById('minimizeAppBtn');
    if (minBtn && window.desktopAPI && window.desktopAPI.minimizeApp) {
      minBtn.addEventListener('click', (e) => { e.stopPropagation(); window.desktopAPI.minimizeApp(); });
    }
    const closeBtn = document.getElementById('closeAppBtn');
    if (closeBtn && window.desktopAPI && window.desktopAPI.closeApp) {
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); window.desktopAPI.closeApp(); });
    }

    // =========================================================================
    // 4. VIEWS SWITCHER (MATCHING SCREENSHOTS 1, 2, 3)
    // =========================================================================

    const views = {
      chat: document.getElementById('viewChat'),
      drop: document.getElementById('viewDrop'),
      home: document.getElementById('viewHome')
    };

    const navBtns = {
      chat: document.getElementById('tabBtnChat'),
      home: document.getElementById('tabBtnHome'),
      drop: document.getElementById('tabBtnDrop')
    };

    function switchView(viewName) {
      Object.keys(views).forEach(key => {
        if (views[key]) views[key].classList.toggle('active', key === viewName);
      });
      Object.keys(navBtns).forEach(key => {
        if (navBtns[key]) navBtns[key].classList.toggle('active', key === viewName);
      });

      // Automatic mascot reactions on view change
      if (viewName === 'drop') {
        loly.setExpression('curious');
      } else if (viewName === 'home') {
        loly.setExpression('neutral');
      } else {
        loly.setExpression('working');
      }
    }

    if (navBtns.chat) navBtns.chat.addEventListener('click', () => switchView('chat'));
    if (navBtns.home) navBtns.home.addEventListener('click', () => switchView('home'));
    if (navBtns.drop) navBtns.drop.addEventListener('click', () => switchView('drop'));

    // =========================================================================
    // 5. DRAG AND DROP HANDLING (AUTO-SWITCH TO DROP VIEW)
    // =========================================================================

    let currentAttachedFile = null;
    const attachedFileChip = document.getElementById('attachedFileChip');
    const attachedFileName = document.getElementById('attachedFileName');
    const btnRemoveAttachment = document.getElementById('btnRemoveAttachment');
    const globalDropBox = document.getElementById('globalDropBox');
    const globalFileInput = document.getElementById('globalFileInput');

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      switchView('drop');
      if (globalDropBox) globalDropBox.classList.add('dragover');
      loly.setExpression('curious');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.clientX <= 0 || e.clientY <= 0) {
        if (globalDropBox) globalDropBox.classList.remove('dragover');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (globalDropBox) globalDropBox.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        attachFile(e.dataTransfer.files[0]);
        switchView('chat');
        loly.setExpression('happy');
        loly.triggerBounce();
        playChimeSound(750, 0.15);
      }
    });

    if (globalDropBox && globalFileInput) {
      globalDropBox.addEventListener('click', () => globalFileInput.click());
      globalFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
          attachFile(e.target.files[0]);
          switchView('chat');
          loly.setExpression('happy');
        }
      });
    }

    function attachFile(file) {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      reader.onload = () => {
        currentAttachedFile = {
          name: file.name,
          type: file.type || 'text/plain',
          content: reader.result
        };
        if (attachedFileName) attachedFileName.textContent = file.name;
        if (attachedFileChip) attachedFileChip.style.display = 'inline-flex';
      };
      if (isImg) reader.readAsDataURL(file);
      else reader.readAsText(file);
    }

    if (btnRemoveAttachment) {
      btnRemoveAttachment.addEventListener('click', () => {
        currentAttachedFile = null;
        if (attachedFileChip) attachedFileChip.style.display = 'none';
      });
    }

    // =========================================================================
    // 6. CHAT INPUT & AUTOMATIC MASCOT REACTION
    // =========================================================================

    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const chatPopup = document.getElementById('chatDialoguePopup');
    const dialogueInner = document.getElementById('dialogueInner');
    const chatHistory = [];

    if (chatInput) {
      // Automatic reaction while user types
      chatInput.addEventListener('input', () => {
        if (chatInput.value.length > 0) {
          loly.setExpression('thinking');
        }
      });

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendChat();
        }
      });
    }

    if (btnSendChat) btnSendChat.addEventListener('click', sendChat);

    async function sendChat() {
      const text = chatInput ? chatInput.value.trim() : '';
      if (!text && !currentAttachedFile) return;

      chatHistory.push({ role: 'user', content: text });
      if (chatInput) chatInput.value = '';

      loly.setExpression('thinking');

      let fileData = null;
      if (currentAttachedFile) {
        fileData = {
          name: currentAttachedFile.name,
          type: currentAttachedFile.type,
          content: currentAttachedFile.content
        };
        currentAttachedFile = null;
        if (attachedFileChip) attachedFileChip.style.display = 'none';
      }

      let fullReply = '';
      try {
        const chatModelSelect = document.getElementById('chatModelSelect');
        const model = chatModelSelect ? chatModelSelect.value : (localStorage.getItem('loly_active_model') || 'gemini-3.5-flash');

        if (chatPopup && dialogueInner) {
          chatPopup.style.display = 'block';
          dialogueInner.textContent = '...';
        }

        const res = await fetch('/api/gemini/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatHistory, model, fileData })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        loly.setExpression('happy');
        loly.startSpeaking();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        dialogueInner.textContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.chunk) {
                fullReply += parsed.chunk;
                dialogueInner.textContent = fullReply;
                chatPopup.scrollTop = chatPopup.scrollHeight;
              }
              if (parsed.done && parsed.fullReply) {
                fullReply = parsed.fullReply;
                dialogueInner.textContent = fullReply;
              }
            } catch (jsonErr) {
              if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                throw jsonErr;
              }
            }
          }
        }

        loly.stopSpeaking();
        chatHistory.push({ role: 'assistant', content: fullReply || 'Done.' });
        loly.setExpression('happy');
        loly.triggerBounce();
        playChimeSound(820, 0.2);
      } catch (err) {
        loly.stopSpeaking();
        if (chatPopup && dialogueInner) {
          chatPopup.style.display = 'block';
          dialogueInner.textContent = fullReply ? `${fullReply} [interrupted: ${err.message}]` : `Request failed: ${err.message}`;
        }
        loly.setExpression('surprised');
      }
    }

    // =========================================================================
    // CHAT MODEL SELECTOR CONTROLLER & DYNAMIC MODEL LOADING
    // =========================================================================
    const chatModelSelect = document.getElementById('chatModelSelect');
    const btnRefreshModels = document.getElementById('btnRefreshModels');

    async function loadAvailableModels(forceRefresh = false) {
      if (!chatModelSelect) return;

      const savedModel = localStorage.getItem('loly_active_model') || 'gemini-3.5-flash';

      try {
        const res = await fetch('/api/gemini/models');
        if (!res.ok) return;
        const data = await res.json();
        const models = data.models || [];
        const serverModel = data.currentModel;

        if (Array.isArray(models) && models.length > 0) {
          const currentSelected = chatModelSelect.value || savedModel || serverModel || 'gemini-3.5-flash';
          chatModelSelect.innerHTML = '';

          models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name || m.displayName || m.id;
            if (m.id === currentSelected) {
              opt.selected = true;
            }
            chatModelSelect.appendChild(opt);
          });

          // Ensure selection is valid
          if (!chatModelSelect.value && chatModelSelect.options.length > 0) {
            chatModelSelect.selectedIndex = 0;
          }

          localStorage.setItem('loly_active_model', chatModelSelect.value);
        }
      } catch (err) {
        console.warn('Unable to load dynamic models:', err);
      }
    }

    if (chatModelSelect) {
      const cached = localStorage.getItem('loly_active_model');
      if (cached) {
        chatModelSelect.value = cached;
      }

      chatModelSelect.addEventListener('change', async () => {
        const selected = chatModelSelect.value;
        localStorage.setItem('loly_active_model', selected);
        try {
          await fetch('/api/gemini/model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: selected })
          });
        } catch (_) {}
      });
    }

    if (btnRefreshModels) {
      btnRefreshModels.addEventListener('click', async (e) => {
        e.stopPropagation();
        btnRefreshModels.style.transform = 'rotate(360deg)';
        await loadAvailableModels(true);
        setTimeout(() => { btnRefreshModels.style.transform = ''; }, 450);
      });
    }

    // Initialize models list
    loadAvailableModels();

    // =========================================================================
    // 7. INTEGRATIONS PILLS (LAUNCH TERMINAL, VS CODE, BROWSER, FILES)
    // =========================================================================

    document.querySelectorAll('.int-pill').forEach(pillBtn => {
      pillBtn.addEventListener('click', () => {
        const appName = pillBtn.getAttribute('data-app');
        if (window.desktopAPI && window.desktopAPI.launchApp) {
          window.desktopAPI.launchApp(appName);
        } else {
          fetch('/api/launch-app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName })
          }).catch(() => {});
        }
        loly.setExpression('happy');
        playChimeSound(700, 0.1);
      });
    });

    // =========================================================================
    // 8. SETTINGS MODAL OVERLAY CONTROLLER
    // =========================================================================

    const settingsOverlay = document.getElementById('settingsOverlay');
    const btnSettingsToggle = document.getElementById('btnSettingsToggle');
    const linkOpenSettings = document.getElementById('linkOpenSettings');
    const btnCloseSettings = document.getElementById('btnCloseSettings');

    function openSettings() {
      loly.setExpression('curious');
      loly.triggerBounce();
      playChimeSound(700, 0.1);

      if (window.desktopAPI && window.desktopAPI.openSettingsWindow) {
        window.desktopAPI.openSettingsWindow();
      } else {
        const w = 840;
        const h = 660;
        const left = Math.round((screen.width - w) / 2);
        const top = Math.max(40, Math.round((screen.height - h) / 2));
        const settingsWin = window.open(
          '/settings.html',
          'LolySettingsWindow',
          `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes,menubar=no,toolbar=no`
        );
        if (settingsWin) {
          settingsWin.focus();
        } else if (settingsOverlay) {
          // Fallback if browser popups blocked
          settingsOverlay.style.display = 'flex';
        }
      }
    }

    function closeSettings() {
      if (settingsOverlay) settingsOverlay.style.display = 'none';
      loly.setExpression('working');
    }

    if (btnSettingsToggle) btnSettingsToggle.addEventListener('click', openSettings);
    if (linkOpenSettings) linkOpenSettings.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);

    // Settings Tabs
    const setTabs = document.querySelectorAll('.set-tab');
    const setPanes = document.querySelectorAll('.set-pane');

    setTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        setTabs.forEach(t => t.classList.remove('active'));
        setPanes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-settab');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
      });
    });

    // Theme Switcher
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'dark') {
          document.body.classList.remove('white-mode');
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
          document.body.classList.add('white-mode');
        }
      });
    }

    // Audio Mute Quick Toggle in Topbar
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const soundToggle = document.getElementById('soundEffectsToggle');
    if (btnSoundToggle && soundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        soundToggle.checked = !soundToggle.checked;
        playChimeSound(600, 0.1);
      });
    }

    // Weather Fetcher
    async function fetchWeather(city = '') {
      try {
        await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      } catch (_) {}
    }
    fetchWeather();

    const btnUpdateCity = document.getElementById('btnUpdateCity');
    const cityInput = document.getElementById('cityWeatherInput');
    if (btnUpdateCity && cityInput) {
      btnUpdateCity.addEventListener('click', () => fetchWeather(cityInput.value.trim()));
    }

    // Save API key
    const btnSaveKey = document.getElementById('btnSaveKey');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const keyStatusMsg = document.getElementById('keyStatusMsg');
    if (btnSaveKey && apiKeyInput) {
      // Check if server already has key
      fetch('/api/config')
        .then(r => r.json())
        .then(cfg => {
          if (cfg.hasApiKey && cfg.maskedKey) {
            apiKeyInput.placeholder = `Active (${cfg.maskedKey})`;
          }
        })
        .catch(() => {});

      btnSaveKey.addEventListener('click', async () => {
        const keyVal = apiKeyInput.value.trim();
        if (!keyVal) return;
        try {
          const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: keyVal })
          });
          if (res.ok && keyStatusMsg) {
            localStorage.setItem('loly_gemini_api_key', keyVal);
            keyStatusMsg.textContent = 'Key saved successfully!';
            setTimeout(() => keyStatusMsg.textContent = '', 3000);
            loadAvailableModels(true);
          }
        } catch (_) {}
      });
    }

    // =========================================================================
    // 9. AUTOMATIC SSE AGENT STREAM & SLIDE APPROVALS
    // =========================================================================

    const agentNameLabel = document.getElementById('agentNameLabel');
    const pillAgentName = document.getElementById('pillAgentName');
    const pillStatusBadge = document.getElementById('pillStatusBadge');
    const tickerText = document.getElementById('tickerText');
    const homeAgentName = document.getElementById('homeAgentName');
    const homeStatusLabel = document.getElementById('homeStatusLabel');
    const approvalSlideBar = document.getElementById('approvalSlideBar');
    const approvalCmdPreview = document.getElementById('approvalCmdPreview');
    const pillQuickActions = document.getElementById('pillQuickActions');

    let currentPendingApproval = null;

    function handleAgentStatus(data) {
      const name = data.name || 'agent';
      if (agentNameLabel) agentNameLabel.textContent = name;
      if (pillAgentName) pillAgentName.textContent = name;
      if (homeAgentName) homeAgentName.textContent = name;

      const status = data.status || 'idle';
      if (pillStatusBadge) pillStatusBadge.textContent = status;
      if (homeStatusLabel) homeStatusLabel.textContent = status.toUpperCase();
      if (data.tickerText && tickerText) tickerText.textContent = data.tickerText;

      // AUTOMATIC MASCOT REACTION BASED ON AGENT STATE
      if (status === 'working') {
        loly.setExpression('working');
      } else if (status === 'waiting_approval') {
        loly.setExpression('curious');
      } else if (status === 'success') {
        loly.setExpression('happy');
        loly.triggerBounce();
        playChimeSound(880, 0.25);
      } else if (status === 'error') {
        loly.setExpression('surprised');
      } else {
        loly.setExpression('neutral');
      }
    }

    function showApproval(appr) {
      currentPendingApproval = appr;
      loly.setExpression('curious');
      playChimeSound(660, 0.2);

      if (approvalSlideBar && approvalCmdPreview) {
        approvalSlideBar.style.display = 'flex';
        approvalCmdPreview.textContent = `${appr.actionType}: ${appr.target || ''}`;
      }
      if (pillQuickActions) pillQuickActions.style.display = 'flex';
    }

    function clearApproval() {
      currentPendingApproval = null;
      if (approvalSlideBar) approvalSlideBar.style.display = 'none';
      if (pillQuickActions) pillQuickActions.style.display = 'none';
    }

    async function sendDecision(id, decision) {
      try {
        await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, decision })
        });
        clearApproval();
        loly.setExpression('happy');
        loly.triggerBounce();
      } catch (_) {}
    }

    const btnSlideAllow = document.getElementById('btnSlideAllow');
    const btnSlideDeny = document.getElementById('btnSlideDeny');
    const quickAllow = document.getElementById('quickAllowBtn');
    const quickDeny = document.getElementById('quickDenyBtn');

    if (btnSlideAllow) btnSlideAllow.addEventListener('click', () => currentPendingApproval && sendDecision(currentPendingApproval.id, 'allow'));
    if (btnSlideDeny) btnSlideDeny.addEventListener('click', () => currentPendingApproval && sendDecision(currentPendingApproval.id, 'deny'));
    if (quickAllow) quickAllow.addEventListener('click', () => currentPendingApproval && sendDecision(currentPendingApproval.id, 'allow'));
    if (quickDeny) quickDeny.addEventListener('click', () => currentPendingApproval && sendDecision(currentPendingApproval.id, 'deny'));

    // Hook simulator buttons
    const simBash = document.getElementById('simBashApproval');
    if (simBash) {
      simBash.addEventListener('click', () => {
        closeSettings();
        showApproval({
          id: `sim-${Date.now()}`,
          actionType: 'bash_command',
          target: 'npm test -- --coverage'
        });
      });
    }

    const simEdit = document.getElementById('simFileEdit');
    if (simEdit) {
      simEdit.addEventListener('click', () => {
        closeSettings();
        showApproval({
          id: `sim-${Date.now()}`,
          actionType: 'file_edit',
          target: 'server.js (+18 -4)'
        });
      });
    }

    const simFinished = document.getElementById('simFinished');
    if (simFinished) {
      simFinished.addEventListener('click', () => {
        closeSettings();
        handleAgentStatus({ name: 'gemini-cli', status: 'success', tickerText: 'All tasks completed successfully!' });
      });
    }

    // Connect SSE
    function connectSse() {
      const sse = new EventSource('/api/events');
      sse.addEventListener('init', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.agent) handleAgentStatus(d.agent);
          if (Array.isArray(d.pendingApprovals) && d.pendingApprovals.length) {
            showApproval(d.pendingApprovals[0]);
          }
          if (d.stats) updateStatsDisplay(d.stats);
        } catch (_) {}
      });

      sse.addEventListener('agent_status', (e) => {
        try { handleAgentStatus(JSON.parse(e.data)); } catch (_) {}
      });

      sse.addEventListener('agent_activity', (e) => {
        try {
          const d = JSON.parse(e.data);
          loly.setExpression('working');
          if (d.stats) updateStatsDisplay(d.stats);
        } catch (_) {}
      });

      sse.addEventListener('approval_request', (e) => {
        try { showApproval(JSON.parse(e.data)); } catch (_) {}
      });

      sse.addEventListener('approval_resolved', () => clearApproval());

      sse.addEventListener('model_changed', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.model && chatModelSelect) {
            chatModelSelect.value = d.model;
            localStorage.setItem('loly_active_model', d.model);
          }
        } catch (_) {}
      });
    }
    connectSse();

    function updateStatsDisplay(stats) {
      if (!stats) return;
      const s1 = document.getElementById('statSessions');
      const s2 = document.getElementById('statEvents');
      const s3 = document.getElementById('statApprovals');
      if (s1 && stats.sessions !== undefined) s1.textContent = stats.sessions;
      if (s2 && stats.events !== undefined) s2.textContent = stats.events;
      if (s3 && stats.approvals !== undefined) s3.textContent = stats.approvals;
    }
  });

})();
