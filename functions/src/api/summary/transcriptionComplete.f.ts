import * as admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";
import { MeetingStatus } from "../../shared/types";
import { analytics } from "../../shared/segment";

export async function handler(req: any, res: any) {
  const responseData = req.body; // from replicate

  const predictionId = responseData.id;
  const predictionStatus = responseData.status;
  const output = responseData.output;

  // query meeting doc based on predictionId
  const meetingRef = admin.firestore().collection("meetings");
  // eslint-disable-next-line max-len
  const meetingSnapshot = await meetingRef.where("transcriptionPredictionIds", "array-contains", predictionId).get();

  if (meetingSnapshot.empty) {
    console.error("No matching documents for prediction: " + predictionId);
    res.status(404).send("No matching documents.");
    return;
  }

  // get first result in snapshot
  const meetingDoc = meetingSnapshot.docs[0];
  const meetingId = meetingDoc.id;

  console.log("got diarization prediction for meeting: " + meetingId);

  // check meeting status
  const meeting = meetingDoc.data();
  if (meeting.transcriptionStatus === "done") {
    // eslint-disable-next-line max-len
    res.status(200).send("Transcription already completed for meeting: " + meetingId);
    return;
  }

  // get audio chunk id
  // eslint-disable-next-line max-len
  const audioChunkId = meeting.transcriptionIdsToChunk[predictionId].audioChunkId;

  // done with pre-checks, starting to handle result
  if (predictionStatus == "succeeded") {
    // update transcription status
    await meetingDoc.ref.update({
      [`transcriptionIdsToChunk.${predictionId}`]: {
        audioChunkId,
        status: "done",
        transcript: output.transcript,
        language: output.language,
      }
    });

    // check if all chunks are done
    // re-fetch meeting doc
    const updatedMeetingDoc = await meetingRef.doc(meetingId).get();
    const updatedMeeting = updatedMeetingDoc.data();
    const transcriptionIdsToChunk = updatedMeeting?.transcriptionIdsToChunk;
    const allChunksDone = Object.keys(transcriptionIdsToChunk).every((key) => {
      return transcriptionIdsToChunk[key].status === "done";
    });

    if (allChunksDone && meeting.status !== "recording") {
      console.log("all chunks done for meeting: " + meetingId);
      // update status

      // update meeting doc
      await meetingDoc.ref.update({
        transcriptionStatus: "done",
      });

      // trigger meeting notes
      // trigger transcription of audio chunks via pubsub
      const pubSubClient = new PubSub();
      await pubSubClient.topic("createMeetingNotes")
        .publishJSON({
          meetingId
        });

      // analytics
      await analytics.track({
        event: "transcription-all-chunks-succeeded",
        userId: meeting?.uid,
        properties: {
          meetingId,
        }
      });
    }

    // analytics
    await analytics.track({
      event: "transcription-chunk-succeeded",
      userId: meeting?.uid,
      properties: {
        meetingId,
        audioChunkId
      }
    });

    res.status(200).send("Transcription succeeded for meeting: " + meetingId);
  } else {
    // update status
    const status: MeetingStatus = "diarizingAndTranscribingFailed";

    // update meeting doc
    await meetingDoc.ref.update({
      transcriptionStatus: "failed",
      status,
    });

    // analytics
    await analytics.track({
      event: "transcription-chunk-failed",
      userId: meeting?.uid,
      properties: {
        meetingId,
        audioChunkId
      }
    });

    console.error("Transcription failed for meeting: " + meetingId + " with error: " + responseData.error);
    res.status(500).send("Transcription failed for meeting: " + meetingId);
  }
}
