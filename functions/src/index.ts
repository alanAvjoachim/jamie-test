import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import * as authGroup from "./api/auth";
import * as audioGroup from "./api/audio";
import * as stripeGroup from "./api/stripe";
import * as summaryGroup from "./api/summary";

// eslint-disable-next-line max-len
import { manualSummaryRetryTriggerHandler } from "./api/manualSummaryRetryTrigger.f";
import { meetingsUsedThisMonthHandler } from "./meetingsUsedThisMonth.f";
import * as updateVersionHandlerr from "./versionUpdate.f";
import * as managementEndpointHandler from "./managementEndpoint.f";
// eslint-disable-next-line max-len
// const envProjectId = JSON.parse(process.env.FIREBASE_CONFIG ?? "")?.projectId;

// if (envProjectId === "jamie-core-staging") {
//   admin.initializeApp({
//     storageBucket: "jamie-core-staging.appspot.com"
//   });
// } else if (envProjectId === "jamie-core") {
//   admin.initializeApp({
//     storageBucket: "jamie-core-staging.appspot.com"
//   });
// }

const projectId = process.env.GCLOUD_PROJECT;

admin.initializeApp({
  storageBucket: projectId + ".appspot.com"
});

// admin.initializeApp(functions.config().firebase);

exports.auth = authGroup;
exports.audio = audioGroup;
exports.stripe = stripeGroup;
exports.summary = summaryGroup;

/*
export const handleAudioUpload = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .storage.object()
  .onFinalize(audioHandler.handler);
*/

/*
exports.generateSummaryTrigger = functions
  .region("europe-west1")
  .firestore.document("meetings/{meetingId}")
  .onUpdate(generateSummaryTriggerHandler);

  */

// run a cloud function every hour
exports.manualSummaryRetryTrigger = functions
  .region("europe-west1")
  .pubsub.schedule("every 60 minutes")
  .onRun(manualSummaryRetryTriggerHandler);

exports.meetingsUsedThisMonth = functions
  .region("europe-west1")
  .firestore.document("meetings/{meetingId}")
  .onCreate(meetingsUsedThisMonthHandler);

export const updateUserVersion = functions
  .region("europe-west1")
  .https.onCall(updateVersionHandlerr.handler);

exports.managementEndpoint = functions
  .region("europe-west1")
  .https.onRequest(managementEndpointHandler.handler);

// exports.captureAdditionalPayments = functions
//   .region("europe-west1")
// eslint-disable-next-line max-len
//   // .pubsub.schedule("0 0 23 L * ?") At 11:00 PM, on the last day of the month
//   .pubsub.schedule("0 0 1 * *") //  At 12:00 AM, on day 1 of the month
//   .timeZone("Europe/Helsinki")
//   .onRun(captureAdditionalPaymentHandler);
// // .https.onRequest(captureAdditionalPaymentHandler);
