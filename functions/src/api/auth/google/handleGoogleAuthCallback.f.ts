/* eslint-disable max-len */
import { google } from "googleapis";
import * as admin from "firebase-admin";
import { analytics } from "../../../shared/segment";

export async function handler(req: any, res: any) {
  const query = req.query;

  if (query.error) {
    console.log("an error has occured. The oAuth request was unsuccessful");
    res.redirect("https://meetjamie.ai/calendar-error");
  }

  // success
  const googleAuthCode = req.query.code;

  const redirectUri =
    process.env.NODE_ENV === "production" ?
      "https://europe-west1-jamie-core.cloudfunctions.net/auth-handleGoogleAuthCallback" :
      "http://localhost:5001/jamie-core-staging/europe-west1/auth-handleGoogleAuthCallback";
  const oauth2Client = new google.auth.OAuth2(
    // eslint-disable-next-line max-len
    process.env.NODE_ENV === "production" ?
      "679073168132-q2mci2tla89v7fhi4npn9b94n0pqtk54.apps.googleusercontent.com" :
      "486965018053-bus89uuudfbn6rappva3hl9cv0bmieo9.apps.googleusercontent.com",
    // eslint-disable-next-line max-len
    process.env.NODE_ENV === "production" ?
      process.env.GOOGLE_OAUTH_CLIENT_SECRET :
      "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",
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(googleAuthCode);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { email } = await oauth2Client.getTokenInfo(tokens!.access_token!);

  // const accessToken = tokens.access_token;
  // const refreshToken = tokens.refresh_token;

  // here we can continue saving the tokens in firebase
  // and check for an update in the firestore doc in the elctron app
  const userRef = admin
    .firestore()
    .collection("accounts")
    .doc(JSON.parse(query.state).userId)
    .collection("private")
    .doc("googleTokens");
  const newData = { ...tokens, email: email };
  await userRef.set(newData);

  await analytics.identify({
    userId: JSON.parse(query.state).userId
  });
  await analytics.track({
    event: "conected-google-calendar",
    userId: JSON.parse(query.state).userId
  });

  // res.send("okay");
  // const isInLocalEnv = process.env.FUNCTIONS_EMULATOR;

  res.redirect("https://meetjamie.ai/calendar-success");
}
