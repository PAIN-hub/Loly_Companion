import { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js'; // Start embedded backend daemon automatically

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let settingsWindow = null;
let tray = null;

// Authentic Dynamic Island Notch Dimensions
const COLLAPSED_WIDTH = 540;
const COLLAPSED_HEIGHT = 58;
const EXPANDED_WIDTH = 740;
const EXPANDED_HEIGHT = 580;

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const winWidth = 840;
  const winHeight = 660;
  const posX = Math.round((screenWidth - winWidth) / 2);
  const posY = Math.max(60, Math.round((screenHeight - winHeight) / 2));

  settingsWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: posX,
    y: posY,
    title: 'Loly — Settings & Full Control Center',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadURL('http://127.0.0.1:4141/settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createIslandWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const posX = Math.round((screenWidth - COLLAPSED_WIDTH) / 2);
  const posY = 0; // Anchor flush to top bezel like real hardware notch

  mainWindow = new BrowserWindow({
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_HEIGHT,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Global resize hook accessible by both IPC and HTTP fallback
  globalThis.__lolyResizeIsland = (expanded) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const display = screen.getPrimaryDisplay();
    const screenWidth = (display.bounds && display.bounds.width) || display.workAreaSize.width;
    const targetWidth = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
    const targetHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    const targetX = Math.round((screenWidth - targetWidth) / 2);

    mainWindow.setResizable(true);
    mainWindow.setBounds({ x: targetX, y: 0, width: targetWidth, height: targetHeight });
    mainWindow.setSize(targetWidth, targetHeight);
    mainWindow.setPosition(targetX, 0);
  };

  // Load from local daemon server with fail-safe retry for packaged runs
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn(`[Loly Electron] Load failed (${errorCode}: ${errorDescription}). Retrying in 400ms...`);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://127.0.0.1:4141');
      }
    }, 400);
  });
  mainWindow.loadURL('http://127.0.0.1:4141');

  // Handle Dynamic Island Resize on Drawer Expand/Collapse
  ipcMain.handle('resize-island', (event, { expanded }) => {
    if (globalThis.__lolyResizeIsland) {
      globalThis.__lolyResizeIsland(expanded);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('launch-app', async (event, { appName }) => {
    try {
      const isWin = process.platform === 'win32';
      let cmd = '';
      if (appName === 'terminal') {
        cmd = isWin ? 'start cmd.exe' : 'x-terminal-emulator || gnome-terminal || konsole || xterm &';
      } else if (appName === 'vscode') {
        cmd = 'code . &';
      } else if (appName === 'browser') {
        cmd = isWin ? 'start https://google.com' : 'xdg-open https://google.com &';
      } else if (appName === 'files') {
        cmd = isWin ? 'explorer .' : 'xdg-open . &';
      }
      if (cmd) {
        const { exec } = await import('node:child_process');
        exec(cmd);
        return { success: true };
      }
      return { success: false, error: 'Unknown app' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('minimize-app', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('close-app', () => {
    app.quit();
  });

  ipcMain.handle('open-settings-window', () => {
    createSettingsWindow();
    return { success: true };
  });

  // Native Audio File Picker for Linux & Windows
  ipcMain.handle('select-audio-files', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { files: [] };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio Files for Loly Library',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
      ]
    });
    if (canceled || !filePaths || filePaths.length === 0) return { files: [] };
    const files = [];
    for (const fp of filePaths) {
      try {
        const buf = fs.readFileSync(fp);
        const ext = path.extname(fp).slice(1).toLowerCase();
        const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : `audio/${ext}`;
        files.push({
          name: path.basename(fp),
          type: mime,
          size: buf.length,
          dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
          base64: `data:${mime};base64,${buf.toString('base64')}`
        });
      } catch (err) {
        console.warn('Read audio file error:', err);
      }
    }
    return files;
  });

  // Native Audio Folder Picker
  ipcMain.handle('select-audio-folder', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { files: [] };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder containing Audio Tracks',
      properties: ['openDirectory']
    });
    if (canceled || !filePaths || filePaths.length === 0) return { files: [] };
    const dir = filePaths[0];
    const files = [];
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fp = path.join(dir, entry);
        const stat = fs.statSync(fp);
        if (stat.isFile() && /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(entry)) {
          const buf = fs.readFileSync(fp);
          const ext = path.extname(fp).slice(1).toLowerCase();
          const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : `audio/${ext}`;
          files.push({
            name: entry,
            type: mime,
            size: buf.length,
            dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
            base64: `data:${mime};base64,${buf.toString('base64')}`
          });
        }
      }
    } catch (err) {
      console.warn('Read audio folder error:', err);
    }
    return files;
  });

  // Physical window retraction for auto-hide in Electron
  ipcMain.handle('set-island-retracted', (event, { retracted }) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
    const cur = mainWindow.getBounds();
    if (retracted) {
      mainWindow.setBounds({ x: cur.x, y: -48, width: cur.width, height: COLLAPSED_HEIGHT });
    } else {
      mainWindow.setBounds({ x: cur.x, y: 0, width: cur.width, height: cur.height });
    }
    return { success: true };
  });

  // Ensure microphone & speech permissions are granted
  try {
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media') return true;
      return false;
    });
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') return callback(true);
      callback(false);
    });
  } catch (_) {}

  // Global Shortcut: Ctrl+Shift+L to toggle Island
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Setup simple Tray
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'public', 'icon.png'));
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show/Hide Island',
        click: () => {
          if (mainWindow.isVisible()) mainWindow.hide();
          else mainWindow.show();
        }
      },
      { type: 'separator' },
      { label: 'Quit Loly', click: () => app.quit() }
    ]);
    tray.setToolTip('Loly — AI Agent Screen Companion');
    tray.setContextMenu(contextMenu);
  } catch (_) {}
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error('[Loly Electron] Server startup note:', err);
  }
  createIslandWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createIslandWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
