const { PubSub } = require("@google-cloud/pubsub");

export async function generateSummaryTriggerHandler(change: any) {
  const meeting = change.after.data();
  console.log("trigger for " + change.after.id);

  if (meeting.status === "summarising") {
    // trigger summary
    // get account doc of meeting uid
    const pubsub = new PubSub();
    await pubsub.topic("generateSummary-v2")
      .publishJSON({
        meetingId: change.after.id
      });
  }
}
