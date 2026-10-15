/**
 * Loly Desktop Companion Renderer Script
 * Connects preload window controls and companion interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Loly companion
  Loly.init({
    container: '#loly-container',
    expression: 'neutral',
    activity: 'idle'
  });

  // Window Controls via preload bridge
  const btnClose = document.getElementById('btn-close');
  const btnMinimize = document.getElementById('btn-minimize');

  if (btnClose && window.electronLoly) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      window.electronLoly.close();
    });
  }

  if (btnMinimize && window.electronLoly) {
    btnMinimize.addEventListener('click', (e) => {
      e.stopPropagation();
      window.electronLoly.minimize();
    });
  }

  // Quick Action Chips
  const actionChips = document.querySelectorAll('.action-chip');
  actionChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      actionChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const expr = chip.getAttribute('data-expr');
      if (expr === 'working') {
        Loly.setActivity('coding');
      } else {
        Loly.setActivity('idle');
        Loly.setExpression(expr);
      }
    });
  });

  // Reset to neutral on double-click
  const mascotStage = document.getElementById('mascot-stage');
  if (mascotStage) {
    mascotStage.addEventListener('dblclick', () => {
      Loly.setActivity('idle');
      Loly.setExpression('happy');
      setTimeout(() => {
        Loly.setExpression('neutral');
      }, 1500);
    });
  }
});
