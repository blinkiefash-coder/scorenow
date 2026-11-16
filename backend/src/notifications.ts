import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdminApp } from "./firebaseAdmin.js";
import {
  addCustomerNotification,
  getCurrentConsents,
  listPushTokens,
  recordNotificationDelivery,
} from "./database.js";

const sendPush = async (userId: string, title: string, body: string): Promise<{ status: "sent" | "skipped" | "failed"; detail: string | null }> => {
  const app = getFirebaseAdminApp();
  if (!app) return { status: "skipped", detail: "Firebase Admin is not configured" };
  const tokens = await listPushTokens(userId);
  if (!tokens.length) return { status: "skipped", detail: "No device registered" };
  try {
    const result = await getMessaging(app).sendEachForMulticast({ tokens, notification: { title, body } });
    return { status: result.successCount > 0 ? "sent" : "failed", detail: `${result.successCount}/${tokens.length} delivered` };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : "Push request failed" };
  }
};

const consentGranted = (consents: { consent_type: string; granted: boolean }[], type: string) =>
  consents.find((consent) => consent.consent_type === type)?.granted ?? true;

// Always stores an in-app notification. Push is attempted only when the customer
// has not withdrawn consent, and the attempt is logged. OTP is the only SMS in use.
export const notifyCustomer = async ({ userId, title, body }: { userId: string; title: string; body: string }) => {
  await addCustomerNotification(userId, title, body);
  const consents = await getCurrentConsents(userId);

  const pushResult = consentGranted(consents, "push_notifications")
    ? await sendPush(userId, title, body)
    : { status: "skipped" as const, detail: "Customer withdrew push consent" };
  await recordNotificationDelivery(userId, "push", pushResult.status, pushResult.detail).catch(() => undefined);
};
