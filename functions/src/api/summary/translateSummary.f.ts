/* eslint-disable indent */
import * as admin from "firebase-admin";
import { openai } from "../../shared/openAi";
import { analytics } from "../../shared/segment";
import { backOff } from "exponential-backoff";
import { MeetingStatus } from "../../shared/types";

const backOffOptions = {
  maxDelay: 1000 * 10,
  numOfAttempts: 10
};

export async function handler(message: any) {
  const meetingId = message.json.meetingId;

  console.log("Starting translation for: " + meetingId);

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  let status: MeetingStatus = "translatingFinalResult";

  await meetingRef.update({
    status
  });

  // user id
  const userId = meeting?.uid;

  // get account doc
  // eslint-disable-next-line max-len
  const accountDoc = await admin
    .firestore()
    .collection("accounts")
    .doc(userId)
    .get();
  const account = accountDoc.data();

  await analytics.track({
    event: "translation-final-result-started",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });

  // start by generating final html output string
  // eslint-disable-next-line max-len
  let finalOutPutString = createFinalOutputString(
    meeting?.outline,
    meeting?.execSummary
  );
  console.log("successfully generated final output string");

  // check if translation is needed
  // eslint-disable-next-line max-len
  if (
    account?.summaryLanguage != "auto" &&
    account?.summaryLanguage != undefined &&
    account?.summaryLanguage !== "english"
  ) {
    // translate final output string
    // eslint-disable-next-line max-len
    const translation = await translate(
      finalOutPutString,
      account?.summaryLanguage,
      userId
    );
    finalOutPutString = translation ? translation : finalOutPutString;
  } else {
    console.log("no translation needed");
  }

  // check if speaker_1 or speaker_2 are present in the final output string
  // if not, not idenfication of speakers is needed
  status = "complete";
  if (checkForSpeaker(finalOutPutString)) {
    status = "identificationOfSpeakersNeeded";
  }

  // save meeting notes to db
  await meetingRef.update({
    status,
    summary: finalOutPutString
  });

  await analytics.track({
    event: "translation-final-result-succeeded",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });
}

// eslint-disable-next-line max-len
function createFinalOutputString(
  outline: { topic: any; notes: any[] }[],
  execSummary: { [s: string]: unknown } | ArrayLike<unknown>
) {
  let finalOutPutString = "<h2>Executive Summary:</h2><ul>";

  // loop through entries of execSummary map
  Object.values(execSummary).forEach((note) => {
    finalOutPutString += `<li>${note}</li>`;
  });

  finalOutPutString += "</ul><h2>Meeting Notes:</h2>";
  // loop through entries of outline array
  outline.forEach((topic: { topic: any; notes: any[] }) => {
    finalOutPutString += `<strong>${topic.topic}</strong><ul>`;

    topic.notes.forEach((note) => {
      finalOutPutString += `<li>${note}</li>`;
    });

    finalOutPutString += "</ul></li>";
  });

  return finalOutPutString;
}

async function translate(text: string, language: string, userId: string) {
  // translate using openai
  let targetLanguageString = "notSelected";
  switch (language) {
    case "german":
      targetLanguageString = "German";
      break;
    case "french":
      targetLanguageString = "French";
      break;
    case "spanish":
      targetLanguageString = "Spanish";
      break;
    case "portuguese":
      targetLanguageString = "Portuguese";
      break;
    case "italian":
      targetLanguageString = "Italian";
      break;
    case "dutch":
      targetLanguageString = "Dutch";
      break;
    case "japanese":
      targetLanguageString = "Japanese";
      break;
    default:
      console.error("undefined language string " + language);
      return false;
  }

  // translate using gpt-3
  if (targetLanguageString) {
    console.log("Starting translation into " + targetLanguageString);
    const translationChunks = splitStringByLiTag(text, 7600);

    // eslint-disable-next-line max-len
    console.log(
      "got a total of " + translationChunks.length + " chunks for translation"
    );
    const translationResult: string[] = [];
    for (const chunk of translationChunks) {
      // eslint-disable-next-line max-len
      // console.log(chunk);
      const operation = await backOff(
        () =>
          openai.createCompletion({
            model: "text-davinci-003",
            prompt:
              // eslint-disable-next-line max-len
              chunk +
              "\n\n##Your task is to translate the following into " +
              targetLanguageString +
              // eslint-disable-next-line max-len
              ". Don't change the formatting of the text. Don't add \n anywhere. Retain all html tags. If there are english words or abbreviations that make sense to remain in english, don't translate them. Translation:",
            temperature: 0.5,
            max_tokens: 1900,
            top_p: 1,
            user: userId
          }),
        backOffOptions
      );
      if (operation.data.choices) {
        const completion = operation.data.choices[0].text;
        // remove first characters (whitespaces) from gpt-3 output
        translationResult.push(completion + "");
        console.log("Chunk was translated successfully");
      }
    }

    // put results back into final response string
    return concatStrings(translationResult);
  } else {
    return false;
  }
}

function concatStrings(strings: string[]): string {
  // Concatenate the strings using the join method
  const str = strings.join("");

  // Return the concatenated string
  return str;
}

// this function creates a balanced split of chunks
function splitStringByLiTag(s: string, chunkSize: number): string[] {
  // find all occurrences of the </li> tag
  const liTags: number[] = [];
  const pattern = /<\/li>/g;
  let match = pattern.exec(s);
  while (match !== null) {
    liTags.push(match.index);
    match = pattern.exec(s);
  }

  // if there are no li tags, return the entire string as a single chunk
  if (liTags.length === 0) {
    return [s];
  }

  // initialize the list of chunks
  const chunks: string[] = [];
  let start = 0;
  let end = 0;
  for (const tag of liTags) {
    // if the current chunk would be larger than the desired chunk size,
    // add the current chunk to the list
    // and start a new chunk
    if (tag - start > chunkSize) {
      chunks.push(s.slice(start, end));
      start = end + 5;
    }

    // update the end position to be after the current li tag
    end = tag + 5;
  }

  // add the final chunk to the list
  chunks.push(s.slice(start));

  return chunks;
}

function checkForSpeaker(str: string): boolean {
  const pattern = /Speaker_\d+/g;
  return pattern.test(str);
}
