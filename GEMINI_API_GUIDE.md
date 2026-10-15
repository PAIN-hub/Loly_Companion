# 🔑 How to Acquire & Configure Your Google Gemini API Key

> Step-by-step guide to get a **free Google Gemini API key** and connect it to **Loly Companion** in under 2 minutes.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Step 1: Get Your Free API Key from Google AI Studio](#-step-1-get-your-free-api-key-from-google-ai-studio)
3. [Step 2: Add Your Key to Loly Companion](#-step-2-add-your-key-to-loly-companion)
   - [Method A: Built-in Settings UI (Recommended)](#method-a-built-in-settings-ui-recommended)
   - [Method B: Environment Variable (CLI / Terminal)](#method-b-environment-variable-cli--terminal)
4. [Step 3: Verify & Test Your Setup](#-step-3-verify--test-your-setup)
5. [Supported Gemini Models](#-supported-gemini-models)
6. [Security Best Practices](#-security-best-practices)
7. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌟 Overview

Loly Companion uses the **Google Gemini API** to provide:
- **Instant AI Chat & Streaming Typewriter**: Chat directly with Loly from your desktop notch.
- **AI Safety & Command Review**: One-click analysis of dangerous CLI commands and file diffs before you approve them.
- **Multimodal File Analysis**: Inspect code, images, and text dropped into the island.

> 💡 **Good News**: Google AI Studio provides **free access** to Gemini models with generous rate limits (up to 15 requests per minute and 1,500 requests per day for free on Flash models). No credit card required!

---

## 🚀 Step 1: Get Your Free API Key from Google AI Studio

1. **Visit Google AI Studio**:
   Navigate to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey) in your web browser.

2. **Sign In**:
   Log in with your existing Google or Gmail account.

3. **Create New API Key**:
   - Click the blue **"Create API key"** (or **"Get API key"**) button.
   - Choose **"Create API key in new project"** (or select an existing Google Cloud project if you have one).
   - Google will immediately generate your secret key. It looks like:
     ```text
     AIzaSy...YourUnique39CharacterKey...
     ```

4. **Copy the Key**:
   - Click the **Copy** button to save it to your clipboard.
   - ⚠️ Keep this tab open until you test it in Loly.

---

## ⚙️ Step 2: Add Your Key to Loly Companion

You can configure your API key through either the graphical interface or via terminal environment variables:

### Method A: Built-in Settings UI (Recommended)

1. Launch Loly:
   - **Desktop App**: Open Loly from your applications menu or run `npm run electron` / `./Loly.AppImage`.
   - **Web Browser**: Run `npm start` and visit `http://127.0.0.1:4141`.
2. Click the **Gear icon (⚙)** in the top-right of the island to open **Settings**.
3. Locate the **Google Gemini API** section.
4. Paste your key (`AIzaSy...`) into the **Gemini API Key** field.
5. Select your default model (e.g. `gemini-2.5-flash` or `gemini-1.5-flash`).
6. Click **Save Settings**.
7. Loly will securely store your key locally in SQLite (`~/.loly/loly.db` on Linux or `%USERPROFILE%\.loly\loly.db` on Windows).

---

### Method B: Environment Variable (CLI / Terminal)

If you run Loly as a daemon or prefer managing credentials in your shell:

#### On Linux & macOS:
```bash
# Add to your current terminal session:
export GEMINI_API_KEY="AIzaSyYourKeyHere"

# Or add permanently to your shell profile (~/.bashrc or ~/.zshrc):
echo 'export GEMINI_API_KEY="AIzaSyYourKeyHere"' >> ~/.bashrc
source ~/.bashrc
```

#### On Windows (Command Prompt):
```cmd
setx GEMINI_API_KEY "AIzaSyYourKeyHere"
```

#### On Windows (PowerShell):
```powershell
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'AIzaSyYourKeyHere', 'User')
```

When `server.js` or `electron .` boots, Loly automatically detects and uses `process.env.GEMINI_API_KEY` if configured.

---

## ✅ Step 3: Verify & Test Your Setup

1. In Loly, click the **Chat mode** icon in the top notch or expand the drawer.
2. In the input capsule, type:
   ```text
   Hello Loly, are you connected?
   ```
3. Press **Enter** or click `↑`.
4. Loly's eyes will focus on the text, her mouth will animate, and she will stream back an instant response.
5. If you see the response, your Gemini API key is configured and working perfectly!

---

## 🧠 Supported Gemini Models

Loly Companion natively supports dynamic model listing and allows switching models on the fly directly inside the chat header:

| Model ID | Recommended For | Speed | Free Quota |
|---|---|---|---|
| `gemini-2.5-flash` | **Default / Best Experience**: Ultra fast, multimodal, 1M context | ⚡⚡⚡ Instant | Generous free tier |
| `gemini-1.5-flash` | Lightweight, reliable companion interactions | ⚡⚡⚡ Instant | Generous free tier |
| `gemini-1.5-pro` | Deep code review, complex diff reasoning & architecture | ⚡⚡ Fast | Generous free tier |
| `gemini-2.0-flash-exp` | Next-gen experimental reasoning & coding | ⚡⚡⚡ Instant | Experimental free tier |

> 💡 **Tip**: Click the refresh button (`↻`) beside the model dropdown in Loly to query Google's API for the latest available models registered to your key.

---

## 🔒 Security Best Practices

1. **Never Commit Keys to Git**:
   Loly's `.gitignore` automatically blocks `.env`, `credentials.json`, `loly.db`, and all secret files. Never push your raw API key to public repositories.

2. **Keys are Stored Locally**:
   Loly stores your configuration in your private local SQLite database on your device (`~/.loly/loly.db`). No telemetry, logs, or keys are ever sent to third-party tracking servers.

3. **Key Restrictions (Optional but Recommended)**:
   In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), you can restrict your API key to only allow calls to the **Generative Language API** for added security.

4. **Revoking Keys**:
   If you ever suspect your key was exposed, return to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey), click the trash icon next to the key, and create a fresh one.

---

## ❓ Troubleshooting & FAQs

### Q: I get an error saying `API key not valid. Please pass a valid API key.`
- **Check for spaces**: Ensure no extra leading or trailing spaces were copied when pasting.
- **Check activation**: Newly created Google AI Studio keys activate within 5-10 seconds. Wait a few moments and retry.

### Q: I get `429 Too Many Requests`
- You reached the per-minute limit on the free tier (15 RPM). Wait a minute or switch to another Flash model in the model selector.

### Q: Can I run Loly without a Gemini API key?
- **Yes!** All agent hook monitoring, terminal approvals (`Allow` / `Deny`), mascot cursor tracking, focus lo-fi music player, digital clock, and weather widgets work completely offline without an API key. The Gemini key is only needed when chatting with Loly or requesting AI code reviews.

---

[← Back to Main README](README.md) • [Download Releases](https://github.com/PAIN-hub/Loly_Companion/releases) • [Live GitHub Page](https://pain-hub.github.io/Loly_Companion/)
