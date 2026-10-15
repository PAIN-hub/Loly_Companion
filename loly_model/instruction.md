# Instructions for Running Loly: The Anime Desktop Companion

This project provides **Loly**, an expressive anime mascot desktop companion built with pure SVG, CSS animations, and vanilla JavaScript for Electron.

---

## 1. Quick Start

### Option A: Standalone Preview Page (Recommended for immediate testing)

The preview page allows you to interact with Loly in any browser without launching Electron:

1. **Directly open in browser**:
   Simply open `preview.html` in your web browser (Chrome, Edge, Firefox, or Safari):
   ```bash
   xdg-open preview.html
   ```
   *or open `file:///home/madara/Documents/loly_model/preview.html` in your browser.*

2. **Via local preview HTTP server**:
   Run the included zero-dependency Node.js server:
   ```bash
   npm run preview
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Electron Desktop Companion (Frameless & Transparent Mascot)

To run Loly as a desktop companion widget floating on your desktop:

1. Ensure Electron is installed:
   ```bash
   npm install --save-dev electron
   ```

2. Start the desktop companion:
   ```bash
   npm start
   ```

*Features in desktop mode:*
- **Draggable**: Click and drag the titlebar handle or mascot stage to position Loly anywhere on your screen.
- **Transparent**: The companion floats freely with a transparent background.
- **Window Controls**: Minimize (&minus;) or close (&times;) from the top handle bar.
- **Quick Action Bar**: Switch between Idle, Happy, Dev, and Sleep modes with one click.

---

## 2. Project Directory Structure

```text
/home/madara/Documents/loly_model/
├── loly_companion/        # Pitch Black OLED Dynamic Island Coding Companion
│   ├── loly_companion.svg # Dedicated vector SVG coding companion
│   ├── loly_companion.css # OLED true black styles and fluid expansion animations
│   ├── loly_companion.js  # Island state & Linux IPC resizing controller
│   ├── index.html         # Standalone OLED Dynamic Island interface
│   └── README.md          # Technical documentation & Linux window bounds fix
├── assets/
│   └── loly/
│       ├── loly.svg       # Master SVG character with semantic groups
│       ├── loly.css       # Hardware-accelerated CSS animations & bobbing
│       ├── loly.js        # Controller API for expressions & pupil tracking
│       └── README.md      # Detailed component documentation
├── src/
│   ├── main.js            # Electron main process (supports Linux dynamic window resizing)
│   ├── preload.js         # Secure contextBridge exposing minimal safe window API
│   ├── companion.html     # Floating companion renderer UI
│   ├── companion.css      # Companion transparent styling & drag controls
│   └── companion.js       # Companion event & window controls connector
├── preview.html           # Standalone interactive inspection dashboard
├── preview.css            # White-mode responsive preview stylesheet
├── preview.js             # Preview dashboard controller
├── package.json           # Project manifest and start/preview scripts
└── instruction.md         # Full project execution documentation
```

### Linux Dynamic Island Window Expansion Fix

On Linux (Mutter, KWin, Wayland/XWayland), transparent frameless Electron windows clip content to the underlying window dimensions:
- When collapsed into a compact pill, `loly_companion.js` sends `loly:island-resize` with `{ expanded: false, width: 290, height: 64 }`.
- When expanded into the full companion island, `loly_companion.js` notifies the main process, which immediately resizes the BrowserWindow to `340x500px` before animating the island content outward.
- This prevents visual clipping on Linux and prevents the transparent canvas from blocking desktop clicks when in pill mode.

---

## 3. JavaScript Controller API Reference

The character controller is exposed as `window.Loly`:

```javascript
// Initialize Loly
Loly.init({
  container: '#loly-container', // Element or query selector
  expression: 'neutral',       // Default: 'neutral'
  activity: 'idle'             // Default: 'idle'
});

// Switch Expressions (8 built-in facial states with expressive hand & body poses)
Loly.setExpression('neutral');    // Calm open eyes, relaxed smile, hands rested
Loly.setExpression('happy');      // Joyful squint, blushing cheeks, hands perked up in cheer
Loly.setExpression('curious');    // Raised brow, natural head tilt, one hand lifted curiously
Loly.setExpression('thinking');   // Hand raised to chin in anime ponder pose, thought cloud with glowing bulb
Loly.setExpression('surprised');  // Contracted pupils, high brows, hands pulled back in recoil
Loly.setExpression('sad');        // Droopy brows, pout mouth, limp drooped sleeves
Loly.setExpression('sleepy');     // Half-closed eyelids, floating Zzz, relaxed slumped hands
Loly.setExpression('working');    // Focused brows, holographic dev visor, hands forward typing

// Mood Controller (maps emotions to visual expressions)
Loly.setMood('happy');
Loly.setMood('focused');
Loly.setMood('tired');

// Activity System
Loly.setActivity('idle');         // Gentle breathing bob & hair swaying
Loly.setActivity('coding');       // Dev HUD visor active
Loly.setActivity('success');      // Excited jump animation & sparkles
Loly.setActivity('error');        // Surprised shake reaction

// Interactions & Toggles
Loly.triggerReaction('click');    // Bounce reaction on poke
Loly.setCursorTracking(true);     // Constrained pupil tracking on mouse move
Loly.setIdleAnimation(true);      // Toggle idle breathing and hair sway
Loly.setVisible(true);            // Pauses all timers & listeners when hidden
```

---

## 4. Hardware Optimization & Low-Power Specs

Optimized for entry-level integrated graphics (Intel Core i3-4005U with HD 4400 graphics):
- **Zero Heavy Filter Chains**: Uses clean vector gradients and clip-paths rather than expensive blur filters.
- **GPU Compositor Properties**: Only animates `transform` and `opacity` with `will-change`.
- **Intelligent Timer Throttling**: Blinking operates on an irregular timer rather than `requestAnimationFrame`. When hidden (`document.hidden` or `setVisible(false)`), all timers and mouse listeners are paused.
- **Full Reduced Motion Support**: Complies with `@media (prefers-reduced-motion: reduce)`.
