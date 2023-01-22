import * as admin from "firebase-admin";
import { openai } from "../shared/openAi";
import { analytics } from "../shared/segment";

export async function generateSummaryHandler(message: any) {
  const meetingId = message.json.meetingId;

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  await meetingRef.update({
    status: "summaryInProgress"
  });

  const userId = meeting?.uid;

  // generate one tanscript file
  let transcript = "";
  const orderedTranscriptChunks: any[] = [];

  meeting?.meetingChunks.forEach((chunk: any) => {
    orderedTranscriptChunks[chunk.audioChunkId] = chunk.text;
  });

  // put transcript together based on order
  orderedTranscriptChunks.forEach((chunk: any) => {
    transcript = transcript + chunk;
  });

  const meetingType: string = meeting?.type;

  // chunking
  // divide transcript into sentences
  const sentences = splitStringIntoSentences(transcript);

  // if there is less than 10 sentences, don't generate the summary
  if (sentences.length < 10) {
    await meetingRef.update({
      status: "complete",
      // eslint-disable-next-line max-len
      summary: "The meeting was too short to generate a summary. jamie needs at least 10 sentences to generate meaningful summaries."
    });

    await analytics.track({
      event: "end-summary",
      userId: userId,
      properties: {
        time: Date.now()
      }
    });
    return;
  }

  // loop through sentences and add them to chunk until size limit is hit
  const textChunks: string[] = [];
  const sizeLimit = 500; // in words (1350, 500)
  let currentChunk = ""; // string capturing current chunk

  // fill chunks sentence-wise
  console.log("Starting summary for meeting: " + meetingId);

  await analytics.identify({
    userId: userId
  });
  await analytics.track({
    event: "start-summary",
    userId: userId,
    properties: {
      summaryStart: Date.now()
    }
  });

  console.log("Number of sentences: " + sentences.length);

  sentences.forEach((sentence, key, arr) => {
    currentChunk = currentChunk + sentence;

    if (countWords(currentChunk) > sizeLimit) {
      textChunks.push(currentChunk);
      currentChunk = "";
    } else {
      // only add whitespace if needed
      currentChunk = currentChunk + " ";
    }

    // handle last iteration
    if (Object.is(arr.length - 1, key)) {
      // execute last item logic
      textChunks.push(currentChunk);
    }
  });

  // check if last chunk is below n words, if yes -> append it to last chunk
  // eslint-disable-next-line max-len
  if (countWords(textChunks[textChunks.length -1]) < 150 && textChunks.length > 1) {
    // append last chunk to previous chunk
    // eslint-disable-next-line max-len
    textChunks[textChunks.length -2] = textChunks[textChunks.length -2] + textChunks[textChunks.length -1];
    textChunks.pop();
  }

  // console.log("transcript chunks: ");
  // console.log(textChunks);
  // console.log(textChunks.length);
  // res.send(textChunks);
  // return;

  // generate meeting notes for all chunks with GPT-3
  // & fine tune based on meeting objective
  const meetingNotesPipeline: any[] = [];
  const meetingNotesArray: string[] = [];
  let meetingNotes = "";

  console.log("Chunking succeeded. Total number of " +
    textChunks.length + " chunks");
  console.log("Meeting type has been " + meetingType);
  console.log("Starting meeting notes");
  console.log("Meeting prompt used: " +
    (MeetingNotesPrompt as any)[meetingType]);

  textChunks.forEach((chunk, index) => {
    console.log("Starting with chunk #"+ index + ":");
    console.log(chunk);
    try {
      const operation = openai.createCompletion({
        model: "text-davinci-003",
        prompt:
        // eslint-disable-next-line max-len
        "The following is a tanscript of a meeting.\n\n" +
          chunk +
          (MeetingNotesPrompt as any)[meetingType],
        temperature: 0.7,
        max_tokens: 456,
        top_p: 1,
        user: userId
      });

      operation.then((res) => {
        if (res.data.choices) {
          const completion = res.data.choices[0].text;
          // remove first characters (whitespaces) from gpt-3 output
          // meetingNotes = meetingNotes + completion?.substring(2) + "\n";
          meetingNotesArray[index] = completion?.substring(1) + "\n";
          console.log("Notes for chunk #"+ index + ":");
          console.log(completion?.substring(0));
          console.log(completion?.substring(1));
          console.log(completion?.substring(2));
        }
      });
      meetingNotesPipeline.push(operation);
    } catch (e) {
      console.log("error with openAi during creation of meeting notes:");
      console.log(e);
    }
  });

  await Promise.all(meetingNotesPipeline);

  meetingNotes = meetingNotesArray.toString();

  console.log("Meetings notes created successfully");
  console.log("notes: " + meetingNotes);
  await meetingRef.update({
    originMeetingNotes: meetingNotes,
  });
  console.log("Starting creation of meeting highlights.");
  console.log("Prompt start: " + (MeetingHighlightsStart as any)[meetingType]);
  console.log("Prompt end: " + (MeetingHighlightsEnd as any)[meetingType]);

  // only generate meeting highlights if meeting notes are less than 3000 words
  let meetingHighlights;
  if (countWords(meetingNotes) < 3000) {
  // generate meeting highlights
    try {
      const meetingHighlightsRes = await openai.createCompletion({
        model: "text-davinci-003",
        prompt:
        // eslint-disable-next-line max-len
        (MeetingHighlightsStart as any)[meetingType] +
          meetingNotes +
          (MeetingHighlightsEnd as any)[meetingType],
        temperature: 0.7,
        max_tokens: 600,
        top_p: 1,
        user: userId
      });

      if (meetingHighlightsRes.data.choices) {
        const completion = meetingHighlightsRes.data.choices[0].text;
        // remove first characters (whitespaces) from gpt-3 output
        meetingHighlights = completion;
      }
    } catch (e) {
      console.log("error with openAi during creation of meeting highlights:");
      console.log(e);
    }
  } else {
    // eslint-disable-next-line max-len
    meetingHighlights = "The meeting notes were too long to generate highlights.";
    console.error(new Error("Maximum lenght hit for meeting highlights"));
  }

  console.log("done with meeting highlights");
  console.log("highlights: " + meetingHighlights);
  await meetingRef.update({
    originMeetingHighlights: meetingHighlights,
  });

  // generate final output from summary
  /*
  const finalResponse =
    "Highlights:" +
    meetingHighlights +
    "\n\nNotes:" +
    meetingNotes;
  */

  // translate final response
  const targetLanguage = meeting?.meetingChunks[0].language;
  console.log("target language/language of first chunk: " + targetLanguage);

  let translatedMeetingNotes;
  let translatedMeetingHighlights;
  let hasBeenTranslated = false;
  if (targetLanguage !== "english") {
    console.log("got into translation loop");
    let targetLanguageString = undefined;
    // support most common language shortcuts
    switch (targetLanguage) {
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
    default:
      console.log("undefined language string " + targetLanguage);
      break;
    }

    // only translate if language is supported
    // and meeting notes are less than 1800 words
    if (targetLanguageString && countWords(meetingNotes) < 1800) {
      console.log("starting actual translation");
      try {
        const translatedMeetingNotesRes = await openai.createCompletion({
          model: "text-davinci-003",
          prompt:
          // eslint-disable-next-line max-len
          "Your task is to translate text. You should include special characters in the translation like '-' for bullet points. Translate the following into " +
          targetLanguageString +
          ":\n" +
          // eslint-disable-next-line max-len
          meetingNotes + "\n\n## You should include special characters in the translation like '-' for bullet points. Translation:",
          temperature: 0.5,
          max_tokens: 1800,
          top_p: 1,
          user: userId
        });
        if (translatedMeetingNotesRes.data.choices) {
          const completion = translatedMeetingNotesRes.data.choices[0].text;
          translatedMeetingNotes = completion;
        }

        const translatedMeetingHighlightsRes = await openai.createCompletion({
          model: "text-davinci-003",
          prompt:
          // eslint-disable-next-line max-len
          "Your task is to translate text. You should include special characters in the translation like '-' for bullet points. Translate the following into " +
          targetLanguageString +
          ":\n" +
          // eslint-disable-next-line max-len
          meetingHighlights + "\n\n## You should include special characters in the translation like '-' for bullet points. Translation:",
          temperature: 0.5,
          max_tokens: 1800,
          top_p: 1,
          user: userId
        });
        if (translatedMeetingHighlightsRes.data.choices) {
          const completion =
            translatedMeetingHighlightsRes.data.choices[0].text;
          translatedMeetingHighlights = completion;
        }
      } catch (e) {
        console.log("error during translation");
        console.log(e);
      }
      console.log("finished translation successfully");
      hasBeenTranslated = true;
    }
  }

  // generate final response string based on whether it has been translated
  let finalResponse;
  if (hasBeenTranslated) {
    console.log("using translated contents:");
    console.log("highlights:");
    console.log(translatedMeetingHighlights);
    console.log("notes:");
    console.log(translatedMeetingNotes);
    finalResponse =
    "<strong>Highlights:</strong>" +
    translatedMeetingHighlights?.replace(/(?:\r\n|\r|\n)/g, "<br>") +
    "<br><br><strong>Notes:</strong><br>" +
    translatedMeetingNotes?.replace(/\n/g, "<br>");
  } else {
    finalResponse =
    "<strong>Highlights:</strong>" +
    // meetingHighlights?.replace(/(?:\r\n|\r|\n)/g, "<br>") +
    meetingHighlights?.replace(/(?:\r\n|\r|\n)/g, "<br>") +
    "<br><br><strong>Notes:</strong><br>" +
    // meetingNotes?.replace(/(?:\r\n|\r|\n)/g, "<br>");
    meetingNotes?.replace(/\n/g, "<br>");
  }
  // console.log("final response: " + finalResponse);

  await meetingRef.update({
    summary: finalResponse,
    status: "complete",
    numberOfTextChunks: textChunks.length
  });

  await analytics.track({
    event: "end-summary",
    userId: userId,
    properties: {
      time: Date.now()
    }
  });
}

function splitStringIntoSentences(str: string) {
  return str.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
}

function countWords(str: string) {
  return str.trim().split(/\s+/).length;
}

enum MeetingNotesPrompt {
  // eslint-disable-next-line max-len
  decision = "\n\n##Please write meeting notes that summarise the content of what has been said. Write like a smart business professional. Always include specific numbers and facts. Use between 3 and 6 bullet points. Write in third person. The notes should be formatted like this:\n\n - Bullet point\n- Bullet point\n\nNotes:",
  // eslint-disable-next-line max-len
  statusUpdate = "\n\n##Please write meeting notes that summarise the content of what has been said. Write like a smart business professional. Always include specific numbers and facts. Use between 3 and 6 bullet points. Write in third person. The notes should be formatted like this:\n\n - Bullet point\n- Bullet point\n\nNotes:",
  // eslint-disable-next-line max-len
  learn = "\n\n##Please write meeting notes that summarise the content of what has been said. Write like a smart business professional. Always include specific numbers and facts. Use between 3 and 6 bullet points. Write in third person. The notes should be formatted like this:\n\n - Bullet point\n- Bullet point\n\nNotes:",
  // eslint-disable-next-line max-len
  other = "\n\n##Please write meeting notes that summarise the content of what has been said. Write like a smart business professional. Always include specific numbers and facts. Use between 3 and 6 bullet points. Write in third person. The notes should be formatted like this:\n\n - Bullet point\n- Bullet point\n\nNotes:"
}

enum MeetingHighlightsStart {
  // eslint-disable-next-line max-len
  decision = "The following are notes of a meeting. Your task is to understand what has been discussed and extract the decisions that were made given the context of the notes. Don't include all the notes. Rephrase based on the overall context. Use bullet points. Don't use more than 7 bullet points. Notes:\n",
  // eslint-disable-next-line max-len
  statusUpdate = "The following are notes of a meeting. Your task is to understand what has been discussed and extract the most relevant status updates of the meeting. Don't include all the notes. Rephrase based on the overall context. Use bullet points. Don't use more than 7 bullet points. Notes:\n",
  // eslint-disable-next-line max-len
  learn = "The following are notes of a meeting. Your task is to understand what has been discussed and extract the most learnings from the meeting. The learnings should be relevant to other people. Don't include all the notes. Rephrase based on the overall context. Use bullet points. Don't use more than 7 bullet points. Notes:\n",
  // eslint-disable-next-line max-len
  other = "The following are notes of a meeting. Your task is to understand what has been discussed and extract the most important takeaways. Don't include all the notes. Rephrase based on the overall context. Use bullet points. Don't use more than 7 bullet points. Notes:\n"
}

enum MeetingHighlightsEnd {
  // eslint-disable-next-line max-len
  decision = "\n## Decisions:",
  // eslint-disable-next-line max-len
  statusUpdate = "\n## Most relevant status updates:",
  // eslint-disable-next-line max-len
  learn = "\n## Most important learnings:",
  // eslint-disable-next-line max-len
  other = "\n## Most important takeaways:"
}
