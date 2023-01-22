/* eslint-disable operator-linebreak */
/* eslint-disable indent */
const stripe = require("stripe")(process.env.STRIPE_KEY);
import * as admin from "firebase-admin";
import {
  STD_PRICE_ID_DEV,
  PRO_PRICE_ID_DEV,
  EXC_PRICE_ID_DEV,
  STD_QTY_PRICE_ID_DEV,
  PRO_QTY_PRICE_ID_DEV,
  EXC_QTY_PRICE_ID_DEV,
  EXC_PRICE_ID_PROD,
  PRO_PRICE_ID_PROD,
  STD_PRICE_ID_PROD,
  STD_QTY_PRICE_ID_PROD,
  PRO_QTY_PRICE_ID_PROD,
  EXC_QTY_PRICE_ID_PROD
} from "../../schema";
import { analytics } from "../../shared/segment";

export async function handleHook(req: any, res: any) {
  try {
    console.log("Subscription started.");
    const event = req.body;
    let subscription;
    let status;

    console.log(event.type);

    switch (event.type) {
      case "customer.subscription.deleted":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        await cancelPlan(subscription);
        break;
      case "customer.subscription.created":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        await createSubscription(subscription);
        break;
      case "customer.subscription.updated":
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Subscription status is ${status}.`);
        await updateSubscription(subscription);
        break;
      default:
        console.log(`Unhandled event type ${event.type}.`);
    }

    return res.sendStatus(201);
  } catch (e) {
    console.log(e);
    return res.sendStatus(400);
  }
}

async function createSubscription(subscription: any) {
  const stripeCustomer = await getStripeUser(subscription.customer);
  let maxMeetings = 5;

  if (
    // executive
    subscription.plan.id === EXC_PRICE_ID_DEV ||
    subscription.plan.id === EXC_PRICE_ID_PROD
  ) {
    maxMeetings = 100;
  } else if (
    // pro
    subscription.plan.id === PRO_PRICE_ID_DEV ||
    subscription.plan.id === PRO_PRICE_ID_PROD
  ) {
    maxMeetings = 40;
  } else if (
    // standard
    subscription.plan.id === STD_PRICE_ID_DEV ||
    subscription.plan.id === STD_PRICE_ID_PROD
  ) {
    maxMeetings = 15;
  }

  const subscriptionData: any = {
    subId: subscription.id,
    subProductId: subscription.plan.product,
    subPlanId: subscription.plan.id,
    subCurrentPeriodStart: subscription.current_period_start,
    subCurrentPeriodEnd: subscription.current_period_end,
    subStatus: subscription.status,
    // eslint-disable-next-line max-len
    subType:
      subscription.status == "active" ? subscription.plan.nickname : "free",
    maxMeetings: subscription.status == "active" ? maxMeetings : 5,
    subCusId: subscription.customer,
    meetingsUsedThisMonth: 0
  };

  const user = await getUserByEmail(stripeCustomer.email);
  if (user) {
    await updateAccount(user.uid, subscriptionData);
  } else {
    throw new Error("User not found with email " + stripeCustomer.email);
  }
}

async function updateSubscription(subscription: any) {
  const account: any = await getAccountByStripeCusId(subscription.customer);
  const stripeCustomer = await getStripeUser(subscription.customer);
  let maxMeetings = 5;

  if (
    // executive
    subscription.plan.id === EXC_PRICE_ID_DEV ||
    subscription.plan.id === EXC_PRICE_ID_PROD
  ) {
    maxMeetings = 100;
  } else if (
    // pro
    subscription.plan.id === PRO_PRICE_ID_DEV ||
    subscription.plan.id === PRO_PRICE_ID_PROD
  ) {
    maxMeetings = 40;
  } else if (
    // standard
    subscription.plan.id === STD_PRICE_ID_DEV ||
    subscription.plan.id === STD_PRICE_ID_PROD
  ) {
    maxMeetings = 15;
  }

  const subscriptionData: any = {
    subId: subscription.id,
    subProductId: subscription.plan.product,
    subPlanId: subscription.plan.id,
    subCurrentPeriodStart: subscription.current_period_start,
    subCurrentPeriodEnd: subscription.current_period_end,
    subStatus: subscription.status,
    // eslint-disable-next-line max-len
    subType:
      subscription.status == "active" ? subscription.plan.nickname : "free",
    maxMeetings: subscription.status == "active" ? maxMeetings : 5,
    subCusId: subscription.customer
  };

  console.log("account?.subPlanId", account?.subPlanId);
  console.log("subscription.plan.id", subscription.plan.id);
  console.log(
    "subscription current period end",
    subscription.current_period_end
  );
  console.log("Date now", Date.now());

  if (
    account &&
    account?.meetingsUsedThisMonth > account?.maxMeetings &&
    subscription.current_period_end <= Date.now() &&
    account?.subPlanId === subscription.plan.id
  ) {
    console.log("create additional charges at the end of billing period");
    await handleAdditionalPayments(account);
  }

  if (
    subscription.current_period_end <= Date.now() &&
    account?.subPlanId === subscription.plan.id
  ) {
    console.log("resetting meetingsUsedThisMonth at the end of the month");
    subscriptionData["meetingsUsedThisMonth"] = 0;
  }

  const user = await getUserByEmail(stripeCustomer.email);
  if (user) {
    console.log(subscriptionData);
    await updateAccount(user.uid, subscriptionData);
  } else {
    throw new Error("User not found with email " + stripeCustomer.email);
  }
}

async function cancelPlan(subscription: any) {
  const stripeCustomer = await getStripeUser(subscription.customer);

  const maxMeetings = 0;

  const subscriptionData: any = {
    subStatus: subscription.status,
    subType: "canceled",
    maxMeetings,
    subCusId: subscription.customer,
    subId: "",
    subPlanId: "",
    subProductId: "",
    subCurrentPeriodStart: 0,
    subCurrentPeriodEnd: 0
  };

  const user = await getUserByEmail(stripeCustomer.email);
  if (user) {
    await updateAccount(user.uid, subscriptionData);
  }
  await analytics.identify({
    userId: user?.uid
  });
  await analytics.track({
    event: "customer-subscription-canceled",
    userId: user?.uid,
    properties: {
      subStatus: subscription.status,
      subCusId: subscription.customer
    }
  });
}

async function handleAdditionalPayments(account: any) {
  const stripeCustomer = await getStripeUser(account.subCusId);

  const accountRef = admin.firestore().collection("accounts").doc(account?.uid);

  const priceData: any = {};
  try {
    const diff: number = account.meetingsUsedThisMonth - account.maxMeetings;

    let priceId =
      process.env.NODE_ENV === "production"
        ? STD_QTY_PRICE_ID_PROD
        : STD_QTY_PRICE_ID_DEV;

    switch (account?.subPlanId) {
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

    // eslint-disable-next-line max-len
    const defaultPaymentMethod = stripeCustomer.invoice_settings
      .default_payment_method
      ? stripeCustomer.invoice_settings.default_payment_method
      : stripeCustomer.default_source;

    await stripe.paymentIntents.create({
      amount: newPrice.unit_amount * diff,
      currency: "eur",
      customer: account.subCusId,
      payment_method: defaultPaymentMethod,
      confirm: true
    });

    await accountRef.update({ meetingsUsedThisMonth: 0 });
  } catch (e) {
    console.log(e);
  }
}

async function getStripeUser(cusId: string) {
  return await stripe.customers.retrieve(cusId);
}

async function getAccountByStripeCusId(cusId: string) {
  const accountDoc = await admin
    .firestore()
    .collection("accounts")
    .where("subCusId", "==", cusId)
    .get();
  return accountDoc.docs && accountDoc.docs.length > 0
    ? { ...accountDoc.docs[0].data(), uid: accountDoc.docs[0].id }
    : null;
}

async function getUserByEmail(email: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user;
  } catch (e) {
    return null;
  }
}

async function updateAccount(uid: string, data: any) {
  console.log("updated account");
  const accountRef = admin.firestore().collection("accounts").doc(uid);
  await accountRef.update(data);
  await analytics.identify({
    userId: uid
  });
  await analytics.track({
    event: "customer-subscription-changed",
    userId: uid,
    properties: {
      ...data
    }
  });
}
