import * as admin from "firebase-admin";
const fetch = require("node-fetch");
import * as fs from "fs";
const { Storage } = require("@google-cloud/storage");
const { PubSub } = require("@google-cloud/pubsub");
const storage = new Storage();
import { analytics } from "./shared/segment";

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

      // Implementation with node-fetch@2
      // Read audio
      const audioBase64 = await audioToBase64(path);
      /*
      const data = {
        meetingId: meetingId,
        audioChunkId: audioChunkId,
        supportedContentType: "webm",
        audioBase64: audioBase64
      };
      */

      // Send request and wait for answer
      /*
      const response = await fetch(
        "https://jamie-audio-to-script-service-zjy2noi6eq-ey.a.run.app/audioToScript",
        {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      result = await response.json();
      */

      // Replicate
      // console.log(audioBase64);
      // eslint-disable-next-line max-len
      const prediction = await fetch(
        "https://api.replicate.com/v1/predictions",
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Token 204b60c83078425f821995f049d0d9fcf7199749"
          },
          method: "POST",
          body: JSON.stringify({
            // eslint-disable-next-line max-len
            version: "089ea17a12d0b9fc2f81d620cc6e686de7a156007830789bf186392728ac25e8",
            input: {
              audio: "data:audio/webm;base64," + audioBase64,
              model: "medium",
              translate: true
            }
          }),
        }
      );

      const predictionRes = await prediction.json();
      console.log("prediction id replicate: " + predictionRes.id);

      // retry counter, if it fails for 10+ times, throw error for retry
      let retryCounter = 0;

      // loop that calls a URL every 5 seconds to check for a status
      const checkStatus = async () => {
        const response = await fetch(
          "https://api.replicate.com/v1/predictions/" + predictionRes.id,
          {
            headers: {
              "Content-Type": "application/json",
              // eslint-disable-next-line max-len
              "Authorization": "Token 204b60c83078425f821995f049d0d9fcf7199749"
            },
            method: "GET",
          }
        );
        const data = await response.json();
        // console.log(data.status);
        if (data.status === "failed" || data.status === "canceled") {
          return false;
        } else if (data.status === "succeeded") {
          return data.output;
        } else {
          retryCounter++;

          // 80 retries x 5s = 400s ;function time out 500s
          if (retryCounter > 80) {
            console.error("retry limit exceeded for replicate");
            return false;
          }

          return new Promise((resolve) => {
            setTimeout(() => resolve(checkStatus()), 5 * 1000);
          });
        }
      };

      const predictionResult = await checkStatus();

      if (predictionResult) {
        const transcript = predictionResult.translation;
        // console.log(result);
        // eslint-disable-next-line max-len
        console.log("successfully got transcription. meeting: " + meetingId + " chunk: " + audioChunkId);

        // define new transcription chunk
        const chunk = {
          audioChunkId: audioChunkId,
          text: transcript,
          language: predictionResult.detected_language
        };

        // Get meeting doc in firestore
        const meetingRef = admin.firestore()
          .collection("meetings").doc(meetingId);

        const meetingDoc = await meetingRef.get();
        const meeting = meetingDoc.data();

        // add transcription chunk to array and increment processed chunks
        await meetingRef.update({
          meetingChunks: admin.firestore.FieldValue.arrayUnion(chunk),
          processedAudioChunks: admin.firestore.FieldValue.increment(1)
        });

        console.log("chunk count: " + meeting?.chunkCount);
        if (meeting?.chunkCount == (meeting?.processedAudioChunks + 1)) {
          console.log("all chunks have been processed: " + meetingId);
          await meetingRef.update({
            status: "summarising"
          });
          const userId = meeting?.uid;
          await analytics.identify({
            userId: userId
          });
          await analytics.track({
            event: "transcription-complete",
            userId: userId,
            properties: {
              meetingId: meetingId
            }
          });
          // Delete all audios from storage
          await bucket.deleteFiles({ prefix: `${meetingId}` });
        }
      } else {
        // put into pubsub retry pipeline
        // eslint-disable-next-line max-len
        console.error(new Error("transcription failed on first try. meetingId: " + meetingId + " audioChunkId: " + audioChunkId));
        // eslint-disable-next-line max-len
        console.log("transcription failed; adding to pubSub for retrial. meetingId: " + meetingId + " audioChunkId: " + audioChunkId);
        // seutp for retry pipeline
        // push a pubSub message to retry the audio to transcript pipeline
        const pubSubClient = new PubSub();
        await pubSubClient.topic("audioTranscriptionRetry")
          .publishJSON({
            meetingId,
            audioChunkId,
            objectPath,
            bucket: object.bucket,
            objectName: object.name
          });
        return;
      }

      // Delete downloads
      fs.unlinkSync(path);
    });
}

async function audioToBase64(audioFile: any) {
  return fs.readFileSync(audioFile).toString("base64");
}
