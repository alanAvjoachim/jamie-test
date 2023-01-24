/* eslint-disable no-undef */
"use strict";

import {
  app,
  protocol,
  ipcMain,
  shell,
  BrowserWindow,
  clipboard,
  Notification,
  systemPreferences,
  globalShortcut,
  powerMonitor,
  autoUpdater,
  dialog 
} from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { menubar } from "menubar";
import * as unhandled from "electron-unhandled";
import * as path from "path";
// import { autoUpdater } from "electron-updater";
import * as Analytics from "analytics-node";
const Store = require("electron-store");
const store = new Store();
import * as os from "os";

// import * as getDoNotDisturb from "electron-notification-state";
// import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
const isDevelopment = process.env.NODE_ENV !== "production";

const analyticsDevKey = "LuBbQN6A5eUOO6jWUHrnmigNCS81HPQr";
const analyticsProdKey = "1FcPQhGSoucgrSTjm2dBrpoDPV7D0HtG";
const analyticsKey = isDevelopment ? analyticsDevKey : analyticsProdKey;
const analytics = new Analytics(analyticsKey);
let mb;
let win;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on("ready", async () => {
  /** 
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  
  */
  if (process.platform === "win32") {
    createWindow();
  } else if (process.platform === "darwin") {
    createMenuBarMain();
  }

  ipcMain.on("sendNotification", sendNotification);
  ipcMain.on("notify", notify);
  ipcMain.on("show", showApp);
  ipcMain.on("openStandardStripeSub", openStandardStripeSub);
  ipcMain.on("openProStripeSub", openProStripeSub);
  ipcMain.on("openExecutiveStripeSub", openExecutiveStripeSub);
  ipcMain.on("openManageSub", openManageSub);
  ipcMain.on("openTermsAndConditions", openTermsAndConditions);
  ipcMain.on("copyToClipboard", copyToClipboard);
  ipcMain.on("checkMicrophonePermissions", checkMicrophonePermissions);
  ipcMain.on("toggleTrayIcon", toggleTrayIcon);
  ipcMain.on("setAutoStart", setAutoStart);
  ipcMain.on("getAutoStart", getAutoStart);
  ipcMain.on("quitApp", quitApp);
  ipcMain.on("openGoogleOAuthUrl", openGoogleOAuthUrl);
  ipcMain.on("trackEvent", trackEvent);
  // identify user
  ipcMain.on("identifyUser", identifyUser);
  ipcMain.on("clearStore", clearStore);
  ipcMain.on("getPlatfromCheck", getPlatfromCheck);
  ipcMain.on("checkForAutoUpdates", checkForAutoUpdates);
  ipcMain.on("checkEventUpdateDownload", checkEventUpdateDownload);
  ipcMain.on("checkForMajorVersionUpdate", checkForMajorVersionUpdate);

  // decide how to open app; createWindow gives more error insights after build

  // createMenuBar();

  function platformCheckForPowerMonitor() {
    if (process.platform === "darwin") {
      mb.window.webContents.send("stopMeeting", true);
    } else if (process.platform === "win32") {
      win.webContents.send("stopMeeting", true);
    }
  }

  powerMonitor.on("suspend", () => {
    platformCheckForPowerMonitor();
  });

  powerMonitor.on("shutdown", () => {
    platformCheckForPowerMonitor();
  });

  powerMonitor.on("lock-screen", () => {
    platformCheckForPowerMonitor();
  });

  // if electron is in production
  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    createProtocol("app");
    // autoUpdater.checkForUpdatesAndNotify();
  }

  // initialize auto start
  setAutoStart();
  // initialize first run if mac os
  if (process.platform === "darwin") {
    isFirstRun();
  }
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

// notification bridge function
// eslint-disable-next-line no-unused-vars
function sendNotification(event, data) {
  console.log("triggered notification");
  // console.log("do not distrub state: " + getDoNotDisturb());
  new Notification({
    title: data.title,
    // subtitle: "Subtitle of the Notification",
    body: data.message,
    silent: false,
    icon: path.join(__dirname, "../public/icon.png"),
    hasReply: false,
    timeoutType: "never",
    // replyPlaceholder: "Reply Here",
    urgency: "critical",
    closeButtonText: "Close"
  }).show();
}

async function notify(event, data) {
  const notification = new Notification({
    title: data.title,
    body: data.body,
    silent: data.silent == undefined ? false : data.silent,
    icon: path.join(__dirname, "../public/icon.png")
  });
  notification.on("click", (event, args) => {
    mb.window.webContents.send(data.responseChannel.toString(), data);
  });
  notification.show();
}

function showApp() {
  mb.showWindow();
  win.showWindow();
}

function openStandardStripeSub(event, data) {
  let link = `https://buy.stripe.com/cN26p70O88uw6e44gg?prefilled_email=${data.email}&client_reference_id=${data.uid}`;
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // test key
    link = `https://buy.stripe.com/test_8wMbLX9eMgb9epWcMM?prefilled_email=${data.email}&client_reference_id=${data.uid}`;
  }
  shell.openExternal(link);
}

function openProStripeSub(event, data) {
  let link = `https://buy.stripe.com/bIYaFn40k124aukeUV?prefilled_email=${data.email}&client_reference_id=${data.uid}`;
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // test key
    link = `https://buy.stripe.com/test_dR6bLXfDagb91Da001?prefilled_email=${data.email}&client_reference_id=${data.uid}`;
  }
  shell.openExternal(link);
}

function openExecutiveStripeSub(event, data) {
  let link = `https://buy.stripe.com/14kbJr1Sc268byofZ0?prefilled_email=${data.email}&client_reference_id=${data.uid}`;
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // test key
    link = `https://buy.stripe.com/test_00g2bn2Qo9MLchO5km?prefilled_email=${data.email}&client_reference_id=${data.uid}}`;
  }
  shell.openExternal(link);
}

function openManageSub(event, data) {
  let link = `https://billing.stripe.com/p/login/5kA17S3oD2JseI0dQQ?prefilled_email=${data.email}`;
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // test key
    link = `https://billing.stripe.com/p/login/test_fZe6oq9zK91G0HC6oo?prefilled_email=${data.email}`;
  }
  shell.openExternal(link);
}

function openTermsAndConditions() {
  shell.openExternal("https://www.meetjamie.ai/terms");
}

function copyToClipboard(event, data) {
  // replace <br> with \n
  const filterOne = data.copy.replace(/<br\s*[\/]?>/gi, "\n");
  //replace <p></p> with \n
  const filterTwo = filterOne.replace(/<p><\/p>/gi, "\n");
  // strip html tags from string
  const plainText = filterTwo.replace(/(<([^>]+)>)/gi, "");
  // write html and plaintext to clipboard
  clipboard.write({ text: plainText, html: data.copy });
}

function setAutoStart(event, state) {
  // state is either "enabled" or "disabled"
  if (state) {
    try {
      store.set("settings.autoStart", state);

      if (state == "enabled") {
        console.log("auto start enabled");
        toggleAutoStart(true);
      } else {
        console.log("auto start disabled");
        toggleAutoStart(false);
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    // check if initial set up
    if (store.get("settings.autoStart") == undefined) {
      // set option
      console.log("initially setting auto start to true");
      toggleAutoStart(true);
    }
  }
}

function getAutoStart() {
  let autoStart = store.get("settings.autoStart");
  if (autoStart === undefined) {
    autoStart = "disabled";
    store.set("settings.autoStart", autoStart);
  }
  // console.log("autoStart", store.get("settings.autoStart"));
  return mb.window.webContents.send("returnAutoStart", autoStart);
}

function toggleAutoStart(isActive) {
  // set login items based on platform of user
  console.log("changing login items");
  app.setLoginItemSettings({
    openAtLogin: isActive
  });
}

function isFirstRun() {
  if (store.get("settings.firstRun") == undefined) {
    // send notification
    const notification = new Notification({
      title: "Welcome to jamie",
      body: "jamie is now in your top toolbar",
      icon: path.join(__dirname, "../public/icon.png")
    });
    notification.show();
    // set store value
    store.set("settings.firstRun", false);
  }
}

// catching errors
unhandled({
  showDialog: false
});

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    title: "jamie",
    // width: 540,
    // height: 690,
    // webPreferences: {
    //   // Use pluginOptions.nodeIntegration, leave this alone
    //   // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
    //   nodeIntegration: true,
    //   contextIsolation: true,
    //   icon: path.join(__dirname, "../public/favicon.ico"),
    //   preload: path.resolve(__dirname, "preload.js"),
    //   // disallow dev tools when in production
    //   devTools: process.env.WEBPACK_DEV_SERVER_URL ? true : false
    width: 540,
    minWidth: 470,
    height: 690,
    minHeight: 690,
    maxHeight: 690,
    webPreferences: {
      nodeIntegration: true, // process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: true, // !process.env.ELECTRON_NODE_INTEGRATION
      preload: path.resolve(__dirname, "preload.js"),
      // devTools: process.env.WEBPACK_DEV_SERVER_URL ? true : false
      devTools: true
    },
    showDockIcon: false, // os.type() == "Darwin" ? false : true,
    showOnAllWorkspaces: false,
    preloadWindow: true,
    icon: path.join(__dirname, "../public/IconTemplate.png")
  });

  win.webContents.on("did-finish-load", () => {
    let windowName = require("../package.json").name;
    win.setTitle(windowName);
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    // if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("jamie");
    // Load the index.html when not in development
    win.loadURL("jamie://./index.html");
    // autoUpdater.checkForUpdatesAndNotify();
  }

  win.once("ready-to-show", () => {
    // autoUpdater.checkForUpdatesAndNotify();
  });
}

function checkMicrophonePermissions() {
  const accessStatus = systemPreferences.getMediaAccessStatus("microphone");
  console.log(accessStatus);
  if (accessStatus == "granted") return true;
  else {
    // only ask for access on Darwin (mac) as windows is always true
    if (os.type() == "Darwin")
      systemPreferences.askForMediaAccess("microphone");
    return false;
  }
}
async function createMenuBarMain() {
  try {
    await new Promise((resolve) => {
      mb = menubar({
        index: process.env.WEBPACK_DEV_SERVER_URL
          ? process.env.WEBPACK_DEV_SERVER_URL
          : "app://./index.html",
        icon: path.resolve(__static, "IconTemplate.png"),
        browserWindow: {
          width: 550,
          minWidth: 470,
          height: 590,
          minHeight: 590,
          maxHeight: 590,
          webPreferences: {
            nodeIntegration: true, // process.env.ELECTRON_NODE_INTEGRATION,
            contextIsolation: true, // !process.env.ELECTRON_NODE_INTEGRATION
            preload: path.resolve(__dirname, "preload.js"),
            // devTools: process.env.WEBPACK_DEV_SERVER_URL ? true : false
            devTools: true
          }
        },
        // only show dock icon on windows (=when mac, don't show)
        showDockIcon: false, // os.type() == "Darwin" ? false : true,
        showOnAllWorkspaces: true,
        preloadWindow: true
      });
      const resolveMbOn = mb.on("ready", () => {
        console.log("app is ready");
        // your app code here
        // mb.tray.setImage(path.resolve(__static, "IconActiveTemplate.png")); // path.resolve(__static, "IconActiveTemplate.png");
      });
      resolve(resolveMbOn);
    });
  } catch (error) {
    console.log(error);
  }
}

function toggleTrayIcon(event, state) {
  // if state is "active", update icon to active
  if (state == "active") {
    try {
      if (process.platform === "win32") {
        win.setIcon(path.resolve(__static, "IconActiveTemplate.png"));
      } else if (process.platform === "darwin") {
        mb.tray.setImage(path.resolve(__static, "IconActiveTemplate.png"));
      }
    } catch (e) {
      console.log(e);
    }
  } else {
    try {
      if (process.platform === "win32") {
        win.setIcon(path.resolve(__static, "IconTemplate.png"));
      } else if (process.platform === "darwin") {
        mb.tray.setImage(path.resolve(__static, "IconTemplate.png"));
      }
    } catch (e) {
      console.log(e);
    }
  }
}

function quitApp() {
  app.quit();
}

function openGoogleOAuthUrl(event, url) {
  console.log(url);
  shell.openExternal(url);
}

function trackEvent(event, eventName, eventProps, userId) {
  console.log(store.get("user.cachedId"));
  console.log("EventName: ", eventName);
  console.log("EventProps: ", eventProps);
  console.log("UserId: ", userId);
  try {
    if (userId) {
      analytics.track({
        event: eventName,
        userId,
        properties: eventProps
      });
      store.set("user.cachedId", userId);
    } else {
      if (store.get("user.cachedId")) {
        analytics.track({
          event: eventName,
          userId: store.get("user.cachedId"),
          properties: eventProps
        });
      } else {
        analytics.track({
          event: eventName,
          anonymousId: "newUser",
          properties: eventProps
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}

// identify function
function identifyUser(event, userId, traits) {
  console.log("identifyUser: ", userId);
  try {
    analytics.identify({
      userId,
      traits
    });
  } catch (e) {
    console.error(e);
  }
  store.set("user.cachedId", userId);
}

function clearStore() {
  console.log("Store", store);
}

function getPlatfromCheck() {
  console.log(process.platform);
  mb.window.webContents.send("returnPlatFormCheck", process.platform);
  // return process.platform;
}
// check for auto updates every 6 hours
setInterval(() => {
  console.log("checking for updates");
  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    // autoUpdater.checkForUpdatesAndNotify();
  }
}, 1000 * 60 * 60 * 4);

// if in developmemt mode
if (!process.env.WEBPACK_DEV_SERVER_URL) {
  // remove refresh short cut
  app.on("browser-window-focus", function () {
    globalShortcut.register("CommandOrControl+R", () => {
      console.log("CommandOrControl+R is pressed: Shortcut Disabled");
    });
    globalShortcut.register("F5", () => {
      console.log("F5 is pressed: Shortcut Disabled");
    });
  });

  app.on("browser-window-blur", function () {
    globalShortcut.unregister("CommandOrControl+R");
    globalShortcut.unregister("F5");
  });
}

const log = require("electron-log");

function checkForAutoUpdates() {
  const server = "https://jamie-update-server.vercel.app/";
  const url = `${server}update/${process.platform}/${app.getVersion()}`;
  // autoUpdater.setFeedURL(url);
  const currentAppVersion = app.getVersion();
}

function splitAppVersion(appVersion) {
  const parts = appVersion.split(".");
  if (parts[parts.length - 1].includes("-")) {
    let lastPart = parts[parts.length - 1].split("-");
    return {
      major: parts[0] || "",
      minor: parts[1] || "",
      patch: lastPart[0] || "",
      suffix: lastPart[1] || ""
    };
  } else {
    return {
      major: parts[0] || "",
      minor: parts[1] || "",
      patch: parts[2] || ""
    };
  }
}

log.warn("Common log....");

setInterval(() => {
  autoUpdater
    .checkForUpdates()
    .then((res) => {
      console.log("checkForUpdates: ", res);
      log.warn("checkForUpdates: ", res);
    })
    .catch((err) => {
      console.log("ErrorOncheckForUpdates: ", res);
      log.warn("ErrorOncheckForUpdates: ", res);
    });
}, 6000);

autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
  log.warn("releaseName: ", releaseName);
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail:
      'A new version has been downloaded. Restart the application to apply the updates.',
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })
  if (currentAppVersion != releaseName) {
    const splitCurrentAppVersionResponse = splitAppVersion(currentAppVersion);
    const splitUpdatedAppVersionResponse = splitAppVersion(releaseName);
    if (
      splitCurrentAppVersionResponse.major !=
      splitUpdatedAppVersionResponse.major
    ) {
      console.log("Major version update has been made");
      checkForMajorVersionUpdate();
    } else if (
      splitCurrentAppVersionResponse.minor !=
      splitUpdatedAppVersionResponse.minor
    ) {
      const data = {
        title: "Version update",
        body: "Improved version available",
        silent: false
      };
      notify(null, data);
      console.log("Minor version update has been made");
    } else if (
      splitCurrentAppVersionResponse.patch !=
      splitUpdatedAppVersionResponse.patch
    ) {
      console.log("Patch version update has been made");
    }
  }
});

autoUpdater.on("error", (message) => {
  console.error("There was a problem updating the application");
  console.error(message);
  log.warn("Error....");
  log.warn(message);
});

autoUpdater.on("checking-for-update", () => {
  console.error("Checking for update....");
  log.warn("Checking for update....");
});

autoUpdater.on("update-available", () => {
  console.error("update-available....");
  log.warn("update-available....");
});

autoUpdater.on("update-not-available", () => {
  console.error("update-not-available....");
  log.warn("update-not-available....");
});

autoUpdater.on("before-quit-for-update", () => {
  console.error("before-quit-for-update....");
  log.warn("before-quit-for-update....");
});

const getFeedURLRes = autoUpdater.getFeedURL().then((res) => {
  console.log("getFeedURLRes: ", res);
  log.warn("getFeedURLRes: ", res);
});

const quitAndInstallLRes = autoUpdater.quitAndInstall().then((res) => {
  console.log("quitAndInstallLRes: ", res);
  log.warn("quitAndInstallLRes: ", res);
});

function checkEventUpdateDownload() {
  setInterval(() => {
    log.warn("update-downloaded event triggered....");
    log.warn(".........update-downloaded event triggered after update1....");
    log.warn(".........update-downloaded event triggered after update2....");
    log.warn(".........update-downloaded event triggered after update3....");
    console.log("update-downloaded event triggered....");
  }, 6000);
}

function checkForMajorVersionUpdate() {
  autoUpdater.quitAndInstall();
  const updateStatus = true;
  log.warn("checkForMajorVersionUpdate method triggered....");
  return mb.window.webContents.send(
    "notifyMajorUpdateCompletion",
    updateStatus
  );
}
