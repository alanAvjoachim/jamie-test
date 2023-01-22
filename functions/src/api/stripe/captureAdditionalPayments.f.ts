/* eslint-disable operator-linebreak */
/* eslint-disable indent */
const stripe = require("stripe")(process.env.STRIPE_KEY);
import * as admin from "firebase-admin";
import {
  EXC_PRICE_ID_DEV,
  EXC_PRICE_ID_PROD,
  EXC_QTY_PRICE_ID_DEV,
  EXC_QTY_PRICE_ID_PROD,
  PRO_PRICE_ID_DEV,
  PRO_PRICE_ID_PROD,
  PRO_QTY_PRICE_ID_DEV,
  PRO_QTY_PRICE_ID_PROD,
  STD_PRICE_ID_DEV,
  STD_PRICE_ID_PROD,
  STD_QTY_PRICE_ID_DEV,
  STD_QTY_PRICE_ID_PROD
} from "../../schema";

const priceData: any = {};

export async function captureAdditionalPaymentHandler() {
  try {
    console.log("Capturing additional payments...");

    const usersSnapshot = await admin.firestore().collection("accounts").get();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.meetingsUsedThisMonth > user.maxMeetings) {
        makeCharge(userDoc);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

async function makeCharge(userRef: any) {
  try {
    const user = userRef.data();
    const diff: number = user.meetingsUsedThisMonth - user.maxMeetings;

    // eslint-disable-next-line max-len
    let priceId =
      process.env.NODE_ENV === "production"
        ? STD_QTY_PRICE_ID_PROD
        : STD_QTY_PRICE_ID_DEV;

    switch (user?.subPlanId) {
      case STD_PRICE_ID_DEV:
        priceId = STD_QTY_PRICE_ID_DEV;
        break;
      case PRO_PRICE_ID_DEV:
        priceId = PRO_QTY_PRICE_ID_DEV;
        break;
      case EXC_PRICE_ID_DEV:
        priceId = EXC_QTY_PRICE_ID_DEV;
        break;
      case STD_PRICE_ID_PROD:
        priceId = STD_QTY_PRICE_ID_PROD;
        break;
      case PRO_PRICE_ID_PROD:
        priceId = PRO_QTY_PRICE_ID_PROD;
        break;
      case EXC_PRICE_ID_PROD:
        priceId = EXC_QTY_PRICE_ID_PROD;
        break;
    }

    if (!priceData[priceId]) {
      const price = await stripe.prices.retrieve(priceId);
      priceData[priceId] = price;
    }
    const newPrice = priceData[priceId];

    const customer = await stripe.customers.retrieve(user?.subCusId);

    // eslint-disable-next-line max-len
    const defaultPaymentMethod = customer.invoice_settings
      .default_payment_method
      ? customer.invoice_settings.default_payment_method
      : customer.default_source;

    await stripe.paymentIntents.create({
      amount: newPrice.unit_amount * diff,
      currency: "eur",
      customer: user.subCusId,
      payment_method: defaultPaymentMethod,
      confirm: true
    });

    userRef.ref.update({ meetingsUsedThisMonth: 0 });
  } catch (e) {
    console.log(e);
  }
}
