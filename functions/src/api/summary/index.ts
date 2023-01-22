import * as functions from "firebase-functions";
const { PubSub } = require("@google-cloud/pubsub");

import * as diarizationHandler from "./diaziration.f";
import * as diarizationCompleteHandler from "./diarizationComplete.f";
import * as speakerIdentityMatchingHandler from "./speakerIdentityMatching.f";
// eslint-disable-next-line max-len
import * as speakerIdentityMatchingCompleteHandler from "./speakerIdentityMatchingComplete.f";
import * as transcriptionHandler from "./transcription.f";
import * as transcriptionCompleteHandler from "./transcriptionComplete.f";
import * as createMeetingNotesHandler from "./createMeetingNotes.f";
import * as createOutlineHandler from "./createOutline.f";
import * as createExecSummaryHandler from "./createExecSummary.f";
import * as translateSummaryHandler from "./translateSummary.f";
import * as handleAudioUploadHandler from "./handleAudioUpload.f";

// legacy
import * as audioHandler from "./legacy/audioHandler.f";
import * as legacyGenerateSummaryHandler from "./legacy/summary2.f";


// to support older version, we have separate function to
//  use legacy transcription & summary creation
export const handleAudioUpload = functions
  .region("europe-west1")
  .storage.object()
  .onFinalize(handleAudioUploadHandler.handler);

// 1: diarizes audio and returns speaker chunks
// status: diarizing / diarized / diarizationFailed
export const diarization = functions
  .region("europe-west1")
  .pubsub.topic("diarization")
  .onPublish(diarizationHandler.handler);

// diarization complete webhook
export const diarizationComplete = functions
  .region("europe-west1")
  .https.onRequest(diarizationCompleteHandler.handler);

// 2: speaker identity matching
exports.speakerIdentityMatching = functions
  .region("europe-west1")
  .pubsub.topic("speakerIdentityMatching")
  .onPublish(speakerIdentityMatchingHandler.handler);

// diarization complete webhook
export const speakerIdentityMatchingComplete = functions
  .region("europe-west1")
  .https.onRequest(speakerIdentityMatchingCompleteHandler.handler);

// 2: audioTranscriptionHandler uses speaker chunks and return transcript
exports.transcription = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("transcribeAudioChunks")
  .onPublish(transcriptionHandler.handler);

// diarization complete webhook
export const transcriptionComplete = functions
  .region("europe-west1")
  .https.onRequest(transcriptionCompleteHandler.handler);

// 3: create meeting notes based on transcript
exports.createMeetingNotes = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("createMeetingNotes")
  .onPublish(createMeetingNotesHandler.handler);

// 4: topic-sort notes & create outlined summary
exports.createOutline = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("createOutline")
  .onPublish(createOutlineHandler.handler);

// 5: create executive summary
exports.createExecSummary = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("createExecSummary")
  .onPublish(createExecSummaryHandler.handler);


// 6: translation to target language
exports.translateSummary = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("translateSummary")
  .onPublish(translateSummaryHandler.handler);

/**
export const audioTranscriptionRetry = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("audioTranscriptionRetry")
  .onPublish(audioTranscriptionRetryHandler.handler);
 */

// http endpoint for testing only when in dev mode
export const test = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    const meetingId = req.query.meetingId;
    const topic = req.query.topic;

    const pubSubClient = new PubSub();

    await pubSubClient.topic(topic)
      .publishJSON({
        meetingId,
      });

    res.send("ok");
  }
  );


// legacy functions
export const legacyAudioHandler = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("legacySummary")
  .onPublish(audioHandler.handler);

exports.legacyGenerateSummary = functions
  .runWith({ timeoutSeconds: 500 })
  .region("europe-west1")
  .pubsub.topic("generateSummary-v2")
  .onPublish(legacyGenerateSummaryHandler.generateSummaryV2Handler);
