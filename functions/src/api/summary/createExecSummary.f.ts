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

  console.log("Starting to write exec summary for: " + meetingId);

  const meetingRef = admin.firestore().collection("meetings").doc(meetingId);
  const meetingDoc = await meetingRef.get();
  const meeting = meetingDoc.data();

  let status: MeetingStatus = "creatingExecSummary";

  await meetingRef.update({
    status
  });

  // user id
  const userId = meeting?.uid;

  await analytics.track({
    event: "exec-summary-creation-started",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });

  // start of creation of exec summary
  console.log("attempting to create exec summary");
  // eslint-disable-next-line max-len
  const execSummaryObject = await createExecSummary(JSON.stringify(meeting?.meetingNotes), userId);
  console.log("successfully created exec summary");

  // save meeting notes to db
  status = "creatingExecSummarySucceded";

  await meetingRef.update({
    status,
    execSummary: execSummaryObject
  });

  // trigger translation
  const pubSubClient = new PubSub();

  await pubSubClient.topic("translateSummary")
    .publishJSON({
      meetingId,
    });

  await analytics.track({
    event: "exec-summary-creation-succeeded",
    userId: userId,
    properties: {
      timestamp: Date.now()
    }
  });
}

async function createExecSummary(notes: string, userId: string) {
  let executiveSummary = "";
  try {
    const operation = await backOff(() => openai.createCompletion({
      model: "text-davinci-003",
      prompt:
      // eslint-disable-next-line max-len
      "The following are notes of a meeting.\n\n" +
      notes +
      // eslint-disable-next-line max-len, quotes
      '\n\nYour task is to create an executive summary with the most important decisions and takeaways based from the notes of the meeting. Try to use as few bullet points as possible. Do not make up things. The executive summary should contain 3-7 bullet points. Use the language of the meeting for the output. The output should have this exact format:{"1": "first bullet point", "2": "second bullet point"}\n\nOutput:\n',
      temperature: 0.6,
      max_tokens: 400,
      top_p: 1,
      user: userId
    }), backOffOptions);

    if (operation.data.choices) {
      const completion = operation.data.choices[0].text;
      // remove first characters (whitespaces) from gpt-3 output
      executiveSummary = completion + "";
    }
  } catch (e) {
    console.log("error with openAi during creation of executive summary:");
    console.log(e);
  }

  // transform executive summary to string
  try {
    console.log("parsing & formatting exec summary now");
    const executiveSummaryObject = JSON.parse(executiveSummary);
    return executiveSummaryObject;
  } catch (e) {
    console.error("error with parsing exec summary:");
    console.error(e);
  }
}
