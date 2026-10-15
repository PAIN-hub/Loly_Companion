/**
 * Loly Desktop Companion Controller
 * Provides cursor tracking, expression morphing, idle animations, and activity states.
 */

(function (global) {
  'use strict';

  // Supported Expressions
  // Supported Expressions with hand poses, body movement, and refined head tilt
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
      // Happy cheer: hands/sleeves lifted up joyfully
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
      // Curious inquiry: one hand lightly raised, slight posture lean
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
      // Thinking pose: right sleeve raised up toward cheek/chin in classic anime ponder gesture!
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
      // Surprised recoil: hands pulled back slightly, startled posture
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
      // Sad slump: hands drooped downward, soft slump
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
      // Sleepy: completely loose and limp sleeves
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
      // Working / Dev posture: sleeves poised forward in typing position
      sleeveLeft: 'rotate(15deg) translate(12px, -8px)',
      sleeveRight: 'rotate(-15deg) translate(-12px, -8px)',
      bodyPose: 'translate(0px, -2px)',
      activeFx: 'working'
    }
  };

  class LolyCompanion {
    constructor() {
      this.container = null;
      this.svg = null;
      this.currentExpression = 'neutral';
      this.currentMood = 'neutral';
      this.currentActivity = 'idle';
      this.isVisible = true;
      this.idleAnimationEnabled = true;

      // Tracking state
      this.maxEyeOffset = { x: 7, y: 5 };
      this.maxHeadTilt = 3.5;
      this.currentPupilOffset = { x: 0, y: 0 };
      this.targetPupilOffset = { x: 0, y: 0 };
      this.isTrackingCursor = true;

      // Timers
      this.blinkTimer = null;
      this.prolongedIdleTimer = null;
      this.idleThresholdMs = 45000; // 45 seconds idle -> sleepy

      // Bound handlers for cleanup
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseLeave = this._onMouseLeave.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onVisibilityChange = this._onVisibilityChange.bind(this);
    }

    /**
     * Initialize Loly inside a container element or find existing elements
     * @param {Object} options Configuration options
     */
    init(options = {}) {
      const containerSelector = options.container || '#loly-container';
      this.container = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;

      if (!this.container) {
        console.warn('[Loly] Container not found:', containerSelector);
        return;
      }

      this.svg = this.container.querySelector('svg') || document.querySelector('#loly-svg');
      if (!this.svg) {
        console.warn('[Loly] SVG element not found.');
        return;
      }

      // Cache DOM references for fast updates
      this.dom = {
        character: this.svg.querySelector('#loly-character'),
        head: this.svg.querySelector('#loly-head'),
        sleeveLeft: this.svg.querySelector('#loly-sleeve-left'),
        sleeveRight: this.svg.querySelector('#loly-sleeve-right'),
        torso: this.svg.querySelector('#hoodie-torso'),
        pupilLeft: this.svg.querySelector('#loly-pupil-left'),
        pupilRight: this.svg.querySelector('#loly-pupil-right'),
        eyeLeft: this.svg.querySelector('#loly-eye-left'),
        eyeRight: this.svg.querySelector('#loly-eye-right'),
        eyebrowLeft: this.svg.querySelector('#loly-eyebrow-left'),
        eyebrowRight: this.svg.querySelector('#loly-eyebrow-right'),
        mouth: this.svg.querySelector('#loly-mouth'),
        mouthOpen: this.svg.querySelector('#loly-mouth-open'),
        blushGroup: this.svg.querySelector('#loly-blush'),
        emblem: this.svg.querySelector('#loly-emblem'),
        fxThinking: this.svg.querySelector('#fx-thinking'),
        fxCurious: this.svg.querySelector('#fx-curious'),
        fxSurprised: this.svg.querySelector('#fx-surprised'),
        fxSleepy: this.svg.querySelector('#fx-sleepy'),
        fxWorking: this.svg.querySelector('#fx-working')
      };

      // Set initial state
      this.container.classList.add('idle-active');
      this.setExpression(options.expression || 'neutral');
      this.setActivity(options.activity || 'idle');

      // Bind listeners
      this._bindEvents();
      this._startBlinkCycle();
      this._resetIdleTimer();

      console.log('[Loly] Initialized successfully.');
      return this;
    }

    _bindEvents() {
      window.addEventListener('mousemove', this._onMouseMove, { passive: true });
      document.addEventListener('mouseleave', this._onMouseLeave);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      
      if (this.container) {
        this.container.addEventListener('click', this._onClick);
      }
    }

    _unbindEvents() {
      window.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mouseleave', this._onMouseLeave);
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      
      if (this.container) {
        this.container.removeEventListener('click', this._onClick);
      }
    }

    _onVisibilityChange() {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    }

    /**
     * Cursor tracking handler
     */
    _onMouseMove(event) {
      if (!this.isVisible || !this.isTrackingCursor || !this.container) return;

      this._resetIdleTimer();

      const rect = this.container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.38; // Align with eye level

      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      // Smooth radius normalization
      const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 0.6;
      const factor = Math.min(distance / maxDistance, 1);

      const angle = Math.atan2(deltaY, deltaX);
      const offsetX = Math.cos(angle) * factor * this.maxEyeOffset.x;
      const offsetY = Math.sin(angle) * factor * this.maxEyeOffset.y;

      this._applyPupilPosition(offsetX, offsetY);

      // Natural, connected head and body movement (no detached funny head!)
      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth * 0.4)));
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;

      // Fixed head: anchored at neck base with natural micro-tilt only
      if (this.dom.head) {
        const naturalHeadTilt = normX * 1.6 + (expr.headTilt || 0);
        this.dom.head.style.transform = `rotate(${naturalHeadTilt.toFixed(2)}deg)`;
      }

      // Connected body sway: whole character gently accommodates gaze in unison
      if (this.dom.character) {
        const bodyShiftX = normX * 1.2;
        const bodySway = normX * 0.8;
        this.dom.character.style.transform = `translate(${bodyShiftX.toFixed(1)}px, 0px) rotate(${bodySway.toFixed(2)}deg)`;
      }
    }

    _onMouseLeave() {
      this._resetGaze();
    }

    _resetGaze() {
      this._applyPupilPosition(0, 0);
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
      if (this.dom.head) {
        this.dom.head.style.transform = `rotate(${expr.headTilt || 0}deg)`;
      }
      if (this.dom.character) {
        this.dom.character.style.transform = expr.bodyPose || 'translate(0px, 0px) rotate(0deg)';
      }
    }

    _applyPupilPosition(x, y) {
      this.currentPupilOffset = { x, y };
      const expr = EXPRESSIONS[this.currentExpression] || EXPRESSIONS.neutral;
      const scale = expr.pupilScale || 1;

      const transformStr = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale})`;

      if (this.dom.pupilLeft) {
        this.dom.pupilLeft.style.transform = transformStr;
      }
      if (this.dom.pupilRight) {
        this.dom.pupilRight.style.transform = transformStr;
      }
    }

    /**
     * Expression Controller
     * @param {string} name - neutral, happy, curious, thinking, surprised, sad, sleepy, working
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

      // Sleeves & Hand Poses alongside expression
      if (this.dom.sleeveLeft && expr.sleeveLeft) {
        this.dom.sleeveLeft.style.transform = expr.sleeveLeft;
      }
      if (this.dom.sleeveRight && expr.sleeveRight) {
        this.dom.sleeveRight.style.transform = expr.sleeveRight;
      }

      // Body Posture alongside expression
      if (this.dom.character && expr.bodyPose && !this.isTrackingCursor) {
        this.dom.character.style.transform = expr.bodyPose;
      }

      // Blush intensity
      if (this.dom.blushGroup) {
        this.dom.blushGroup.style.opacity = expr.blushOpacity;
      }

      // Pupil scale & gaze
      this._applyPupilPosition(this.currentPupilOffset.x, this.currentPupilOffset.y);

      // Emote FX visibility
      this._hideAllFx();
      if (expr.activeFx) {
        this._showFx(expr.activeFx);
      }

      // Head tilt update if not tracking
      if (this.dom.head && !this.isTrackingCursor) {
        this.dom.head.style.transform = `rotate(${expr.headTilt}deg)`;
      }

      // Dispatch event
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent('loly:expression', { detail: { expression: this.currentExpression } }));
      }
    }

    _hideAllFx() {
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

    /**
     * Mood Controller (maps moods to visual expressions)
     */
    setMood(mood) {
      this.currentMood = mood;
      const moodMap = {
        happy: 'happy',
        excited: 'happy',
        calm: 'neutral',
        curious: 'curious',
        thoughtful: 'thinking',
        bored: 'sleepy',
        tired: 'sleepy',
        focused: 'working',
        upset: 'sad'
      };
      this.setExpression(moodMap[mood] || 'neutral');
    }

    /**
     * Activity System
     * @param {string} activity - idle, coding, success, error
     */
    setActivity(activity) {
      this.currentActivity = activity;
      if (!this.container) return;

      // Remove activity CSS classes
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
        // idle
        this.setExpression('neutral');
      }
    }

    /**
     * Interactive Reactions (Click, Success, Error)
     */
    triggerReaction(type) {
      if (!this.container) return;

      if (type === 'click') {
        this.container.classList.remove('loly-clicked');
        // trigger reflow
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
      } else if (type === 'success') {
        this.container.classList.remove('loly-success');
        void this.container.offsetWidth;
        this.container.classList.add('loly-success');
        setTimeout(() => {
          this.container.classList.remove('loly-success');
          if (this.currentActivity === 'idle') {
            this.setExpression('neutral');
          }
        }, 1600);
      } else if (type === 'error') {
        this.container.classList.remove('loly-error');
        void this.container.offsetWidth;
        this.container.classList.add('loly-error');
        setTimeout(() => {
          this.container.classList.remove('loly-error');
          if (this.currentActivity === 'idle') {
            this.setExpression('neutral');
          }
        }, 1400);
      }
    }

    _onClick() {
      this.triggerReaction('click');
    }

    /**
     * Blinking system with irregular intervals
     */
    _startBlinkCycle() {
      clearTimeout(this.blinkTimer);
      if (!this.isVisible) return;

      // Random delay between 2.5s and 6.0s
      const nextDelay = 2500 + Math.random() * 3500;

      this.blinkTimer = setTimeout(() => {
        this._blink(() => {
          // 15% chance of double blink
          if (Math.random() < 0.15) {
            setTimeout(() => {
              this._blink(() => {
                this._startBlinkCycle();
              });
            }, 120);
          } else {
            this._startBlinkCycle();
          }
        });
      }, nextDelay);
    }

    _blink(callback) {
      if (!this.isVisible || this.currentExpression === 'sleepy' || !this.container) {
        if (callback) callback();
        return;
      }

      this.container.classList.add('loly-blinking');
      setTimeout(() => {
        if (this.container) {
          this.container.classList.remove('loly-blinking');
        }
        if (callback) callback();
      }, 190);
    }

    /**
     * Prolonged Idle -> Sleepy trigger
     */
    _resetIdleTimer() {
      clearTimeout(this.prolongedIdleTimer);
      if (!this.isVisible) return;

      if (this.currentExpression === 'sleepy' && this.currentActivity === 'idle') {
        this.setExpression('neutral');
      }

      this.prolongedIdleTimer = setTimeout(() => {
        if (this.currentActivity === 'idle') {
          this.setExpression('sleepy');
        }
      }, this.idleThresholdMs);
    }

    /**
     * Visibility & Performance Management
     */
    setVisible(visible) {
      this.isVisible = !!visible;
      if (this.container) {
        this.container.style.display = this.isVisible ? 'inline-flex' : 'none';
      }

      if (this.isVisible) {
        this.resume();
      } else {
        this.pause();
      }
    }

    setIdleAnimation(enabled) {
      this.idleAnimationEnabled = !!enabled;
      if (this.container) {
        if (this.idleAnimationEnabled) {
          this.container.classList.add('idle-active');
        } else {
          this.container.classList.remove('idle-active');
        }
      }
    }

    setCursorTracking(enabled) {
      this.isTrackingCursor = !!enabled;
      if (!this.isTrackingCursor) {
        this._resetGaze();
      }
    }

    pause() {
      clearTimeout(this.blinkTimer);
      clearTimeout(this.prolongedIdleTimer);
      if (this.container) {
        this.container.classList.remove('idle-active');
      }
    }

    resume() {
      if (this.idleAnimationEnabled && this.container) {
        this.container.classList.add('idle-active');
      }
      this._startBlinkCycle();
      this._resetIdleTimer();
    }

    destroy() {
      this.pause();
      this._unbindEvents();
    }
  }

  // Create global singleton instance
  const Loly = new LolyCompanion();

  // Export for browser & CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Loly;
  } else {
    global.Loly = Loly;
  }

})(typeof window !== 'undefined' ? window : this);
