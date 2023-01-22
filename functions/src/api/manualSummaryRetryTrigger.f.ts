const { PubSub } = require("@google-cloud/pubsub");
import * as admin from "firebase-admin";

// eslint-disable-next-line max-len
export async function manualSummaryRetryTriggerHandler() {
  // query the database for meetings with the status "manual-summary-trigger"
  const meetingsRef = admin.firestore()
    .collection("meetings")
    .where("status", "==", "manual-summary-trigger")
    .where("manualSummaryTriggerTime", "<=", admin.firestore.Timestamp.now());

  const meetingsSnapshot = await meetingsRef.get();

  // await loop through the meetings and trigger the manual summary pipeline
  for (const meetingDoc of meetingsSnapshot.docs) {
    const meetingId = meetingDoc.id;

    console.log("starting retry for meeting: " + meetingId);
    // trigger summary
    const pubsub = new PubSub();
    await pubsub.topic("generateSummary")
      .publishJSON({
        meetingId
      });
  }
}

