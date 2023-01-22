const { contextBridge, ipcRenderer } = require("electron");
const unhandled = require("electron-unhandled");

contextBridge.exposeInMainWorld("electronAPI", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  sendNotification: (notificationText) =>
    ipcRenderer.send("sendNotification", notificationText),

  /* ### PLEASE VALIDATE
   * @Louis, we can use this syntax to make the preload less complex.
   * Functions can be called via the channel property
   */
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ["notify", "show"]; // List of valid channels / OPTIONAL validation
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data); // Send data to channel in main process
    }
  },
  receive: (channel, func) => {
    // Two-way communication. Send data back from main to renderer
    /*
     * HERE, the validation is disabled, so all dynamically created channel can be used
     */
    //let validChannels = ["notification-clicked"];
    //if (validChannels.includes(channel)) {
    // Deliberately strip event as it includes `sender`
    ipcRenderer.on(channel, (event, ...args) => func(...args));
    //}
  },
  /*
   * End of validation
   */

  openStandardStripeSub: (notificationText) =>
    ipcRenderer.send("openStandardStripeSub", notificationText),
  openProStripeSub: (notificationText) =>
    ipcRenderer.send("openProStripeSub", notificationText),
  openExecutiveStripeSub: (notificationText) =>
    ipcRenderer.send("openExecutiveStripeSub", notificationText),
  openManageSub: (notificationText) =>
    ipcRenderer.send("openManageSub", notificationText),
  openTermsAndConditions: (notificationText) =>
    ipcRenderer.send("openTermsAndConditions", notificationText),
  trackEvent: (eventName, eventProps, userId) =>
    ipcRenderer.send("trackEvent", eventName, eventProps, userId),
  // identify user
  identifyUser: (userId, traits) =>
    ipcRenderer.send("identifyUser", userId, traits),
  clearStore: () => ipcRenderer.send("clearStore"),
  copyToClipboard: (notificationText) =>
    ipcRenderer.send("copyToClipboard", notificationText),
  checkMicrophonePermissions: () =>
    ipcRenderer.send("checkMicrophonePermissions"),
  toggleTrayIcon: (state) => ipcRenderer.send("toggleTrayIcon", state),
  setAutoStart: (state) => ipcRenderer.send("setAutoStart", state),
  getAutoStart: (state) => ipcRenderer.send("getAutoStart", state),
  returnAutoStart: (state) => ipcRenderer.on("returnAutoStart", state),
  stopMeeting: (state) => ipcRenderer.once("stopMeeting", state),

  quitApp: () => ipcRenderer.send("quitApp"),
  openGoogleOAuthUrl: (url) => ipcRenderer.send("openGoogleOAuthUrl", url),
  returnPlatFormCheck: (state) => ipcRenderer.on("returnPlatFormCheck", state),
  getPlatfromCheck: () => ipcRenderer.send("getPlatfromCheck"),
  checkForAutoUpdates: () => ipcRenderer.send("checkForAutoUpdates"),
  checkEventUpdateDownload: () => ipcRenderer.send("checkEventUpdateDownload"),
  checkForMajorVersionUpdate: () => ipcRenderer.send("checkForMajorVersionUpdate"),
  notifyMajorUpdateCompletion: (state) => ipcRenderer.on("notifyMajorUpdateCompletion", state),
  // ipcRenderer.on("update_available", () => {
  //   ipcRenderer.removeAllListeners("update_available");
  // }),
  // downloadAutoUpdates: () =>
  //   ipcRenderer.on("update_downloaded", () => {
  //     ipcRenderer.removeAllListeners("update_downloaded");
  //     message.innerText =
  //       "Update Downloaded. It will be installed on restart. Restart now?";
  //   })
  // askForMicrophoneAccess: () => ipcRenderer.invoke("askForMicrophoneAccess")
  // getVideoSources: () => {
  //   ipcRenderer.send("getVideoSources");
  //   ipcRenderer.on('SET_SOURCE', async (event, sourceId) => {
  //     try {
  //       const stream = await navigator.mediaDevices.getUserMedia({
  //         audio: false,
  //         video: {
  //           mandatory: {
  //             chromeMediaSource: 'desktop',
  //             chromeMediaSourceId: sourceId,
  //             minWidth: 1280,
  //             maxWidth: 1280,
  //             minHeight: 720,
  //             maxHeight: 720
  //           }
  //         }
  //       })
  //       // handleStream(stream)
  //       const video = document.querySelector('video')
  //       video.srcObject = stream
  //       video.onloadedmetadata = (e) => video.play()
  //     } catch (e) {
  //       // handleError(e)
  //       console.log(e)
  //     }
  //   })
  // },
  // getHello: () =>
  //   // ipcRenderer.send("getHello"),
  //   ipcRenderer.send('getHello', function (event, store) {
  //     console.log(store);
  //   })
});

// catching errors
unhandled({
  showDialog: false
});

// disallowing to drop images in electron
document.addEventListener(
  "dragover",
  function (event) {
    event.preventDefault();
    return false;
  },
  false
);

document.addEventListener(
  "drop",
  function (event) {
    event.preventDefault();
    return false;
  },
  false
);
