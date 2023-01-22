import * as admin from "firebase-admin";
import { sendEmail } from "../../shared/email";
import { analytics } from "../../shared/segment";

export async function handler(data: any) {
  try {
    // Check if account already exists
    const accountDoc = await admin
      .firestore()
      .collection("accounts")
      .where("email", "==", data.email)
      .get();

    if (accountDoc.docs && accountDoc.docs.length <= 0) {
      return {
        status: 400,
        message: "Account doesn't exist"
      };
    }
    const account = accountDoc.docs[0].data();
    const accountRef = accountDoc.docs[0].ref;

    // generate pin code and send email
    const pinCode = Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const pinValidUntil = now.getTime() + 1000 * 60 * 5; // 5 minutes

    await accountRef.collection("private").doc("loginPin").set({
      pinCode: pinCode,
      pinValidUntil: pinValidUntil
    });

    // eslint-disable-next-line max-len
    const emailBody = `Your pin code is <b>${pinCode}</b>. It is valid for 5 minutes.`;
    const emailSubject = "Your pin code";
    const recipients = [{ email: data.email, name: "User" }];
    const templateId = "3zxk54v89e6ljy6v";
    const variableInput = [
      // eslint-disable-next-line max-len
      { var: "firstName", value: account.displayName == undefined ? "there" : account.displayName },
      { var: "pincode", value: pinCode.toString() }
    ];
    // eslint-disable-next-line max-len
    const emailVariables = [{ email: account.email, substitutions: variableInput }];
    // eslint-disable-next-line max-len
    await sendEmail(recipients, emailSubject, emailBody, templateId, emailVariables);

    const userId = accountRef.id;
    await analytics.identify({
      userId: userId,
      traits: {
        firstName: account.displayName,
        email: account.email
      }
    });
    await analytics.track({
      event: "sign-in",
      userId: userId
    });

    return {
      status: 200,
      message: "Successfully signed in",
      accountId: account.id
    };
  } catch (e) {
    console.error(e);

    return {
      status: 400,
      message: "Error while signing in"
    };
  }
}
