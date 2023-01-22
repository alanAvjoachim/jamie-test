import * as admin from "firebase-admin";
import { sendEmail } from "../../shared/email";
import { analytics } from "../../shared/segment";

export async function handler(data: any) {
  try {
    const accountData = {
      email: data.email,
      subType: "free",
      onboardingComplete: false,
      maxMeetings: 5,
      createdDate: Date.now(),
      meetingsUsedThisMonth: 0,
      summaryLanguage: "auto"
      // maxMilliseconds: 600000
    };

    // Check if account already exists
    const accountDoc = await admin
      .firestore()
      .collection("accounts")
      .where("email", "==", accountData.email)
      .get();
    if (accountDoc.docs.length > 0) {
      return {
        status: 400,
        message: "Account already exists"
      };
    }

    // Create a new firebase auth account
    const auth = admin.auth();
    const user = await auth.createUser(accountData);

    const accountRef = admin.firestore().collection("accounts").doc(user.uid);
    await accountRef.set(accountData);
    const accountId = accountRef.id;

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
    const recipients = [{ email: accountData.email, name: "User" }];
    const templateId = "3zxk54v89e6ljy6v";
    const variableInput = [
      { var: "firstName", value: "there" },
      { var: "pincode", value: pinCode.toString() }
    ];
    // eslint-disable-next-line max-len
    const emailVariables = [
      { email: accountData.email, substitutions: variableInput }
    ];
    // eslint-disable-next-line max-len
    await sendEmail(
      recipients,
      emailSubject,
      emailBody,
      templateId,
      emailVariables
    );

    const userId = accountId;
    await analytics.identify({
      userId: userId,
      traits: {
        email: accountData.email
      }
    });

    // wait for 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await analytics.track({
      event: "sign-up",
      userId: userId
    });

    return {
      status: 200,
      message: "Successfully created new account",
      accountId: accountId
    };
  } catch (e) {
    console.error(e);

    return {
      status: 400,
      message: "Error while signing up"
    };
  }
}
