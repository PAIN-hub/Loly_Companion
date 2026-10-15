// Loly Companion — Interactive Website Script
document.addEventListener('DOMContentLoaded', () => {
  // 1. Live Mascot Eye Cursor Tracking
  const leftPupil = document.getElementById('leftPupil');
  const rightPupil = document.getElementById('rightPupil');
  const mascotSvg = document.getElementById('mascotSvg');
  const mascotMouth = document.getElementById('mascotMouth');
  const mascotStatusText = document.getElementById('mascotStatusText');

  const maxRadius = 4.5; // Max pupil travel distance in SVG coordinates

  window.addEventListener('mousemove', (e) => {
    if (!mascotSvg || !leftPupil || !rightPupil) return;

    const rect = mascotSvg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) return;

    const angle = Math.atan2(deltaY, deltaX);
    const clampedRadius = Math.min(maxRadius, distance / 40);

    const pupilX = (Math.cos(angle) * clampedRadius).toFixed(2);
    const pupilY = (Math.sin(angle) * clampedRadius).toFixed(2);

    leftPupil.setAttribute('transform', `translate(${pupilX}, ${pupilY})`);
    rightPupil.setAttribute('transform', `translate(${pupilX}, ${pupilY})`);
  });

  // Mood buttons
  const moodButtons = document.querySelectorAll('.mood-btn');
  const moods = {
    idle: {
      mouth: 'M 83 115 Q 90 120 97 115',
      text: 'Loly is watching your cursor'
    },
    working: {
      mouth: 'M 83 115 L 97 115',
      text: 'Loly is monitoring agent build tasks'
    },
    alert: {
      mouth: 'M 86 114 Q 90 110 94 114',
      text: 'Permission required! Loly is waiting'
    },
    happy: {
      mouth: 'M 82 113 Q 90 124 98 113',
      text: 'All tasks completed successfully!'
    }
  };

  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      moodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mood = btn.dataset.mood;
      if (moods[mood]) {
        mascotMouth.setAttribute('d', moods[mood].mouth);
        mascotStatusText.textContent = moods[mood].text;
      }
    });
  });

  // 2. Simulator Clock
  const simClock = document.getElementById('simClock');
  function updateSimClock() {
    if (!simClock) return;
    const now = new Date();
    simClock.textContent = now.toTimeString().split(' ')[0];
  }
  setInterval(updateSimClock, 1000);
  updateSimClock();

  // 3. Simulator Agent Actions
  const simTickerText = document.getElementById('simTickerText');
  const simAgentName = document.getElementById('simAgentName');
  const simApprovalCard = document.getElementById('simApprovalCard');
  const geminiReviewBox = document.getElementById('geminiReviewBox');

  document.getElementById('simEventEdit')?.addEventListener('click', () => {
    simAgentName.textContent = 'gemini-cli';
    simTickerText.textContent = 'Editing auth.ts (+42 lines, -10 lines)';
    simApprovalCard.style.display = 'none';
  });

  document.getElementById('simEventTest')?.addEventListener('click', () => {
    simAgentName.textContent = 'claude-code';
    simTickerText.textContent = 'Running test suite: 14 passing (0 failed)';
    simApprovalCard.style.display = 'none';
  });

  document.getElementById('simEventApproval')?.addEventListener('click', () => {
    simAgentName.textContent = 'antigravity';
    simTickerText.textContent = '⚠️ Waiting for permission approval';
    simApprovalCard.style.display = 'block';
    geminiReviewBox.style.display = 'none';
  });

  document.getElementById('simEventDone')?.addEventListener('click', () => {
    simAgentName.textContent = 'loly';
    simTickerText.textContent = '🎉 All agent jobs completed successfully!';
    simApprovalCard.style.display = 'none';
    if (moodButtons[3]) moodButtons[3].click();
  });

  // In-simulator approval buttons
  document.getElementById('btnAllow')?.addEventListener('click', () => {
    simApprovalCard.style.display = 'none';
    simTickerText.textContent = '✓ Approved! Agent executing: rm -rf /dist';
  });

  document.getElementById('btnDeny')?.addEventListener('click', () => {
    simApprovalCard.style.display = 'none';
    simTickerText.textContent = '✗ Denied! Agent stopped command.';
  });

  document.getElementById('btnAskGemini')?.addEventListener('click', () => {
    geminiReviewBox.style.display = 'block';
  });

  // 4. Code Snippet Copy
  const btnCopyCode = document.getElementById('btnCopyCode');
  const codeSnippet = document.getElementById('codeSnippet');
  btnCopyCode?.addEventListener('click', async () => {
    if (!codeSnippet) return;
    try {
      await navigator.clipboard.writeText(codeSnippet.textContent);
      btnCopyCode.textContent = 'Copied!';
      setTimeout(() => {
        btnCopyCode.textContent = 'Copy';
      }, 2000);
    } catch (_) {
      btnCopyCode.textContent = 'Done!';
    }
  });

  // 5. Procedural Lo-Fi Music Synthesizer (Web Audio API)
  let audioCtx = null;
  let isPlaying = false;
  let synthTimer = null;
  const btnToggleAudio = document.getElementById('btnToggleAudio');

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, time, duration = 1.2, gainValue = 0.04) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  function startLoFiChords() {
    if (!audioCtx) return;
    // Ambient minor chords: Dm9 -> G13 -> Cmaj9 -> Am7
    const chords = [
      [293.66, 349.23, 440.0, 523.25], // Dm9
      [392.00, 493.88, 587.33, 659.25], // G13
      [261.63, 329.63, 392.0, 493.88], // Cmaj9
      [220.00, 261.63, 329.63, 392.0]  // Am7
    ];
    let step = 0;

    synthTimer = setInterval(() => {
      if (!isPlaying || !audioCtx) return;
      const now = audioCtx.currentTime;
      const chord = chords[step % chords.length];
      chord.forEach((note, idx) => {
        playTone(note, now + idx * 0.15, 2.2, 0.035);
      });
      step++;
    }, 2400);
  }

  btnToggleAudio?.addEventListener('click', () => {
    initAudio();
    if (!isPlaying) {
      isPlaying = true;
      btnToggleAudio.textContent = '⏹ Stop Lo-Fi';
      startLoFiChords();
    } else {
      isPlaying = false;
      btnToggleAudio.textContent = '▶ Play Ambient Lo-Fi';
      if (synthTimer) clearInterval(synthTimer);
    }
  });
});
