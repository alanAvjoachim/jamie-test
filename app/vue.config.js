module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: "src/preload.js",
      // Or, for multiple preload files:
      // preload: { preload: 'src/preload.js', otherPreload: 'src/preload2.js' }
      builderOptions: {
        productName: "jamie",
        appId: "ai.meetjamie.app",
        win: {
          target: ["nsis"],
          icon: "public/icon.png",
          requestedExecutionLevel: "asInvoker" // requireAdministrator or asInvoker
        },
        mac: {
          category: "public.app-category.productivity",
          icon: "public/icon.png",
          hardenedRuntime: true,
          gatekeeperAssess: false,
          entitlements: "entitlements.mac.plist",
          entitlementsInherit: "entitlements.mac.plist",
        },
        dmg: {
          background: "public/installer_background.png"
        },
        nsis: {
          oneClick: true,
          allowToChangeInstallationDirectory: false,
          perMachine: false,
          runAfterFinish: true,
          deleteAppDataOnUninstall: true
        },
        squirrelWindows: {
          iconUrl : "public/icon.ico",
        }, 
        publish: [
          // "github"
          {
            provider: "github",
            private: false,
            owner: "louismorgner",
            repo: "jamie-release"
          }
        ],
        dmg: {
          sign: false
        },
        afterSign: "scripts/notarize.js"
      },
      
    }
  }
};
