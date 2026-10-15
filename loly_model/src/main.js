/**
 * Electron Main Process
 * Creates a transparent, frameless desktop companion window for Loly
 */

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 320;
  const windowHeight = 440;

  // Position at bottom right corner of the primary display
  const posX = Math.max(0, screenWidth - windowWidth - 40);
  const posY = Math.max(0, screenHeight - windowHeight - 40);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: posY,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'companion.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for secure window management
ipcMain.on('loly:window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('loly:window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('loly:window-always-on-top', (event, alwaysOnTop) => {
  if (mainWindow && typeof alwaysOnTop === 'boolean') {
    mainWindow.setAlwaysOnTop(alwaysOnTop);
  }
});

// Dynamic Island Linux / Desktop Window Resizing Fix
ipcMain.on('loly:island-resize', (event, { expanded, width, height }) => {
  if (!mainWindow) return;

  const currentBounds = mainWindow.getBounds();
  const targetWidth = width || (expanded ? 340 : 290);
  const targetHeight = height || (expanded ? 500 : 64);

  // Smoothly adjust position so expanding upward/leftward preserves anchor
  const deltaHeight = targetHeight - currentBounds.height;
  const newY = Math.max(10, currentBounds.y - deltaHeight);
  const deltaWidth = targetWidth - currentBounds.width;
  const newX = Math.max(10, currentBounds.x - deltaWidth);

  mainWindow.setResizable(true);
  mainWindow.setBounds({
    x: newX,
    y: newY,
    width: targetWidth,
    height: targetHeight
  }, true);
  mainWindow.setResizable(false);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
