// require("dotenv").config();
const { notarize } = require("electron-notarize");

// import * as notarize from "electron-notarize";

exports.default = async function notarizing(context) {
  console.log("Starting notarization");
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  // const appleId = "louis@louismorgner.com";
  const appName = context.packager.appInfo.productFilename;
  // const password = `@keychain:jamie_electron_application_apple`;

  try {
    await notarize({
      appBundleId: "ai.meetjamie.app",
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS
    });
    console.log("Notarization done");
  } catch (e) {
    console.log("Notarization failed");
    console.log(e);
  }
  return;
};
