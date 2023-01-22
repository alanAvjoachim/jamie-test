import * as admin from "firebase-admin";
import { openai } from "../../shared/openAi";
import { analytics } from "../../shared/segment";
import { backOff } from "exponential-backoff";
const { PubSub } = require("@google-cloud/pubsub");
import { MeetingStatus } from "../../shared/types";

const backOffOptions = {
  maxDelay: 1000 * 10,
  numOfAttempts: 10
};

export async function handler(message: any) {
  const meetingId = message.json.meetingId;

  console.log("Starting to create ouline for: " + meetingId);

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  let status: MeetingStatus = "creatingOutline";

  await meetingRef.update({
    status
  });

  // user id
  const userId = meeting?.uid;

  await analytics.track({
    event: "outline-creation-started",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });

  // starting of creation of outline
  console.log("attempting to detect topics");
  const topics = await detecTopics(meeting?.meetingNotes, userId);
  console.log(topics);
  console.log("successfully detected topics");

  // labeling of notes with topics
  console.log("starting with labeling of notes");
  // eslint-disable-next-line max-len
  const labeledMeetingNotes = await labelNotes(meeting?.meetingNotes, topics, userId);
  console.log(labeledMeetingNotes);
  console.log("successfully labeled notes");

  // sorting notes based on topic
  // eslint-disable-next-line max-len
  const outlineArray: { topic: string, topicId: number, notes: string[] }[] = [];

  // add structured topics to array
  // eslint-disable-next-line guard-for-in
  for (const key in topics) {
    // get topic id
    const topicId = topics[key].topicId;
    // get topic name
    const topicName = topics[key].topic;
    // add topic to array
    outlineArray.push({ topic: topicName, topicId: topicId, notes: [] });
  }

  outlineArray.push({ topic: "Other", topicId: 0, notes: [] });

  // now add notes to topics
  // eslint-disable-next-line guard-for-in
  for (const key in labeledMeetingNotes) {
    // get topic id
    const topicId = labeledMeetingNotes[key].topicId;
    // get note
    const note = labeledMeetingNotes[key].bullet_point;
    // add note to topic
    // find index of topic in topic array based on topicId
    const topicIndex = outlineArray
      .findIndex((topic) => topic.topicId == topicId);
    // add note to topic
    outlineArray[topicIndex].notes.push(note);
  }

  // if topic has no notes, remove topic from outline array
  for (let i = 0; i < outlineArray.length; i++) {
    if (outlineArray[i].notes.length == 0) {
      outlineArray.splice(i, 1);
    }
  }

  // save meeting notes to db
  status = "creatingOutlineSucceded";

  await meetingRef.update({
    status,
    outline: outlineArray
  });

  // trigger outlined summary process
  const pubSubClient = new PubSub();

  await pubSubClient.topic("createExecSummary")
    .publishJSON({
      meetingId,
    });

  await analytics.track({
    event: "outline-creation-succeded",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });
}

async function detecTopics(meetingNotes: object, userId: string) {
  let topicDetection = "";
  try {
    const operation = await backOff(() => openai.createCompletion({
      model: "text-davinci-003",
      prompt:
      // eslint-disable-next-line max-len
      "The following are notes of a meeting.\n\n" +
      JSON.stringify(meetingNotes) +
        // eslint-disable-next-line max-len, quotes
        '\n\n##Your task is to extract high-level topics for an outline. You can group related topics into bigger topics. The fewer topics you return, the better. A bad example for a topic would be "Deep dive into financial results of the quarter". A good example would be "Quarterly Results". The output should be in this exact format:{"1": {"topic": "topic name", "topicId": 1}, "2": {"topic": "topic name", "topicId": 2}}. Do not add any \n characters. Use the language of the notes. Output:',
      temperature: 0.7,
      max_tokens: 456,
      top_p: 1,
      user: userId
    }), backOffOptions);

    if (operation.data.choices) {
      const completion = operation.data.choices[0].text;
      // remove first characters (whitespaces) from gpt-3 output
      topicDetection = completion + "";

      // parse topicDetection
      const topicDetectionObject = JSON.parse(topicDetection);
      return topicDetectionObject;
    }
  } catch (e) {
    console.log("error with openAi during topic detection:");
    console.log(e);
    return;
  }
}

// eslint-disable-next-line max-len
async function labelNotes(meetingNotes: object, topics: object, userId: string) {
  // Split the meeting notes into chunks of at most 5700 characters
  console.log("generating chunks for labeling of notes");
  const chunks: string[] = splitIntoChunks(meetingNotes, 5700);
  console.log(chunks);
  console.log("total of " + chunks.length + " chunks generated");
  const result: any[] = [];
  for (const chunk of chunks) {
    try {
      // console.log("starting to process chunk index " + chunks.indexOf(chunk))
      const operation = await backOff(() => openai.createCompletion({
        model: "text-davinci-003",
        prompt:
          // eslint-disable-next-line max-len
          "The following are notes of a meeting.\n\n" +
          chunk +
          // eslint-disable-next-line max-len
          "\n\n##Your task is to label each bullet point with one topic. The following topics are available:\n\n" +
          JSON.stringify(topics) +
          // eslint-disable-next-line max-len, quotes
          '\n\n##The output should be in this exact format:{"1": {"bullet_point": "text", "topicId": 1}, "2": {"bullet_point": "text", "topicId": 2}}\n\n##Do not add any "\n" to the output. If bullet point does not fit any topic, label it with topicId 0. Do not add any \n characters to the output. Use the language of the notes for the output. Output:',
        temperature: 0.7,
        max_tokens: 2400,
        top_p: 1,
        user: userId
      }), backOffOptions);
      if (operation.data.choices) {
        const completion = operation.data.choices[0].text;
        // remove first characters (whitespaces) from gpt-3 output
        result.push(completion);
        // console.log("Chunk processed successfully");
      }
    } catch (e) {
      console.log("Error while processing chunk");
      console.log(e);
    }
  }

  // creating a joint final result object with labeled meeting notes
  // eslint-disable-next-line max-len
  const output: { [key: string]: { bullet_point: string, topicId: number } } = {};

  let index = 0;
  for (const chunk of result) {
    const chunkObject = await JSON.parse(chunk);
    for (const key in chunkObject) {
      if (Object.prototype.hasOwnProperty.call(chunkObject, key)) {
        const element = chunkObject[key];
        output[index] = element;
        index++;
      }
    }
  }

  return output;
}

// this is used by the function processing the outlined notes
// and labeling it with topics
// eslint-disable-next-line max-len
function splitIntoChunks(meetingNotesObject: object, maxChunkLength: number): string[] {
  let currentChunk = "";
  const chunks: string[] = [];
  let counter = 0;
  // loop through entires of meeting notes object
  // add entry to current chunk until maxChunkLength is reached
  // then add current chunk to chunks array and reset current chunk
  for (const entry of Object.entries(meetingNotesObject)) {
    if (currentChunk.length + entry[1].length < maxChunkLength) {
      currentChunk += entry[1] + "";
    } else {
      chunks.push(currentChunk);
      currentChunk = entry[1] + "";
    }

    // increase counter to check for last iteration
    counter++;

    // if last entry of meeting notes object is reached
    // add current chunk to chunks array
    // eslint-disable-next-line max-len
    if (counter === Object.entries(meetingNotesObject).length) {
      chunks.push(currentChunk);
    }
  }

  return chunks;
}
