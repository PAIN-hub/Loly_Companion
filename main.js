import { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './server.js'; // Start embedded backend daemon automatically

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let settingsWindow = null;
let tray = null;

// Authentic Dynamic Island Notch Dimensions
const COLLAPSED_WIDTH = 420;
const COLLAPSED_HEIGHT = 46;
const EXPANDED_WIDTH = 680;
const EXPANDED_HEIGHT = 540;

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

  // Load from local daemon server
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

app.whenReady().then(() => {
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
