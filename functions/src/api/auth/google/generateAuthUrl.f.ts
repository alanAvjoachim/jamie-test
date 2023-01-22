
import { google } from "googleapis";

export async function handler(data: any) {
  // adjust callBackUrl for production and development environment
  const callBackUrl = process.env.NODE_ENV === "production" ? "https://europe-west1-jamie-core.cloudfunctions.net/auth-handleGoogleAuthCallback" : "http://localhost:5001/jamie-core-staging/europe-west1/auth-handleGoogleAuthCallback";

  const oauth2Client = new google.auth.OAuth2(
    // eslint-disable-next-line max-len
    (process.env.NODE_ENV === "production" ? "679073168132-q2mci2tla89v7fhi4npn9b94n0pqtk54.apps.googleusercontent.com" : "486965018053-bus89uuudfbn6rappva3hl9cv0bmieo9.apps.googleusercontent.com"),
    // eslint-disable-next-line max-len
    (process.env.NODE_ENV === "production" ? process.env.GOOGLE_OAUTH_CLIENT_SECRET : "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"),
    callBackUrl
  );

  // Access scopes for read-only Drive activity.
  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/userinfo.email"
  ];

  // Generate a url that asks permissions for the Drive activity scope
  const authorizationUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    scope: scopes,
    state: JSON.stringify({ userId: data.userId }),
    // Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes: true
  });

  return {
    status: 200,
    authUrl: authorizationUrl
  };
}
