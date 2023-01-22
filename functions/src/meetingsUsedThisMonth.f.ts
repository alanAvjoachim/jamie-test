import * as admin from "firebase-admin";
const stripe = require("stripe")(process.env.STRIPE_KEY);
import { analytics } from "./shared/segment";

export async function meetingsUsedThisMonthHandler(snap: any) {
  const newValue = snap.data();
  const userId = newValue.uid;

  const increment = admin.firestore.FieldValue.increment(1);

  const accountRef = admin.firestore().collection("accounts").doc(userId);
  await accountRef.update({ meetingsUsedThisMonth: increment });
  const accountDoc = await accountRef.get();

  if (accountDoc.exists) {
    const account = accountDoc.data();

    if (account?.meetingsUsedThisMonth === account?.maxMeetings) {
      try {
        await analytics.track({
          event: "quota_reached",
          userId: userId,
          properties: {
            meetingsUsedThisMonth: account?.meetingsUsedThisMonth
          }
        });
      } catch (r) {
        console.log(r);
      }
    }

    try {
      if (account?.subCusId) {
        let customer = await stripe.customers.retrieve(account?.subCusId);

        if (customer && !customer.default_source) {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: account?.subCusId,
            type: "card"
          });

          customer = await stripe.customers.update(account?.subCusId, {
            // eslint-disable-next-line max-len
            invoice_settings: {
              default_payment_method: paymentMethods.data[0].id
            }
          });
        }
      }
    } catch (e) {
      // throw firebase cloud functions error
      console.error(new Error("unhandeled error"));
      console.log(e);
    }
  }
}
