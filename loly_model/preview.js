/**
 * Loly Standalone Preview Script
 * Connects UI controls to Loly companion instance
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Loly companion
  Loly.init({
    container: '#loly-container',
    expression: 'neutral',
    activity: 'idle'
  });

  // UI Element References
  const stageViewport = document.getElementById('stage-viewport');
  const characterWrapper = document.getElementById('character-wrapper');
  const sizeSlider = document.getElementById('size-slider');
  const codePreview = document.getElementById('code-preview');
  const badgeExpr = document.getElementById('badge-current-expr');
  const badgeActivity = document.getElementById('badge-current-activity');
  const badgeSize = document.getElementById('badge-current-size');
  const metricPupil = document.getElementById('metric-pupil');
  const indicatorStatus = document.getElementById('indicator-status');

  // Backdrop toggles
  const bgButtons = document.querySelectorAll('[data-backdrop]');
  bgButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      bgButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const backdrop = btn.getAttribute('data-backdrop');
      stageViewport.className = `stage-canvas backdrop-${backdrop}`;
    });
  });

  // Expression buttons
  const exprButtons = document.querySelectorAll('[data-expr]');
  exprButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      exprButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const expr = btn.getAttribute('data-expr');
      Loly.setExpression(expr);
      badgeExpr.textContent = expr;
      codePreview.textContent = `Loly.setExpression("${expr}");`;
    });
  });

  // Activity buttons
  const activityButtons = document.querySelectorAll('[data-activity]');
  activityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const act = btn.getAttribute('data-activity');
      Loly.setActivity(act);
      badgeActivity.textContent = act;
      codePreview.textContent = `Loly.setActivity("${act}");`;
    });
  });

  // Poke / Click reaction button
  const btnPoke = document.getElementById('btn-poke');
  btnPoke.addEventListener('click', () => {
    Loly.triggerReaction('click');
    codePreview.textContent = `Loly.triggerReaction("click");`;
  });

  // Size Controls
  function updateSize(widthPx) {
    const heightPx = Math.round(widthPx * 1.3);
    characterWrapper.style.width = `${widthPx}px`;
    characterWrapper.style.height = `${heightPx}px`;
    sizeSlider.value = widthPx;
    badgeSize.textContent = `${widthPx}px`;

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-size'), 10) === parseInt(widthPx, 10));
    });
  }

  sizeSlider.addEventListener('input', (e) => {
    updateSize(e.target.value);
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateSize(btn.getAttribute('data-size'));
    });
  });

  // Toggles
  const toggleTracking = document.getElementById('toggle-tracking');
  toggleTracking.addEventListener('change', (e) => {
    Loly.setCursorTracking(e.target.checked);
    indicatorStatus.textContent = e.target.checked ? 'Active • Tracking' : 'Active • Tracking Paused';
    codePreview.textContent = `Loly.setCursorTracking(${e.target.checked});`;
  });

  const toggleIdle = document.getElementById('toggle-idle');
  toggleIdle.addEventListener('change', (e) => {
    Loly.setIdleAnimation(e.target.checked);
    codePreview.textContent = `Loly.setIdleAnimation(${e.target.checked});`;
  });

  const toggleVisible = document.getElementById('toggle-visible');
  toggleVisible.addEventListener('change', (e) => {
    Loly.setVisible(e.target.checked);
    indicatorStatus.textContent = e.target.checked ? 'Active • Visible' : 'Hidden • Engine Idle';
    codePreview.textContent = `Loly.setVisible(${e.target.checked});`;
  });

  // Live Pupil Metric Observer
  window.addEventListener('mousemove', () => {
    if (Loly.currentPupilOffset) {
      const { x, y } = Loly.currentPupilOffset;
      metricPupil.textContent = `Pupils: (${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }, { passive: true });
});
