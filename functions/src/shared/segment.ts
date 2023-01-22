import Analytics from "analytics-node";

// check whether functions are running in development or production
const isProduction = process.env.GCLOUD_PROJECT === "jamie-core";
const devKey = "1ffHptgmTQrvoehahZGSsWYeQwN4vT75";
const prodKey = "AlJ7FRRB5GnJ71WPEmUp0075HAfvVCOL";

export const analytics = new Analytics(isProduction ? prodKey : devKey);
