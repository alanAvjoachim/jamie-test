import * as admin from "firebase-admin";
import { openai } from "../../shared/openAi";
import { analytics } from "../../shared/segment";
import { backOff } from "exponential-backoff";
const { PubSub } = require("@google-cloud/pubsub");
import { MeetingStatus } from "../../shared/types";
import { languageCodeToString } from "../../shared/utils/languageCodeToString";


const backOffOptions = {
  maxDelay: 1000 * 10,
  numOfAttempts: 10
};

export async function handler(message: any) {
  const meetingId = message.json.meetingId;

  console.log("Starting to write meeting notes for: " + meetingId);

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  // check if pre conditions are met
  if (meeting?.diarizationStatus === "done" &&
    meeting?.transcriptionStatus === "done" &&
    meeting?.speakerIdentityMatchingStatus === "done") {
    console.log("pre conditions met");
  } else {
    console.log("pre conditions not met");
    return;
  }

  let status: MeetingStatus = "writingMeetingNotes";

  await meetingRef.update({
    status
  });

  // user id
  const userId = meeting?.uid;

  await analytics.track({
    event: "creation-meeting-notes-started",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });

  // prepare transcript w speaker ids from source doc
  // eslint-disable-next-line max-len
  const transcriptFormatted = generateTranscriptChunk(meeting.transcriptionIdsToChunk, meeting.speakerMappingAcrossChunks);
  const transcript = transcriptFormatted.transcript;
  const language = transcriptFormatted.mostFrequentLanguage;
  const languageString = languageCodeToString(language);

  // save transcript
  await meetingRef.update({
    transcript,
    language: languageString
  });

  // check if transcript is too short
  if (transcript?.length < 400) {
    const status: MeetingStatus = "complete";
    console.log("transcript too short");
    await meetingRef.update({
      status,
      // eslint-disable-next-line max-len
      summary: "The meeting was too short to generate a summary. jamie needs at least around 10 sentences to generate meaningful summaries.",
      meetingWasTooShort: true
    });
    return;
  }

  // split transcript into chunks based on speaker turns

  // the target gpt token limit implicitly controls the level of detail
  // hence, we should adjust it based on the length of the transcript
  const transcriptLength = transcript.length;
  let targetGptTokenLimit = 3200; // 1 token ~= 4-5 chars in (openAi); aimia

  // the average speaker says around 130 words per minute
  // we assume one word to be aroud 5 characters
  if (transcriptLength > 5 * 130 * 10) {
    // less than approx 10 minutes
    targetGptTokenLimit = 1500;
  } else if (transcriptLength > 5 * 130 * 30) {
    // less than approx 30 minutes
    targetGptTokenLimit = 2100;
  } else if (transcriptLength > 5 * 130 * 60) {
    // less than approx 60 minutes
    targetGptTokenLimit = 3000;
  }

  // eslint-disable-next-line max-len
  console.log("splitting transcript into chunks. limit: " + targetGptTokenLimit);
  const transcriptChunks = splitTranscript(transcript, targetGptTokenLimit * 5);
  console.log("total of " + transcriptChunks.length + " chunks");

  // start generation of gpt notes
  // eslint-disable-next-line max-len
  const meetingNotes = await generateMeetingNotes(transcriptChunks, userId, languageString);
  console.log("all notes have been generated successfully");

  // save meeting notes to db
  status = "writingMeetingNotesSucceded";

  await meetingRef.update({
    status,
    meetingNotes
  });

  // trigger outlined summary process
  const pubSubClient = new PubSub();

  await pubSubClient.topic("createOutline")
    .publishJSON({
      meetingId,
    });

  await analytics.track({
    event: "creation-meeting-notes-succeded",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });
}

function splitTranscript(transcript: string, characterLimit: number) {
  // each end of aspeaker turn is denoted with a "#E#" character
  // split the transcript into chunks based on this character
  const chunks = transcript.split("#E#");

  // create a new array to store the chunks
  const chunkArray: string[] = [];
  let currentChunk = "";

  // go through each speaking chunk
  chunks.forEach((chunk) => {
    if (currentChunk.length + chunk.length > characterLimit) {
      chunkArray.push(currentChunk);
      currentChunk = chunk + "#E#";
    } else {
      currentChunk += chunk + "#E#";
    }

    // if last chunk, add to array
    if (chunk === chunks[chunks.length - 1]) {
      chunkArray.push(currentChunk);
    }
  });

  // check if balancing is required
  const totalChunks = chunkArray.length;

  if (totalChunks > 1) {
    const lastChunk = chunkArray[chunkArray.length - 1];
    const secondLastChunk = chunkArray[chunkArray.length - 2];

    // merge the last two chunks
    const mergedChunk = secondLastChunk + lastChunk;
    // get total char length of merged chunk
    const mergedChunkLength = mergedChunk.length;

    // and now split the balancedly by using the #e# character
    const balancedChunksArray = mergedChunk.split("#E#");

    let firstChunk = "";
    let secondChunk = "";
    const balancedCharLimit = mergedChunkLength / 2;

    // loop through balanced chunks
    balancedChunksArray.forEach((chunk) => {
      // add to first chunk if it is not too long
      if (firstChunk.length < balancedCharLimit) {
        firstChunk += chunk + "#E#";
      } else {
        // add to second chunk
        secondChunk += chunk + "#E#";
      }
    });

    // remove the last two chunks and add the new balanced chunks
    chunkArray.splice(chunkArray.length - 2, 2);
    chunkArray.push(firstChunk);
    chunkArray.push(secondChunk);
  }


  return chunkArray;
}

// eslint-disable-next-line max-len
async function generateMeetingNotes(transcriptChunks: string[], userId: string, language: string) {
  const meetingNotesArray: string[] = [];
  const promisePipeline: any[] = [];

  // loop through transcriptChunks
  transcriptChunks.forEach((chunk, index) => {
    try {
      const operation = backOff(() => openai.createCompletion({
        model: "text-davinci-003",
        prompt:
        // eslint-disable-next-line max-len
        "The following is a tanscript of a meeting.\n\n" +
          chunk +
        // eslint-disable-next-line max-len, quotes
        // '\n\n##Please write meeting notes that summarise the content of what has been said. Write like a smart business professional. Always include specific numbers and facts. Do not make up things. Stick to what has been said. Use at most 4 bullet points. Write in third person. Make the notes concise & to the point. The output should be in this exact format:\n{"1": "text", "2": "text"}. Do not add any \n characters. Write the meeting notes in the language of the transcript. Output:',
        // eslint-disable-next-line max-len
        "\n\n## Your task is to write meeting notes that include the most important takeaways. Include specific numbers, names, decisions and facts. Also always include tasks and responsibilities. If it makes sense, mention who said what like 'Speaker_1 said x'. Use concise bullet points that are to the point. Do not make up things and stick to what has been staid. The output should be in this exact format:\n{\"1\": \"bullet point\", \"2\": \"bullet point\"}. Do not add any \n characters. Write the meeting notes in " + language + ". Output:",
        temperature: 0.6,
        max_tokens: 500,
        top_p: 1,
        user: userId
      }), backOffOptions);

      operation.then((res) => {
        if (res.data.choices) {
          const completion = res.data.choices[0].text;
          // remove first characters (whitespaces) from gpt-3 output
          // meetingNotes = meetingNotes + completion?.substring(2) + "\n";
          meetingNotesArray[index] = completion?.substring(1) + "\n";
        }
      });
      promisePipeline.push(operation);
    } catch (e) {
      console.log("error with openAi during creation of meeting notes:");
      console.log(e);
    }
  });

  await Promise.all(promisePipeline);

  // parse string responses from gpt-3 into json
  const jointMeetingNotesObject: { [key: string]: any } = {};
  let startIndex = 0;

  meetingNotesArray.forEach((chunk: string) => {
    try {
      console.log("parsing meeting notes into json");
      console.log("chunk:");
      console.log(chunk);
      const chunkObject: any = JSON.parse(chunk);
      console.log("success");
      const chunkObjectKeys: string[] = Object.keys(chunkObject);

      // add chunk index to each key
      chunkObjectKeys.forEach((key: string) => {
        jointMeetingNotesObject[startIndex.toString()] = chunkObject[key];
        startIndex++;
      });
    } catch (e) {
      console.error("error while prasing meeting notes into json");
    }
  });
  console.log("parsing succeeded");
  return jointMeetingNotesObject;
}

// eslint-disable-next-line max-len
function generateTranscriptChunk(transcriptionIdsToChunk: any, speakerMappingAcrossChunks: any) {
  // loop through all transcript chunks
  const chunkObject = transcriptionIdsToChunk;

  // sort the transcript chunks by their audioChjunkId
  const sortedChunkObject = sortObjectByAudioChunkId(chunkObject);
  console.log(sortedChunkObject);

  const languageFrequency: { [key: string]: number } = {};
  let transcript = "";

  // loop through all chunks (sorted by audioChunkId)
  Object.keys(sortedChunkObject).forEach((predictionId) => {
    // transcript of chunk
    let transcriptOfChunk = chunkObject[predictionId].transcript;
    const audioChunkId = chunkObject[predictionId].audioChunkId;

    // change speaker identities according to mappingss
    // eslint-disable-next-line max-len
    const speakerMapping = speakerMappingAcrossChunks[audioChunkId];

    // loop through all keys and values of the speaker mapping
    Object.keys(speakerMapping).forEach((key) => {
      const value = speakerMapping[key];
      const replacementString = "Speaker_" + value;

      // eslint-disable-next-line max-len
      const updatedString = replaceString(transcriptOfChunk, key, replacementString);
      transcriptOfChunk = updatedString;
    });

    // add transcript to the transcript
    transcript += transcriptOfChunk;
    // also cound the occurences of language
    // eslint-disable-next-line max-len
    const language = chunkObject[predictionId].language;
    if (languageFrequency[language]) {
      languageFrequency[language]++;
    } else {
      languageFrequency[language] = 1;
    }
  });

  // find the most frequent language
  const mostFrequentLanguage = Object.keys(languageFrequency).reduce((a, b) => {
    return languageFrequency[a] > languageFrequency[b] ? a : b;
  });

  // return the transcript chunk and the most frequent language
  return {
    transcript,
    mostFrequentLanguage
  };
}

// eslint-disable-next-line max-len
function sortObjectByAudioChunkId(obj: { [key: string]: { audioChunkId: string } }): { [key: string]: { audioChunkId: string } } {
  const sortedKeys = Object.keys(obj).sort((a, b) => {
    const audioChunkIdA = obj[a].audioChunkId;
    const audioChunkIdB = obj[b].audioChunkId;
    return audioChunkIdA.localeCompare(audioChunkIdB);
  });
  const sortedObject: { [key: string]: { audioChunkId: string } } = {};
  for (const key of sortedKeys) {
    sortedObject[key] = obj[key];
  }
  return sortedObject;
}

// eslint-disable-next-line max-len
function replaceString(input: string, search: string, replacement: string): string {
  return input.replace(new RegExp(search, "g"), replacement);
}

