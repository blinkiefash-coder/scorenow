import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
// Temporary mode while Razorpay reviews the website: checkout is shown but payments auto-approve without charging.
export const isSimulatedPayments = () => process.env.PAYMENTS_MODE === "simulated";
export const simulatedId = (prefix) => `sim_${prefix}_${randomBytes(9).toString("hex")}`;
export const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
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
