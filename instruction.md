# 📖 Instructions — Running & Using Loly Companion

> Complete instructions on how to install, configure, run, build, and use **Loly Companion** on Linux, Windows, and Web.

---

## 📋 Table of Contents
1. [System Prerequisites](#1-system-prerequisites)
2. [Quickstart (Run in 1 Minute)](#2-quickstart-run-in-1-minute)
3. [Running as Native Desktop App (Electron)](#3-running-as-native-desktop-app-electron)
4. [Running Standalone Production Binaries (No Node.js Required)](#4-running-standalone-production-binaries)
   - [Windows Standalone (.exe)](#windows-standalone-exe)
   - [Linux Standalone (.AppImage / .deb)](#linux-standalone-appimage--deb)
5. [Configuring the Google Gemini API Key](#5-configuring-the-google-gemini-api-key)
6. [Testing Agent Integrations & Approvals](#6-testing-agent-integrations--approvals)
7. [Building Binaries from Source](#7-building-binaries-from-source)
8. [Database & Storage Details](#8-database--storage-details)
9. [Keyboard Shortcuts & Hotkeys](#9-keyboard-shortcuts--hotkeys)

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
👉 **`http://127.0.0.1:4141`**

---

## 3. Running as Native Desktop App (Electron)

To launch Loly as a transparent, floating screen island anchored at the top-center of your monitor with always-on-top positioning:

```bash
npm run electron
```

- **Global Hotkey**: Press `Ctrl + Shift + L` (Windows/Linux) or `Cmd + Shift + L` (macOS) to show/hide the island anytime.
- **System Tray**: An icon appears in your desktop system tray to quickly show, hide, open settings, or quit.

---

## 4. Running Standalone Production Binaries

If you prefer running standalone executables without Node.js installed:

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

## 5. Configuring the Google Gemini API Key

To enable real-time streaming chat, safety reviews, and file inspection:

1. Obtain a **free API key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Read the complete visual walkthrough in [**`GEMINI_API_GUIDE.md`**](GEMINI_API_GUIDE.md).
2. In Loly:
   - Click the **Gear icon (⚙)** in the top right to open **Settings**.
   - Paste your key in the **Gemini API Key** field.
   - Click **Save Settings**.
3. Or set it in your environment:
   ```bash
   export GEMINI_API_KEY="AIzaSyYourKeyHere"
   npm start
   ```

---

## 6. Testing Agent Integrations & Approvals

Loly includes a built-in agent simulation script to test events without running complex coding agents:

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
    "target": "rm -rf /dist",
    "requires_approval": true
  }'
```

Watch Loly's island expand to display `[ Allow ]`, `[ Deny ]`, and `[ Ask Gemini Review ]`!

---

## 7. Building Binaries from Source

To compile standalone binaries for Linux or Windows yourself:

```bash
# Build Linux AppImage and .deb:
npm run dist:linux

# Build Windows portable and installer:
npm run dist:win

# Build all platforms:
npm run dist:all
```
All outputs are generated into the `dist/` directory.

---

## 8. Database & Storage Details

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

## 9. Keyboard Shortcuts & Hotkeys

| Shortcut | Scope | Action |
|---|---|---|
| `Ctrl + Shift + L` | Global (OS) | Toggle Loly Island visibility |
| `Escape` | Window | Close expanded drawer / settings |
| `Enter` | Chat Input | Send message to Gemini / Loly |
| `Space` | Music Player | Play / pause procedural Lo-Fi track |

---

<div align="center">
  <sub>Official Documentation for Loly Companion • <a href="https://pain-hub.github.io/Loly_Companion/">Live Website</a></sub>
</div>
