/**
 * Electron Secure Preload Bridge
 * Follows least-privilege security principles: contextIsolation enabled, no raw IPC exposed.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronLoly', {
  /**
   * Close the companion window
   */
  close: () => {
    ipcRenderer.send('loly:window-close');
  },

  /**
   * Minimize the companion window
   */
  minimize: () => {
    ipcRenderer.send('loly:window-minimize');
  },

  /**
   * Toggle pinned always on top
   */
  setAlwaysOnTop: (alwaysOnTop) => {
    if (typeof alwaysOnTop === 'boolean') {
      ipcRenderer.send('loly:window-always-on-top', alwaysOnTop);
    }
  },

  /**
   * Dynamically resize Electron window for Dynamic Island (critical for Linux desktop window bounds)
   */
  setIslandExpanded: (expanded, width, height) => {
    ipcRenderer.send('loly:island-resize', {
      expanded: !!expanded,
      width: width || (expanded ? 340 : 290),
      height: height || (expanded ? 500 : 64)
    });
  }
});
