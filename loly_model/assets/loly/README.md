# Loly - The Anime Desktop Companion Component

Loly is a lightweight, expressive anime-style desktop companion designed for Electron and modern web runtimes.

## Asset Directory Structure

```text
assets/loly/
├── loly.svg       # Master vector illustration with independently addressable groups
├── loly.css       # Hardware-accelerated CSS animations, bobbing, and emotes
├── loly.js        # Controller API for expressions, mood, activities, and pupil tracking
└── README.md      # Component documentation
```

## SVG Semantic Group Layout

The SVG is structured into cleanly named groups:
- `#loly-character`: Master container for physics, scaling, and bounce effects
- `#loly-shadow`: Soft grounded desktop shadow
- `#loly-hair-back`: Flowing layered hair locks with mint/cyan ombre tips and bows
- `#loly-body`: Stylized anime legs, subtle knee blush, peeking shorts
- `#loly-neck`: Neck and ribbon choker
- `#loly-hoodie`: Oversized charcoal hoodie with dropped baggy sleeves, double stripes, and glowing cyan chest emblem
- `#loly-head`:
  - `#loly-face-base`: Cheeks, ears, soft rosy blush hatches, and nose dot
  - `#loly-eyes`: Independent clip paths, multi-layered irises, specular highlights, feline lashes, and eyelids
  - `#loly-eyebrows`: Separately addressable left and right brows for nuanced expressions
  - `#loly-mouth`: Morphing mouth path supporting both lines and open smiling shapes
  - `#loly-hair-front`: Bangs, face-framing tresses, glossy hair halo, and bouncy ahoge
- `#loly-accessories`: Dynamic emote overlays (Thinking lightbulb, Curious ?, Surprised sweat drop, Sleepy Zzz, and Coding HUD visor)

## JavaScript Controller API

```javascript
// Initialize Loly inside your container
Loly.init({
  container: '#loly-container', // Element or selector
  expression: 'neutral',       // Initial expression
  activity: 'idle'             // Initial activity
});

// Expressions (8 distinct visual states)
Loly.setExpression('neutral');
Loly.setExpression('happy');
Loly.setExpression('curious');
Loly.setExpression('thinking');
Loly.setExpression('surprised');
Loly.setExpression('sad');
Loly.setExpression('sleepy');
Loly.setExpression('working');

// Mood helper (maps emotional states to expressions)
Loly.setMood('happy');
Loly.setMood('calm');
Loly.setMood('focused');

// Activity System
Loly.setActivity('idle');    // Normal idle breathing and blinking
Loly.setActivity('coding');  // Displays holographic dev visor
Loly.setActivity('success'); // Excited jump animation + stars
Loly.setActivity('error');   // Surprised shake reaction

// Interactions & Animation Toggles
Loly.triggerReaction('click');     // Gentle click reaction
Loly.setIdleAnimation(true);       // Enable/disable breathing & sway
Loly.setCursorTracking(true);      // Enable/disable pupil mouse tracking
Loly.setVisible(true);             // Pauses CPU/GPU cycles when false

// Cleanup
Loly.destroy();
```

## Performance & Optimization Notes

Designed to run smoothly on lower-spec hardware (Intel Core i3-4005U with HD 4400 graphics):
- Pure SVG vector paths with no heavy SVG filter chains or CPU blur bottlenecks.
- `transform` and `opacity` animations only, running on GPU compositor layers.
- Blinking runs on a lightweight timer rather than continuous requestAnimationFrame polling.
- Complete event and timer teardown when companion is hidden or minimized.
- Native `prefers-reduced-motion` compliance.
