# Loly Coding Companion - Pitch Black OLED Dynamic Island

This package provides **Loly** as a dedicated coding companion featuring a Pitch Black OLED Dynamic Island interface designed for low-power operation, desktop widgets, and Electron integration on Linux, Windows, and macOS.

## Structure

```text
loly_companion/
├── loly_companion.svg   # Standalone coding companion SVG vector
├── loly_companion.css   # Pitch black OLED dynamic island styling and animations
├── loly_companion.js    # Island state manager & character controller
├── index.html           # Standalone OLED Island interactive preview
└── README.md            # Documentation and Linux expansion guide
```

## Why the Dynamic Island Did Not Expand on Linux (And How It Is Fixed)

### The Linux Electron Transparent Window Clipping Issue
On Linux (X11 with window managers like Mutter/GNOME, KWin, or Wayland via XWayland), an Electron frameless transparent window (`frame: false, transparent: true`) clips its web content to the actual OS-allocated window dimensions.

- If the window was created at a fixed pill size (e.g. `270x48px`), when the dynamic island expanded in CSS to `320x480px`, Linux OS graphics compositor clipped the content outside the 48px height.
- Conversely, if the window was created at `320x480px` while in collapsed pill mode, the transparent empty canvas captured desktop mouse clicks, preventing users from clicking windows behind the mascot.

### The Solution: Synchronized Two-Way IPC Resizing
`loly_companion.js` coordinates with Electron's main process via IPC:

1. **Expanding State**:
   When the user clicks the pill, `LolyCompanion.expand()` notifies Electron via `electronLoly.setIslandExpanded(true)`:
   ```javascript
   // Electron main process expands the window boundary dynamically on Linux
   mainWindow.setResizable(true);
   mainWindow.setBounds({ x, y, width: 340, height: 500 });
   ```
2. **Collapsed State**:
   When collapsing into the compact OLED pill, `LolyCompanion.collapse()` resizes the window down:
   ```javascript
   mainWindow.setBounds({ x, y, width: 290, height: 64 });
   ```

## Design Specifications

- **Surface Palette**: Pure pitch black (`#000000`) for true OLED energy efficiency.
- **Accents**: Electric cyan (`#00f2fe` / `#06b6d4`) glowing perimeter edge and active telemetry indicators.
- **Physics**: Smooth fluid spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Mascot**: Expressive anime character with anchored natural head pivot, dynamic sleeve/hand poses, live gaze tracking, and working/thinking emotes.
