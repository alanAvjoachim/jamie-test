import * as admin from "firebase-admin";

export async function handler(req: any, res: any) {
  try {
    const { accessKey, customerEmail } = req.query;
    const checkAddAdditionalMeetings = req.query.addAdditionalMeetings;
    const checkAddExtraTrialTime = req.query.addExtraTrialTime;
    // Check access
    if (accessKey != "1b47Gxp00aPuV5cJ") {
      return res.status(200).send("Rejected");
    }
    // Query user
    if (customerEmail == undefined) {
      return res.status(200).send(getHTML("Customer email not set."));
    }
    const accountRef = admin.firestore().collection("accounts");
    const snapshot = await accountRef
      .where("email", "==", customerEmail)
      .get();
    if (snapshot.empty) {
      return res.status(200)
        .send(getHTML(`No user found with email <b>"${customerEmail}"</b>`));
    }
    let userDoc; // Can only be one document -> user can sign-up with email once
    snapshot.forEach((doc) => {
      userDoc = doc;
    });
    // Check command of query
    let resultAddAdditionalMeetings = "";
    let resultAddExtraTrialTime = "";
    if (checkAddAdditionalMeetings != undefined &&
      checkAddAdditionalMeetings != "") {
      // eslint-disable-next-line max-len
      resultAddAdditionalMeetings = await addAdditionalMeetings(req, userDoc) || "";
    }
    if (checkAddExtraTrialTime != undefined &&
      checkAddExtraTrialTime != "") {
      resultAddExtraTrialTime = await addExtraTrialTime(req, userDoc) || "";
    }
    if ((resultAddAdditionalMeetings + resultAddExtraTrialTime) == "") {
      return res.status(200).send(getHTML(`
            No query command set. Use one of the following commands
            <li><b>'addAdditionalMeetings'</b> -> 
            <i>Number between 1 and 20.</i></li>
            <li><b>'addExtraTrialTime'</b> -> 
            <i>This command adds 7 days trial time from now.</i></li>
        `));
    }
    // Add additional meetings
    return res.status(200)
      .send(getHTML(resultAddAdditionalMeetings + resultAddExtraTrialTime));
  } catch (e) {
    console.log("Failed in main");
  }
}

async function addAdditionalMeetings(req: any, userDoc: any) {
  try {
    const { customerEmail, addAdditionalMeetings } = req.query;
    if (isNaN(Number(addAdditionalMeetings))) return "";
    const additionalMeetings = Number(addAdditionalMeetings);
    const user = userDoc.data();
    const newMaxMeetings = user.maxMeetings + additionalMeetings;
    await userDoc.ref.update({ maxMeetings: newMaxMeetings });
    return `
            The user ${customerEmail} has recieved ${addAdditionalMeetings} 
            extra meetings.<br/>
            Meetings before: ${user.maxMeetings}.<br/>
            Total meetings now: ${user.maxMeetings + additionalMeetings}.
            <br/>
            <br/>
        `;
  } catch (e) {
    console.log("Failed in addAdditionalMeetings");
    return "";
  }
}

async function addExtraTrialTime(req: any, userDoc: any) {
  try {
    const { customerEmail, addExtraTrialTime } = req.query;
    if (isNaN(Number(addExtraTrialTime))) return "";
    const extraTrialDays = Number(addExtraTrialTime);
    const now = Date.now() + (86400000 * extraTrialDays);
    await userDoc.ref.update({ freeTrialUntil: now });
    return `
            The user ${customerEmail} has recieved ${addExtraTrialTime} day(s) 
            extra trial from now.
            <br/>
            <br/>
        `;
  } catch (e) {
    console.log("Failed in addExtraTrialTime");
    return "";
  }
}

function getHTML(message: string) {
  return `
    <body style="background-color: black; color: white;">
        <h1>jamie</h1>
        <div>
            ${message}
        </div>
    </body>
    `;
}
