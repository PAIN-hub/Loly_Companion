const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  resizeIsland: (expanded) => ipcRenderer.invoke('resize-island', { expanded }),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  launchApp: (appName) => ipcRenderer.invoke('launch-app', { appName }),
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window')
});
