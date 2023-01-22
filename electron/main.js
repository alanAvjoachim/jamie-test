/**
const { app, BrowserWindow } = require("electron");
const path = require("path");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

 */

// Menu bar package (https://github.com/maxogden/menubar)
const { menubar } = require("menubar");
const { BrowserWindow, app, ipcMain } = require("electron");

const path = require("path");
const indexDir = "file://" + path.join(__dirname, "dist/index.html");

const notifier = require("node-notifier");

app.on("ready", () => {
  ipcMain.on("sendNotification", sendNotification);

  const mb = menubar({
    // index: "http://localhost:5173/",
    index: indexDir,
    browserWindow: {
      width: 540,
      height: 680
    }
  });

  mb.on("ready", () => {
    console.log("app is ready");
    // your app code here
  });
});

// implementation of ipc bridge
function sendNotification(event, notificationText) {
  console.log("test");
  // const notification = new Notification("Test");
  // notification.show();
  // String
  try {
    let not = notifier.notify("Message: " + notificationText);
    console.log(not);
  } catch (e) {
    console.log(e);
  }
}
