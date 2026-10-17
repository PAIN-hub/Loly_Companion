# Documentation — Running & Using Loly Companion

> Complete instructions on how to install, configure, run, build, and use **Loly Companion** on Linux, Windows, and Web.

---

## Table of Contents
1. [System Prerequisites](#1-system-prerequisites)
2. [Quickstart (Run in 1 Minute)](#2-quickstart-run-in-1-minute)
3. [Running as Native Desktop App (Electron)](#3-running-as-native-desktop-app-electron)
4. [Self-Contained Standalone Binaries (No Node.js Required)](#4-self-contained-standalone-binaries)
   - [Headless Embedded Daemon Architecture](#headless-embedded-daemon-architecture)
   - [Windows Standalone (.exe)](#windows-standalone-exe)
   - [Linux Standalone (.AppImage / .deb)](#linux-standalone-appimage--deb)
5. [Autonomous Multi-File Coding Agent](#5-autonomous-multi-file-coding-agent)
6. [Interactive Chat Bubbles & Floating Speech Bubble](#6-interactive-chat-bubbles--floating-speech-bubble)
7. [Configuring the Google Gemini API Key](#7-configuring-the-google-gemini-api-key)
8. [Testing Agent Integrations & Approvals](#8-testing-agent-integrations--approvals)
9. [Building Binaries from Source](#9-building-binaries-from-source)
10. [Database & Storage Details](#10-database--storage-details)
11. [Audio Library & File Picker](#11-audio-library--file-picker)
12. [Keyboard Shortcuts & Hotkeys](#12-keyboard-shortcuts--hotkeys)

---

## 1. System Prerequisites

- **Node.js**: Version 20.0.0 or higher (Node 22+ recommended).
- **npm**: Version 9.0.0 or higher.
- **Operating System**: 
  - Linux (Ubuntu 20.04+, 22.04+, 24.04+, Debian 11+, Kali Linux, Arch, Fedora)
  - Windows 10 or Windows 11 (64-bit)
- **Web Browser**: Chrome, Edge, Firefox, or Brave (for web mode).

---

## 2. Quickstart (Run in 1 Minute)

### Step 1: Open Terminal in the Project Directory
```bash
cd /home/madara/Documents/loly/Loly_Companion
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Start the Background Daemon & Web Server
```bash
npm start
```

The server initializes SQLite and starts both HTTP and Unix socket listeners:
```text
=======================================================
  Loly - AI Coding Agent Desktop Companion & Island   
  HTTP Web Server: http://127.0.0.1:4141              
  [Socket Server] IPC Listening at: /tmp/coucou.sock
=======================================================
```

Open your browser to:
**`http://127.0.0.1:4141`**

---

## 3. Running as Native Desktop App (Electron)

To launch Loly as a transparent, floating screen island anchored at the top-center of your monitor with always-on-top positioning:

```bash
npm run electron
```

- **Global Hotkey**: Press `Ctrl + Shift + L` (Windows/Linux) or `Cmd + Shift + L` (macOS) to show/hide the island anytime.
- **System Tray**: An icon appears in your desktop system tray to quickly show, hide, open settings, or quit.

---

## 4. Self-Contained Standalone Binaries

### Headless Embedded Daemon Architecture
In packaged distribution formats (`.deb`, `.AppImage`, and `.exe`):
- Loly automatically boots the embedded Node.js backend daemon headlessly inside the Electron main process. Users do **not** need to open a terminal or run `node server.js` manually.
- Electron's window manager explicitly awaits backend socket initialization (`startServer()`) and includes an automatic retry handler (`did-fail-load`) to eliminate connection-refused errors or missing UI assets.
- Static assets are resolved using `getPublicDir()` and delivered via buffered streams, ensuring all styles, anime vectors, and icons render correctly from within Electron ASAR archives.
- **Notch Dimensions & Squircle Cutout**: The collapsed notch container is 530px wide by 52px high with a refined 16px border-radius matching modern hardware screen cutouts.
- **Custom Hover Indicator Engine**: Default OS/browser tooltips are replaced by a zero-delay custom floating tooltip indicator styled to match the dark OLED `#000000` aesthetic.
- **Cross-Platform Workspace & DB Persistence**: Database keys, model preferences, and active coding workspaces are automatically preserved and migrated between local development and installed binaries.

### Windows Standalone (.exe)
Download from [GitHub Releases](https://github.com/PAIN-hub/Loly_Companion/releases/tag/v1.0.0):
1. **Portable Version**: Download `Loly-1.0.0.exe` and double click. It runs immediately.
2. **Installer Version**: Download `Loly-Setup-1.0.0.exe` to install as a standard Windows program with desktop shortcuts.

### Linux Standalone (.AppImage / .deb)
Download from [GitHub Releases](https://github.com/PAIN-hub/Loly_Companion/releases/tag/v1.0.0):
1. **Universal AppImage**:
   ```bash
   chmod +x Loly-1.0.0.AppImage
   ./Loly-1.0.0.AppImage
   ```
2. **Debian/Ubuntu Package (.deb)**:
   ```bash
   sudo dpkg -i loly_1.0.0_amd64.deb
   # Run directly by typing:
   loly
   ```

---

## 5. Autonomous Multi-File Coding Agent

Loly includes an autonomous AI agent capable of multi-file modifications and shell command execution directly from the chat interface:

- **Target Workspace Pill**: Displays the currently active target directory (e.g. `Loly_Companion`). Clicking the pill lets you point Loly at any local project folder.
- **Agent Mode Toggle**: Toggle between `Coding Agent` mode (which inspects, reads, and edits files across the directory tree) and conversational chat mode.
- **Agent Tool Calling Engine**:
  - `list_files`: Automatically traverses workspace folders up to 5 levels deep.
  - `read_file`: Reads specific target files to analyze code context.
  - `edit_file`: Performs surgical regex or string replacements across files.
  - `write_file`: Generates new files within the project boundary.
  - `run_command`: Executes build scripts, linters, and test commands.
- **Interactive Diff Badges**: Each file modification step is rendered in the conversation stream with an expandable code diff view showing additions and deletions.

---

## 6. Chrome Built-in AI (Prompt API) & Cloud Fallback

Loly prioritizes Chrome's native, on-device AI inference via the **Prompt API / Gemini Nano** (`window.ai.languageModel`) for lightning-fast responses with zero latency and offline capability:

- **Automatic Engine Detection**: When you select `⚡ Chrome Built-in AI (Prompt API + Cloud Fallback)` (the default), Loly tests on-device availability. If available, responses stream locally.
- **Graceful Cloud Fallback**: If Chrome Built-in AI is not supported or not enabled in your current browser/runtime, Loly seamlessly and invisibly falls back to the Google Cloud Gemini API (`/api/gemini/chat-stream`).
- **Live AI Engine Badge**: A badge next to the chat model selector displays whether you are running `⚡ Nano Local` or `☁️ Gemini Cloud`.
- **How to Enable Chrome Nano**: In Chrome 128+, navigate to `chrome://flags/#prompt-api-for-gemini-nano` and set it to **Enabled**.

---

## 7. Dynamic Notch Animations

Loly features smooth, responsive micro-animations styled for an OLED `#000000` aesthetic:

- **Appearance Spring Animation**: When the island first loads or reappears, it enters with a subtle spring bounce (`@keyframes islandEntrance`).
- **Hover Lift & Rim Glow**: Hovering over the collapsed notch lifts the capsule slightly (`translateY(2px) scale(1.012)`) and enhances the white border glow.
- **Chat Active Pulse**: While Loly is streaming an AI response, generating text, or running an autonomous coding task, the notch breathes with an animated pulsing ring and soundwave motion (`.notch-chat-active`).

---

## 8. Inactivity Auto-Disappear Timer (30s Default)

To keep your screen clean and distraction-free:

- **Default Behavior**: If no mouse, keyboard, or audio activity occurs for **30 seconds**, the notch island smoothly glides up into a sleek 4px glowing peek line at the top screen bezel.
- **Instant Wake**: Moving your mouse to the top 16px of your monitor, hovering over the peek bar, clicking it, or pressing `Ctrl + Shift + L` instantly wakes Loly.
- **Configurable Inactivity Duration**: Go to **Settings > Notch, Timer & Voice** to select:
  - `10 Seconds (Quick Retract)`
  - `30 Seconds (Default)`
  - `1 Minute`
  - `5 Minutes`
  - `Never (Always Visible)`

---

## 9. Voice Command & Wake Word Engine

Wake up and control Loly completely hands-free using the native Web Speech API:

- **Supported Wake Words**: Say `"Hey Loly"`, `"Loly"`, `"Coucou Loly"`, or `"Wake up Loly"`.
- **Audio Feedback**: Upon detecting the wake word, Loly plays a dual-tone wake chime, bounces cheerfully, and shows `"I'm listening..."` in her speech bubble.
- **Hands-Free Voice Actions**:
  - `"Hey Loly, open settings"` — Launches the full Settings window.
  - `"Hey Loly, play music"` / `"pause music"` — Controls audio tracks.
  - `"Hey Loly, hide"` / `"sleep"` — Retracts the notch island immediately.
  - `"Hey Loly, expand"` / `"open island"` — Expands the drawer.
  - `"Hey Loly, agent mode"` — Toggles autonomous coding agent mode.
  - `"Hey Loly, [any question or coding task]"` — Sends the prompt to Chrome Built-in AI / Gemini.
- **Microphone Toggle**: Click the microphone icon in the notch pill anytime to mute or un-mute voice listening.

---

## 7. Configuring the Google Gemini API Key

To enable real-time streaming chat, autonomous agent coding, and safety reviews:

1. Obtain a **free API key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In Loly:
   - Click the **Gear icon** in the top right to open **Settings** (or open `http://127.0.0.1:4141/settings.html`).
   - Paste your key in the **Gemini API Key** field.
   - Click **Save Key**.
3. Or set it in your environment:
   ```bash
   export GEMINI_API_KEY="AIzaSyYourKeyHere"
   npm start
   ```

---

## 8. Testing Agent Integrations & Approvals

Loly includes a built-in agent simulation script to test events without running external agents:

```bash
# In a separate terminal while Loly is running:
npm run simulate
```

Or trigger an approval manually with `curl`:
```bash
curl -X POST http://127.0.0.1:4141/api/hook \
  -H "Content-Type: application/json" \
  -d '{
    "coucou_agent": "gemini-cli",
    "event_type": "approval_request",
    "title": "Bash Command Approval",
    "target": "npm test --coverage",
    "requires_approval": true
  }'
```

Watch Loly's island expand to display `[ Allow ]`, `[ Deny ]`, and `[ Ask Gemini Review ]`!

---

## 9. Cleaning Old Builds & Getting Fresh Standalone Apps

To completely get rid of old versions and compile a fresh standalone package:

### Step 1: Remove Old Installed Binaries & Build Cache
- **Linux (Debian/Ubuntu/Kali)**:
  ```bash
  # Remove old .deb system package if previously installed:
  sudo apt remove loly -y || sudo dpkg -r loly
  ```
- **Windows**:
  - If installed via installer: Go to **Settings > Apps > Installed apps**, find **Loly**, and click **Uninstall**.
  - If using portable `.exe`: Simply delete the old `.exe` file.
- **Project Directory Build Cache**:
  ```bash
  # Clean old dist folder:
  npm run clean
  ```

---

### Step 2: Build the Fresh Standalone Apps

Run the build script corresponding to your platform:

- **Linux (.AppImage & .deb)**:
  ```bash
  npm run dist:fresh
  # Or: npm run dist:linux
  ```
- **Windows (.exe portable & setup installer)**:
  ```bash
  npm run clean && npm run dist:win
  ```
- **Both Platforms**:
  ```bash
  npm run clean && npm run dist:all
  ```

---

### Step 3: Run the Standalone App (No Server / Terminal Needed)

Once compiled in `dist/`, launch directly:

- **Linux AppImage (Universal)**:
  ```bash
  ./dist/Loly.AppImage
  ```
  *(Or double-click `Loly.AppImage` in your Linux file manager)*

- **Linux .deb Package**:
  ```bash
  sudo dpkg -i dist/loly_1.0.0_amd64.deb
  # Launch from terminal or application launcher:
  loly
  ```

- **Windows Portable**:
  Double-click `dist/Loly 1.0.0.exe`.

> **Note**: In all standalone packages, the embedded Node.js backend starts headlessly inside Electron on launch. You do **not** need to open a terminal or run `npm start` / `node server.js`.

---

## 10. Database & Storage Details

- **Database Engine**: Native `node:sqlite` in Node.js core. Zero external C drivers.
- **Storage Location**:
  - Linux: `~/.loly/loly.db`
  - Windows: `%USERPROFILE%\.loly\loly.db`
- **Data Logged**:
  - `sessions`: Active agent sessions.
  - `events`: Tool actions, file edits, bash executions.
  - `approvals`: Terminal approval requests and user decisions (`allow`, `deny`, `always`).
  - `settings`: Configured model, API key, audio, and weather city.
  - `chats`: Conversation messages with Gemini.

---

## 11. Audio Library & File Picker

Loly includes an internal audio workstation and Lo-Fi player:
- **Internal Storage & Native File Dialogs**: Clicking `Load Audio Files` invokes native OS file dialogs via Electron IPC (`desktopAPI.selectAudioFiles`, `desktopAPI.selectAudioFolder`) or the browser HTML5 file picker fallback.
- **IndexedDB Audio Storage (`LolyAudioStorage`)**: Tracks are stored as offline binary blobs in IndexedDB, completely playable without a web server and persistent across reboots. Both the dynamic island player and the full settings window (`settings.html`) share and synchronize this audio storage library.
- **Ambient Focus Presets**: Includes procedural multi-oscillator chords for *Midnight Lo-Fi*, *Cyber Synthwave*, *Chill Coffee*, and *Rain Focus*.
- **Microphone Permissions**: Electron default session automatically grants `media` access for hands-free voice wake words.

---

## 12. Dot Burger Menu & Curated AI Models

To keep the collapsed dynamic island and chat interface minimal and uncluttered:
- **Header Row**: The capsule header row displays only the active agent badge on the left (`Loly-Agent • Coding Agent`) and a sleek **dot burger** (`⋮`) icon button on the far right.
- **Floating Dot Burger Dropdown**: Clicking the vertical 3-dot burger (`⋮`) reveals:
  - **Coding Agent Autonomous Mode**: Toggle full filesystem editing vs conversational chat.
  - **Curated Model Selector**: Filtered to only the 5 essential models (Chrome Built-in AI with auto/offline fallback, Gemini 2.5 Flash, Gemini 2.5 Pro, and Gemini 3.5 Flash), eliminating outdated previews.
  - **Workspace Directory Picker**: Pick and switch local project folders on the fly.
- **Status Indicator**: The Loly companion status caption bar is formatted and padded to ensure "Loly • Ready" and companion moods are fully visible without any edge clipping.

---

## 12. Keyboard Shortcuts & Hotkeys

| Shortcut | Scope | Action |
|---|---|---|
| `Ctrl + Shift + L` | Global (OS) | Toggle Loly Island visibility |
| `Escape` | Window | Close expanded drawer / settings |
| `Enter` | Chat Input | Send message or execute agent command |
| `Space` | Music Player | Play / pause procedural Lo-Fi track |

---

<div align="center">
  <sub>Official Documentation for Loly Companion • <a href="https://pain-hub.github.io/Loly_Companion/">Live Website</a></sub>
</div>
