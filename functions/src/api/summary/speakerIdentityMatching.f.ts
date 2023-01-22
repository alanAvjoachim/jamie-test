import * as admin from "firebase-admin";

export async function handler(message: any) {
  const meetingId = message.json.meetingId;

  // eslint-disable-next-line max-len
  console.log("starting speakder identify matching for meeting: " + meetingId);

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);

  // get meeting doc
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  await meetingRef.update({
    speakerIdentityMatchingStatus: "inProgress"
  });

  // prepare audio chunk objec for diarization
  const speakerIdentificationChunks: {[chunkIndex: string]: any } = {};

  // loop through all entries of diarizationIdsToChunk
  Object.values(meeting?.diarizationIdsToChunk).forEach((chunk: any) => {
    const audioChunkId = chunk.audioChunkId;
    const output = chunk.output;

    const speakers: { [speakerId: string]: {url:string, duration:number} } = {};

    // loop through all files in output
    output.forEach((url: string) => {
      const fileName = getFileName(url);
      const attributes = extractAttributes(fileName);

      const speakerId = attributes.speakerId;
      const duration = attributes.duration;

      // check if speaker does not exist yet
      if (!speakers[speakerId]) {
        speakers[speakerId] = { url, duration };
      } else {
        if (duration > speakers[speakerId].duration) {
          speakers[speakerId] = { url, duration };
        }
      }

      speakerIdentificationChunks[audioChunkId] = speakers;
    });
  });

  console.log(speakerIdentificationChunks);

  // define webhook url based whether running locally or in prod
  const webhookUrl = process.env.NODE_ENV == "production" ?
    "https://europe-west1-jamie-core-dev.cloudfunctions.net/summary-speakerIdentityMatchingComplete" :
    // eslint-disable-next-line max-len
    process.env.NGROK_ENPOINT + "/jamie-core-staging/europe-west1/summary-speakerIdentityMatchingComplete";

  // replicate call
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
        version: "f5de35f55a3a71edd0425e42d04a0930c18e7aedc981bb5122a8654848f59440",
        input: {
          // eslint-disable-next-line max-len
          speakerIdentificationChunks: JSON.stringify(speakerIdentificationChunks)
        },
        webhook_completed: webhookUrl
      }),
    }
  );

  const predictionRes = await prediction.json();
  console.log("prediction id replicate: " + predictionRes.id);

  // update meeting doc
  await meetingRef.update({
    speakerIdentityMatchingPredictionId: predictionRes.id,
  });
}

function getFileName(url: string): string {
  const lastSlashIndex = url.lastIndexOf("/");
  return url.substring(lastSlashIndex + 1);
}

// eslint-disable-next-line max-len
function extractAttributes(input: string): { audioChunkIndex: number, index: number, speakerId: string, duration: number } {
  const regex = /^(\d+)_(\d+)_(SPEAKER_\d+)_(\d+)\.wav$/;
  const match = regex.exec(input);
  if (match) {
    return {
      audioChunkIndex: parseInt(match[1]),
      index: parseInt(match[2]),
      speakerId: match[3],
      duration: parseInt(match[4])
    };
  } else {
    throw new Error(`Could not extract attributes from string: ${input}`);
  }
}
