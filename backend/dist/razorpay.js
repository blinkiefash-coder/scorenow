import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
// Temporary mode while Razorpay reviews the website: checkout is shown but payments auto-approve without charging.
export const isSimulatedPayments = () => process.env.PAYMENTS_MODE === "simulated" && process.env.NODE_ENV !== "production";
export const simulatedId = (prefix) => `sim_${prefix}_${randomBytes(9).toString("hex")}`;
export const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const isRazorpayXConfigured = () => isRazorpayConfigured() && Boolean(process.env.RAZORPAYX_ACCOUNT_NUMBER);
const razorpayRequest = async (path, body, extraHeaders = {}) => {
    const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}`, ...extraHeaders },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(data.error?.description || `Razorpay request failed (${response.status}).`);
    return data;
};
export const createRazorpayContact = (name, referenceId) => razorpayRequest("/contacts", { name, type: "vendor", reference_id: referenceId });
export const createRazorpayFundAccount = (contactId, details) => razorpayRequest("/fund_accounts", "upiId" in details
    ? { contact_id: contactId, account_type: "vpa", vpa: { address: details.upiId } }
    : { contact_id: contactId, account_type: "bank_account", bank_account: { name: details.name, ifsc: details.ifsc, account_number: details.accountNumber } });
// The idempotency key is the reference ID, so a retried request cannot send the same money twice.
export const createRazorpayPayout = async ({ fundAccountId, amountPaise, mode, referenceId, narration }) => {
    const payout = await razorpayRequest("/payouts", {
        account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: amountPaise,
        currency: "INR",
        mode,
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: referenceId,
        narration,
    }, { "X-Payout-Idempotency": referenceId });
    if (["rejected", "cancelled", "reversed", "failed"].includes(payout.status)) {
        throw new Error(payout.failure_reason || `Payout was ${payout.status}.`);
    }
    return payout;
};
export const createRazorpayOrder = async ({ amountPaise, receipt, notes, }) => {
    const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
        body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
        signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.id) {
        throw new Error(body?.error?.description || "Unable to create a Razorpay order.");
    }
    return { id: body.id, amount: body.amount ?? amountPaise, currency: body.currency ?? "INR" };
};
export const isValidPaymentSignature = (orderId, paymentId, signature) => {
    const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
};
