# Loly — AI Agent Screen Companion & Notch Island

> A desktop companion for **Linux and Windows** , powered by the **Google Gemini API**, with an interactive animated companion mascot whose eyes track your cursor, a live agent activity ticker, one-click terminal approvals, file diff reviews, and local SQLite audit logging.

---

## 🌟 Key Features

1. **Top Screen Dynamic Island & Floating Mascot**:
   - Anchored at the top center of your screen or viewable as a floating app.
   - Animated SVG mascot (**Loly**) whose pupils smoothly calculate angles and follow your mouse across the screen.
   - Expresses status (idle, active, needs attention with pulsing indicator, completion bounce).

2. **AI Agent Live Stream & Ticker**:
   - Compatible with **Gemini CLI**, **Claude Code**, **Antigravity**, **Cursor**, **Codex**, and custom CLI agents.
   - Shows live file edits (`+N -M`), commands, and tool executions.

3. **In-Pill Permission Approvals & Questions**:
   - `[ Allow ]`, `[ Deny ]`, `[ Always ]` buttons right in the island.
   - Interactive multiple-choice selection for agent questions (`AskUserQuestion`).
   - One-click approval resolution sent directly back to the waiting agent terminal via HTTP or Unix domain socket.

4. **Chill Lo-Fi & Focus Music Player**:
   - Synthesizes ambient lo-fi coding soundscapes natively via the **Web Audio API** (zero external MP3 files needed; zero latency).
   - 4 Ambient soundscapes: `Midnight Lo-Fi`, `Cyber Synthwave`, `Chill Coffee Beats`, and `Rain Ambient Focus`.
   - Equalizer waveform visualizer, spinning vinyl disc animation, volume slider, and mini-controls in the top strip.
   - Auto-plays ambient focus beats when the island expands.

5. **Live Digital Clock & Weather Widget**:
   - Displays real-time hours:minutes:seconds digital clock in the drawer header and pill.
   - Live temperature and weather condition fetched via `/api/weather` with custom city customization in Settings.

6. **Quick 1-Click App Launcher**:
   - One-click launch chips for **Terminal**, **VS Code**, **Web Browser**, and **File Manager** with clean vector SVG icons.
   - Invokes native desktop system commands with instant haptic audio feedback.

7. **Audio Notification Sounds & Haptics**:
   - Synthesized dual-tone completion chimes on agent success.
   - Tri-tone attention pulses on permission/approval requests.
   - Haptic click feedback on button presses and drawer expansion.
   - Sound toggle and test chime button in Settings.

8. **Direct Gemini Assistant & Safety Review**:
   - Quick chat with **Gemini 2.5 Flash** directly from the island drawer with SVG quick prompt chips.
   - Drag-and-drop file inspection into the island.
   - **"Ask Gemini Review"**: With one click on any pending approval, Gemini analyzes the pending command or file diff for security and destructive risks before you allow it.

9. **Universal Hook Bus (Linux & Windows)**:
   - **Linux**: Unix Domain Socket at `/tmp/coucou.sock` (supporting both `socat` and `nc -U`) + local HTTP at `http://127.0.0.1:4141/api/hook`.
   - **Windows**: HTTP at `http://127.0.0.1:4141/api/hook` or Named Pipe `\\.\pipe\coucou`.

10. **Dual Theme Palette: Clean White Mode & Pitch-Black OLED**:
    - **White Mode**: Elegant ceramic white island pill, pure crisp surfaces, slate-900 typography, subtle borders, high contrast.
    - **Pitch-Black OLED Mode**: Deepest pure pitch black (`#000000`) with glass rim reflection matching Apple and hardware notches.
    - 1-click toggle directly in the top header bar or via Settings.

11. **Modern Feather SVG Vector Icons**:
    - 100% replaced all text emojis with crisp, high-DPI inline vector SVG icons for Weather, App Launchers, Music, Audio controls, Themes, and Quick Chips.

12. **Local SQLite Audit Storage**:
    - Built with native `node:sqlite` in Node.js core. Zero external C dependencies.
    - Persists sessions, events, approvals, and chat logs locally in `~/.loly/loly.db` (Linux) and `%USERPROFILE%\.loly\loly.db` (Windows).

---

## 🚀 How to Run the Project

### Prerequisites
- **Node.js** (v22+ or v24+ recommended, already available).
- Modern web browser (Chrome, Edge, Firefox, Brave).

### Step 1: Start the Background Daemon & Server

```bash
cd /home/madara/Documents/loly
npm start
```

The server starts immediately and displays:
```
=======================================================
  Loly - AI Coding Agent Desktop Companion & Island   
  HTTP Web Server: http://127.0.0.1:4141              
  [Socket Server] IPC Listening at: /tmp/coucou.sock
=======================================================
```

### Step 2: Open as a Floating Screen Island

#### Option A: Native Desktop App (Recommended)
Run the native transparent Dynamic Island app with always-on-top, auto-resize, global hotkey (`Ctrl+Shift+L` / `Cmd+Shift+L`), and system tray:

```bash
npm run electron
```
*(Starts the embedded background daemon automatically and floats the island at top-center of your screen)*

#### Option B: Linux Standalone Universal AppImage & Binary

You can run Loly on any Linux distribution (Ubuntu 22.04+, 24.04+, Kali Linux, Debian 12+, Arch, Fedora):

1. **Universal AppImage (Zero configuration needed - Works with or without libfuse2)**:
   ```bash
   ./dist/Loly-1.0.0.AppImage
   # or
   ./dist/Loly.AppImage
   ```
   *(Features automatic runtime fallback: detects if `libfuse2` is absent on modern FUSE3-only distros and runs immediately without errors)*

2. **Direct Unpacked Linux Binary**:
   ```bash
   ./dist/linux-unpacked/loly
   # or simply:
   npm run app:linux
   ```

#### Option C: Windows Executable (.exe)
Full Windows support is verified and pre-built in `dist/`:
- **Portable**: `dist/Loly 1.0.0.exe` (double-click to run on Windows without installing)
- **Installer**: `dist/Loly Setup 1.0.0.exe` (one-click NSIS installation)
- **Unpacked Folder**: `dist/win-unpacked/Loly.exe`

Windows features:
- Windows Named Pipes (`\\.\pipe\coucou`) and Local HTTP (`http://127.0.0.1:4141`)
- Native Windows command launches (`start cmd.exe`, `code .`, `explorer .`)
- Automatic window resizing with smooth top-screen anchor
- Local SQLite database in `%USERPROFILE%\.loly\loly.db`

#### Option D: Chrome App Mode (Borderless)
To launch Loly as a lightweight borderless window without Electron:

```bash
npm run desktop
```

#### Option E: In Any Web Browser
Simply open:
```
http://127.0.0.1:4141
```

---

## 📦 Building Standalone Binaries (Linux & Windows)

You can build new releases with a single command:

- **Build Linux AppImage**:
  ```bash
  npm run dist:linux
  ```
  Produces: `dist/Loly-1.0.0.AppImage`

- **Build Windows Executables (.exe)**:
  ```bash
  npm run dist:win
  ```
  Produces: `dist/Loly Setup 1.0.0.exe` (Installer) and `dist/Loly 1.0.0.exe` (Portable)

- **Build Both Simultaneously**:
  ```bash
  npm run dist
  ```

---

## 🔑 Configuring Google Gemini API

You can configure your Gemini API key in either of two ways:

1. **Environment Variable (Recommended):**
   ```bash
   export GEMINI_API_KEY="AIzaSy..."
   npm start
   ```

2. **Directly in the Island UI:**
   - Click the island pill to open the drawer.
   - Go to **Audit & Settings** tab.
   - Enter your key and click **Save Key** (saved securely in server memory).
   - Select your preferred model (e.g. `gemini-2.5-flash` or `gemini-1.5-pro`).

---

## 🔌 Connecting AI Coding Agents

### 1. Quick In-App Simulator
You can test all scenarios with one click inside the app:
- Open the drawer -> click **Hook Simulator**.
- Click **Bash Command Approval**, **File Modification Diff**, **Multiple-Choice Prompt**, or **Agent Success Celebration**.

### 2. Automated Multi-Step Demo
In a second terminal, run:
```bash
npm run simulate
```
This automatically simulates an agent analyzing files, writing code with a diff, and requesting bash approval.

### 3. Real Agent Integration via HTTP or CLI Hook

#### In Bash or Shell Scripts:
```bash
./hooks/coucou-hook.sh "my-agent" "Building assets" "npm run build"
```

To halt the terminal until you click **Allow** on your screen:
```bash
./hooks/coucou-hook.sh "claude-code" "Run migration" "alembic upgrade head" sync
```

#### In Python Scripts:
```bash
python3 hooks/coucou-hook.py --agent gemini-cli --title "Linting" --target "flake8 ."
```

#### Using `curl` directly:
```bash
curl -X POST http://127.0.0.1:4141/api/hook \
  -H "Content-Type: application/json" \
  -d '{
    "coucou_agent": "gemini-cli",
    "title": "Editing files",
    "target": "src/app.py",
    "diff": {
      "file": "src/app.py",
      "added": 14,
      "removed": 2,
      "content": "@@ -10,2 +10,14 @@\n- old_func()\n+ new_secure_func()"
    },
    "requires_approval": true
  }'
```

#### Using Unix Domain Socket (`nc` on Linux):
```bash
echo '{"coucou_agent":"antigravity","title":"Analyzing tests","target":"pytest"}' | nc -U /tmp/coucou.sock
```

---

## 📁 Project Architecture

```
/home/madara/Documents/loly/
├── package.json          # Project metadata & launch scripts
├── server.js             # HTTP, SSE real-time stream, Unix socket, & API router
├── db.js                 # Native node:sqlite storage for sessions, approvals, events
├── gemini.js             # Direct Google Gemini API client (chat, review, multimodal)
├── public/
│   ├── index.html        # Clean semantic HTML5 floating island & companion
│   ├── style.css         # Strict white-mode monochrome stylesheet (responsive)
│   └── app.js            # Eye tracking, SSE live listener, diff viewer, chat
├── hooks/
│   ├── coucou-hook.sh    # Fast bash hook for Linux/macOS
│   ├── coucou-hook.py    # Cross-platform Python hook for Linux/Windows
│   └── test-agent.js     # End-to-end simulated agent lifecycle runner
└── instruction.md        # Comprehensive documentation
```

---

## 🛡️ Security Guarantees
- Localhost only (`127.0.0.1`). Does not listen on `0.0.0.0`.
- Parameterized SQLite queries preventing SQL injection.
- Zero raw `innerHTML` injections on client side (framework-native safe DOM).
- API keys never persisted in plaintext git commits.
