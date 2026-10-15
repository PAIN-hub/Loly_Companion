/**
 * Loly Coding Companion & Pitch Black OLED Dynamic Island Controller
 * Handles fluid expanding animations, Linux-safe window resizing, and character interactions.
 */

(function (global) {
  'use strict';

  // Supported Expressions with hand poses and body movement
  const EXPRESSIONS = {
    neutral: {
      leftEyebrow: { transform: 'translate(0px, 0px) rotate(0deg)' },
      rightEyebrow: { transform: 'translate(0px, 0px) rotate(0deg)' },
      mouthD: 'M 196 220 Q 200 222 204 220',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 1,
      pupilScale: 1,
      blushOpacity: 0.6,
      headTilt: 0,
      sleeveLeft: 'rotate(0deg) translate(0px, 0px)',
      sleeveRight: 'rotate(0deg) translate(0px, 0px)',
      bodyPose: 'translate(0px, 0px) rotate(0deg)',
      activeFx: null
    },
    happy: {
      leftEyebrow: { transform: 'translate(0px, -4px) rotate(-2deg)' },
      rightEyebrow: { transform: 'translate(0px, -4px) rotate(2deg)' },
      mouthD: 'M 194 218 Q 200 228 206 218 Z',
      mouthFill: '#f43f5e',
      mouthStroke: '#be123c',
      mouthOpenOpacity: '0.9',
      eyeScaleY: 0.5,
      pupilScale: 1,
      blushOpacity: 0.95,
      headTilt: 0.8,
      sleeveLeft: 'rotate(-16deg) translate(-4px, -14px)',
      sleeveRight: 'rotate(16deg) translate(4px, -14px)',
      bodyPose: 'translate(0px, -3px) scale(1.01, 1)',
      activeFx: null
    },
    curious: {
      leftEyebrow: { transform: 'translate(-1px, -7px) rotate(-8deg)' },
      rightEyebrow: { transform: 'translate(1px, 2px) rotate(5deg)' },
      mouthD: 'M 197 220 Q 200 224 203 220 Q 200 217 197 220 Z',
      mouthFill: '#be123c',
      mouthStroke: '#9f1239',
      mouthOpenOpacity: '0.6',
      eyeScaleY: 1.05,
      pupilScale: 1.05,
      blushOpacity: 0.7,
      headTilt: 1.8,
      sleeveLeft: 'rotate(-14deg) translate(-6px, -8px)',
      sleeveRight: 'rotate(-4deg) translate(-2px, 0px)',
      bodyPose: 'rotate(0.8deg)',
      activeFx: 'curious'
    },
    thinking: {
      leftEyebrow: { transform: 'translate(0px, -3px) rotate(4deg)' },
      rightEyebrow: { transform: 'translate(0px, -4px) rotate(-4deg)' },
      mouthD: 'M 195 221 Q 198 219 201 222 Q 204 220 206 221',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.95,
      pupilScale: 0.95,
      blushOpacity: 0.5,
      headTilt: -1.6,
      sleeveLeft: 'rotate(4deg) translate(2px, 2px)',
      sleeveRight: 'rotate(-30deg) translate(-16px, -24px)',
      bodyPose: 'rotate(-1.2deg)',
      activeFx: 'thinking'
    },
    surprised: {
      leftEyebrow: { transform: 'translate(0px, -9px) rotate(0deg)' },
      rightEyebrow: { transform: 'translate(0px, -9px) rotate(0deg)' },
      mouthD: 'M 196 217 Q 200 227 204 217 Q 200 213 196 217 Z',
      mouthFill: '#4c0519',
      mouthStroke: '#be123c',
      mouthOpenOpacity: '0.8',
      eyeScaleY: 1.15,
      pupilScale: 0.8,
      blushOpacity: 0.85,
      headTilt: 0,
      sleeveLeft: 'rotate(12deg) translate(6px, -4px)',
      sleeveRight: 'rotate(-12deg) translate(-6px, -4px)',
      bodyPose: 'translate(0px, 3px) scale(0.98, 1.01)',
      activeFx: 'surprised'
    },
    sad: {
      leftEyebrow: { transform: 'translate(0px, 3px) rotate(7deg)' },
      rightEyebrow: { transform: 'translate(0px, 3px) rotate(-7deg)' },
      mouthD: 'M 196 223 Q 200 219 204 223',
      mouthFill: 'none',
      mouthStroke: '#884a41',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.85,
      pupilScale: 0.9,
      blushOpacity: 0.4,
      headTilt: -0.8,
      sleeveLeft: 'rotate(-4deg) translate(-2px, 10px)',
      sleeveRight: 'rotate(4deg) translate(2px, 10px)',
      bodyPose: 'translate(0px, 4px) scale(0.99, 0.98)',
      activeFx: null
    },
    sleepy: {
      leftEyebrow: { transform: 'translate(0px, 2px) rotate(2deg)' },
      rightEyebrow: { transform: 'translate(0px, 2px) rotate(-2deg)' },
      mouthD: 'M 197 221 Q 200 223 203 221',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.22,
      pupilScale: 0.9,
      blushOpacity: 0.75,
      headTilt: 1.2,
      sleeveLeft: 'rotate(-6deg) translate(-2px, 12px)',
      sleeveRight: 'rotate(6deg) translate(2px, 12px)',
      bodyPose: 'translate(0px, 2px) rotate(0.6deg)',
      activeFx: 'sleepy'
    },
    working: {
      leftEyebrow: { transform: 'translate(0px, -2px) rotate(6deg)' },
      rightEyebrow: { transform: 'translate(0px, -2px) rotate(-6deg)' },
      mouthD: 'M 195 220 Q 200 223 205 219',
      mouthFill: 'none',
      mouthStroke: '#a86055',
      mouthOpenOpacity: '0',
      eyeScaleY: 0.92,
      pupilScale: 1,
      blushOpacity: 0.5,
      headTilt: 0,
      sleeveLeft: 'rotate(15deg) translate(12px, -8px)',
      sleeveRight: 'rotate(-15deg) translate(-12px, -8px)',
      bodyPose: 'translate(0px, -2px)',
      activeFx: 'working'
    }
  };

  class LolyCodingIsland {
    constructor() {
      this.islandElem = null;
      this.isExpanded = false;
      this.currentExpression = 'neutral';
      this.currentActivity = 'coding';
      this.isVisible = true;

      // Mouse tracking state
      this.maxEyeOffset = { x: 6.5, y: 4.8 };
      this.currentPupilOffset = { x: 0, y: 0 };
      this.isTrackingCursor = true;

      // Blinking & Idle
      this.blinkTimer = null;

      // Bound event listeners
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseLeave = this._onMouseLeave.bind(this);
      this._onVisibilityChange = this._onVisibilityChange.bind(this);
    }

    init(options = {}) {
      this.islandElem = document.getElementById('oled-island') || document.querySelector('.oled-island');
      if (!this.islandElem) {
        console.warn('[LolyCompanion] OLED Island element not found.');
        return;
      }

      this.svg = document.getElementById('loly-svg') || this.islandElem.querySelector('svg');
      this.container = this.islandElem.querySelector('.loly-container');

      // Cache DOM references
      if (this.svg) {
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
          blushGroup: this.svg.querySelector('#loly-blush'),
          fxThinking: this.svg.querySelector('#fx-thinking'),
          fxCurious: this.svg.querySelector('#fx-curious'),
          fxSurprised: this.svg.querySelector('#fx-surprised'),
          fxSleepy: this.svg.querySelector('#fx-sleepy'),
          fxWorking: this.svg.querySelector('#fx-working')
        };
      }

      // Initial state
      if (this.container) {
        this.container.classList.add('idle-active');
      }

      // Configure initial island state (default: expanded or compact)
      const startExpanded = options.expanded !== undefined ? !!options.expanded : true;
      if (startExpanded) {
        this.expand(false);
      } else {
        this.collapse(false);
      }

      this.setActivity(options.activity || 'coding');
      this.setExpression(options.expression || 'working');

      // Bind events
      this._bindEvents();
      this._startBlinkCycle();

      console.log('[LolyCompanion] OLED Island initialized successfully.');
      return this;
    }

    _bindEvents() {
      window.addEventListener('mousemove', this._onMouseMove, { passive: true });
      document.addEventListener('mouseleave', this._onMouseLeave);
      document.addEventListener('visibilitychange', this._onVisibilityChange);

      // Pill click expands island
      const pillContent = this.islandElem.querySelector('.island-pill-content');
      if (pillContent) {
        pillContent.addEventListener('click', (e) => {
          e.stopPropagation();
          this.expand(true);
        });
      }

      // Collapse button
      const btnCollapse = this.islandElem.querySelector('#btn-collapse-island');
      if (btnCollapse) {
        btnCollapse.addEventListener('click', (e) => {
          e.stopPropagation();
          this.collapse(true);
        });
      }

      // Action Chips
      const chips = this.islandElem.querySelectorAll('.island-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const expr = chip.getAttribute('data-expr');
          if (expr === 'working') {
            this.setActivity('coding');
          } else {
            this.setActivity('idle');
            this.setExpression(expr);
          }
        });
      });

      // Window controls bridge
      const btnClose = this.islandElem.querySelector('#btn-close-window');
      if (btnClose && window.electronLoly) {
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          window.electronLoly.close();
        });
      }

      const btnMin = this.islandElem.querySelector('#btn-min-window');
      if (btnMin && window.electronLoly) {
        btnMin.addEventListener('click', (e) => {
          e.stopPropagation();
          window.electronLoly.minimize();
        });
      }

      // Mascot poke reaction
      if (this.container) {
        this.container.addEventListener('click', () => {
          this.triggerReaction('click');
        });
      }
    }

    /**
     * Expand Dynamic Island
     * Critical for Linux Electron: notifies main process to grow window bounds before content expands!
     */
    expand(notifyElectron = true) {
      this.isExpanded = true;
      if (this.islandElem) {
        this.islandElem.classList.remove('is-collapsed');
        this.islandElem.classList.add('is-expanded');
      }

      // Linux / Desktop App Window Sizing Fix
      if (notifyElectron && window.electronLoly && window.electronLoly.setIslandExpanded) {
        window.electronLoly.setIslandExpanded(true);
      }

      this._applyGazeReset();
    }

    /**
     * Collapse Dynamic Island into compact OLED Pill
     * Critical for Linux Electron: notifies main process to shrink window bounds to pill dimensions!
     */
    collapse(notifyElectron = true) {
      this.isExpanded = false;
      if (this.islandElem) {
        this.islandElem.classList.remove('is-expanded');
        this.islandElem.classList.add('is-collapsed');
      }

      // Linux / Desktop App Window Sizing Fix
      if (notifyElectron && window.electronLoly && window.electronLoly.setIslandExpanded) {
        window.electronLoly.setIslandExpanded(false);
      }
    }

    toggle() {
      if (this.isExpanded) {
        this.collapse(true);
      } else {
        this.expand(true);
      }
    }

    _onVisibilityChange() {
      if (document.hidden) {
        clearTimeout(this.blinkTimer);
      } else {
        this._startBlinkCycle();
      }
    }

    /**
     * Mouse tracking: anchored natural head pivot and smooth eye tracking
     */
    _onMouseMove(event) {
      if (!this.isVisible || !this.isTrackingCursor || !this.isExpanded || !this.container) return;

      const rect = this.container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.38;

      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 0.55;
      const factor = Math.min(distance / maxDistance, 1);

      const angle = Math.atan2(deltaY, deltaX);
      const offsetX = Math.cos(angle) * factor * this.maxEyeOffset.x;
      const offsetY = Math.sin(angle) * factor * this.maxEyeOffset.y;

      this._applyPupilPosition(offsetX, offsetY);

      // Connected, natural micro-tilt anchored at neck base
      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth * 0.35)));
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;

      if (this.dom && this.dom.head) {
        const naturalHeadTilt = normX * 1.5 + (expr.headTilt || 0);
        this.dom.head.style.transform = `rotate(${naturalHeadTilt.toFixed(2)}deg)`;
      }

      if (this.dom && this.dom.character) {
        const bodyShiftX = normX * 1.2;
        const bodySway = normX * 0.7;
        this.dom.character.style.transform = `translate(${bodyShiftX.toFixed(1)}px, 0px) rotate(${bodySway.toFixed(2)}deg)`;
      }
    }

    _onMouseLeave() {
      this._applyGazeReset();
    }

    _applyGazeReset() {
      this._applyPupilPosition(0, 0);
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
      if (this.dom && this.dom.head) {
        this.dom.head.style.transform = `rotate(${expr.headTilt || 0}deg)`;
      }
      if (this.dom && this.dom.character) {
        this.dom.character.style.transform = expr.bodyPose || 'translate(0px, 0px) rotate(0deg)';
      }
    }

    _applyPupilPosition(x, y) {
      this.currentPupilOffset = { x, y };
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
      const scale = expr.pupilScale || 1;

      const transformStr = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale})`;

      if (this.dom && this.dom.pupilLeft) {
        this.dom.pupilLeft.style.transform = transformStr;
      }
      if (this.dom && this.dom.pupilRight) {
        this.dom.pupilRight.style.transform = transformStr;
      }
    }

    /**
     * Expression Controller
     */
    setExpression(name) {
      const expr = EXPRESSIONS[name] || EXPRESSIONS.neutral;
      this.currentExpression = name in EXPRESSIONS ? name : 'neutral';

      if (!this.dom || !this.dom.eyebrowLeft) return;

      // Eyebrows
      this.dom.eyebrowLeft.style.transform = expr.leftEyebrow.transform;
      this.dom.eyebrowRight.style.transform = expr.rightEyebrow.transform;

      // Mouth
      if (this.dom.mouth) {
        this.dom.mouth.setAttribute('d', expr.mouthD);
        this.dom.mouth.setAttribute('stroke', expr.mouthStroke);
        this.dom.mouth.setAttribute('fill', expr.mouthFill);
      }
      if (this.dom.mouthOpen) {
        this.dom.mouthOpen.style.opacity = expr.mouthOpenOpacity;
      }

      // Eye height / shape
      if (this.dom.eyeLeft && this.dom.eyeRight) {
        const eyeTransform = `scaleY(${expr.eyeScaleY})`;
        this.dom.eyeLeft.style.transform = eyeTransform;
        this.dom.eyeRight.style.transform = eyeTransform;
      }

      // Hand / Sleeve poses
      if (this.dom.sleeveLeft && expr.sleeveLeft) {
        this.dom.sleeveLeft.style.transform = expr.sleeveLeft;
      }
      if (this.dom.sleeveRight && expr.sleeveRight) {
        this.dom.sleeveRight.style.transform = expr.sleeveRight;
      }

      // Body Posture
      if (this.dom.character && expr.bodyPose && !this.isTrackingCursor) {
        this.dom.character.style.transform = expr.bodyPose;
      }

      // Blush
      if (this.dom.blushGroup) {
        this.dom.blushGroup.style.opacity = expr.blushOpacity;
      }

      // Pupils
      this._applyPupilPosition(this.currentPupilOffset.x, this.currentPupilOffset.y);

      // Emotes
      this._hideAllFx();
      if (expr.activeFx) {
        this._showFx(expr.activeFx);
      }

      if (this.dom.head && !this.isTrackingCursor) {
        this.dom.head.style.transform = `rotate(${expr.headTilt}deg)`;
      }
    }

    _hideAllFx() {
      if (!this.dom) return;
      const fxList = [
        this.dom.fxThinking,
        this.dom.fxCurious,
        this.dom.fxSurprised,
        this.dom.fxSleepy,
        this.dom.fxWorking
      ];
      fxList.forEach(fx => {
        if (fx) {
          fx.style.display = 'none';
          fx.style.opacity = '0';
        }
      });
    }

    _showFx(type) {
      if (!this.dom) return;
      let target = null;
      if (type === 'thinking') target = this.dom.fxThinking;
      else if (type === 'curious') target = this.dom.fxCurious;
      else if (type === 'surprised') target = this.dom.fxSurprised;
      else if (type === 'sleepy') target = this.dom.fxSleepy;
      else if (type === 'working') target = this.dom.fxWorking;

      if (target) {
        target.style.display = 'inline';
        requestAnimationFrame(() => {
          target.style.opacity = '1';
        });
      }
    }

    setActivity(activity) {
      this.currentActivity = activity;
      if (!this.container) return;

      this.container.classList.remove('loly-coding', 'loly-success', 'loly-error');

      if (activity === 'coding') {
        this.container.classList.add('loly-coding');
        this.setExpression('working');
      } else if (activity === 'success') {
        this.container.classList.add('loly-success');
        this.setExpression('happy');
        this.triggerReaction('success');
      } else if (activity === 'error') {
        this.container.classList.add('loly-error');
        this.setExpression('surprised');
        this.triggerReaction('error');
      } else {
        this.setExpression('neutral');
      }
    }

    triggerReaction(type) {
      if (!this.container) return;

      if (type === 'click') {
        this.container.classList.remove('loly-clicked');
        void this.container.offsetWidth;
        this.container.classList.add('loly-clicked');
        const prevExpr = this.currentExpression;
        this.setExpression('happy');
        setTimeout(() => {
          this.container.classList.remove('loly-clicked');
          if (this.currentActivity === 'idle') {
            this.setExpression(prevExpr === 'happy' ? 'neutral' : prevExpr);
          }
        }, 1200);
      }
    }

    _startBlinkCycle() {
      clearTimeout(this.blinkTimer);
      if (!this.isVisible) return;

      const nextDelay = 2600 + Math.random() * 3400;
      this.blinkTimer = setTimeout(() => {
        if (this.container && this.currentExpression !== 'sleepy') {
          this.container.classList.add('loly-blinking');
          setTimeout(() => {
            if (this.container) {
              this.container.classList.remove('loly-blinking');
            }
            this._startBlinkCycle();
          }, 180);
        } else {
          this._startBlinkCycle();
        }
      }, nextDelay);
    }
  }

  // Create global instance
  const LolyCompanion = new LolyCodingIsland();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LolyCompanion;
  } else {
    global.LolyCompanion = LolyCompanion;
  }

})(typeof window !== 'undefined' ? window : this);
