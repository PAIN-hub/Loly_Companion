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
        name: file.name ? file.name.replace(/\.[^/.]+$/, "") : (file.fileName ? file.fileName.replace(/\.[^/.]+$/, "") : 'Track'),
        fileName: file.fileName || file.name || 'track.mp3',
        type: file.type || 'audio/mpeg',
        blob: file.blob || file,
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
      if (btnFiles) {
        btnFiles.addEventListener('click', async (e) => {
          e.preventDefault();
          if (window.desktopAPI && window.desktopAPI.selectAudioFiles) {
            try {
              const files = await window.desktopAPI.selectAudioFiles();
              if (files && files.length) {
                await this._handleNativeFiles(files);
                return;
              }
            } catch (err) {
              console.warn('[Audio Player] Native file dialog error:', err);
            }
          }
          if (inputFiles) inputFiles.click();
        });
      }
      if (inputFiles) {
        inputFiles.addEventListener('change', (e) => this._handleFilesSelected(e.target.files));
      }

      const btnFolder = document.getElementById('btnSelectFolder');
      const inputFolder = document.getElementById('internalStorageFolderInput');
      if (btnFolder) {
        btnFolder.addEventListener('click', async (e) => {
          e.preventDefault();
          if (window.desktopAPI && window.desktopAPI.selectAudioFolder) {
            try {
              const files = await window.desktopAPI.selectAudioFolder();
              if (files && files.length) {
                await this._handleNativeFiles(files);
                return;
              }
            } catch (err) {
              console.warn('[Audio Player] Native folder dialog error:', err);
            }
          }
          if (inputFolder) inputFolder.click();
        });
      }
      if (inputFolder) {
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

    async _handleNativeFiles(nativeFiles) {
      if (!nativeFiles || !nativeFiles.length) return;
      for (const item of nativeFiles) {
        try {
          const dataUrl = item.base64 || item.dataUrl;
          if (!dataUrl) continue;
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          await this.db.addTrack({
            name: item.name ? item.name.replace(/\.[^/.]+$/, "") : 'Track',
            fileName: item.name,
            type: item.type || 'audio/mpeg',
            blob,
            size: item.size
          });
        } catch (err) {
          console.warn('[Audio Player] Failed adding track from base64:', item.name, err);
        }
      }
      await this.loadLibrary();
      if (!this.isPlaying && this.tracks.length) {
        this.playTrack(0);
      }
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
    // 6. CHAT BUBBLES, SPEECH BUBBLE & AUTONOMOUS CODING AGENT RUNNER
    // =========================================================================

    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const chatBubblesStream = document.getElementById('chatBubblesStream');
    const mascotSpeechBubble = document.getElementById('mascotSpeechBubble');
    const mascotSpeechText = document.getElementById('mascotSpeechText');
    const btnAgentModeToggle = document.getElementById('btnAgentModeToggle');
    const btnWorkspacePill = document.getElementById('btnWorkspacePill');
    const workspaceDirLabel = document.getElementById('workspaceDirLabel');

    let isAgentMode = true;
    let speechBubbleTimer = null;
    const chatHistory = [];

    function escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showMascotSpeech(text, durationMs = 4500) {
      if (!mascotSpeechBubble || !mascotSpeechText) return;
      if (speechBubbleTimer) clearTimeout(speechBubbleTimer);

      mascotSpeechText.textContent = text;

      const moodLabel = document.getElementById('mascotCaptionMood');
      const moodDot = document.getElementById('captionMoodDot');
      if (moodLabel) {
        const shortStatus = text.length > 28 ? `${text.slice(0, 26)}...` : text;
        moodLabel.textContent = shortStatus;
      }
      if (moodDot) {
        moodDot.classList.add('pulse');
        setTimeout(() => {
          if (moodDot) moodDot.classList.remove('pulse');
        }, 1200);
      }

      mascotSpeechBubble.classList.remove('caption-pop');
      void mascotSpeechBubble.offsetWidth;
      mascotSpeechBubble.classList.add('caption-pop');
      mascotSpeechBubble.style.display = 'block';

      speechBubbleTimer = setTimeout(() => {
        if (mascotSpeechBubble) {
          mascotSpeechBubble.style.display = 'none';
          mascotSpeechBubble.classList.remove('caption-pop');
        }
        if (moodLabel) moodLabel.textContent = 'Loly • Ready';
      }, durationMs);
    }

    function appendUserBubble(text) {
      if (!chatBubblesStream) return;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble bubble-user';
      bubble.innerHTML = `
        <div class="bubble-content">
          <div class="bubble-header-name">You</div>
          <div class="bubble-text">${escapeHtml(text)}</div>
        </div>
      `;
      chatBubblesStream.appendChild(bubble);
      chatBubblesStream.scrollTop = chatBubblesStream.scrollHeight;
    }

    function appendLolyBubble() {
      if (!chatBubblesStream) return null;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble bubble-loly';
      bubble.innerHTML = `
        <div class="bubble-avatar-mini">
          <svg viewBox="100 60 200 240" width="16" height="16"><use href="#loly-head" /></svg>
        </div>
        <div class="bubble-content">
          <div class="bubble-header-name">Loly Companion</div>
          <div class="agent-steps-list" style="display: none;"></div>
          <div class="bubble-text">Thinking...</div>
        </div>
      `;
      chatBubblesStream.appendChild(bubble);
      chatBubblesStream.scrollTop = chatBubblesStream.scrollHeight;

      const textEl = bubble.querySelector('.bubble-text');
      const stepsList = bubble.querySelector('.agent-steps-list');

      return {
        bubble,
        textEl,
        stepsList,
        setText: (txt) => {
          textEl.textContent = txt;
          chatBubblesStream.scrollTop = chatBubblesStream.scrollHeight;
        },
        addToolStep: (step) => {
          stepsList.style.display = 'flex';
          const item = document.createElement('div');
          item.className = 'tool-step-item';

          const svgIcon = {
            list_files: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
            read_file: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
            edit_file: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
            write_file: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
            run_command: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`
          }[step.tool] || `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

          const badge = document.createElement('div');
          badge.className = 'tool-step-badge';
          let summary = `${step.tool}`;
          if (step.tool === 'list_files') {
            summary += `: ${step.result?.fileCount ?? 0} files found`;
          } else if (step.tool === 'read_file') {
            summary += `: ${step.args?.filePath || ''}`;
          } else if (step.tool === 'edit_file') {
            const added = step.result?.addedLines ?? 0;
            const removed = step.result?.removedLines ?? 0;
            summary += `: ${step.args?.filePath || ''} (+${added} -${removed})`;
          } else if (step.tool === 'write_file') {
            summary += `: ${step.args?.filePath || ''}`;
          } else if (step.tool === 'run_command') {
            summary += `: ${step.args?.command || ''}`;
          }
          badge.innerHTML = `${svgIcon} <span>${escapeHtml(summary)}</span>`;
          item.appendChild(badge);

          if (step.result?.diffPreview || (step.tool === 'run_command' && step.result?.stdout)) {
            const preview = document.createElement('pre');
            preview.className = 'tool-diff-preview';
            preview.style.display = 'none';

            const codeContent = step.result.diffPreview || step.result.stdout || '';
            preview.innerHTML = codeContent.split('\n').map(line => {
              if (line.startsWith('+')) return `<span class="diff-add">${escapeHtml(line)}</span>`;
              if (line.startsWith('-')) return `<span class="diff-del">${escapeHtml(line)}</span>`;
              return escapeHtml(line);
            }).join('\n');

            badge.addEventListener('click', () => {
              preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
            });
            badge.title = 'Click to toggle diff or output details';
            item.appendChild(preview);
          }

          stepsList.appendChild(item);
          chatBubblesStream.scrollTop = chatBubblesStream.scrollHeight;
        }
      };
    }

    // Burger Menu & Floating Options Dropdown Controls
    const btnChatMenuToggle = document.getElementById('btnChatMenuToggle');
    const notchBurgerBtn = document.getElementById('notchBurgerBtn');
    const chatHeaderDropdown = document.getElementById('chatHeaderDropdown');
    const btnCloseChatDropdown = document.getElementById('btnCloseChatDropdown');
    const dropdownAgentModeToggle = document.getElementById('dropdownAgentModeToggle');
    const dropdownModelSelect = document.getElementById('dropdownModelSelect');
    const btnDropdownWorkspace = document.getElementById('btnDropdownWorkspace');
    const dropdownWorkspaceLabel = document.getElementById('dropdownWorkspaceLabel');

    function toggleChatDropdown(open) {
      if (!chatHeaderDropdown) return;
      const isOpen = open !== undefined ? open : (chatHeaderDropdown.style.display !== 'none');
      chatHeaderDropdown.style.display = isOpen ? 'none' : 'flex';
      if (dropdownAgentModeToggle) dropdownAgentModeToggle.checked = isAgentMode;
      const chatModelSelect = document.getElementById('chatModelSelect');
      if (dropdownModelSelect && chatModelSelect) dropdownModelSelect.value = chatModelSelect.value;
    }

    if (btnChatMenuToggle) {
      btnChatMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChatDropdown();
      });
    }

    if (notchBurgerBtn) {
      notchBurgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetInactivityTimer();
        if (islandWrapperEl && !islandWrapperEl.classList.contains('is-expanded')) {
          setDrawerState(true);
        }
        setTimeout(() => toggleChatDropdown(false), 200);
      });
    }

    if (btnCloseChatDropdown) {
      btnCloseChatDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChatDropdown(true);
      });
    }

    document.addEventListener('click', (e) => {
      if (chatHeaderDropdown && chatHeaderDropdown.style.display !== 'none') {
        if (!chatHeaderDropdown.contains(e.target) && e.target !== btnChatMenuToggle && !btnChatMenuToggle?.contains(e.target)) {
          chatHeaderDropdown.style.display = 'none';
        }
      }
    });

    function setAgentModeState(active) {
      isAgentMode = active;
      if (btnAgentModeToggle) btnAgentModeToggle.classList.toggle('active', isAgentMode);
      if (dropdownAgentModeToggle) dropdownAgentModeToggle.checked = isAgentMode;
      const modeText = document.getElementById('agentModeText');
      if (modeText) modeText.textContent = isAgentMode ? 'Coding Agent' : 'Chat Only';
      const agentModeMiniTag = document.getElementById('agentModeMiniTag');
      if (agentModeMiniTag) agentModeMiniTag.textContent = isAgentMode ? 'Coding Agent' : 'Chat Only';
      showMascotSpeech(isAgentMode ? 'Agent mode on! Ready to edit files.' : 'Switched to conversational chat.');
    }

    // Toggle Autonomous Coding Agent Mode
    if (btnAgentModeToggle) {
      btnAgentModeToggle.addEventListener('click', () => {
        setAgentModeState(!isAgentMode);
      });
    }

    if (dropdownAgentModeToggle) {
      dropdownAgentModeToggle.addEventListener('change', (e) => {
        setAgentModeState(e.target.checked);
      });
    }

    // Sync Dropdown Model Select
    if (dropdownModelSelect) {
      dropdownModelSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const chatModelSelect = document.getElementById('chatModelSelect');
        if (chatModelSelect) {
          chatModelSelect.value = val;
          localStorage.setItem('loly_active_model', val);
          if (val === 'chrome-builtin-only') {
            updateAiEngineBadge(true, 'Nano Local (Strict)');
          } else if (val === 'chrome-builtin-auto') {
            checkChromeBuiltinAI();
          } else {
            updateAiEngineBadge(false, 'Gemini Cloud');
          }
        }
      });
    }

    // Load active workspace directory
    async function loadWorkspaceInfo() {
      try {
        const res = await fetch('/api/agent/workspace');
        if (res.ok) {
          const data = await res.json();
          if (data.workspaceDir) {
            const parts = data.workspaceDir.split(/[\/\\]/);
            const folderName = parts[parts.length - 1] || data.workspaceDir;
            if (workspaceDirLabel) workspaceDirLabel.textContent = folderName;
            if (dropdownWorkspaceLabel) dropdownWorkspaceLabel.textContent = folderName;
            if (btnWorkspacePill) btnWorkspacePill.title = `Active workspace: ${data.workspaceDir}\nClick to change folder`;
          }
        }
      } catch (_) {}
    }
    loadWorkspaceInfo();

    async function promptChangeWorkspace() {
      const current = workspaceDirLabel ? workspaceDirLabel.textContent : '';
      const newPath = prompt('Enter absolute path to workspace folder for Loly to edit code in:', current);
      if (newPath && newPath.trim()) {
        try {
          const res = await fetch('/api/agent/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceDir: newPath.trim() })
          });
          const data = await res.json();
          if (data.workspaceDir) {
            const parts = data.workspaceDir.split(/[\/\\]/);
            const folderName = parts[parts.length - 1] || data.workspaceDir;
            if (workspaceDirLabel) workspaceDirLabel.textContent = folderName;
            if (dropdownWorkspaceLabel) dropdownWorkspaceLabel.textContent = folderName;
            showMascotSpeech(`Workspace: ${folderName}`);
          } else if (data.error) {
            alert('Failed to set workspace: ' + data.error);
          }
        } catch (err) {
          alert('Error updating workspace: ' + err.message);
        }
      }
    }

    // Click workspace pill or dropdown button to change project folder
    if (btnWorkspacePill) btnWorkspacePill.addEventListener('click', promptChangeWorkspace);
    if (btnDropdownWorkspace) btnDropdownWorkspace.addEventListener('click', promptChangeWorkspace);

    // Setup Suggestion Chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const promptText = chip.getAttribute('data-prompt');
        if (promptText && chatInput) {
          chatInput.value = promptText;
          sendChat();
        }
      });
    });

    if (chatInput) {
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

    // =========================================================================
    // CHROME BUILT-IN AI (PROMPT API / GEMINI NANO) & CLOUD GEMINI ENGINE
    // =========================================================================
    const aiEngineBadge = document.getElementById('aiEngineBadge');
    const engineDot = document.getElementById('engineDot');
    const engineLabel = document.getElementById('engineLabel');

    let chromeAiSession = null;
    let isChromeAiAvailable = false;

    async function checkChromeBuiltinAI() {
      try {
        const aiObj = window.ai || (typeof ai !== 'undefined' ? ai : null);
        if (aiObj && aiObj.languageModel) {
          // Check with short timeout so UI never freezes
          const capsPromise = aiObj.languageModel.capabilities ? aiObj.languageModel.capabilities() : Promise.resolve(null);
          const caps = await Promise.race([
            capsPromise,
            new Promise(res => setTimeout(() => res(null), 1200))
          ]).catch(() => null);

          // ONLY accept 'readily' - 'after-download' hangs indefinitely without model files
          if (caps && caps.available === 'readily') {
            isChromeAiAvailable = true;
            updateAiEngineBadge(true, 'Nano Local');
            return true;
          }
        }
        if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.availability === 'function') {
          const avail = await Promise.race([
            LanguageModel.availability(),
            new Promise(res => setTimeout(() => res(null), 1200))
          ]).catch(() => null);
          if (avail === 'available' || avail === 'readily') {
            isChromeAiAvailable = true;
            updateAiEngineBadge(true, 'Prompt API');
            return true;
          }
        }
      } catch (_) {}
      isChromeAiAvailable = false;
      updateAiEngineBadge(false, 'Gemini Cloud');
      return false;
    }

    function updateAiEngineBadge(isNano, label) {
      if (!aiEngineBadge || !engineLabel) return;
      engineLabel.textContent = label;
      if (isNano) {
        aiEngineBadge.classList.remove('cloud-mode');
        aiEngineBadge.title = 'Inference Engine: Chrome Built-in AI (Gemini Nano on-device)';
      } else {
        aiEngineBadge.classList.add('cloud-mode');
        aiEngineBadge.title = 'Inference Engine: Google Cloud Gemini API';
      }
    }

    async function getOrCreateChromeAiSession() {
      const aiObj = window.ai || (typeof ai !== 'undefined' ? ai : null);
      if (aiObj && aiObj.languageModel) {
        if (!chromeAiSession) {
          const createPromise = aiObj.languageModel.create({
            systemPrompt: 'You are Loly, a cute, smart desktop AI screen companion and software engineering buddy. Keep answers concise, clear, and direct (maximum 1-3 sentences unless asked for code). Speak warmly and accurately.'
          });
          chromeAiSession = await Promise.race([
            createPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt API initialization timed out')), 3500))
          ]);
        }
        return chromeAiSession;
      }
      return null;
    }

    checkChromeBuiltinAI();

    if (btnSendChat) btnSendChat.addEventListener('click', sendChat);

    async function sendChat() {
      const text = chatInput ? chatInput.value.trim() : '';
      if (!text && !currentAttachedFile) return;

      if (chatInput) chatInput.value = '';
      appendUserBubble(text || '[Attached File]');

      const chatModelSelect = document.getElementById('chatModelSelect');
      const model = chatModelSelect ? chatModelSelect.value : (localStorage.getItem('loly_active_model') || 'chrome-builtin-auto');

      const lolyBubble = appendLolyBubble();

      // Trigger notch chat animation during processing
      const islandPill = document.getElementById('islandPill');
      if (islandPill) islandPill.classList.add('notch-chat-active');
      const cleanupChatAnimation = () => {
        if (islandPill) islandPill.classList.remove('notch-chat-active');
      };

      // Check if this is an autonomous coding task
      const lower = text.toLowerCase();
      const isCodingTask = isAgentMode ||
        lower.includes('edit') || lower.includes('fix') || lower.includes('change') ||
        lower.includes('code') || lower.includes('file') || lower.includes('folder') ||
        lower.includes('refactor') || lower.includes('run') || lower.includes('script') ||
        lower.includes('bug') || lower.includes('scan') || lower.includes('workspace');

      if (isCodingTask && !currentAttachedFile) {
        // Run Autonomous Coding Agent across files in workspace
        loly.setExpression('working');
        showMascotSpeech('Working on your codebase...', 6000);
        loly.startSpeaking();

        try {
          const res = await fetch('/api/agent/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text, model: (model && !model.startsWith('chrome-')) ? model : 'gemini-2.5-flash', maxTurns: 10 })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Agent error ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let finalReply = '';
          const filesModifiedSet = new Set();

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
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.step && lolyBubble) {
                  lolyBubble.addToolStep(parsed.step);
                  if (parsed.step.name && (parsed.step.name === 'write_file' || parsed.step.name === 'edit_file')) {
                    if (parsed.step.args && parsed.step.args.path) filesModifiedSet.add(parsed.step.args.path);
                  }
                }
                if (parsed.done) {
                  finalReply = parsed.reply || finalReply;
                  if (parsed.toolExecutions && Array.isArray(parsed.toolExecutions)) {
                    parsed.toolExecutions.forEach(te => {
                      if (te.tool === 'write_file' || te.tool === 'edit_file') {
                        if (te.args && te.args.path) filesModifiedSet.add(te.args.path);
                      }
                    });
                  }
                }
              } catch (jsonErr) {
                if (jsonErr.message && !jsonErr.message.includes('JSON')) throw jsonErr;
              }
            }
          }

          loly.stopSpeaking();
          cleanupChatAnimation();

          const replyText = finalReply || 'Code modification complete.';
          if (lolyBubble) {
            lolyBubble.setText(replyText);

            if (filesModifiedSet.size > 0) {
              const fileList = Array.from(filesModifiedSet);
              const summaryBadge = document.createElement('div');
              summaryBadge.className = 'agent-summary-badge';
              summaryBadge.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> <span>Modified ${fileList.length} file(s): ${escapeHtml(fileList.join(', '))}</span>`;
              lolyBubble.bubble.querySelector('.bubble-content').appendChild(summaryBadge);
            }
          }

          chatHistory.push({ role: 'user', content: text });
          chatHistory.push({ role: 'assistant', content: replyText });

          loly.setExpression('happy');
          loly.triggerBounce();
          showMascotSpeech(replyText.slice(0, 100), 5000);
          playChimeSound(880, 0.25);
          return;
        } catch (agentErr) {
          loly.stopSpeaking();
          cleanupChatAnimation();
          loly.setExpression('surprised');
          if (lolyBubble) {
            lolyBubble.setText(`Agent task error: ${agentErr.message}`);
          }
          showMascotSpeech('Oops! Had an issue editing the files.');
          return;
        }
      }

      // Standard Conversational Streaming Chat
      chatHistory.push({ role: 'user', content: text });
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

      // 1. Try Chrome Built-in AI if model is chrome-builtin-auto, chrome-builtin-only, or default
      const isChromeOnly = (model === 'chrome-builtin-only');
      const isAutoChrome = (!model || model === 'chrome-builtin-auto' || isChromeOnly);
      if (isAutoChrome && !fileData) {
        const chromeAvailable = await checkChromeBuiltinAI();
        if (chromeAvailable) {
          try {
            updateAiEngineBadge(true, isChromeOnly ? 'Nano (Strict)' : 'Nano (Streaming)');
            loly.setExpression('happy');
            loly.startSpeaking();

            const session = await getOrCreateChromeAiSession();
            let fullReply = '';

            const promptPromise = (async () => {
              if (session && typeof session.promptStreaming === 'function') {
                const stream = session.promptStreaming(text);
                for await (const chunk of stream) {
                  fullReply = chunk;
                  if (lolyBubble) lolyBubble.setText(fullReply);
                }
              } else if (session && typeof session.prompt === 'function') {
                fullReply = await session.prompt(text);
                if (lolyBubble) lolyBubble.setText(fullReply);
              }
              return fullReply;
            })();

            // Fail fast (3.5s) if Chrome AI is thinking forever / hanging
            await Promise.race([
              promptPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Prompt API response timed out')), 3500))
            ]);

            if (fullReply) {
              loly.stopSpeaking();
              cleanupChatAnimation();
              chatHistory.push({ role: 'assistant', content: fullReply });
              loly.setExpression('happy');
              loly.triggerBounce();
              showMascotSpeech(fullReply.slice(0, 100), 4500);
              playChimeSound(820, 0.2);
              updateAiEngineBadge(true, 'Nano Local');
              return;
            }
          } catch (chromeErr) {
            console.warn('[Chrome Built-in AI] Failed or timed out:', chromeErr);
            chromeAiSession = null;
            if (isChromeOnly) {
              loly.stopSpeaking();
              cleanupChatAnimation();
              loly.setExpression('surprised');
              const msg = `⚡ Chrome Built-in AI error: ${chromeErr.message || 'Prompt failed'}.\n(Cloud fallback disabled for "Chrome Built-in AI Only" model).`;
              if (lolyBubble) lolyBubble.setText(msg);
              showMascotSpeech('Chrome AI error.', 3500);
              return;
            }
            isChromeAiAvailable = false;
            updateAiEngineBadge(false, 'Cloud Fallback');
          }
        } else if (isChromeOnly) {
          // If strictly Chrome Built-in AI Only was requested but not available
          loly.setExpression('surprised');
          cleanupChatAnimation();
          const errorMsg = '⚡ Chrome Built-in AI (Prompt API On-Device Only) is not available or enabled in this browser.\n\nFallback to Cloud Gemini is disabled for this model option.\n\nTo enable local Gemini Nano:\n1. Open Chrome or Chromium.\n2. Navigate to chrome://flags/#prompt-api-for-gemini-nano and set to "Enabled".\n3. Restart browser or switch model to "Chrome Built-in AI (Auto Fallback)" or a Gemini Cloud model.';
          if (lolyBubble) lolyBubble.setText(errorMsg);
          showMascotSpeech('Chrome AI not available.', 4000);
          return;
        }
      }

      // 2. Google Cloud Gemini API (Fallback or explicit cloud model)
      updateAiEngineBadge(false, 'Gemini Cloud');
      let fullReply = '';
      try {
        const res = await fetch('/api/gemini/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatHistory, model: model === 'chrome-builtin-auto' ? 'gemini-3.5-flash' : model, fileData })
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
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.chunk) {
                fullReply += parsed.chunk;
                if (lolyBubble) lolyBubble.setText(fullReply);
              }
              if (parsed.done && parsed.fullReply) {
                fullReply = parsed.fullReply;
                if (lolyBubble) lolyBubble.setText(fullReply);
              }
            } catch (jsonErr) {
              if (jsonErr.message && !jsonErr.message.includes('JSON')) throw jsonErr;
            }
          }
        }

        loly.stopSpeaking();
        cleanupChatAnimation();
        chatHistory.push({ role: 'assistant', content: fullReply || 'Done.' });
        loly.setExpression('happy');
        loly.triggerBounce();
        showMascotSpeech(fullReply.slice(0, 100), 4500);
        playChimeSound(820, 0.2);
      } catch (err) {
        loly.stopSpeaking();
        cleanupChatAnimation();
        loly.setExpression('surprised');
        if (lolyBubble) {
          lolyBubble.setText(fullReply ? `${fullReply} [interrupted: ${err.message}]` : `Error: ${err.message}`);
        }
        showMascotSpeech('Sorry, I ran into an error.');
      }
    }

    // =========================================================================
    // CHAT MODEL SELECTOR CONTROLLER & DYNAMIC MODEL LOADING
    // =========================================================================
    const chatModelSelect = document.getElementById('chatModelSelect');
    const btnRefreshModels = document.getElementById('btnRefreshModels');

    async function loadAvailableModels(forceRefresh = false) {
      if (!chatModelSelect) return;

      const savedModel = localStorage.getItem('loly_active_model') || 'chrome-builtin-auto';

      try {
        const res = await fetch('/api/gemini/models');
        if (!res.ok) return;
        const data = await res.json();
        const models = data.models || [];
        const serverModel = data.currentModel;

        const currentSelected = chatModelSelect.value || savedModel || serverModel || 'chrome-builtin-auto';
        chatModelSelect.innerHTML = '';

        // Add Chrome Built-in AI as the top choice
        const chromeOpt = document.createElement('option');
        chromeOpt.value = 'chrome-builtin-auto';
        chromeOpt.textContent = '⚡ Chrome Built-in AI (Prompt API + Cloud Fallback)';
        if (currentSelected === 'chrome-builtin-auto') chromeOpt.selected = true;
        chatModelSelect.appendChild(chromeOpt);

        if (Array.isArray(models) && models.length > 0) {
          models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name || m.displayName || m.id;
            if (m.id === currentSelected) {
              opt.selected = true;
            }
            chatModelSelect.appendChild(opt);
          });
        }

        // Ensure selection is valid
        if (!chatModelSelect.value && chatModelSelect.options.length > 0) {
          chatModelSelect.selectedIndex = 0;
        }

        localStorage.setItem('loly_active_model', chatModelSelect.value);
        if (dropdownModelSelect && chatModelSelect.value) {
          dropdownModelSelect.value = chatModelSelect.value;
        }
        updateModelBadgeFromSelect();
      } catch (err) {
        console.warn('Unable to load dynamic models:', err);
      }
    }

    function updateModelBadgeFromSelect() {
      if (!chatModelSelect) return;
      const val = chatModelSelect.value;
      if (val === 'chrome-builtin-auto') {
        if (isChromeAiAvailable) {
          updateAiEngineBadge(true, 'Nano Local');
        } else {
          updateAiEngineBadge(false, 'Cloud Fallback');
        }
      } else {
        updateAiEngineBadge(false, 'Gemini Cloud');
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
        updateModelBadgeFromSelect();
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

    // =========================================================================
    // INACTIVITY AUTO-DISAPPEAR TIMER (30s DEFAULT, CONFIGURABLE IN SETTINGS)
    // =========================================================================
    let autohideSeconds = 30; // default 30s
    let lastActivityTime = Date.now();

    function resetInactivityTimer() {
      lastActivityTime = Date.now();
      const wrapper = document.getElementById('islandWrapper');
      if (wrapper && wrapper.classList.contains('island-retracted')) {
        wrapper.classList.remove('island-retracted');
        wrapper.classList.add('island-waking');
        setTimeout(() => {
          if (wrapper) wrapper.classList.remove('island-waking');
        }, 450);
        if (window.desktopAPI && window.desktopAPI.setIslandRetracted) {
          window.desktopAPI.setIslandRetracted(false);
        }
      }
    }

    // Load timer preference from localStorage and /api/config
    const cachedTimerPref = localStorage.getItem('loly_autohide_seconds');
    if (cachedTimerPref !== null) {
      autohideSeconds = Number(cachedTimerPref);
    }
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (typeof cfg.autohideSeconds !== 'undefined') {
          autohideSeconds = Number(cfg.autohideSeconds);
        }
        if (typeof cfg.voiceWakeEnabled !== 'undefined') {
          voiceWakeEnabled = Boolean(cfg.voiceWakeEnabled);
          updateVoiceButtonState();
        }
      })
      .catch(() => {});

    // Reset on any user interactions
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    // Top screen edge proximity: wake immediately if cursor is within top 24px
    window.addEventListener('mousemove', (e) => {
      if (e.clientY <= 24) {
        resetInactivityTimer();
      }
    });

    const islandWrapperEl = document.getElementById('islandWrapper');
    if (islandWrapperEl) {
      islandWrapperEl.addEventListener('mouseenter', resetInactivityTimer);
    }

    const islandPeekHandle = document.getElementById('islandPeekHandle');
    if (islandPeekHandle) {
      islandPeekHandle.addEventListener('mouseenter', resetInactivityTimer);
      islandPeekHandle.addEventListener('click', (e) => {
        e.stopPropagation();
        resetInactivityTimer();
        if (islandWrapperEl && !islandWrapperEl.classList.contains('is-expanded')) {
          setDrawerState(true);
        }
      });
    }

    // Check inactivity every second
    setInterval(() => {
      if (autohideSeconds <= 0) return; // 'Never'
      if (!islandWrapperEl) return;
      if (typeof isAudioPlaying !== 'undefined' && isAudioPlaying) return; // keep visible while playing audio
      if (document.getElementById('quickAllowBtn') && document.getElementById('quickAllowBtn').offsetParent !== null) return; // awaiting approval

      const elapsed = Date.now() - lastActivityTime;
      if (elapsed >= autohideSeconds * 1000) {
        if (islandWrapperEl.classList.contains('is-expanded')) {
          setDrawerState(false);
        }
        if (!islandWrapperEl.classList.contains('island-retracted')) {
          islandWrapperEl.classList.add('island-retracted');
          if (window.desktopAPI && window.desktopAPI.setIslandRetracted) {
            window.desktopAPI.setIslandRetracted(true);
          }
        }
      }
    }, 1000);

    // =========================================================================
    // VOICE COMMAND ENGINE WITH WAKE WORDS ("HEY LOLY", "COUCOU LOLY")
    // =========================================================================
    let voiceWakeEnabled = localStorage.getItem('loly_voice_wake_enabled') !== 'false';
    const voiceWakeBtn = document.getElementById('voiceWakeBtn');
    let speechRecognizer = null;
    let isSpeechListening = false;
    let isAwaitingVoiceCommand = false;
    let voiceCommandTimeout = null;
    let micStream = null;
    let audioContext = null;

    function updateVoiceButtonState() {
      if (!voiceWakeBtn) return;
      if (voiceWakeEnabled && isSpeechListening) {
        voiceWakeBtn.classList.add('listening');
        voiceWakeBtn.title = 'Voice Active: Listening for "Hey Loly"';
      } else if (voiceWakeEnabled) {
        voiceWakeBtn.classList.remove('listening');
        voiceWakeBtn.title = 'Voice Wake Word Enabled: Say "Hey Loly"';
      } else {
        voiceWakeBtn.classList.remove('listening');
        voiceWakeBtn.title = 'Voice Wake Disabled (Click to activate)';
      }
    }

    // Audio energy voice activity detector as companion/fallback
    async function initVoiceActivityDetection() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      try {
        if (!micStream) {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx || audioContext) return;
        audioContext = new AudioCtx();
        const source = audioContext.createMediaStreamSource(micStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let energyTriggerCount = 0;

        const checkEnergy = () => {
          if (!voiceWakeEnabled) {
            requestAnimationFrame(checkEnergy);
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          if (avg > 24) {
            energyTriggerCount++;
            if (energyTriggerCount === 4) {
              resetInactivityTimer();
              if (islandWrapperEl && islandWrapperEl.classList.contains('island-retracted')) {
                resetInactivityTimer();
              }
            }
          } else {
            energyTriggerCount = Math.max(0, energyTriggerCount - 1);
          }
          requestAnimationFrame(checkEnergy);
        };
        requestAnimationFrame(checkEnergy);
      } catch (err) {
        console.warn('[Loly Mic] Mic energy monitor notice:', err);
      }
    }

    function initSpeechRecognition() {
      initVoiceActivityDetection();

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[Loly Voice] Web Speech API not supported in this runtime');
        return;
      }

      try {
        speechRecognizer = new SpeechRecognition();
        speechRecognizer.continuous = true;
        speechRecognizer.interimResults = false;
        speechRecognizer.lang = 'en-US';

        speechRecognizer.onstart = () => {
          isSpeechListening = true;
          updateVoiceButtonState();
        };

        speechRecognizer.onend = () => {
          isSpeechListening = false;
          updateVoiceButtonState();
          // Auto-restart continuous listening if voice wake remains enabled
          if (voiceWakeEnabled) {
            setTimeout(() => {
              try { speechRecognizer.start(); } catch (_) {}
            }, 600);
          }
        };

        speechRecognizer.onerror = (event) => {
          console.warn('[Loly Voice] Speech recognition event:', event.error);
          if (event.error === 'not-allowed') {
            voiceWakeEnabled = false;
            updateVoiceButtonState();
          } else if (voiceWakeEnabled && event.error !== 'aborted') {
            setTimeout(() => {
              try { speechRecognizer.start(); } catch (_) {}
            }, 800);
          }
        };

        speechRecognizer.onresult = (event) => {
          const results = event.results;
          const latestResult = results[results.length - 1];
          if (!latestResult || !latestResult[0]) return;

          const transcript = latestResult[0].transcript.trim().toLowerCase();
          console.log('[Loly Voice] Heard:', transcript);

          handleVoiceTranscript(transcript);
        };

        if (voiceWakeEnabled) {
          try {
            speechRecognizer.start();
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[Loly Voice] Initialization failed:', err);
      }
    }

    function handleVoiceTranscript(rawText) {
      resetInactivityTimer();

      const wakeWords = ['hey loly', 'hey loli', 'loly', 'loli', 'hi loly', 'coucou loly', 'coucou', 'wake up loly', 'wake up', 'hello loly'];
      let matchedWake = null;

      for (const w of wakeWords) {
        if (rawText.startsWith(w) || rawText.includes(w)) {
          matchedWake = w;
          break;
        }
      }

      if (matchedWake || isAwaitingVoiceCommand) {
        let command = rawText;
        if (matchedWake) {
          const idx = rawText.indexOf(matchedWake);
          command = rawText.slice(idx + matchedWake.length).trim();
          command = command.replace(/^[,.!\- ]+/, '').trim();
        }

        resetInactivityTimer();
        playChimeSound(660, 0.12);
        setTimeout(() => playChimeSound(880, 0.18), 120);
        loly.setExpression('happy');
        loly.triggerBounce();

        if (!command) {
          showMascotSpeech("Hey! I'm listening...", 3500);
          isAwaitingVoiceCommand = true;
          if (voiceCommandTimeout) clearTimeout(voiceCommandTimeout);
          voiceCommandTimeout = setTimeout(() => { isAwaitingVoiceCommand = false; }, 6000);
          return;
        }

        isAwaitingVoiceCommand = false;
        executeVoiceCommand(command);
      }
    }

    function executeVoiceCommand(cmd) {
      console.log('[Loly Voice] Executing command:', cmd);
      resetInactivityTimer();

      if (cmd.includes('settings') || cmd.includes('control center') || cmd.includes('preferences')) {
        showMascotSpeech('Opening settings window!', 3000);
        if (window.desktopAPI && window.desktopAPI.openSettingsWindow) {
          window.desktopAPI.openSettingsWindow();
        } else {
          window.open('/settings.html', 'LolySettings', 'width=980,height=720');
        }
        return;
      }
      if (cmd.includes('play music') || cmd.includes('play track') || cmd.includes('start music') || cmd.includes('resume music')) {
        showMascotSpeech('Playing music!', 3000);
        const playBtn = document.getElementById('musicPlayBtn');
        if (playBtn) playBtn.click();
        return;
      }
      if (cmd.includes('pause music') || cmd.includes('stop music')) {
        showMascotSpeech('Music paused.', 3000);
        const playBtn = document.getElementById('musicPlayBtn');
        if (playBtn) playBtn.click();
        return;
      }
      if (cmd.includes('hide') || cmd.includes('disappear') || cmd.includes('sleep') || cmd.includes('retract')) {
        showMascotSpeech('Going to sleep!', 2500);
        setTimeout(() => {
          if (islandWrapperEl) {
            setDrawerState(false);
            islandWrapperEl.classList.add('island-retracted');
          }
        }, 1000);
        return;
      }
      if (cmd.includes('expand') || cmd.includes('open island') || cmd.includes('open drawer')) {
        setDrawerState(true);
        showMascotSpeech('Expanded!', 2500);
        return;
      }
      if (cmd.includes('collapse') || cmd.includes('close island')) {
        setDrawerState(false);
        showMascotSpeech('Collapsed!', 2500);
        return;
      }
      if (cmd.includes('agent mode') || cmd.includes('coding agent')) {
        const btnAgentToggle = document.getElementById('btnAgentModeToggle');
        if (btnAgentToggle) btnAgentToggle.click();
        showMascotSpeech('Toggled agent mode!', 2500);
        return;
      }

      // Natural language question or coding command:
      // Open drawer to chat tab if collapsed, populate input, and trigger send
      setDrawerState(true);
      switchView('chat');
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = cmd;
        showMascotSpeech(`Asking: "${cmd.slice(0, 35)}..."`, 3000);
        setTimeout(() => {
          sendChat();
        }, 300);
      }
    }

    if (voiceWakeBtn) {
      voiceWakeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        voiceWakeEnabled = !voiceWakeEnabled;
        localStorage.setItem('loly_voice_wake_enabled', String(voiceWakeEnabled));
        updateVoiceButtonState();
        if (voiceWakeEnabled) {
          if (speechRecognizer && !isSpeechListening) {
            try { speechRecognizer.start(); } catch (_) {}
          }
          showMascotSpeech('Voice wake enabled! Say "Hey Loly".', 3000);
          playChimeSound(780, 0.15);
        } else {
          if (speechRecognizer && isSpeechListening) {
            try { speechRecognizer.stop(); } catch (_) {}
          }
          showMascotSpeech('Voice wake muted.', 2500);
        }
      });
    }

    initSpeechRecognition();

    // =========================================================================
    // CUSTOM HOVER INDICATOR / TOOLTIP ENGINE (REPLACES DEFAULT OS TOOLTIPS)
    // =========================================================================
    function initCustomTooltips() {
      let tooltipEl = document.getElementById('lolyCustomTooltip');
      if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'lolyCustomTooltip';
        tooltipEl.className = 'loly-custom-tooltip';
        document.body.appendChild(tooltipEl);
      }

      document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[title], [data-tooltip]');
        if (!target) return;

        if (target.hasAttribute('title')) {
          const titleVal = target.getAttribute('title');
          if (titleVal) {
            target.setAttribute('data-tooltip', titleVal);
            target.removeAttribute('title');
          }
        }

        const text = target.getAttribute('data-tooltip');
        if (!text) return;

        tooltipEl.textContent = text;
        tooltipEl.className = 'loly-custom-tooltip';

        const rect = target.getBoundingClientRect();
        const tooltipWidth = tooltipEl.offsetWidth || 80;
        const tooltipHeight = tooltipEl.offsetHeight || 24;

        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        left = Math.max(6, Math.min(window.innerWidth - tooltipWidth - 6, left));

        if (rect.bottom + tooltipHeight + 10 < window.innerHeight) {
          tooltipEl.style.top = `${rect.bottom + 6}px`;
          tooltipEl.classList.add('pos-bottom');
        } else {
          tooltipEl.style.top = `${Math.max(4, rect.top - tooltipHeight - 6)}px`;
          tooltipEl.classList.add('pos-top');
        }
        tooltipEl.style.left = `${left}px`;
        tooltipEl.classList.add('visible');
      }, true);

      document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target && tooltipEl) {
          tooltipEl.classList.remove('visible');
        }
      }, true);
    }
    initCustomTooltips();
  });

})();
