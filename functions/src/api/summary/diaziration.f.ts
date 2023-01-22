import * as admin from "firebase-admin";
const fetch = require("node-fetch");
import * as fs from "fs";
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
import { MeetingStatus } from "../../shared/types";
import { analytics } from "../../shared/segment";

export async function handler(message: any) {
  const object = message.json.bucketObject;

  // Init
  const bucket = storage.bucket(object.bucket);
  const now = Date.now();
  const supportedContentType = object.contentType?.split("/")[1];

  // Create download folder
  if (!fs.existsSync("/tmp/downloads")) fs.mkdirSync("/tmp/downloads");
  const path = "/tmp/downloads/" + now + "." + supportedContentType;

  // Download object from Cloud Storage and process
  await bucket
    .file(object.name)
    .download({ destination: path })
    .then(async () => {
      const objectPath = object.name.split("/");
      const meetingId = objectPath[0];
      const audioChunkId = objectPath[1].split("_")[0];

      // get meeting doc
      // eslint-disable-next-line max-len
      const meetingRef = admin
        .firestore()
        .collection("meetings")
        .doc(meetingId);
      const status: MeetingStatus = "diarizingAndTranscribing";
      await meetingRef.update({
        status,
        diarizationStatus: "inProgress"
      });

      // eslint-disable-next-line max-len
      console.log(
        "processing audio for meeting: " +
          meetingId +
          ". audioChunkId: " +
          audioChunkId
      );

      // Implementation with node-fetch@2
      // Read audio
      const audioBase64 = await audioToBase64(path);

      // define webhook url based whether running locally or in prod
      const webhookUrl =
        process.env.NODE_ENV == "production" ?
          "https://europe-west1-jamie-core-dev.cloudfunctions.net/summary-diarizationComplete" : // eslint-disable-next-line max-len
          process.env.NGROK_ENPOINT +
            "/jamie-core-staging/europe-west1/summary-diarizationComplete";

      // Replicate
      // eslint-disable-next-line max-len
      const prediction = await fetch(
        "https://api.replicate.com/v1/predictions",
        {
          headers: {
            "Content-Type": "application/json",
            // eslint-disable-next-line quote-props
            Authorization: "Token 204b60c83078425f821995f049d0d9fcf7199749"
          },
          method: "POST",
          body: JSON.stringify({
            // eslint-disable-next-line max-len
            version:
              // eslint-disable-next-line max-len
              "874b6d246003ff2d471a0d6a61a8c284608f57a8e94a5fe202fee9368fb9b04e",
            input: {
              audio: "data:audio/webm;base64," + audioBase64,
              audioChunkIndex: audioChunkId
            },
            webhook_completed: webhookUrl
          })
        }
      );

      const predictionRes = await prediction.json();
      console.log("prediction id replicate: " + predictionRes.id);

      // save prediction id in meeting doc
      await meetingRef.update({
        // eslint-disable-next-line max-len
        diarizationPredictionIds: admin.firestore.FieldValue.arrayUnion(
          predictionRes.id
        ),
        [`diarizationIdsToChunk.${predictionRes.id}`]: {
          audioChunkId,
          status: "processing"
        }
      });

      // get meeting doc
      const meeting = (await meetingRef.get()).data();

      // analytics
      await analytics.track({
        event: "diraziation-chunk-started",
        userId: meeting?.uid,
        properties: {
          meetingId,
          audioChunkId
        }
      });
      // Delete downloads
      fs.unlinkSync(path);
    });
}

async function audioToBase64(audioFile: any) {
  return fs.readFileSync(audioFile).toString("base64");
}
