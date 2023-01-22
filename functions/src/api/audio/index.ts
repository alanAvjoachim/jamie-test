import * as functions from "firebase-functions";

import * as recordingHandler from "./recording.f";

export const handleAudioFilesFromElectronApp = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .https.onCall(recordingHandler.handler);
