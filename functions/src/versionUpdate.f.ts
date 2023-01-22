import * as admin from "firebase-admin";

export async function handler(data: any, context: any) {
  try {
    const appVersion = data.version.version;
    const customerUID = context.auth.uid;
    const accountRef = admin.firestore()
      .collection("accounts").doc(customerUID);
    await accountRef.update({ version: appVersion });
  } catch (error) {
    console.log(error);
  }
}
