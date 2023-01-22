import * as admin from "firebase-admin";
import * as fs from "fs";
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
import { PubSub } from "@google-cloud/pubsub";

export async function handler(object: any) {
  // Check if the object is a folder
  if (object.contentType === "text/plain") {
    console.log("Not an audio: ", object.contentType);
    return;
  }
  // Init
  const bucket = storage.bucket(object.bucket);
  const now = Date.now();
  const supportedContentType = object.contentType?.split("/")[1];

  // Create download folder
  if (!fs.existsSync("/tmp/downloads")) fs.mkdirSync("/tmp/downloads");
  const path = "/tmp/downloads/" + now + "." + supportedContentType;

  // Download object from Cloud Storage and process
  await bucket.file(object.name).download({ destination: path })
    .then(async () => {
      const objectPath = object.name.split("/");
      const meetingId = objectPath[0];
      const audioChunkId = objectPath[1].split("_")[0];

      // eslint-disable-next-line max-len
      console.log("processing audio for meeting: " + meetingId + ". audioChunkId: " + audioChunkId);
      // get meeting doc
      // eslint-disable-next-line max-len
      const meetingRef = await admin.firestore().collection("meetings").doc(meetingId).get();
      const meeting = meetingRef.data();

      // get account
      // eslint-disable-next-line max-len
      const accountRef = await admin.firestore().collection("accounts").doc(meeting?.uid).get();
      const account = accountRef.data();

      // check account version
      if (account?.version === "2.0.0") {
        console.log("running new version (2.0.0)");
        // trigger new code
        const pubSubClient = new PubSub();
        await pubSubClient.topic("diarization")
          .publishJSON({
            bucketObject: object,
          });
      } else {
        console.log("running legacy version");
        // trigger legacy code
        const pubSubClient = new PubSub();
        await pubSubClient.topic("legacySummary")
          .publishJSON({
            bucketObject: object,
          });
      }
    });
}
