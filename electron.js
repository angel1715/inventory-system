const { app, BrowserWindow } = require("electron");

const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,

    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: false,
    },
  });

  win.loadURL("http://localhost:3001");
}

app.whenReady().then(() => {
  createWindow();
});