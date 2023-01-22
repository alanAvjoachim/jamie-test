export enum MeetingObjective {
  decision = "decision",
  statusUpdate = "statusUpdate",
  learn = "learn",
  other = "other"
}
export interface Account {
  email: string;
  name: string;
  emailVerified?: boolean;
}

export const PRO_PRICE_ID_DEV = "price_1M56eoLOLipejsn2f5KSOkcx";
export const EXC_PRICE_ID_DEV = "price_1M56fxLOLipejsn2XoIHuDFA";
export const STD_PRICE_ID_DEV = "price_1M56dVLOLipejsn2ZMLfinjp";

export const PRO_QTY_PRICE_ID_DEV = "price_1M56eoLOLipejsn2B1h78CJL";
export const EXC_QTY_PRICE_ID_DEV = "price_1M56fxLOLipejsn2sD3LR8WG";
export const STD_QTY_PRICE_ID_DEV = "price_1M56dVLOLipejsn2W1gBfp9X";

// live
export const PRO_PRICE_ID_PROD = "price_1M5TibLOLipejsn2pvxiIgr1";
export const EXC_PRICE_ID_PROD = "price_1M5SvILOLipejsn2pBzv72uX";
export const STD_PRICE_ID_PROD = "price_1M5TigLOLipejsn2LunA8fvC";

export const PRO_QTY_PRICE_ID_PROD = "price_1M5TibLOLipejsn2FGcrSsX5";
export const EXC_QTY_PRICE_ID_PROD = "price_1M5SvILOLipejsn2g3sycGlj";
export const STD_QTY_PRICE_ID_PROD = "price_1M5TigLOLipejsn2PyKgIQK2";
