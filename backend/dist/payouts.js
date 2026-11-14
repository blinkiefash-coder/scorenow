import { createRazorpayContact, createRazorpayFundAccount, createRazorpayPayout, isRazorpayXConfigured, isSimulatedPayments, simulatedId, } from "./razorpay.js";
import { getPayoutProfile, getPendingCommissions, markCommissionsPaidWithPayout, setPayoutRazorpayIds, } from "./database.js";
export class PayoutError extends Error {
}
const UPI_LIMIT_PAISE = 100000 * 100;
const IMPS_LIMIT_PAISE = 500000 * 100;
// Pays every pending commission for one partner or agent in a single RazorpayX payout.
export const payPendingCommissions = async (payeeEmail) => {
    const profile = await getPayoutProfile(payeeEmail);
    if (!profile || (!profile.upi_id && !(profile.bank_account_number && profile.ifsc))) {
        throw new PayoutError("Add UPI or bank details for this person before paying.");
    }
    const pending = await getPendingCommissions(payeeEmail);
    if (!pending.length)
        throw new PayoutError("No pending commissions to pay.");
    const totalPaise = pending.reduce((sum, row) => sum + row.amount_paise, 0);
    const commissionIds = pending.map((row) => row.id);
    if (isSimulatedPayments()) {
        const payoutId = simulatedId("pay");
        await markCommissionsPaidWithPayout(commissionIds, payoutId);
        return { payoutId, amountPaise: totalPaise, mode: "SIMULATED", count: pending.length };
    }
    if (!isRazorpayXConfigured()) {
        throw new PayoutError("RazorpayX is not configured. Set RAZORPAY keys and RAZORPAYX_ACCOUNT_NUMBER.");
    }
    // UPI is preferred for small totals. Larger totals go by bank transfer: IMPS up to ₹5 lakh, otherwise NEFT.
    let mode;
    let fundAccountId;
    const name = profile.full_name || payeeEmail;
    const referenceId = payeeEmail.slice(0, 40);
    if (profile.upi_id && totalPaise <= UPI_LIMIT_PAISE) {
        mode = "UPI";
        fundAccountId = profile.razorpay_vpa_fund_account_id;
    }
    else if (profile.bank_account_number && profile.ifsc) {
        mode = totalPaise <= IMPS_LIMIT_PAISE ? "IMPS" : "NEFT";
        fundAccountId = profile.razorpay_bank_fund_account_id;
    }
    else {
        throw new PayoutError("The amount is above the UPI limit. Add bank details for this person to pay by bank transfer.");
    }
    // Each step is saved right away, so a retry after a partial failure reuses the contact and fund account instead of creating duplicates.
    let contactId = profile.razorpay_contact_id;
    if (!contactId) {
        contactId = (await createRazorpayContact(name, referenceId)).id;
        await setPayoutRazorpayIds(payeeEmail, { contactId });
    }
    if (!fundAccountId) {
        fundAccountId = mode === "UPI"
            ? (await createRazorpayFundAccount(contactId, { upiId: profile.upi_id })).id
            : (await createRazorpayFundAccount(contactId, { name, ifsc: profile.ifsc, accountNumber: profile.bank_account_number })).id;
        await setPayoutRazorpayIds(payeeEmail, mode === "UPI" ? { vpaFundAccountId: fundAccountId } : { bankFundAccountId: fundAccountId });
    }
    const payout = await createRazorpayPayout({
        fundAccountId,
        amountPaise: totalPaise,
        mode,
        referenceId: `batch_${payeeEmail}_${commissionIds[0]}`.slice(0, 40),
        narration: "ScoreNow commission",
    });
    await markCommissionsPaidWithPayout(commissionIds, payout.id);
    return { payoutId: payout.id, amountPaise: totalPaise, mode, count: pending.length };
};
