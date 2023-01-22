import * as functions from "firebase-functions";
import { handleHook } from "./webHook.f";

export const stripeWebHook = functions
  .region("europe-west3")
  .https.onRequest(handleHook);
