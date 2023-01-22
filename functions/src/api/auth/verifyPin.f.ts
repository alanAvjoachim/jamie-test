import * as admin from "firebase-admin";

export async function handler(data: any) {
  const email = data.email;
  const rPin = data.pin;

  // eslint-disable-next-line max-len
  const accountDoc = await admin
    .firestore()
    .collection("accounts")
    .where("email", "==", email)
    .get();
  const account = accountDoc.docs[0].data();
  const pinDoc = await accountDoc.docs[0].ref
    .collection("private")
    .doc("loginPin")
    .get();
  const pinData = pinDoc.data();

  const now: Date = new Date();

  // check if pin is valid
  if (now.getTime() > pinData?.pinValidUntil) {
    // pin is expired
    return {
      status: 400,
      message: "Pin expired"
    };
  }

  // Check if pin not is correct
  if (pinData?.pinCode != rPin) {
    // pin is incorrect
    return {
      status: 404,
      message: "Pin invalid"
    };
  }

  pinDoc.ref.delete();

  const customAuthToken = await admin
    .auth()
    .createCustomToken(accountDoc.docs[0].id);

  return {
    status: 200,
    message: "Successfully account created",
    account,
    accountId: accountDoc.docs[0].id,
    token: customAuthToken
  };
}
