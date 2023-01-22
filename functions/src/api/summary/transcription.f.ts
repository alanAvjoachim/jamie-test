import * as admin from "firebase-admin";
import { analytics } from "../../shared/segment";

export async function handler(message: any) {
  const meetingId = message.json.meetingId;
  const audioChunkList = message.json.audioChunkList;
  const audioChunkId = message.json.audioChunkId;

  // eslint-disable-next-line max-len
  console.log(
    "starting transcribeAudioChunks for meeting: " +
      meetingId +
      " chunk: " +
      audioChunkId
  );

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  await meetingRef.update({
    transcriptionStatus: "inProgress"
  });

  // define webhook url based whether running locally or in prod
  const webhookUrl =
    // eslint-disable-next-line max-len
    process.env.NODE_ENV == "production" // eslint-disable-next-line operator-linebreak
      ? "https://europe-west1-jamie-core-dev.cloudfunctions.net/summary-transcriptionComplete" // eslint-disable-next-line max-len, operator-linebreak
      : process.env.NGROK_ENPOINT +
        "/jamie-core-staging/europe-west1/summary-transcriptionComplete";

  // replicate call
  const prediction = await fetch("https://api.replicate.com/v1/predictions", {
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line quote-props
      Authorization: "Token 204b60c83078425f821995f049d0d9fcf7199749"
    },
    method: "POST",
    body: JSON.stringify({
      // eslint-disable-next-line max-len
      version:
        "669af92d3a6a5eb60db8e22b26ebf1d9f6f496492e5664c60194f8126eb28a2d",
      input: {
        audioChunks: JSON.stringify(audioChunkList)
      },
      webhook_completed: webhookUrl
    })
  });

  const predictionRes = await prediction.json();
  console.log("prediction id replicate: " + predictionRes.id);

  // save prediction id in meeting doc
  await meetingRef.update({
    // eslint-disable-next-line max-len
    transcriptionPredictionIds: admin.firestore.FieldValue.arrayUnion(
      predictionRes.id
    ),
    [`transcriptionIdsToChunk.${predictionRes.id}`]: {
      audioChunkId,
      status: "processing"
    }
  });

  // get meeting doc
  const meeting = (await meetingRef.get()).data();

  // analytics
  await analytics.track({
    event: "transcription-chunk-started",
    userId: meeting?.uid,
    properties: {
      meetingId
    }
  });
}
