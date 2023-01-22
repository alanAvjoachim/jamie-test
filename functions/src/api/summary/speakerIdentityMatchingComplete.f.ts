import * as admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";
import { analytics } from "../../shared/segment";

export async function handler(req: any, res: any) {
  const responseData = req.body; // from replicate

  const predictionId = responseData.id;
  const predictionStatus = responseData.status;
  const output = responseData.output;

  // query meeting doc based on predictionId
  const meetingRef = admin.firestore().collection("meetings");
  // eslint-disable-next-line max-len
  const meetingSnapshot = await meetingRef.where("speakerIdentityMatchingPredictionId", "==", predictionId).get();

  if (meetingSnapshot.empty) {
    console.error("No matching documents.");
    res.status(404).send("No matching documents.");
    return;
  }

  // get first result in snapshot
  const meetingDoc = meetingSnapshot.docs[0];
  const meetingId = meetingDoc.id;

  // eslint-disable-next-line max-len
  console.log("got speaker identity matching prediction for meeting: " + meetingId);

  // get chunk id from prediction
  const meeting = meetingDoc.data();

  if (meeting.speakerIdentityMatchingStatus === "done") {
    // eslint-disable-next-line max-len
    res.status(200).send("Diarization already completed for meeting: " + meetingId);
    return;
  }

  if (predictionStatus == "succeeded") {
    // update meeting doc
    await meetingDoc.ref.update({
      speakerIdentityMatchingStatus: "done",
      speakerIdentificationChunks: output.speakerIdentificationChunks,
      speakerMappingAcrossChunks: output.speakerMappingAcrossChunks,
      identifiedSpeakerLibrary: output.identifiedSpeakerLibrary,
    });

    // next step
    // trigger meeting notes
    // trigger transcription of audio chunks via pubsub
    const pubSubClient = new PubSub();
    await pubSubClient.topic("createMeetingNotes")
      .publishJSON({
        meetingId
      });

    // analytics
    await analytics.track({
      event: "speaker-identity-matching-succeeded",
      userId: meeting?.uid,
      properties: {
        meetingId,
      }
    });

    // eslint-disable-next-line max-len
    res.status(200).send("Speaker identification succeeded for meeting: " + meetingId);
  } else {
    // update meeting doc
    await meetingDoc.ref.update({
      speakerIdentityMatchingStatus: "failed",
    });

    // analytics
    await analytics.track({
      event: "speaker-identity-matching-failed",
      userId: meeting?.uid,
      properties: {
        meetingId,
      }
    });

    console.error("Speaker matching failed for meeting: " + meetingId + " with error: " + responseData.error);
    res.status(500).send("Speaker matching failed for meeting: " + meetingId);
  }
}
