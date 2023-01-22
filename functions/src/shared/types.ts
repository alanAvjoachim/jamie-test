// define typescript status type for meeting

/*

a meeting starts by being recorded
as chunks are being uploaded, the following things happen simulataneously:

1. diarization
2. transcription

after the last chunk is diarized and transcribed, the following things happen:
3. speaker identity matching

after the last chunk is transcribed & speaker identity matching is done
the following things happen:

4. writing meeting notes
5. creating outline
6. creating executive summary
7. translating final result

when this is done, the user still needs to add the names for each speaker
8. identification of speakers needed
*/


export type MeetingStatus =
  | "recording"
  | "diarizingAndTranscribing"
  | "diarizingAndTranscribingFailed"
  | "writingMeetingNotes"
  | "writingMeetingNotesFailed"
  | "writingMeetingNotesSucceded"
  | "creatingOutline"
  | "creatingOutlineFailed"
  | "creatingOutlineSucceded"
  | "creatingExecSummary"
  | "creatingExecSummaryFailed"
  | "creatingExecSummarySucceded"
  | "translatingFinalResult"
  | "translatingFinalSucceeded"
  | "translatingFinalResultFailed"
  | "identificationOfSpeakersNeeded"
  | "complete"
