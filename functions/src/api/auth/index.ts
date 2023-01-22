import * as functions from "firebase-functions";

import * as signInHandler from "./signIn.f";
import * as signUpHandler from "./signUp.f";
import * as verifyPinHandler from "./verifyPin.f";
import * as generateAuthUrlHandler from "./google/generateAuthUrl.f";
import * as handleGoogleAuthCallbackHandler
  from "./google/handleGoogleAuthCallback.f";

const envProjectId = JSON.parse(process.env.FIREBASE_CONFIG ?? "")?.projectId;

console.log("process", process.env.FIREBASE_CONFIG);
console.log("process", envProjectId);

export const signIn = functions
  .region("europe-west1")
  .runWith({
    minInstances: envProjectId === "jamie-core" ? 1 : 0
  })
  .https.onCall(signInHandler.handler);

export const signUp = functions
  .region("europe-west1")
  .runWith({
    minInstances: envProjectId === "jamie-core" ? 1 : 0
  })
  .https.onCall(signUpHandler.handler);

// generates a google oauth url
export const generateAuthUrl = functions
  .region("europe-west1")
  .runWith({
    minInstances: envProjectId === "jamie-core" ? 1 : 0
  })
  .https.onCall(generateAuthUrlHandler.handler);

// generates a google oauth url
export const handleGoogleAuthCallback = functions
  .region("europe-west1")
  .runWith({
    minInstances: envProjectId === "jamie-core" ? 1 : 0
  })
  .https.onRequest(handleGoogleAuthCallbackHandler.handler);

export const verifyPin = functions
  .region("europe-west1")
  .runWith({
    minInstances: envProjectId === "jamie-core" ? 1 : 0
  })
  .https.onCall(verifyPinHandler.handler);
