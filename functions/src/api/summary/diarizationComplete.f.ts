import * as admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";
import { analytics } from "../../shared/segment";
import { MeetingStatus } from "../../shared/types";

export async function handler(req: any, res: any) {
  const responseData = req.body; // from replicate

  const predictionId = responseData.id;
  const predictionStatus = responseData.status;
  const output = responseData.output;

  // query meeting doc based on predictionId
  const meetingRef = admin.firestore().collection("meetings");
  // eslint-disable-next-line max-len
  const meetingSnapshot = await meetingRef.where("diarizationPredictionIds", "array-contains", predictionId).get();

  if (meetingSnapshot.empty) {
    console.error("No matching documents.");
    res.status(404).send("No matching documents.");
    return;
  }

  // get first result in snapshot
  const meetingDoc = meetingSnapshot.docs[0];
  const meetingId = meetingDoc.id;

  console.log("got diarization prediction for meeting: " + meetingId);

  // get chunk id from prediction
  const meeting = meetingDoc.data();
  const audioChunkId = meeting.diarizationIdsToChunk[predictionId].audioChunkId;

  if (meeting.diarizationStatus === "done") {
    // eslint-disable-next-line max-len
    res.status(200).send("Diarization already completed for meeting: " + meetingId);
    return;
  }

  // pre-checks done, starting to handle result
  if (predictionStatus == "succeeded") {
    // update status of prediction id chunk & save output
    await meetingDoc.ref.update({
      [`diarizationIdsToChunk.${predictionId}`]: {
        audioChunkId,
        status: "done",
        output
      }
    });

    // save data & trigger transcription
    // trigger transcription of audio chunks via pubsub
    const pubSubClient = new PubSub();
    await pubSubClient.topic("transcribeAudioChunks")
      .publishJSON({
        meetingId,
        audioChunkList: output,
        audioChunkId
      });

    // check if diarization is complete
    // check if all chunks are done
    // re-fetch meeting doc
    const updatedMeetingDoc = await meetingRef.doc(meetingId).get();
    const updatedMeeting = updatedMeetingDoc.data();
    const diarizationIdsToChunk = updatedMeeting?.diarizationIdsToChunk;
    console.log(diarizationIdsToChunk);
    const allChunksDone = Object.keys(diarizationIdsToChunk).every((key) => {
      return diarizationIdsToChunk[key].status === "done";
    });

    // safety check to see whether chunk count is correct
    // eslint-disable-next-line max-len
    if (allChunksDone && meeting.status !== "recording" && meeting.chunkCount === Object.keys(diarizationIdsToChunk).length) {
      console.log("all chunks done for meeting: " + meetingId);
      // update status
      await updatedMeetingDoc.ref.update({
        diarizationStatus: "done"
      });

      // start speaker identity matching
      const pubSubClient = new PubSub();
      await pubSubClient.topic("speakerIdentityMatching")
        .publishJSON({
          meetingId,
        });

      // delete bucket for meetings
      // get project id firebase
      const projectId = process.env.GCLOUD_PROJECT;
      const bucket = admin.storage().bucket(projectId + ".appspot.com");
      await bucket.deleteFiles({
        prefix: `${meetingId}`
      });

      // analytics
      await analytics.track({
        event: "diraziation-all-chunks-done",
        userId: meeting?.uid,
        properties: {
          meetingId
        }
      });
    }

    // analytics
    await analytics.track({
      event: "diraziation-chunk-succeeded",
      userId: meeting?.uid,
      properties: {
        meetingId,
        audioChunkId,
      }
    });

    res.status(200).send("Diarization succeeded for meeting: " + meetingId);
  } else {
    // update status
    const status: MeetingStatus = "diarizingAndTranscribingFailed";

    // update meeting doc
    await meetingDoc.ref.update({
      diarizationStatus: "failed",
      status
    });

    // analytics
    await analytics.track({
      event: "diraziation-chunk-failed",
      userId: meeting?.uid,
      properties: {
        meetingId,
        audioChunkId,
      }
    });

    console.error("Diarization failed for meeting: " + meetingId + " with error: " + responseData.error);
    res.status(500).send("Diarization failed for meeting: " + meetingId);
  }
}
