import * as admin from "firebase-admin";
import { openai } from "../../../shared/openAi";
import { analytics } from "../../../shared/segment";
import { backOff } from "exponential-backoff";

const backOffOptions = {
  maxDelay: 1000 * 10,
  numOfAttempts: 10
};

export async function generateSummaryV2Handler(message: any) {
  const meetingId = message.json.meetingId;

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  await meetingRef.update({
    status: "summaryInProgress"
  });

  const userId = meeting?.uid;

  // gater account doc of uid of meeting
  const accountRef = admin.firestore().collection("accounts").doc(userId);
  const accountDoc = await accountRef.get();
  const account = accountDoc.data();

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

  // save full transcript in meeting doc
  await meetingRef.update({
    transcript: transcript
  });

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
  const sizeLimit = 700; // in words (1350, 500)
  let currentChunk = ""; // string capturing current chunk

  // fill chunks sentence-wise
  console.log("Starting summary for meeting: " + meetingId);

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
  if (countWords(textChunks[textChunks.length -1]) < 250 && textChunks.length > 1) {
    // append last chunk to previous chunk
    // eslint-disable-next-line max-len
    textChunks[textChunks.length -2] = textChunks[textChunks.length -2] + textChunks[textChunks.length -1];
    textChunks.pop();
  }

  // save text chunks in meeting doc
  await meetingRef.update({
    textChunks: textChunks
  });

  // if there less than 70 sentences, don't run the topic detection loop
  const runTopicSorting = sentences.length < 80 ? false : true;

  // generate meeting notes for all chunks with GPT-3
  // & fine tune based on meeting objective
  const meetingNotesPipeline: any[] = [];
  const meetingNotesArray: string[] = [];

  console.log("Chunking succeeded. Total number of " +
    textChunks.length + " chunks. ");

  let maxNoteLimitPerChunk = 5;
  // if the meeting is more than n chunks, reduce the number of notes per chunk
  // eslint-disable-next-line max-len
  if (textChunks.length > 10) { // 10 * 500 words per chunk / 120 WPM speaking = around 40 minutes
    maxNoteLimitPerChunk = 4;
    console.log("recuded note limit to 4 because of long meeting");
  }

  // starting with notes
  console.log("Starting notes generation");
  textChunks.forEach((chunk, index) => {
    console.log("Generating notes for chunk " + index);
    try {
      const operation = backOff(() => openai.createCompletion({
        model: "text-davinci-003",
        prompt:
        // eslint-disable-next-line max-len
        "The following is a tanscript of a meeting.\n\n" +
          chunk +
        // eslint-disable-next-line max-len, quotes
        '\n\n##Please write meeting notes that summarise the content of what has been said. Write like a smart business professional. Always include specific numbers and facts. Do not make up things. Stick to what has been said. Use between 2 and ' + maxNoteLimitPerChunk.toString() + ' bullet points. Write in third person. Make the notes concise & to the point. The output should be in this exact format:\n{"1": "text", "2": "text"}. Do not add any \n characters. Output:',
        temperature: 0.6,
        max_tokens: 456,
        top_p: 1,
        user: userId
      }), backOffOptions);

      operation.then((res) => {
        if (res.data.choices) {
          const completion = res.data.choices[0].text;
          // remove first characters (whitespaces) from gpt-3 output
          // meetingNotes = meetingNotes + completion?.substring(2) + "\n";
          meetingNotesArray[index] = completion?.substring(1) + "\n";
          console.log("Notes for chunk "+ index + " are done");
        }
      });
      meetingNotesPipeline.push(operation);
    } catch (e) {
      console.log("error with openAi during creation of meeting notes:");
      console.log(e);
    }
  });

  await Promise.all(meetingNotesPipeline);

  // turn each note chunk into one object
  console.log("parsing each note response to object");
  let startIndex = 0;
  const jointMeetingNotesObject: { [key: string]: any } = {};

  meetingNotesArray.forEach((chunk: string) => {
    console.log("trying this:");
    console.log(chunk);
    const chunkObject: any = JSON.parse(chunk);
    console.log("success");
    const chunkObjectKeys: string[] = Object.keys(chunkObject);

    // add chunk index to each key
    chunkObjectKeys.forEach((key: string) => {
      jointMeetingNotesObject[startIndex.toString()] = chunkObject[key];
      startIndex++;
    });
  });

  console.log("Successfully got joint note object");
  const meetingNotes = jointMeetingNotesObject;

  // save meeting notes in doc
  await meetingRef.update({
    meetingNotes: meetingNotes
  });

  // test whether token limits are hit
  // count characters of string meetingNotes
  const meetingNotesLength = meetingNotes.length;

  // check if token limit can become a problem
  // ~4 characters corresponds to ~1 token
  // eslint-disable-next-line max-len
  if (meetingNotesLength > 4 * 3600) { // upper limit, just for safeety
    await meetingRef.update({
      status: "complete",
      // eslint-disable-next-line max-len
      summary: "<p>The meeting was too long to generate a sorted summary. jamie stills gives you an unsorted summary of the meeting.</p><br><strong>Notes:</strong><br><p>" + meetingNotes + "</p>"
    });

    await analytics.track({
      event: "end-summary",
      userId: userId,
      properties: {
        time: Date.now()
      }
    });

    await analytics.track({
      event: "summary-size-limit-hit",
      userId: userId,
    });

    // throw firebase cloud functions error
    console.error("character limit was hit for user " + userId);
    return;
  }

  // start topic detection with gpt-3
  let finalNoteString = "";
  if (runTopicSorting) {
    console.log("Starting topic detection");
    let topicDetection = "";
    try {
      const operation = await backOff(() => openai.createCompletion({
        model: "text-davinci-003",
        prompt:
        // eslint-disable-next-line max-len
        "The following are notes of a meeting.\n\n" +
        JSON.stringify(meetingNotes) +
          // eslint-disable-next-line max-len, quotes
          '\n\n##Your task is to list the high-level topics they talked about. Only list the high-level topics. If it makes sense, group topics into one bigger topic. The less topics, the better. The output should be in this exact format:{"1": {"topic": "topic name", "topicId": 1}, "2": {"topic": "topic name", "topicId": 2}}.Do not add any \n characters. Output:',
        temperature: 0.7,
        max_tokens: 456,
        top_p: 1,
        user: userId
      }), backOffOptions);

      if (operation.data.choices) {
        const completion = operation.data.choices[0].text;
        // remove first characters (whitespaces) from gpt-3 output
        topicDetection = completion + "";
        console.log("Topic detection succeeded");
        await meetingRef.update({
          topicDetection
        });
      }
    } catch (e) {
      console.log("error with openAi during topic detection:");
      console.log(e);
      return;
    }

    console.log("Done. Starting creation of outlined notes.");

    // send notes to outline generator gpt-3
    // eslint-disable-next-line max-len
    const outlinedNotesObject = await processMeetingNotes(JSON.stringify(meetingNotes), topicDetection, userId);
    // get topic array
    const topicObject = JSON.parse(topicDetection);

    console.log("Parsing of topics went fine. Creating topic array");
    // eslint-disable-next-line max-len
    const topicArray: { topic: string, topicId: number, notes: string[] }[] = [];
    // loop through all entries of topics
    // eslint-disable-next-line guard-for-in
    for (const key in topicObject) {
      // get topic id
      const topicId = topicObject[key].topicId;
      // get topic name
      const topicName = topicObject[key].topic;
      // add topic to array
      topicArray.push({ topic: topicName, topicId: topicId, notes: [] });
    }

    topicArray.push({ topic: "Other", topicId: 0, notes: [] });

    // loop entries of outlined notes and add notes
    console.log("Succeeded. Adding notes to topics");

    // eslint-disable-next-line guard-for-in
    for (const key in outlinedNotesObject) {
      // get topic id
      const topicId = outlinedNotesObject[key].topicId;
      // get note
      const note = outlinedNotesObject[key].bullet_point;
      // add note to topic
      // find index of topic in topic array based on topicId
      const topicIndex = topicArray
        .findIndex((topic) => topic.topicId == topicId);
      // add note to topic
      topicArray[topicIndex].notes.push(note);
    }

    // finished with sorting of notes
    console.log("Finished with sorting of notes");
    // console.log(topicArray);

    // generate a final string object
    // loop through all topics
    console.log("Starting to generate final string object with formatting");
    finalNoteString = "<h2>Notes:</h2>";

    topicArray.forEach((topic) => {
      // if topic has no notes, return
      if (topic.notes.length === 0) {
        return;
      }

      const topicName = topic.topic;
      // initialize empty string for notes
      let noteString = "";

      // loop through notes and create string with HTML list items
      topic.notes.forEach((note) => {
        noteString += `<li>${note}</li>`;
      });

      // append topic name and notes to final string
      // eslint-disable-next-line max-len
      finalNoteString += `<strong>${topicName}:</strong><ul>${noteString}</ul><br>`;
    });
  } else {
    // proccess meeting notes without topic sorting
    console.log("parsing meeting notes");
    console.log("meeting notes parsed");
    console.log(meetingNotes);

    finalNoteString = "<h2>Notes:</h2><ul>";

    // loop through all entries of meeting notes
    // eslint-disable-next-line guard-for-in
    for (const key in meetingNotes) {
      // get note
      const note = meetingNotes[key];
      // add note to final string
      finalNoteString += `<li>${note}</li>`;
    }

    finalNoteString += "</ul>";
  }

  // generating executive summary
  console.log("Done. Starting generation of executive summary...");
  let executiveSummary = "";
  try {
    const operation = await backOff(() => openai.createCompletion({
      model: "text-davinci-003",
      prompt:
      // eslint-disable-next-line max-len
      "The following are notes of a meeting.\n\n" +
      finalNoteString +
      // eslint-disable-next-line max-len, quotes
      '\n\nYour task is to create an executive summary with the most important decisions and takeaways. Try to use as few bullet points as possible. You can rephrase points, but make sure they are truthful in their meaning. Do not make up things. The executive summary should contain 3-7 bullet points. The output should have this exact format:{"1": "first bullet point", "2": "second bullet point"}\n\nOutput:\n',
      temperature: 0.6,
      max_tokens: 400,
      top_p: 1,
      user: userId
    }), backOffOptions);

    if (operation.data.choices) {
      const completion = operation.data.choices[0].text;
      // remove first characters (whitespaces) from gpt-3 output
      executiveSummary = completion + "";
      console.log("Executive summary created successfully");
      console.log(executiveSummary);
    }
  } catch (e) {
    console.log("error with openAi during creation of executive summary:");
    console.log(e);
  }

  // transform executive summary to string
  console.log("parsing & formatting exec summary now");
  const executiveSummaryObject = JSON.parse(executiveSummary);
  let executiveSummaryString = "<h2>Executive Summary:</h2><ul>";

  // loop through executive summary object and create string with HTML items
  Object.values(executiveSummaryObject).forEach((note) => {
    executiveSummaryString += `<li>${note}</li>`;
  });

  executiveSummaryString += "</ul>";
  console.log("Done with exec summary");

  // translation
  // count which language was most often used in meeting chunks
  const languageCount: { [language: string]: number } = {};

  if (meeting && meeting.meetingChunks) {
    meeting.meetingChunks.forEach((chunk: { language: string }) => {
      const language = chunk.language;
      if (languageCount[language]) {
        languageCount[language]++;
      } else {
        languageCount[language] = 1;
      }
    });
  }

  // get language with most occurences
  let mostUsedLanguage: string | undefined;
  let mostUsedLanguageCount = 0;

  for (const [language, count] of Object.entries(languageCount)) {
    if (count > mostUsedLanguageCount) {
      mostUsedLanguage = language;
      mostUsedLanguageCount = count;
    }
  }

  console.log(`The most used language is: ${mostUsedLanguage}`);

  // translate final string and executive summary if language is not english
  let translatedFinalString = undefined;
  let translatedExecutiveSummary = undefined;
  try {
    // if account setting is auto, use mostUsedLanguage
    // eslint-disable-next-line max-len
    if (account?.summaryLanguage != "auto" && account?.summaryLanguage != undefined) {
      mostUsedLanguage = account?.summaryLanguage;
    }

    if (mostUsedLanguage && mostUsedLanguage !== "english") {
      translatedFinalString = await translateContent(
        finalNoteString,
        mostUsedLanguage,
        userId
      );
      translatedExecutiveSummary = await translateContent(
        executiveSummaryString,
        mostUsedLanguage,
        userId
      );
    }
  } catch (error) {
    // handle error here
    console.log("Error during translation:");
    console.log(error);
  }


  // generate final response string based on whether it has been translated

  let finalResponse = "";
  if (translatedFinalString && translatedExecutiveSummary) {
    // eslint-disable-next-line max-len
    finalResponse = translatedExecutiveSummary.toString() + translatedFinalString.toString();
  } else {
    // eslint-disable-next-line max-len
    finalResponse = executiveSummaryString.toString() + finalNoteString.toString();
  }

  console.log("final response:");
  console.log(finalResponse);

  await meetingRef.update({
    summary: finalResponse,
    status: "complete",
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

// eslint-disable-next-line max-len
async function processMeetingNotes(meetingNotes: string, topicDetection: string, userId: string) {
  // Split the meeting notes into chunks of at most 5800 characters
  const chunks: string[] = splitIntoChunks(meetingNotes, 5700);
  console.log("starting to generate chuns for proccessing meeting notes");

  console.log("total of " + chunks.length + " chunks generated");
  const result: any[] = [];
  for (const chunk of chunks) {
    try {
      console.log("starting to process chunk index " + chunks.indexOf(chunk));
      const operation = await backOff(() => openai.createCompletion({
        model: "text-davinci-003",
        prompt:
          // eslint-disable-next-line max-len
          "The following are notes of a meeting.\n\n" +
          chunk +
          // eslint-disable-next-line max-len
          "\n\n##Your task is to label each bullet point with one topic. The following topics are available:\n\n" +
          topicDetection +
          // eslint-disable-next-line max-len, quotes
          '\n\n##The output should be in this exact format:{"1": {"bullet_point": "text", "topicId": 1}, "2": {"bullet_point": "text", "topicId": 2}}\n\n##Do not add any "\n" to the output. If bullet point does not fit any topic, label it with topicId 0. Do not add any \n characters to the output. Output:',
        temperature: 0.7,
        max_tokens: 2400,
        top_p: 1,
        user: userId
      }), backOffOptions);
      if (operation.data.choices) {
        const completion = operation.data.choices[0].text;
        // remove first characters (whitespaces) from gpt-3 output
        result.push(completion);
        console.log("Chunk processed successfully");
      }
    } catch (e) {
      console.log("Error while processing chunk");
      console.log(e);
    }
  }

  console.log("got all chunks, now merging them");
  const finalResult = await processResult(result);
  return finalResult;
}

async function processResult(resultArray: any) {
  // eslint-disable-next-line max-len
  const output: { [key: string]: { bullet_point: string, topicId: number } } = {};

  // go through all chunks in result and add them to big output object
  console.log("trying to parse note output from multiple chunks");
  let index = 1;
  for (const chunk of resultArray) {
    console.log("parsing chunk");
    const chunkObject = await JSON.parse(chunk);
    for (const key in chunkObject) {
      if (Object.prototype.hasOwnProperty.call(chunkObject, key)) {
        const element = chunkObject[key];
        output[index] = element;
        index++;
      }
    }
  }

  console.log("Successfully generated one who object of notes with topics");
  console.log(output);

  return output;
}

// translate content using gpt-3
// eslint-disable-next-line max-len
async function translateContent(content: string, targetLanguage: any, userId: string) {
  // support most common language shortcuts
  let targetLanguageString = "notSelected";
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
  case "japanese":
    targetLanguageString = "Japanese";
    break;
  default:
    console.log("undefined language string " + targetLanguage);
    return false;
  }

  // translate using gpt-3
  if (targetLanguageString) {
    console.log("Starting translation into " + targetLanguageString);
    const translationChunks = splitStringByLiTag(content, 7600);

    // eslint-disable-next-line max-len
    console.log("got a total of " + translationChunks.length + " chunks for translation");
    const translationResult: string[] = [];
    for (const chunk of translationChunks) {
      // eslint-disable-next-line max-len
      // console.log(chunk);
      const operation = await backOff(() => openai.createCompletion({
        model: "text-davinci-003",
        prompt:
        // eslint-disable-next-line max-len
        chunk + "\n\n##Your task is to translate the following into " + targetLanguageString + ". Don't change the formatting of the text. Don't add \n anywhere. Retain all html tags. If there are english words or abbreviations that make sense to remain in english, don't translate them. Translation:",
        temperature: 0.5,
        max_tokens: 1900,
        top_p: 1,
        user: userId
      }), backOffOptions);
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

// this is used by the function processing the outlined notes
// and labeling it with topics
// eslint-disable-next-line max-len
function splitIntoChunks(meetingNotesString: string, maxChunkLength: number): string[] {
  const chunks = [];
  let currentChunk = "";

  // parse meetingNotesString
  const meetingNotesObject = JSON.parse(meetingNotesString);
  const numberOfNotes = Object.keys(meetingNotesObject).length;
  let notesProcessed = 0;

  // go through all entries of the object
  // eslint-disable-next-line guard-for-in
  for (const key in meetingNotesObject) {
    // Get the property's value
    const note = meetingNotesObject[key];

    // add note to current chunk
    currentChunk += "- " + note + "\n";
    notesProcessed++;

    // check if chunk limit is reached
    // eslint-disable-next-line max-len
    if (currentChunk.length > maxChunkLength || notesProcessed === numberOfNotes) {
      // add chunk to list
      chunks.push(currentChunk.slice());

      // reset current chunk
      currentChunk = "";
    }
  }

  return chunks;
}
