// ==========================================================================
// Loly Companion & Island App Logic
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const islandWrapper = document.getElementById('islandWrapper');
  const islandPill = document.getElementById('islandPill');
  const islandDrawer = document.getElementById('islandDrawer');
  const toggleDrawerBtn = document.getElementById('toggleDrawerBtn');
  const pillAgentName = document.getElementById('pillAgentName');
  const pillStatusBadge = document.getElementById('pillStatusBadge');
  const tickerText = document.getElementById('tickerText');
  const pillWave = document.getElementById('pillWave');
  const pillQuickActions = document.getElementById('pillQuickActions');
  const quickAllowBtn = document.getElementById('quickAllowBtn');
  const quickDenyBtn = document.getElementById('quickDenyBtn');
  const mascotStatusDot = document.getElementById('mascotStatusDot');
  const mascotAvatar = document.getElementById('mascotAvatar');
  const leftPupil = document.getElementById('leftPupil');
  const rightPupil = document.getElementById('rightPupil');

  // Drawer Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Pending Approval Elements
  const pendingSection = document.getElementById('pendingSection');
  const approvalTitle = document.getElementById('approvalTitle');
  const approvalAgent = document.getElementById('approvalAgent');
  const approvalType = document.getElementById('approvalType');
  const approvalTarget = document.getElementById('approvalTarget');
  const approvalDiffContainer = document.getElementById('approvalDiffContainer');
  const diffHeader = document.getElementById('diffHeader');
  const diffBody = document.getElementById('diffBody');
  const approvalOptionsContainer = document.getElementById('approvalOptionsContainer');
  const approvalOptionsList = document.getElementById('approvalOptionsList');
  const geminiReviewCard = document.getElementById('geminiReviewCard');
  const geminiReviewText = document.getElementById('geminiReviewText');
  const btnGeminiReview = document.getElementById('btnGeminiReview');
  const btnAllow = document.getElementById('btnAllow');
  const btnDeny = document.getElementById('btnDeny');
  const btnAlways = document.getElementById('btnAlways');

  // Activity Feed
  const activityFeed = document.getElementById('activityFeed');
  const eventCounter = document.getElementById('eventCounter');

  // Gemini Chat Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const btnSendChat = document.getElementById('btnSendChat');
  const fileDropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('fileInput');
  const dropLabel = document.getElementById('dropLabel');
  const attachedFilePill = document.getElementById('attachedFilePill');
  const attachedFileName = document.getElementById('attachedFileName');
  const btnClearFile = document.getElementById('btnClearFile');

  // Settings & Stats
  const apiKeyInput = document.getElementById('apiKeyInput');
  const btnSaveKey = document.getElementById('btnSaveKey');
  const keyStatusMsg = document.getElementById('keyStatusMsg');
  const modelSelect = document.getElementById('modelSelect');
  const statSessions = document.getElementById('statSessions');
  const statEvents = document.getElementById('statEvents');
  const statApprovals = document.getElementById('statApprovals');

  // Simulator Buttons
  const simBashApproval = document.getElementById('simBashApproval');
  const simFileEdit = document.getElementById('simFileEdit');
  const simQuestion = document.getElementById('simQuestion');
  const simFinished = document.getElementById('simFinished');

  // State
  let activePendingApproval = null;
  let attachedFile = null;
  let chatConversation = [];
  let totalEventCount = 0;

  // ==========================================================================
  // 1. Eye Tracking & Mascot Interactions
  // ==========================================================================
  function updateEyeTracking(clientX, clientY) {
    if (!leftPupil || !rightPupil || !mascotAvatar) return;

    const rect = mascotAvatar.getBoundingClientRect();
    const avatarCenterX = rect.left + rect.width / 2;
    const avatarCenterY = rect.top + rect.height / 2;

    const deltaX = clientX - avatarCenterX;
    const deltaY = clientY - avatarCenterY;
    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.min(Math.hypot(deltaX, deltaY), 300);

    const maxEyeRadius = 2.4;
    const pupilShift = (distance / 300) * maxEyeRadius;

    const offsetX = Math.cos(angle) * pupilShift;
    const offsetY = Math.sin(angle) * pupilShift;

    leftPupil.setAttribute('transform', `translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`);
    rightPupil.setAttribute('transform', `translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`);
  }

  window.addEventListener('mousemove', (e) => {
    updateEyeTracking(e.clientX, e.clientY);
  });

  // Mascot Blink Animation
  function scheduleBlink() {
    const nextBlink = Math.random() * 4000 + 3000;
    setTimeout(() => {
      leftPupil.style.transform = 'scaleY(0.1)';
      rightPupil.style.transform = 'scaleY(0.1)';
      setTimeout(() => {
        leftPupil.style.transform = '';
        rightPupil.style.transform = '';
        scheduleBlink();
      }, 140);
    }, nextBlink);
  }
  scheduleBlink();

  // Mascot Click Wiggle
  mascotAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    mascotAvatar.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-6px) scale(1.1)' },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 300, easing: 'ease-out' });
    toggleDrawer();
  });

  // ==========================================================================
  // Audio & Sound Engine (Web Audio API Synthesizer)
  // Zero external MP3 files needed; works offline, instant, zero latency
  // ==========================================================================
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const soundEffectsToggle = document.getElementById('soundEffectsToggle');
  const btnTestSound = document.getElementById('btnTestSound');
  let soundEnabled = localStorage.getItem('loly_sound_enabled') !== 'false';
  if (soundEffectsToggle) {
    soundEffectsToggle.checked = soundEnabled;
    soundEffectsToggle.addEventListener('change', () => {
      soundEnabled = soundEffectsToggle.checked;
      localStorage.setItem('loly_sound_enabled', soundEnabled);
      if (soundEnabled) playChime();
    });
  }

  function playChime() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(739.99, now);
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.12);

      osc2.frequency.setValueAtTime(1108.73, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1479.98, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (_) {}
  }

  function playAlert() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (_) {}
  }

  function playHapticClick() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (_) {}
  }

  if (btnTestSound) {
    btnTestSound.addEventListener('click', () => {
      playChime();
    });
  }

  // Island Ethereal Expansion Ripple
  const islandRipple = document.getElementById('islandRipple');
  function triggerRipple() {
    if (!islandRipple) return;
    islandRipple.classList.remove('animating');
    void islandRipple.offsetWidth; // Force CSS reflow
    islandRipple.classList.add('animating');
    setTimeout(() => {
      islandRipple.classList.remove('animating');
    }, 1300);
  }

  // ==========================================================================
  // Lo-Fi & Focus Ambient Music Engine (Procedural Web Audio Generator)
  // ==========================================================================
  const TRACKS = [
    { title: 'Midnight Lo-Fi', artist: 'Loly Ambient Lo-Fi Generator', tempo: 72, chords: [[220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 349.23], [164.81, 196, 246.94, 293.66]] },
    { title: 'Cyber Synthwave', artist: 'Loly Neon Synth Generator', tempo: 110, chords: [[130.81, 196, 246.94, 329.63], [146.83, 220, 261.63, 349.23], [110, 164.81, 220, 261.63], [123.47, 185, 220, 293.66]] },
    { title: 'Chill Coffee Beats', artist: 'Loly Neo-Soul Beats', tempo: 80, chords: [[261.63, 329.63, 392, 493.88], [220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 392]] },
    { title: 'Rain Ambient Focus', artist: 'Loly Ethereal Soundscape', tempo: 60, chords: [[174.61, 261.63, 329.63, 440], [196, 293.66, 349.23, 493.88], [220, 261.63, 329.63, 440], [164.81, 246.94, 329.63, 392]] }
  ];

  let currentTrackIdx = 0;
  let isPlayingMusic = false;
  let musicInterval = null;
  let musicGainNode = null;
  let musicVolume = 0.7;

  const miniPlayBtn = document.getElementById('miniPlayBtn');
  const miniSkipBtn = document.getElementById('miniSkipBtn');
  const miniTrackTitle = document.getElementById('miniTrackTitle');
  const miniEqualizer = document.getElementById('miniEqualizer');

  const fullPlayBtn = document.getElementById('fullPlayBtn');
  const fullPrevBtn = document.getElementById('fullPrevBtn');
  const fullNextBtn = document.getElementById('fullNextBtn');
  const mainTrackTitle = document.getElementById('mainTrackTitle');
  const mainTrackArtist = document.getElementById('mainTrackArtist');
  const fullEqualizer = document.getElementById('fullEqualizer');
  const artworkDisc = document.getElementById('artworkDisc');
  const musicVolumeSlider = document.getElementById('musicVolumeSlider');
  const volValText = document.getElementById('volValText');
  const trackChips = document.querySelectorAll('.track-chip');

  function updateMusicUI() {
    const track = TRACKS[currentTrackIdx];
    if (miniTrackTitle) miniTrackTitle.textContent = track.title;
    if (mainTrackTitle) mainTrackTitle.textContent = track.title;
    if (mainTrackArtist) mainTrackArtist.textContent = track.artist;

    const playSymbol = isPlayingMusic ? '⏸' : '▶';
    if (miniPlayBtn) miniPlayBtn.textContent = playSymbol;
    if (fullPlayBtn) fullPlayBtn.textContent = playSymbol;

    if (isPlayingMusic) {
      if (miniEqualizer) miniEqualizer.classList.add('playing');
      if (fullEqualizer) fullEqualizer.classList.add('playing');
      if (artworkDisc) artworkDisc.classList.add('spinning');
    } else {
      if (miniEqualizer) miniEqualizer.classList.remove('playing');
      if (fullEqualizer) fullEqualizer.classList.remove('playing');
      if (artworkDisc) artworkDisc.classList.remove('spinning');
    }

    trackChips.forEach((chip, idx) => {
      if (idx === currentTrackIdx) chip.classList.add('active');
      else chip.classList.remove('active');
    });
  }

  let chordStep = 0;
  function scheduleNextChord() {
    if (!isPlayingMusic) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const track = TRACKS[currentTrackIdx];
    const chord = track.chords[chordStep % track.chords.length];
    chordStep++;

    const now = ctx.currentTime;
    const beatSec = 60 / track.tempo;
    const duration = beatSec * 2.8;

    if (!musicGainNode) {
      musicGainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1600;
      musicGainNode.connect(filter);
      filter.connect(ctx.destination);
    }
    musicGainNode.gain.setValueAtTime(musicVolume * 0.14, now);

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.22 / chord.length, now + 0.3);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(noteGain);
      noteGain.connect(musicGainNode);

      osc.start(now + i * 0.03);
      osc.stop(now + duration);
    });

    const nextInterval = (beatSec * 2.5) * 1000;
    clearTimeout(musicInterval);
    musicInterval = setTimeout(scheduleNextChord, nextInterval);
  }

  function startMusic() {
    isPlayingMusic = true;
    chordStep = 0;
    getAudioContext();
    scheduleNextChord();
    updateMusicUI();
  }

  function stopMusic() {
    isPlayingMusic = false;
    clearTimeout(musicInterval);
    updateMusicUI();
  }

  function toggleMusic() {
    if (isPlayingMusic) stopMusic();
    else startMusic();
  }

  if (miniPlayBtn) miniPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMusic(); });
  if (fullPlayBtn) fullPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMusic(); });

  function nextTrack() {
    currentTrackIdx = (currentTrackIdx + 1) % TRACKS.length;
    chordStep = 0;
    updateMusicUI();
    if (isPlayingMusic) {
      clearTimeout(musicInterval);
      scheduleNextChord();
    }
  }

  function prevTrack() {
    currentTrackIdx = (currentTrackIdx - 1 + TRACKS.length) % TRACKS.length;
    chordStep = 0;
    updateMusicUI();
    if (isPlayingMusic) {
      clearTimeout(musicInterval);
      scheduleNextChord();
    }
  }

  if (miniSkipBtn) miniSkipBtn.addEventListener('click', (e) => { e.stopPropagation(); nextTrack(); });
  if (fullNextBtn) fullNextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextTrack(); });
  if (fullPrevBtn) fullPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevTrack(); });

  trackChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.dataset.track, 10);
      if (!isNaN(idx)) {
        currentTrackIdx = idx;
        chordStep = 0;
        updateMusicUI();
        if (isPlayingMusic) {
          clearTimeout(musicInterval);
          scheduleNextChord();
        } else {
          startMusic();
        }
      }
    });
  });

  if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      musicVolume = val / 100;
      if (volValText) volValText.textContent = `${val}%`;
      if (musicGainNode && audioCtx) {
        musicGainNode.gain.setValueAtTime(musicVolume * 0.14, audioCtx.currentTime);
      }
    });
  }

  // ==========================================================================
  // 2. Island Drawer Toggling & Tabs
  // ==========================================================================
  const isDesktopApp = Boolean(window.desktopAPI && window.desktopAPI.isElectron);
  if (isDesktopApp) {
    document.documentElement.classList.add('in-electron');
  }

  let waveTimeout = null;
  function triggerWaveActivity() {
    if (!pillWave) return;
    pillWave.classList.add('active');
    clearTimeout(waveTimeout);
    waveTimeout = setTimeout(() => {
      pillWave.classList.remove('active');
    }, 3200);
  }

  function toggleDrawer(forceOpen = null) {
    const isOpen = islandDrawer.classList.contains('open');
    const targetState = forceOpen !== null ? forceOpen : !isOpen;

    playHapticClick();
    triggerRipple();

    if (targetState) {
      islandDrawer.classList.add('open');
      if (islandWrapper) islandWrapper.classList.add('drawer-open');
      toggleDrawerBtn.setAttribute('title', 'Collapse Island Drawer');
      // Auto-start music if not currently playing when island expands
      if (!isPlayingMusic) {
        startMusic();
      }
    } else {
      islandDrawer.classList.remove('open');
      if (islandWrapper) islandWrapper.classList.remove('drawer-open');
      toggleDrawerBtn.setAttribute('title', 'Expand Island Drawer');
    }

    if (window.desktopAPI && window.desktopAPI.resizeIsland) {
      window.desktopAPI.resizeIsland(targetState).catch(() => {});
    } else {
      fetch('/api/resize-island', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expanded: targetState })
      }).catch(() => {});
    }
  }

  const minimizeAppBtn = document.getElementById('minimizeAppBtn');
  const closeAppBtn = document.getElementById('closeAppBtn');
  if (minimizeAppBtn) {
    minimizeAppBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playHapticClick();
      if (window.desktopAPI) window.desktopAPI.minimizeApp();
    });
  }
  if (closeAppBtn) {
    closeAppBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playHapticClick();
      if (window.desktopAPI) window.desktopAPI.closeApp();
    });
  }

  islandPill.addEventListener('click', (e) => {
    // If clicking directly on controls, let them handle it
    if (e.target.closest('#toggleDrawerBtn') || e.target.closest('#mascotAvatar') || e.target.closest('.electron-only') || e.target.closest('#pillQuickActions')) {
      return;
    }
    toggleDrawer();
  });

  toggleDrawerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDrawer();
  });

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPane = tab.dataset.tab;
      navTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const pane = document.getElementById(`pane-${targetPane}`);
      if (pane) pane.classList.add('active');
    });
  });

  // ==========================================================================
  // 3. Activity Feed Helpers (Secure DOM construction)
  // ==========================================================================
  function addFeedItem(agentName, text, timestamp = new Date()) {
    const emptyMsg = activityFeed.querySelector('.empty-feed');
    if (emptyMsg) {
      emptyMsg.remove();
    }

    const item = document.createElement('div');
    item.className = 'feed-item';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'feed-time';
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    timeSpan.textContent = `${hours}:${minutes}:${seconds}`;

    const agentSpan = document.createElement('span');
    agentSpan.className = 'feed-agent';
    agentSpan.textContent = agentName;

    const textSpan = document.createElement('span');
    textSpan.className = 'feed-text';
    textSpan.textContent = text;

    item.appendChild(timeSpan);
    item.appendChild(agentSpan);
    item.appendChild(textSpan);

    activityFeed.prepend(item);

    // Keep max 40 items in DOM
    while (activityFeed.children.length > 40) {
      activityFeed.lastElementChild.remove();
    }

    totalEventCount++;
    eventCounter.textContent = `${totalEventCount} events`;
  }

  // ==========================================================================
  // 4. Pending Approval Render & Handlers
  // ==========================================================================
  function showPendingApproval(approval) {
    activePendingApproval = approval;
    approvalTitle.textContent = approval.actionType === 'question' ? 'User Choice Required' : 'Permission Request';
    approvalAgent.textContent = approval.agentName || 'agent';
    approvalType.textContent = approval.actionType || 'tool';
    approvalTarget.textContent = approval.target || approval.details || '';

    // Handle Diff
    if (approval.diff && approval.diff.content) {
      approvalDiffContainer.style.display = 'block';
      diffHeader.textContent = `${approval.diff.file || 'File'} (+${approval.diff.added || 0} -${approval.diff.removed || 0})`;
      diffBody.textContent = approval.diff.content;
    } else {
      approvalDiffContainer.style.display = 'none';
    }

    // Handle Question Options
    approvalOptionsList.replaceChildren();
    if (Array.isArray(approval.options) && approval.options.length > 0) {
      approvalOptionsContainer.style.display = 'block';
      approval.options.forEach((opt) => {
        const item = document.createElement('div');
        item.className = 'option-item';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'approvalOption';
        radio.value = opt;
        const label = document.createElement('span');
        label.textContent = opt;

        item.appendChild(radio);
        item.appendChild(label);
        item.addEventListener('click', () => {
          radio.checked = true;
        });
        approvalOptionsList.appendChild(item);
      });
    } else {
      approvalOptionsContainer.style.display = 'none';
    }

    // Reset Gemini Review Card
    geminiReviewCard.style.display = 'none';
    geminiReviewText.textContent = '';

    // Adjust button visibility for questions vs standard allow/deny
    if (approval.actionType === 'question') {
      btnAllow.textContent = 'Submit Answer';
      btnAlways.style.display = 'none';
    } else {
      btnAllow.textContent = 'Allow';
      btnAlways.style.display = 'inline-flex';
    }

    pendingSection.style.display = 'block';
    if (pillQuickActions) pillQuickActions.style.display = 'flex';
    mascotStatusDot.className = 'mascot-status-dot waiting';
    pillStatusBadge.textContent = 'needs attention';
    pillStatusBadge.className = 'status-badge waiting';
    tickerText.textContent = `Approval needed: ${approval.target || approval.actionType}`;

    // Play notification alert chime & ripple aura
    playAlert();
    triggerRipple();

    // Automatically expand island so user sees the prompt immediately
    toggleDrawer(true);
  }

  function hidePendingApproval() {
    activePendingApproval = null;
    pendingSection.style.display = 'none';
    if (pillQuickActions) pillQuickActions.style.display = 'none';
    geminiReviewCard.style.display = 'none';
    mascotStatusDot.className = 'mascot-status-dot active';
    pillStatusBadge.textContent = 'active';
    pillStatusBadge.className = 'status-badge working';
  }

  async function resolveApproval(decision) {
    if (!activePendingApproval) return;

    let finalDecision = decision;
    // Check if an option was selected
    const selectedOption = approvalOptionsList.querySelector('input[name="approvalOption"]:checked');
    if (selectedOption && (decision === 'allow' || decision === 'submit')) {
      finalDecision = selectedOption.value;
    }

    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activePendingApproval.id,
          decision: finalDecision
        })
      });
      if (res.ok) {
        addFeedItem(activePendingApproval.agentName, `Approval resolved [${finalDecision}]`);
        hidePendingApproval();
      }
    } catch (err) {
      console.error('Failed to submit approval:', err);
    }
  }

  btnAllow.addEventListener('click', () => resolveApproval('allow'));
  btnDeny.addEventListener('click', () => resolveApproval('deny'));
  btnAlways.addEventListener('click', () => resolveApproval('always'));

  // Quick In-Notch Approval buttons
  if (quickAllowBtn) {
    quickAllowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resolveApproval('allow');
    });
  }
  if (quickDenyBtn) {
    quickDenyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resolveApproval('deny');
    });
  }

  // Gemini Safety Review Button
  btnGeminiReview.addEventListener('click', async () => {
    if (!activePendingApproval) return;

    geminiReviewCard.style.display = 'block';
    geminiReviewText.textContent = 'Asking Gemini to review action for security & stability...';
    btnGeminiReview.disabled = true;

    try {
      const res = await fetch('/api/gemini/review-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: activePendingApproval.id,
          model: modelSelect.value
        })
      });
      const data = await res.json();
      if (data.review) {
        geminiReviewText.textContent = data.review;
      } else {
        geminiReviewText.textContent = `Review failed: ${data.error || 'Unknown error'}`;
      }
    } catch (err) {
      geminiReviewText.textContent = `Network error: ${err.message}`;
    } finally {
      btnGeminiReview.disabled = false;
    }
  });

  // ==========================================================================
  // 5. Server-Sent Events (SSE) Client
  // ==========================================================================
  function setupSSE() {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('init', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.agent) {
          pillAgentName.textContent = data.agent.name || 'gemini-cli';
          pillStatusBadge.textContent = data.agent.status || 'idle';
          tickerText.textContent = data.agent.tickerText || 'Connected and waiting...';
        }
        if (data.stats) {
          statSessions.textContent = data.stats.totalSessions || 0;
          statEvents.textContent = data.stats.totalEvents || 0;
          statApprovals.textContent = data.stats.totalApprovals || 0;
        }
        if (Array.isArray(data.recentEvents)) {
          data.recentEvents.slice().reverse().forEach(ev => {
            addFeedItem(ev.agent_name, `${ev.title}${ev.details ? ': ' + ev.details : ''}`, new Date(ev.created_at));
          });
        }
        if (Array.isArray(data.pendingApprovals) && data.pendingApprovals.length > 0) {
          showPendingApproval(data.pendingApprovals[0]);
        }
        if (data.hasApiKey) {
          keyStatusMsg.textContent = 'API Key is configured & active.';
        }
      } catch (err) {
        console.error('Error handling SSE init:', err);
      }
    });

    eventSource.addEventListener('agent_activity', (e) => {
      try {
        const data = JSON.parse(e.data);
        pillAgentName.textContent = data.agentName;
        pillAgentName.setAttribute('data-agent', data.agentName.toLowerCase());
        tickerText.textContent = `${data.title}${data.details ? ': ' + data.details : ''}`;
        mascotStatusDot.className = 'mascot-status-dot active';
        pillStatusBadge.textContent = 'working';
        pillStatusBadge.className = 'status-badge working';
        triggerWaveActivity();
        addFeedItem(data.agentName, `${data.title} ${data.details || ''}`);
        if (data.stats) {
          statSessions.textContent = data.stats.totalSessions;
          statEvents.textContent = data.stats.totalEvents;
          statApprovals.textContent = data.stats.totalApprovals;
        }
      } catch (err) {
        console.error('SSE activity parse error:', err);
      }
    });

    eventSource.addEventListener('approval_request', (e) => {
      try {
        const approval = JSON.parse(e.data);
        showPendingApproval(approval);
      } catch (err) {
        console.error('SSE approval_request parse error:', err);
      }
    });

    eventSource.addEventListener('approval_resolved', (e) => {
      try {
        hidePendingApproval();
      } catch (err) {
        console.error('SSE approval_resolved parse error:', err);
      }
    });

    eventSource.addEventListener('agent_status', (e) => {
      try {
        const data = JSON.parse(e.data);
        pillAgentName.textContent = data.name;
        pillStatusBadge.textContent = data.status;
        tickerText.textContent = data.tickerText;
        if (data.status === 'success') {
          playChime();
          triggerRipple();
          mascotAvatar.animate([
            { transform: 'translateY(0)' },
            { transform: 'translateY(-10px)' },
            { transform: 'translateY(0)' }
          ], { duration: 400 });
        }
      } catch (err) {
        console.error('SSE status parse error:', err);
      }
    });

    eventSource.addEventListener('config_updated', (e) => {
      const data = JSON.parse(e.data);
      keyStatusMsg.textContent = data.hasApiKey ? 'API Key is active.' : 'No API key set.';
    });

    eventSource.onerror = () => {
      mascotStatusDot.className = 'mascot-status-dot';
      pillStatusBadge.textContent = 'reconnecting';
    };
  }
  setupSSE();

  // ==========================================================================
  // 6. Gemini Chat & File Attachment
  // ==========================================================================
  function appendChatBubble(role, content) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = content;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Handle Drag & Drop File
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Content = e.target.result.split(',')[1];
      attachedFile = {
        name: file.name,
        mimeType: file.type || 'text/plain',
        base64: base64Content
      };
      dropLabel.style.display = 'none';
      attachedFilePill.style.display = 'inline-flex';
      attachedFileName.textContent = file.name;
    };
    reader.readAsDataURL(file);
  }

  fileDropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach(name => {
    fileDropZone.addEventListener(name, (e) => {
      e.preventDefault();
      fileDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    fileDropZone.addEventListener(name, (e) => {
      e.preventDefault();
      fileDropZone.classList.remove('dragover');
    });
  });

  fileDropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  btnClearFile.addEventListener('click', (e) => {
    e.stopPropagation();
    attachedFile = null;
    fileInput.value = '';
    attachedFilePill.style.display = 'none';
    dropLabel.style.display = 'block';
  });

  async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text && !attachedFile) return;

    appendChatBubble('user', text + (attachedFile ? ` [Attached: ${attachedFile.name}]` : ''));
    chatConversation.push({ role: 'user', content: text });
    chatInput.value = '';

    const currentFile = attachedFile;
    if (attachedFile) {
      attachedFile = null;
      fileInput.value = '';
      attachedFilePill.style.display = 'none';
      dropLabel.style.display = 'block';
    }

    btnSendChat.disabled = true;
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatConversation,
          model: modelSelect.value,
          fileData: currentFile
        })
      });
      const data = await res.json();
      if (data.reply) {
        appendChatBubble('assistant', data.reply);
        chatConversation.push({ role: 'assistant', content: data.reply });
      } else {
        appendChatBubble('assistant', `Error: ${data.error || 'Failed to get answer'}`);
      }
    } catch (err) {
      appendChatBubble('assistant', `Network error: ${err.message}`);
    } finally {
      btnSendChat.disabled = false;
    }
  }

  btnSendChat.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // ==========================================================================
  // 7. Settings & Key Management
  // ==========================================================================
  btnSaveKey.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();
      if (data.success) {
        apiKeyInput.value = '';
        keyStatusMsg.textContent = 'Key saved securely in local server memory!';
      }
    } catch (err) {
      keyStatusMsg.textContent = 'Failed to save key.';
    }
  });

  // ==========================================================================
  // 8. Event Simulator Actions
  // ==========================================================================
  simBashApproval.addEventListener('click', async () => {
    await fetch('/api/hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coucou_agent: 'claude-code',
        action_type: 'bash_command',
        title: 'Run test suite',
        target: 'npm test -- --coverage',
        requires_approval: true
      })
    });
  });

  simFileEdit.addEventListener('click', async () => {
    await fetch('/api/hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coucou_agent: 'gemini-cli',
        action_type: 'file_edit',
        title: 'Editing backend routing',
        target: 'server.js',
        diff: {
          file: 'server.js',
          added: 18,
          removed: 4,
          content: '@@ -42,4 +42,18 @@\n- const legacyRoute = true;\n+ const router = createModernRouter();\n+ router.register(\"/api/gemini\", handleGemini);\n+ router.register(\"/api/hook\", handleAgentHook);'
        },
        requires_approval: true
      })
    });
  });

  simQuestion.addEventListener('click', async () => {
    await fetch('/api/hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coucou_agent: 'antigravity',
        action_type: 'question',
        title: 'Database Architecture Decision',
        target: 'Which database engine should be used for production logs?',
        options: [
          'SQLite (Local Embedded, Zero Latency)',
          'PostgreSQL (Remote Distributed)',
          'In-Memory Cache Only'
        ],
        requires_approval: true
      })
    });
  });

  simFinished.addEventListener('click', async () => {
    await fetch('/api/hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coucou_agent: 'antigravity',
        event_type: 'completed',
        title: 'All tasks completed successfully!',
        details: '14 files inspected, 3 tests passed'
      })
    });
  });

  // ==========================================================================
  // 9. Live Digital Clock & Weather Updater
  // ==========================================================================
  const clockDisplay = document.getElementById('clockDisplay');
  const pillTimeTag = document.getElementById('pillTimeTag');
  const weatherIcon = document.getElementById('weatherIcon');
  const weatherDisplay = document.getElementById('weatherDisplay');
  const cityWeatherInput = document.getElementById('cityWeatherInput');
  const btnUpdateCity = document.getElementById('btnUpdateCity');

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    if (clockDisplay) clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    if (pillTimeTag) pillTimeTag.textContent = `${hours}:${minutes}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  function getWeatherIconSvg(desc) {
    const d = (desc || '').toLowerCase();
    if (d.includes('rain') || d.includes('drizzle')) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 13a4 4 0 0 0-8 0"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/></svg>';
    }
    if (d.includes('thunder') || d.includes('lightning')) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    }
    if (d.includes('snow') || d.includes('ice') || d.includes('flurry')) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>';
    }
    if (d.includes('cloud') || d.includes('overcast')) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>';
    }
    if (d.includes('fog') || d.includes('mist')) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="16" x2="20" y2="16"/></svg>';
    }
    // Clear / default sun
    return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>';
  }

  let savedCity = localStorage.getItem('loly_city') || '';
  if (cityWeatherInput && savedCity) {
    cityWeatherInput.value = savedCity;
  }

  async function fetchWeather(city = '') {
    try {
      const targetCity = city || savedCity;
      const url = targetCity ? `/api/weather?city=${encodeURIComponent(targetCity)}` : '/api/weather';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (weatherDisplay) weatherDisplay.textContent = `${data.tempC}°C ${data.desc}`;
        if (weatherIcon) weatherIcon.innerHTML = getWeatherIconSvg(data.desc);
      }
    } catch (_) {}
  }
  fetchWeather();
  setInterval(() => fetchWeather(), 10 * 60 * 1000); // Check every 10 min

  if (btnUpdateCity && cityWeatherInput) {
    btnUpdateCity.addEventListener('click', () => {
      const city = cityWeatherInput.value.trim();
      savedCity = city;
      localStorage.setItem('loly_city', city);
      playHapticClick();
      fetchWeather(city);
    });
  }

  // ==========================================================================
  // 10. Quick 1-Click App Launcher
  // ==========================================================================
  document.querySelectorAll('.launcher-chip').forEach(chip => {
    chip.addEventListener('click', async (e) => {
      e.stopPropagation();
      const appName = chip.dataset.app;
      playHapticClick();
      chip.style.transform = 'scale(0.92)';
      setTimeout(() => { chip.style.transform = ''; }, 150);

      try {
        if (window.desktopAPI && window.desktopAPI.launchApp) {
          await window.desktopAPI.launchApp(appName);
        } else {
          await fetch('/api/launch-app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName })
          });
        }
        tickerText.textContent = `Launched ${appName.toUpperCase()}`;
      } catch (err) {
        console.error('Launch app error:', err);
      }
    });
  });

  // ==========================================================================
  // 11. Quick Prompt Chips (Gemini AI Chat)
  // ==========================================================================
  document.querySelectorAll('.prompt-chip, .quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      playHapticClick();
      const prompt = chip.dataset.prompt;
      if (prompt && chatInput) {
        chatInput.value = prompt;
        chatInput.focus();
      }
    });
  });

  // ==========================================================================
  // 12. Theme Management (White Mode Color Palette & OLED Hardware Notch)
  // ==========================================================================
  const quickThemeBtn = document.getElementById('quickThemeBtn');
  const themeSelect = document.getElementById('themeSelect');
  
  // Default to white mode as preferred by user rule
  let currentTheme = localStorage.getItem('loly_theme') || 'white';

  const ICON_SUN = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`;
  const ICON_MOON = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('loly_theme', theme);
    if (theme === 'white') {
      document.body.classList.add('white-mode');
      if (quickThemeBtn) quickThemeBtn.innerHTML = ICON_MOON;
      if (themeSelect) themeSelect.value = 'white';
    } else {
      document.body.classList.remove('white-mode');
      if (quickThemeBtn) quickThemeBtn.innerHTML = ICON_SUN;
      if (themeSelect) themeSelect.value = 'dark';
    }
  }

  // Initialize theme
  applyTheme(currentTheme);

  if (quickThemeBtn) {
    quickThemeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playHapticClick();
      const newTheme = currentTheme === 'white' ? 'dark' : 'white';
      applyTheme(newTheme);
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      playHapticClick();
      applyTheme(e.target.value);
    });
  }
});
