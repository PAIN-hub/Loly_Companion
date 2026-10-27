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

## 5. Autonomous Coding & Shell Execution Engine (Gen-v5 Merged)

Loly incorporates the complete **Nexus Shell Agent v5.0.0** execution engine while maintaining Loly's signature desktop dynamic island aesthetic:

- **Multi-Provider AI Architecture**:
  - **Google Gemini**: Uses Generative Language v1beta streaming (`gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.8-flash`, etc.).
  - **Anthropic Claude**: Direct browser streaming via Anthropic Messages API (`claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-latest`) with `anthropic-dangerous-direct-browser-access`.
  - **OpenAI / Codex**: Direct streaming via OpenAI Responses API (`gpt-4o`, `gpt-4.5-preview`, `o3-mini`).
- **Autonomous Tool Calling Loop**:
  - The agent emits `execute_shell_command` function calls to execute local build scripts, tests, and CLI tasks.
  - Multi-turn execution loop continues autonomously up to the configured `maxSteps` (default: 6, max: 12).
- **Interactive Permission Approvals**:
  - Before any shell command is run, Loly generates an interactive **Permission Card** directly in the chat stream with command syntax highlighting.
  - Quick action buttons on the notch island (`Allow` / `Deny`) also resolve pending permissions instantly.
- **Process Group Isolation & Timeout Guards**:
  - Each command runs within an isolated process group (`detached: true`) so children processes can be killed cleanly without orphan leaks.
  - Configurable execution timeout (1 to 120 seconds, default: 10s).
- **Persistent Shell State (`cd` tracking)**:
  - Unix bash execution traps `EXIT` and reports the new working directory over file descriptor 3 (`trap 'pwd -P >&3' EXIT`).
  - Windows PowerShell fallback tracks `$PWD` reliably.
  - `cd` commands persist across turns in the session.
- **ReDoS-Safe Secret Redaction**:
  - Bounded regular expressions (`{0,40}`) sanitize API keys (`AIzaSy...`, `sk-ant-api...`, `sk-proj...`, bearer tokens, AWS credentials) before command output is streamed to the AI model or displayed on screen.
- **Typewriter Rendering & History Navigation**:
  - Markdown stream rendered safely via DOM construction with Lucide SVG copy buttons.
  - Chat input supports `↑` and `↓` arrow keys to recall prior shell prompts.
  - Stop button (`#btnStopAgent`) and `Escape` key immediately abort active multi-turn agent execution.
- **Session Transcript Export**:
  - Export full sessions to sanitized Markdown (`.md`) or structured JSON (`.json`) with one click from Settings.

---

## 6. Configuring AI Engine Providers & Keys

In Loly's Settings drawer (click the **Gear icon** in the top right or open `http://127.0.0.1:4141/settings.html`):

1. **Select Provider**: Choose between **Google Gemini**, **Anthropic Claude**, or **OpenAI / Codex**.
2. **API Key Input**:
   - **Google Gemini**: Get key from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - **Anthropic Claude**: Get key from [Anthropic Console](https://console.anthropic.com/).
   - **OpenAI**: Get key from [OpenAI Platform](https://platform.openai.com/api-keys).
   - Keys are kept directly in the browser (`sessionStorage`, or `localStorage` if **Remember Keys on Device** is checked).
3. **Model Selection & Discovery**:
   - Click **Fetch Models** to query live available models directly from the provider API.
   - Or type a custom model ID in the datalist input.
4. **Agent Step & Timeout Preferences**:
   - Set **Max Agent Steps** (1-12) and **Command Timeout** (1-120 seconds).
   - Set **Max Output Tokens** (for Claude, up to 64,000 tokens).

---

## 7. Testing Agent Integrations & Approvals

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
    "event_type": "permission_request",
    "title": "Bash Command Approval Required",
    "target": "npm test -- --coverage",
    "action_type": "bash_command"
  }'
```

Watch Loly's island expand to display `[ Allow ]` and `[ Deny ]`, or ask Loly directly in the chat interface to test running a shell command!

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

Loly includes an internal audio workstation, Lo-Fi player, and real-time sound-reactive visualizer:
- **Sound-Reactive Dynamic RGB Border**: Uses Web Audio API (`AudioContext` + `AnalyserNode`) to extract real-time bass, mid, and treble frequencies and drive a dynamic RGB border pulse and box-shadow glow on the player and Companion Island.
- **Island Dropdown & Quick Music Widget**: Includes Prev, Play, Pause, Stop, and Forward (Next) controls with clean monochrome Lucide SVG icons.
- **Custom Tooltip Integration (`lolyCustomTooltip`)**: Hovering over the music icon or player dynamically renders real-time playback status and track metadata in the custom floating indicator.
- **Internal Storage & Native File Dialogs**: Clicking `Load Audio Files` invokes native OS file dialogs via Electron IPC (`desktopAPI.selectAudioFiles`, `desktopAPI.selectAudioFolder`) or the browser HTML5 file picker fallback.
- **IndexedDB Audio Storage (`LolyAudioStorage`)**: Tracks are stored as offline binary blobs in IndexedDB, completely playable without an external server and persistent across reboots. Both the dynamic island player and the full settings window (`settings.html`) share and synchronize this audio storage library.
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
