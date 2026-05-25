import DodoPayments from "dodopayments";

let dodoClient: DodoPayments | null = null;

export function getDodoClient() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DODO_PAYMENTS_API_KEY.");
  }

  if (!dodoClient) {
    dodoClient = new DodoPayments({
      bearerToken: apiKey,
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || undefined,
      environment: "live_mode",
    });
  }

  return dodoClient;
}

export function getDodoProProductId() {
  const productId = process.env.DODO_PRO_PRODUCT_ID;
  if (!productId) {
    throw new Error("Missing DODO_PRO_PRODUCT_ID.");
  }
  return productId;
}
