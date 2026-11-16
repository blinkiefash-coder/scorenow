import cors from "cors";
import "dotenv/config";
import { createHash, timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "node:path";
import {
  BUREAUS,
  bureauNames,
  type Applicant,
  fetchBureauReport,
  isBureau,
  isBureauAvailable,
  missingApplicantFields,
  scoreBand,
  stateCodes,
  type Bureau,
  type ProviderDiagnostics,
  downloadReportPdf,
} from "./bureaus.js";
import {
  completeReportRequest,
  authenticateCustomerByEmail,
  authenticateDatabaseAdmin,
  createDemoReportRequest,
  createAdminReportAudit,
  addSupportTicketComment,
  createAdminSession,
  completeAdminReportAudit,
  createOtp,
  createCustomerInvitation,
  createAdminInvitation,
  acceptAdminInvitation,
  createReportPayment,
  createSession,
  failReportRequest,
  findReportPayment,
  findReportRequest,
  findSessionUser,
  findAdminSession,
  extendAdminSession,
  ADMIN_SESSION_TTL_MS,
  findUserByEmail,
  getApplicant,
  getAdminActivity,
  getAdminAnalytics,
  getRevenueReport,
  getAdminCustomers,
    getAdminReportDocument,
  getDashboardStatus,
  getPrimaryAdminEmail,
  getPrimaryAdminRow,
  createPrimaryAdmin,
  updateAdminCredentials,
  getReportDetail,
  getReportPdf,
  initializeDatabase,
  listAdminAccounts,
  listAdminUsers,
  listCustomerInvitations,
  listSupportTickets,
  markEmailVerified,
  markPaymentFailed,
  markPaymentPaidAndCreateRequest,
  recordPaymentFailure,
  markReportProcessing,
  revokeSession,
  revokeAdminSession,
  setAdminAccountStatus,
  setCustomerPassword,
  setCustomerAccountStatus,
  updateSupportTicket,
  createSupportTicket,
  cancelCustomerInvitation,
  saveAssessment,
  saveReportPdf,
  createSubscriptionPayment,
  findSubscriptionPayment,
  activateSubscription,
  getUserSubscriptions,
  saveReportDocument,
  saveAdminReportDocument,
  saveWebsiteInquiry,
  saveKycProfile,
  setUserEmailIfMissing,
  upsertUserByMobile,
  verifyOtp,
  exportAdminActivity,
  recordAdminAudit,
  listAdminAudit,
  getAdminCustomerDetail,
  findCustomerForFollowUp,
  findAdminRetryableReport,
  getAdminAttention,
  getFailedOperations,
  getHealthStats,
  listPartnerAccounts,
  getPortalCustomers,
  getPortalEarnings,
  getPayoutProfile,
  savePayoutProfile,
  listCommissions,
  createCommission,
  markCommissionPaid,
  assignCustomerToOwner,
  unassignCustomer,
  type AdminActivityFilters,
  type AdminRole,
  type PartnerRole,
  CRM_ACTIVITY_KINDS,
  CRM_STAGES,
  addCrmActivity,
  createCrmTask,
  getCrmExportRows,
  getCrmPipeline,
  getCrmTimeline,
  listCrmCustomers,
  listOpenCrmTasks,
  setCrmTaskStatus,
  updateCrmProfile,
  type CrmActivityKind,
  type CrmStage,
  submitHealthAssessmentRequest,
  listHealthAssessmentRequests,
  getHealthAssessmentRequest,
  updateHealthAssessmentStatus,
  submitTestimonial,
  listTestimonials,
  publishTestimonial,
  setTestimonialPublished,
  createTestimonial,
  deleteTestimonial,
  listSiteContent,
  saveSiteContent,
  deleteSiteContent,
  listPartnerActivity,
  listCustomerNames,
  recordPartnerActivity,
  deleteCustomerAccount,
  recordConsent,
  getCurrentConsents,
  listConsentHistory,
  getPaymentForUser,
  listCustomerPayments,
  createRefundRequest,
  listRefundRequests,
  decideRefundRequest,
  listCustomerNotifications,
  markCustomerNotificationsRead,
  savePushToken,
  listCannedReplies,
  saveCannedReply,
  deleteCannedReply,
  createAdminPasswordReset,
  acceptAdminPasswordReset,
  exportRows,
  getSupportTicketAssignee,
  createNehaConversation,
  getNehaConversation,
  listNehaConversations,
  saveNehaMessage,
  getNehaMessages,
  updateAgentStatus,
  getAvailableAgents,
} from "./database.js";
import { notifyCustomer } from "./notifications.js";
import { ticketSla } from "./sla.js";
import { PARTNER_ACTIVITY_CHANNEL, NEHA_MESSAGE_CHANNEL, AGENT_STATUS_CHANNEL, partnerEvents, type PartnerActivityEvent } from "./realtime.js";
import { gstIncluded } from "./subscriptions.js";
import { isSiteContentKey, resolveReportPrice, resolveSubscriptionPlans, validateSiteContent } from "./siteContent.js";
import { generateReportPdf } from "./reportPdf.js";
import { captureBureauDocument, htmlToPdf } from "./bureauDocument.js";
import { tryGenerateCibilPdf } from "./cibilPdf.js";
import { verifyFirebaseGoogleToken, verifyFirebasePhoneToken } from "./firebaseAdmin.js";
import { demoReportResponses, isReportsDemoMode } from "./demoReports.js";
import { createRazorpayOrder, isRazorpayConfigured, isSimulatedPayments, isValidPaymentSignature, simulatedId } from "./razorpay.js";
import { PayoutError, payPendingCommissions } from "./payouts.js";
import { normalizeReport } from "./reportParser.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

type SessionUser = NonNullable<Awaited<ReturnType<typeof findSessionUser>>>;

const bearerToken = (request: Request) => (request.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
const requestIpAddress = (request: Request) => request.ip || request.socket.remoteAddress || "0.0.0.0";

const requireUser = async (request: Request, response: Response, next: NextFunction) => {
  const user = await findSessionUser(bearerToken(request)).catch(() => null);
  if (!user) {
    response.status(401).json({ message: "Please log in or sign up to continue." });
    return;
  }
  response.locals.user = user;
  next();
};

const sessionUser = (response: Response) => response.locals.user as SessionUser;
const sessionAdminId = (response: Response) => response.locals.adminId as string;
const sessionAdminRole = (response: Response) => response.locals.adminRole as AdminRole;

const startSession = (request: Request, userId: string) =>
  createSession({ userId, ipAddress: request.ip, userAgent: request.get("user-agent") });

const currentReportPrice = async () => resolveReportPrice((await listSiteContent()).report_price);
const currentSubscriptionPlans = async () => resolveSubscriptionPlans((await listSiteContent()).subscription_plans);

const requireAdmin = async (request: Request, response: Response, next: NextFunction) => {
  const token = bearerToken(request);
  const admin = await findAdminSession(token).catch(() => null);
  if (!admin) {
    response.status(401).json({ message: "Admin sign-in is required." });
    return;
  }
  response.locals.adminId = admin.admin_id;
  response.locals.adminRole = admin.role;
  response.locals.adminExpiresAt = new Date(admin.expires_at).toISOString();
  next();
};

const requireAdminRoles = (...roles: AdminRole[]) =>
  (request: Request, response: Response, next: NextFunction) => {
    if (!roles.includes(sessionAdminRole(response))) {
      response.status(403).json({ message: "Your admin role does not have access to this action." });
      return;
    }
    next();
  };

// Pages the superadmin can open to partner and agent logins. Ids match the admin sidebar section ids.
const PARTNER_PAGE_IDS = ["analytics", "monitor", "journey", "customers", "assessments", "tickets", "crm"] as const;
type PartnerPageId = (typeof PARTNER_PAGE_IDS)[number];
const PARTNER_ACCESS_KEY = "partner_page_access";

const enabledPartnerPages = async (): Promise<PartnerPageId[]> => {
  const saved = (await listSiteContent())[PARTNER_ACCESS_KEY];
  return Array.isArray(saved) ? saved.filter((page): page is PartnerPageId => (PARTNER_PAGE_IDS as readonly string[]).includes(page)) : [];
};

// Lets the listed roles through, and partner or agent sessions through when any of the pages is enabled.
const requireAdminOrPartnerPage = (roles: AdminRole[], pages: PartnerPageId[]) =>
  async (request: Request, response: Response, next: NextFunction) => {
    const role = sessionAdminRole(response);
    if (roles.includes(role)) {
      next();
      return;
    }
    if (role === "partner" || role === "agent") {
      const enabled = await enabledPartnerPages().catch(() => [] as PartnerPageId[]);
      if (pages.some((page) => enabled.includes(page))) {
        next();
        return;
      }
    }
    response.status(403).json({ message: "Your admin role does not have access to this action." });
  };

// Audit writes must never block or fail the admin action they describe.
const auditAdmin = (request: Request, response: Response, action: string, target: { type?: string; id?: string | null; details?: Record<string, unknown> } = {}) => {
  void recordAdminAudit({
    adminId: sessionAdminId(response) || "unknown",
    action,
    targetType: target.type ?? null,
    targetId: target.id ?? null,
    details: target.details ?? null,
    ipAddress: requestIpAddress(request),
  }).catch((error) => console.error("Admin audit write failed", error));
};

const activityFiltersFrom = (request: Request): AdminActivityFilters => ({
  q: String(request.query.q || "").slice(0, 100),
  paymentStatus: String(request.query.paymentStatus || ""),
  reportStatus: String(request.query.reportStatus || ""),
  bureau: String(request.query.bureau || ""),
  from: String(request.query.from || ""),
  to: String(request.query.to || ""),
});

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Prefix formula-leading characters so spreadsheets do not execute cell content.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

const adminLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ADMIN_LOGIN_ATTEMPTS = 5;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const customerEmailLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const equalSecret = (candidate: string, expected: string) => timingSafeEqual(
  createHash("sha256").update(candidate).digest(),
  createHash("sha256").update(expected).digest(),
);

const canAttemptAdminLogin = (ipAddress: string) => {
  const now = Date.now();
  const attempt = adminLoginAttempts.get(ipAddress);
  if (!attempt || attempt.resetAt <= now) {
    adminLoginAttempts.set(ipAddress, { count: 1, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
    return true;
  }
  if (attempt.count >= MAX_ADMIN_LOGIN_ATTEMPTS) return false;
  attempt.count += 1;
  return true;
};

const canAttemptCustomerEmailLogin = (ipAddress: string) => {
  const now = Date.now();
  const attempt = customerEmailLoginAttempts.get(ipAddress);
  if (!attempt || attempt.resetAt <= now) {
    customerEmailLoginAttempts.set(ipAddress, { count: 1, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
    return true;
  }
  if (attempt.count >= MAX_ADMIN_LOGIN_ATTEMPTS) return false;
  attempt.count += 1;
  return true;
};

const allowedReportTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedReportTypes.has(file.mimetype)) {
      callback(new Error("Only PDF, JPG, and PNG reports are accepted."));
      return;
    }
    callback(null, true);
  },
});

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const createMailTransport = () => {
  if (process.env.EMAIL_PREVIEW === "true") {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

const fieldLabels: Record<string, string> = {
  businessName: "Business name",
  fullName: "Full name",
  mobile: "Mobile number",
  email: "Email address",
  businessType: "Business type",
  cmr: "Current CMR",
  funding: "Funding requirement",
  city: "City",
  score: "Current credit score",
  goal: "Improvement goal",
};

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "Scorenow API" });
});

app.post("/api/auth/email/login", async (request, response) => {
  const ipAddress = requestIpAddress(request);
  if (!canAttemptCustomerEmailLogin(ipAddress)) {
    response.status(429).json({ message: "Too many sign-in attempts. Try again in 15 minutes." });
    return;
  }

  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 1 || password.length > 128) {
    response.status(400).json({ message: "Enter a valid email address and password." });
    return;
  }

  try {
    const user = await authenticateCustomerByEmail(email, password);
    if (!user) {
      response.status(401).json({ message: "Email or password is incorrect." });
      return;
    }
    customerEmailLoginAttempts.delete(ipAddress);
    response.json({ message: "Signed in successfully.", user, token: await startSession(request, user.id) });
  } catch (error) {
    console.error("Customer email sign-in failed", error);
    response.status(500).json({ message: "Unable to sign in right now. Please try again." });
  }
});

app.post("/api/admin/login", async (request, response) => {
  const ipAddress = requestIpAddress(request);
  if (!canAttemptAdminLogin(ipAddress)) {
    response.status(429).json({ message: "Too many sign-in attempts. Try again in 15 minutes." });
    return;
  }

  const adminId = process.env.ADMIN_LOGIN_ID || "";
  const password = process.env.ADMIN_PASSWORD || "";
  const pin = process.env.ADMIN_PIN || "";
  const submittedId = String(request.body.id || "").trim();
  const submittedPassword = String(request.body.password || "");
  const submittedPin = String(request.body.pin || "");
  const databaseAdmin = await authenticateDatabaseAdmin(submittedId, submittedPassword, submittedPin);
  const rootConfigured = Boolean(adminId && password.length >= 12 && /^\d{6}$/.test(pin)) && !(await getPrimaryAdminRow());
  const isRootAdmin = rootConfigured &&
    equalSecret(submittedId, adminId) &&
    equalSecret(submittedPassword, password) &&
    equalSecret(submittedPin, pin);
  if (!databaseAdmin && !isRootAdmin) {
    if (!rootConfigured) {
      response.status(503).json({ message: "No administrator credentials are configured." });
      return;
    }
    void recordAdminAudit({ adminId: submittedId.slice(0, 120) || "unknown", action: "login_failed", ipAddress })
      .catch((error) => console.error("Admin audit write failed", error));
    response.status(401).json({ message: "Invalid admin credentials." });
    return;
  }

  adminLoginAttempts.delete(ipAddress);
  const sessionAdmin = databaseAdmin ?? { adminId, role: "owner" as const };
  const token = await createAdminSession({
    adminId: sessionAdmin.adminId,
    role: sessionAdmin.role,
    ipAddress,
    userAgent: request.get("user-agent"),
  });
  void recordAdminAudit({ adminId: sessionAdmin.adminId, action: "login", ipAddress })
    .catch((error) => console.error("Admin audit write failed", error));
  if (sessionAdmin.role === "partner" || sessionAdmin.role === "agent") {
    void recordPartnerActivity({ actorEmail: sessionAdmin.adminId, actorRole: sessionAdmin.role, event: "signed_in" });
  }
  response.json({ token, adminId: sessionAdmin.adminId, role: sessionAdmin.role, expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS).toISOString() });
});

app.get("/api/admin/session", requireAdmin, (request, response) => {
  response.json({ adminId: sessionAdminId(response), role: sessionAdminRole(response), expiresAt: response.locals.adminExpiresAt });
});

app.post("/api/admin/session/extend", requireAdmin, async (request, response) => {
  const expiresAt = await extendAdminSession(bearerToken(request)).catch(() => null);
  if (!expiresAt) {
    response.status(401).json({ message: "Admin sign-in is required." });
    return;
  }
  response.locals.adminExpiresAt = expiresAt.toISOString();
  response.json({ expiresAt: expiresAt.toISOString() });
});

app.get("/api/admin/activity", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const page = Number(request.query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) {
    response.status(400).json({ message: "Choose a valid activity page." });
    return;
  }
  try {
    response.json(await getAdminActivity(page, activityFiltersFrom(request)));
  } catch (error) {
    console.error("Admin activity load failed", error);
    response.status(500).json({ message: "Unable to load admin activity." });
  }
});

app.get("/api/admin/activity/export", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  try {
    const filters = activityFiltersFrom(request);
    const rows = await exportAdminActivity(filters);
    const header = ["Payment ID", "Customer", "Mobile (last 4)", "Bureau", "Payment status", "Gateway", "Amount (INR)", "Report status", "Failure reason", "Created at"];
    const lines = rows.map((row) => [row.payment_id, row.customer, row.mobile_last4, row.bureau, row.payment_status, row.gateway,
      row.amount, row.report_status ?? "not requested", row.failure_reason, new Date(row.created_at).toISOString()].map(csvCell).join(","));
    auditAdmin(request, response, "activity_exported", { details: { rows: rows.length, ...filters } });
    response.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scorenow-activity-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    }).send([header.join(","), ...lines].join("\n"));
  } catch (error) {
    console.error("Admin activity export failed", error);
    response.status(500).json({ message: "Unable to export activity." });
  }
});

app.get("/api/admin/attention", requireAdmin, requireAdminRoles("owner", "manager", "support", "analyst"), async (_request, response) => {
  try {
    response.json(await getAdminAttention());
  } catch (error) {
    console.error("Admin attention load failed", error);
    response.status(500).json({ message: "Unable to load items needing attention." });
  }
});

app.get("/api/admin/failed-operations", requireAdmin, requireAdminRoles("owner", "manager"), async (_request, response) => {
  try {
    response.json(await getFailedOperations());
  } catch (error) {
    console.error("Admin failed operations load failed", error);
    response.status(500).json({ message: "Unable to load failed operations." });
  }
});

app.post("/api/admin/report-requests/:id/retry", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const requestId = String(request.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    response.status(400).json({ message: "Choose a valid report request." });
    return;
  }
  const reportRequest = await findAdminRetryableReport(requestId);
  if (!reportRequest) {
    response.status(409).json({ message: "Only failed or stuck paid report requests can be retried." });
    return;
  }
  try {
    await markReportProcessing(reportRequest.id);
    await runReportFetch(reportRequest.user_id, reportRequest.id, reportRequest.bureau, requestIpAddress(request));
    const updated = await findAdminRetryableReport(requestId);
    const succeeded = !updated;
    auditAdmin(request, response, "report_retried", { type: "customer", id: reportRequest.user_id, details: { requestId, bureau: reportRequest.bureau, succeeded } });
    response.json({ ok: succeeded, message: succeeded ? "Report fetched successfully." : "The bureau still returned an error. Check the failure reason." });
  } catch (error) {
    console.error("Admin report retry failed", error);
    auditAdmin(request, response, "report_retried", { type: "customer", id: reportRequest.user_id, details: { requestId, bureau: reportRequest.bureau, succeeded: false } });
    response.status(502).json({ message: "Unable to fetch the report right now." });
  }
});

app.get("/api/admin/health", requireAdmin, requireAdminRoles("owner", "manager"), async (_request, response) => {
  try {
    const stats = await getHealthStats();
    response.json({
      ...stats,
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.round(process.uptime()),
      payments: { mode: isSimulatedPayments() ? "simulated" : "razorpay", razorpayConfigured: isRazorpayConfigured() },
      reportsDemoMode: isReportsDemoMode(),
      emailConfigured: Boolean(createMailTransport()),
      bureauConfig: BUREAUS.map((id) => ({ bureau: id, name: bureauNames[id], configured: isBureauAvailable(id) })),
    });
  } catch (error) {
    console.error("Admin health check failed", error);
    response.status(500).json({ message: "Database is not reachable." });
  }
});

app.get("/api/admin/audit", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const page = Number(request.query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) {
    response.status(400).json({ message: "Choose a valid audit page." });
    return;
  }
  try {
    response.json(await listAdminAudit({ page, action: String(request.query.action || "").slice(0, 60), adminId: String(request.query.admin || "").slice(0, 120) }));
  } catch (error) {
    console.error("Admin audit load failed", error);
    response.status(500).json({ message: "Unable to load the audit log." });
  }
});

app.get("/api/admin/customers", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support", "analyst"], ["customers", "journey"]), async (request, response) => {
  const page = Number(request.query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) {
    response.status(400).json({ message: "Choose a valid customer page." });
    return;
  }
  try {
    response.json(await getAdminCustomers(String(request.query.q || "").slice(0, 100), page, sessionAdminRole(response) === "analyst"));
  } catch (error) {
    console.error("Admin customer search failed", error);
    response.status(500).json({ message: "Unable to search customers." });
  }
});

app.get("/api/admin/customers/:id", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["customers"]), async (request, response) => {
  const userId = String(request.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    response.status(400).json({ message: "Choose a valid customer." });
    return;
  }
  try {
    const detail = await getAdminCustomerDetail(userId, sessionAdminRole(response) === "support");
    if (!detail) {
      response.status(404).json({ message: "Customer account not found." });
      return;
    }
    response.json(detail);
  } catch (error) {
    console.error("Admin customer detail failed", error);
    response.status(500).json({ message: "Unable to load this customer." });
  }
});

app.post("/api/admin/customers/:id/follow-up", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["customers"]), async (request, response) => {
  const userId = String(request.params.id);
  const note = String(request.body.note || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || note.length < 3 || note.length > 2000) {
    response.status(400).json({ message: "Add a follow-up note (3 to 2,000 characters)." });
    return;
  }
  try {
    const customer = await findCustomerForFollowUp(userId);
    if (!customer) {
      response.status(404).json({ message: "Customer account not found." });
      return;
    }
    const stage = String(request.body.stage || "").slice(0, 60);
    const ticketId = await createSupportTicket({
      requesterName: customer.full_name,
      requesterMobile: customer.mobile,
      subject: `Follow-up${stage ? `: ${stage}` : ""}`.slice(0, 180),
      message: note,
      priority: "normal",
      createdBy: `admin:${sessionAdminId(response)}`,
      userId,
    });
    auditAdmin(request, response, "customer_follow_up", { type: "customer", id: userId, details: { ticketId, stage } });
    response.status(201).json({ ticketId, message: "Follow-up ticket created in Helpline tickets." });
  } catch (error) {
    console.error("Admin follow-up creation failed", error);
    response.status(500).json({ message: "Unable to create the follow-up." });
  }
});

app.get("/api/admin/customer-accounts", requireAdmin, requireAdminRoles("owner", "manager"), async (_request, response) => {
  try {
    const [customers, invitations] = await Promise.all([listAdminUsers(), listCustomerInvitations()]);
    response.json({ customers, invitations });
  } catch (error) {
    console.error("Admin customer accounts load failed", error);
    response.status(500).json({ message: "Unable to load customer accounts." });
  }
});

app.post("/api/admin/customer-invitations", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const fullName = String(request.body.fullName || "").trim();
  const mobile = String(request.body.mobile || "").replace(/\D/g, "");
  const email = String(request.body.email || "").trim().toLowerCase() || null;
  if (fullName.length < 2 || fullName.length > 120 || mobile.length !== 10 ||
      (email !== null && !/^\S+@\S+\.\S+$/.test(email))) {
    response.status(400).json({ message: "Enter a name, valid 10-digit mobile number, and valid optional email." });
    return;
  }
  try {
    const invitationId = await createCustomerInvitation({
      fullName,
      mobile,
      email,
      invitedBy: sessionAdminId(response),
    });
    auditAdmin(request, response, "customer_invited", { type: "customer_invitation", id: String(invitationId), details: { fullName, mobileLast4: mobile.slice(-4) } });
    response.status(201).json({
      invitationId,
      message: "Invitation recorded. The customer should sign up with this mobile number and verify it by OTP.",
    });
  } catch (error) {
    console.error("Customer invitation creation failed", error);
    response.status(409).json({ message: "Unable to create invitation. Check whether this mobile already has an account or pending invitation." });
  }
});

app.post("/api/admin/customer-invitations/:id/cancel", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const cancelled = await cancelCustomerInvitation(String(request.params.id));
  if (!cancelled) {
    response.status(404).json({ message: "Pending customer invitation not found." });
    return;
  }
  auditAdmin(request, response, "customer_invitation_cancelled", { type: "customer_invitation", id: String(request.params.id) });
  response.json({ ok: true });
});

app.patch("/api/admin/customers/:id/status", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const userId = String(request.params.id);
  const status = request.body.status;
  const reason = String(request.body.reason || "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !["active", "blocked"].includes(status)) {
    response.status(400).json({ message: "Choose a valid customer and status." });
    return;
  }
  if (status === "blocked" && reason.length < 3) {
    response.status(400).json({ message: "Give a reason for blocking this customer." });
    return;
  }
  const updated = await setCustomerAccountStatus(userId, status);
  if (!updated) {
    response.status(404).json({ message: "Customer account not found." });
    return;
  }
  auditAdmin(request, response, status === "blocked" ? "customer_blocked" : "customer_enabled", { type: "customer", id: userId, details: reason ? { reason } : undefined });
  response.json({ ok: true });
});

app.get("/api/admin/analytics", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "analyst"], ["analytics", "journey"]), async (request, response) => {
  try {
    response.json(await getAdminAnalytics(Number(request.query.days) || 14));
  } catch (error) {
    console.error("Admin analytics load failed", error);
    response.status(500).json({ message: "Unable to load analytics." });
  }
});

app.get("/api/admin/revenue", requireAdmin, requireAdminRoles("owner", "manager", "analyst"), async (request, response) => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const from = String(request.query.from || defaultFrom);
  const to = String(request.query.to || today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    response.status(400).json({ message: "Choose a valid from and to date (YYYY-MM-DD)." });
    return;
  }
  try {
    response.json(await getRevenueReport(from, to));
  } catch (error) {
    console.error("Revenue report failed", error);
    response.status(500).json({ message: "Unable to load revenue report." });
  }
});

app.get("/api/admin/tickets", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["tickets"]), async (request, response) => {
  const status = String(request.query.status || "");
  try {
    response.json({ tickets: (await listSupportTickets(status)).map((ticket) => ({ ...ticket, sla: ticketSla(ticket.priority, ticket.created_at, ticket.status) })) });
  } catch (error) {
    console.error("Support ticket list failed", error);
    response.status(500).json({ message: "Unable to load support tickets." });
  }
});

app.get("/api/support/tickets", requireUser, async (_request, response) => {
  try {
    response.json({ tickets: await listSupportTickets("", sessionUser(response).id) });
  } catch (error) {
    console.error("Customer support ticket list failed", error);
    response.status(500).json({ message: "Unable to load your support tickets." });
  }
});

app.post("/api/support/tickets", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const subject = String(request.body.subject || "").trim();
  const message = String(request.body.message || "").trim();
  if (subject.length < 3 || subject.length > 180 || message.length < 3 || message.length > 4000) {
    response.status(400).json({ message: "Enter a subject and message (up to 4,000 characters)." });
    return;
  }
  try {
    const id = await createSupportTicket({
      requesterName: user.full_name,
      requesterMobile: user.mobile,
      subject,
      message,
      priority: "normal",
      createdBy: "customer",
      userId: user.id,
    });
    response.status(201).json({ id, message: "Your support ticket was sent to our team." });
  } catch (error) {
    console.error("Customer support ticket creation failed", error);
    response.status(500).json({ message: "Unable to submit your support ticket." });
  }
});

app.post("/api/support/tickets/:id/comments", requireUser, async (request, response) => {
  const ticketId = String(request.params.id);
  const user = sessionUser(response);
  const message = String(request.body.message || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || message.length < 1 || message.length > 4000) {
    response.status(400).json({ message: "Enter a valid ticket reply." });
    return;
  }
  try {
    const added = await addSupportTicketComment({
      ticketId,
      authorType: "customer",
      authorId: user.id,
      authorName: user.full_name,
      message,
      userId: user.id,
    });
    if (!added) {
      response.status(404).json({ message: "Ticket not found or closed." });
      return;
    }
    response.status(201).json({ ok: true });
  } catch (error) {
    console.error("Customer support ticket reply failed", error);
    response.status(500).json({ message: "Unable to send your reply." });
  }
});

app.post("/api/admin/tickets/:id/comments", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["tickets"]), async (request, response) => {
  const ticketId = String(request.params.id);
  const message = String(request.body.message || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || message.length < 1 || message.length > 4000) {
    response.status(400).json({ message: "Enter a valid ticket reply." });
    return;
  }
  try {
    const added = await addSupportTicketComment({
      ticketId,
      authorType: "admin",
      authorId: sessionAdminId(response),
      authorName: sessionAdminId(response),
      message,
    });
    if (!added) {
      response.status(404).json({ message: "Support ticket not found." });
      return;
    }
    auditAdmin(request, response, "ticket_replied", { type: "ticket", id: ticketId });
    response.status(201).json({ ok: true });
  } catch (error) {
    console.error("Admin support ticket reply failed", error);
    response.status(500).json({ message: "Unable to send the ticket reply." });
  }
});

app.patch("/api/admin/tickets/:id", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["tickets"]), async (request, response) => {
  const status = String(request.body.status || "");
  const assignedTo = String(request.body.assignedTo || "").trim() || null;
  const ticketId = String(request.params.id);
  const previous = await getSupportTicketAssignee(ticketId);
  const updated = await updateSupportTicket(ticketId, status, assignedTo);
  if (!updated) {
    response.status(404).json({ message: "Support ticket not found or status is invalid." });
    return;
  }
  if (previous.exists && previous.assignedTo !== assignedTo) {
    auditAdmin(request, response, "ticket_reassigned", { type: "ticket", id: ticketId, details: { from: previous.assignedTo, to: assignedTo } });
  }
  auditAdmin(request, response, "ticket_updated", { type: "ticket", id: ticketId, details: { status, assignedTo } });
  response.json({ ok: true });
});

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const cell = (value: unknown) => {
    const text = value instanceof Date ? value.toISOString() : value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => cell(row[header])).join(","))].join("\n");
};
const CONSENT_TYPES = ["marketing", "data_sharing", "sms_notifications", "push_notifications"];

app.post("/api/account/delete", requireUser, async (request, response) => {
  if (String(request.body.confirm || "") !== "DELETE") {
    response.status(400).json({ message: 'Type DELETE to confirm account deletion.' });
    return;
  }
  try {
    const deleted = await deleteCustomerAccount(sessionUser(response).id);
    if (!deleted) {
      response.status(404).json({ message: "Account not found." });
      return;
    }
    await revokeSession(bearerToken(request));
    response.json({ ok: true, message: "Your personal details have been removed. Payment and report records are kept as required by law." });
  } catch (error) {
    console.error("Account deletion failed", error);
    response.status(500).json({ message: "Unable to delete your account right now." });
  }
});

app.get("/api/consents", requireUser, async (_request, response) => {
  const userId = sessionUser(response).id;
  const [current, history] = await Promise.all([getCurrentConsents(userId), listConsentHistory(userId)]);
  response.json({ current, history });
});

app.post("/api/consents", requireUser, async (request, response) => {
  const consentType = String(request.body.type || "");
  if (!CONSENT_TYPES.includes(consentType) || typeof request.body.granted !== "boolean") {
    response.status(400).json({ message: "Choose a valid consent type and set granted to true or false." });
    return;
  }
  await recordConsent(sessionUser(response).id, consentType, request.body.granted);
  response.status(201).json({ ok: true });
});

app.get("/api/payments", requireUser, async (_request, response) => {
  response.json({ payments: await listCustomerPayments(sessionUser(response).id) });
});

app.get("/api/payments/:id/invoice", requireUser, async (request, response) => {
  const payment = await getPaymentForUser(sessionUser(response).id, String(request.params.id)).catch(() => null);
  if (!payment || payment.status !== "paid") {
    response.status(404).json({ message: "Paid invoice not found." });
    return;
  }
  const net = Number(payment.amount);
  const gst = Number(payment.gst_amount);
  const total = net + gst;
  const formatted = (value: number) => `Rs. ${value.toFixed(2)}`;
  const description = payment.plan_id ? `Subscription plan (${escapeHtml(payment.plan_id)})` : `Credit report (${escapeHtml(payment.report_bureau || "report")})`;
  response.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>ScoreNow invoice ${escapeHtml(payment.id)}</title>
<style>body{font-family:Arial,sans-serif;color:#081446;max-width:640px;margin:32px auto;padding:0 16px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style></head>
<body><h1>ScoreNow invoice</h1><p>Invoice no: ${escapeHtml(payment.id)}<br>Order: ${escapeHtml(payment.gateway_order_id)}<br>Date: ${new Date(payment.created_at).toISOString().slice(0, 10)}</p>
<table><tr><th>Description</th><th>Amount</th></tr><tr><td>${description}</td><td>${formatted(net)}</td></tr>
<tr><td>GST</td><td>${formatted(gst)}</td></tr><tr><th>Total paid</th><th>${formatted(total)}</th></tr></table>
<p>Status: paid</p></body></html>`);
});

app.post("/api/payments/:id/refund-request", requireUser, async (request, response) => {
  const reason = String(request.body.reason || "").trim();
  if (reason.length < 10 || reason.length > 1000) {
    response.status(400).json({ message: "Describe the reason in 10 to 1000 characters." });
    return;
  }
  const refund = await createRefundRequest(sessionUser(response).id, String(request.params.id), reason).catch(() => null);
  if (!refund) {
    response.status(409).json({ message: "This payment is not eligible for a refund request, or one was already submitted." });
    return;
  }
  response.status(201).json({ refund });
});

app.get("/api/notifications", requireUser, async (_request, response) => {
  response.json({ notifications: await listCustomerNotifications(sessionUser(response).id) });
});

app.post("/api/notifications/read", requireUser, async (request, response) => {
  const id = request.body.id === undefined || request.body.id === null ? null : String(request.body.id);
  if (id !== null && !/^\d+$/.test(id)) {
    response.status(400).json({ message: "Invalid notification id." });
    return;
  }
  const updated = await markCustomerNotificationsRead(sessionUser(response).id, id);
  response.json({ updated });
});

app.post("/api/notifications/push-token", requireUser, async (request, response) => {
  const token = String(request.body.token || "").trim();
  const platform = request.body.platform;
  if (token.length < 20 || token.length > 4096 || !["android", "ios", "web"].includes(platform)) {
    response.status(400).json({ message: "Send a device token and a platform of android, ios, or web." });
    return;
  }
  await savePushToken(sessionUser(response).id, token, platform);
  response.status(201).json({ ok: true });
});

app.get("/api/admin/refunds", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const status = ["pending", "approved", "rejected", "processed"].includes(String(request.query.status)) ? String(request.query.status) : null;
  response.json({ refunds: await listRefundRequests(status) });
});

app.post("/api/admin/refunds/:id/decision", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const id = Number(request.params.id);
  const decision = request.body.decision;
  const note = String(request.body.note || "").trim().slice(0, 500) || null;
  if (!Number.isInteger(id) || !["approved", "rejected", "processed"].includes(decision)) {
    response.status(400).json({ message: "Choose a valid refund decision." });
    return;
  }
  const refund = await decideRefundRequest(id, decision, sessionAdminId(response), note);
  if (!refund) {
    response.status(409).json({ message: "This refund cannot move to that status." });
    return;
  }
  auditAdmin(request, response, "refund_decided", { type: "refund", id: String(id), details: { decision, note } });
  const messages: Record<string, string> = {
    approved: "Your refund request was approved. Our team will process it shortly.",
    rejected: "Your refund request was not approved. Contact support for details.",
    processed: "Your refund has been processed.",
  };
  void notifyCustomer({ userId: refund.user_id, title: "Refund update", body: messages[decision] });
  response.json({ ok: true });
});

app.get("/api/admin/canned-replies", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["tickets"]), async (_request, response) => {
  response.json({ replies: await listCannedReplies() });
});

app.post("/api/admin/canned-replies", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["tickets"]), async (request, response) => {
  const title = String(request.body.title || "").trim();
  const body = String(request.body.body || "").trim();
  const id = request.body.id ? String(request.body.id) : null;
  if (title.length < 2 || title.length > 120 || body.length < 2 || body.length > 2000) {
    response.status(400).json({ message: "Enter a title up to 120 characters and a reply up to 2000 characters." });
    return;
  }
  const saved = await saveCannedReply(id, title, body, sessionAdminId(response));
  if (!saved) {
    response.status(404).json({ message: "Canned reply not found." });
    return;
  }
  auditAdmin(request, response, "canned_reply_saved", { type: "canned_reply", id: String(saved.id) });
  response.status(201).json({ id: saved.id });
});

app.delete("/api/admin/canned-replies/:id", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["tickets"]), async (request, response) => {
  const removed = await deleteCannedReply(String(request.params.id));
  if (!removed) {
    response.status(404).json({ message: "Canned reply not found." });
    return;
  }
  auditAdmin(request, response, "canned_reply_deleted", { type: "canned_reply", id: String(request.params.id) });
  response.json({ ok: true });
});

app.post("/api/admin/team/:email/password-reset", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const email = decodeURIComponent(String(request.params.email)).trim().toLowerCase();
  const reset = await createAdminPasswordReset(email);
  if (!reset) {
    response.status(404).json({ message: "No active admin with that email." });
    return;
  }
  auditAdmin(request, response, "admin_password_reset_issued", { type: "admin", id: email });
  const requestOrigin = request.get("origin");
  const requestAppUrl = requestOrigin && /^https?:\/\//i.test(requestOrigin) ? new URL(requestOrigin).origin : null;
  const baseUrl = process.env.ADMIN_APP_URL || requestAppUrl || `${request.protocol}://${request.get("host")}`;
  response.status(201).json({ email, expiresInHours: 2, resetUrl: `${baseUrl}/admin?reset=${reset.token}` });
});

app.post("/api/admin/password-reset/accept", async (request, response) => {
  const token = String(request.body.token || "");
  const password = String(request.body.password || "");
  if (!/^[0-9a-f]{64}$/.test(token) || password.length < 12) {
    response.status(400).json({ message: "Use a valid reset link and a password of at least 12 characters." });
    return;
  }
  const admin = await acceptAdminPasswordReset(token, password);
  if (!admin) {
    response.status(400).json({ message: "This reset link has expired or was already used." });
    return;
  }
  response.json({ ok: true, message: "Password updated. Sign in again." });
});

app.get("/api/admin/exports/:kind", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const kind = String(request.params.kind);
  if (!["customers", "payments", "refunds"].includes(kind)) {
    response.status(404).json({ message: "Unknown export." });
    return;
  }
  const rows = await exportRows(kind as "customers" | "payments" | "refunds");
  auditAdmin(request, response, "export_downloaded", { type: "export", id: kind, details: { rows: rows.length } });
  response.type("text/csv").attachment(`scorenow-${kind}-${new Date().toISOString().slice(0, 10)}.csv`).send(toCsv(rows as Record<string, unknown>[]));
});

app.get("/api/admin/team", requireAdmin, requireAdminRoles("owner"), async (_request, response) => {
  try {
  response.json({ admins: await listAdminAccounts(), primaryAdmin: await getPrimaryAdminEmail() });
  } catch (error) {
    console.error("Admin team list failed", error);
    response.status(500).json({ message: "Unable to load admin team." });
  }
});

app.post("/api/admin/team/invitations", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const fullName = String(request.body.fullName || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const role = request.body.role;
  const parentEmail = role === "agent" && request.body.partnerEmail ? String(request.body.partnerEmail).trim().toLowerCase() : null;
  const primaryEmail = await getPrimaryAdminEmail();
  if (fullName.length < 2 || fullName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) ||
      !["manager", "support", "analyst", "partner", "agent"].includes(role) || email === primaryEmail ||
      (role === "agent" && parentEmail !== null && !/^\S+@\S+\.\S+$/.test(parentEmail))) {
    response.status(400).json({ message: "Enter a valid name, email, and non-owner role." });
    return;
  }
  const password = request.body.password ? String(request.body.password) : "";
  const pin = request.body.pin ? String(request.body.pin) : "";
  const setCredentialsNow = password !== "" || pin !== "";
  if (setCredentialsNow && (password.length < 12 || !/^\d{6}$/.test(pin))) {
    response.status(400).json({ message: "To set credentials now, enter a password of at least 12 characters and a 6-digit PIN. Leave both empty to send an invite link instead." });
    return;
  }
  try {
    if (setCredentialsNow && (await listAdminAccounts()).some((admin) => admin.email === email)) {
      response.status(409).json({ message: "An admin with this email already exists." });
      return;
    }
    const invite = await createAdminInvitation({ fullName, email, role, invitedBy: sessionAdminId(response), parentEmail });
    if (setCredentialsNow) {
      await updateAdminCredentials({ email: invite.email, password, pin });
    }
    auditAdmin(request, response, "admin_invited", { type: "admin", id: email, details: { role, partner: parentEmail, credentialsSetByOwner: setCredentialsNow } });
    if (role === "partner" || role === "agent") {
      void recordPartnerActivity({
        actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
        event: "invited", targetEmail: parentEmail ?? email, details: { role, email },
      });
    }
    const requestOrigin = request.get("origin");
    const requestAppUrl = requestOrigin && /^https?:\/\//i.test(requestOrigin) ? new URL(requestOrigin).origin : null;
    const baseUrl = process.env.ADMIN_APP_URL || requestAppUrl || `${request.protocol}://${request.get("host")}`;
    response.status(201).json({
      email: invite.email, role, active: setCredentialsNow,
      ...(setCredentialsNow ? {} : { invitationUrl: `${baseUrl}/admin?invite=${invite.token}` }),
    });
  } catch (error) {
    console.error("Admin invitation creation failed", error);
    response.status(409).json({ message: "Unable to invite this admin. Check whether the email is already registered." });
  }
});

app.post("/api/admin/team/invitations/accept", async (request, response) => {
  const token = String(request.body.token || "");
  const password = String(request.body.password || "");
  const pin = String(request.body.pin || "");
  if (!/^[0-9a-f]{64}$/.test(token) || password.length < 12 || !/^\d{6}$/.test(pin)) {
    response.status(400).json({ message: "Use a valid invite, a password of at least 12 characters, and a 6-digit PIN." });
    return;
  }
  const admin = await acceptAdminInvitation({ token, password, pin });
  if (!admin) {
    response.status(400).json({ message: "This admin invitation has expired or was already used." });
    return;
  }
  const sessionToken = await createAdminSession({
    adminId: admin.email,
    role: admin.role,
    ipAddress: request.ip,
    userAgent: request.get("user-agent"),
  });
  if (admin.role === "partner" || admin.role === "agent") {
    void recordPartnerActivity({ actorEmail: admin.email, actorRole: admin.role, event: "invite_accepted" });
  }
  response.status(201).json({ token: sessionToken, adminId: admin.email, role: admin.role });
});

app.patch("/api/admin/team/:email/credentials", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const email = decodeURIComponent(String(request.params.email)).trim().toLowerCase();
  const newEmail = request.body.email ? String(request.body.email).trim().toLowerCase() : undefined;
  const password = request.body.password ? String(request.body.password) : undefined;
  const pin = request.body.pin ? String(request.body.pin) : undefined;
  if ((newEmail !== undefined && !/^\S+@\S+\.\S+$/.test(newEmail)) ||
      (password !== undefined && password.length < 12) ||
      (pin !== undefined && !/^\d{6}$/.test(pin)) ||
      (newEmail === undefined && password === undefined && pin === undefined)) {
    response.status(400).json({ message: "Enter a valid email, a password of at least 12 characters, and/or a 6-digit PIN. Leave a field empty to keep it." });
    return;
  }
  try {
    const primaryEmail = await getPrimaryAdminEmail();
    const primaryRow = await getPrimaryAdminRow();
    let finalEmail = newEmail ?? email;
    if (email === primaryEmail && !primaryRow) {
      if (password === undefined || pin === undefined) {
        response.status(400).json({ message: "Set both a password and a 6-digit PIN for the primary admin the first time." });
        return;
      }
      await createPrimaryAdmin({ previousEmail: email, email: finalEmail, password, pin });
    } else {
      const updated = await updateAdminCredentials({ email, newEmail, password, pin });
      if (!updated) {
        response.status(404).json({ message: "Admin account not found." });
        return;
      }
      finalEmail = updated.email;
    }
    auditAdmin(request, response, "admin_credentials_updated", {
      type: "admin", id: finalEmail,
      details: { emailChanged: newEmail !== undefined && newEmail !== email, passwordChanged: password !== undefined, pinChanged: pin !== undefined },
    });
    response.json({ ok: true, email: finalEmail });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      response.status(409).json({ message: "That email is already used by another admin account." });
      return;
    }
    console.error("Admin credential update failed", error);
    response.status(500).json({ message: "Unable to update admin credentials." });
  }
});

app.patch("/api/admin/team/:email/status", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const email = String(request.params.email).toLowerCase();
  const status = request.body.status;
  const primaryEmail = await getPrimaryAdminEmail();
  if (!/^\S+@\S+\.\S+$/.test(email) || !["active", "disabled"].includes(status) ||
      email === primaryEmail || email === sessionAdminId(response).toLowerCase()) {
    response.status(400).json({ message: "Choose a valid admin account and status. You cannot disable the primary admin or your own account." });
    return;
  }
  const updated = await setAdminAccountStatus(email, status);
  if (!updated) {
    response.status(404).json({ message: "Admin account not found." });
    return;
  }
  auditAdmin(request, response, status === "disabled" ? "admin_disabled" : "admin_enabled", { type: "admin", id: email });
  void recordPartnerActivity({
    actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
    event: status === "disabled" ? "account_disabled" : "account_enabled", targetEmail: email,
  });
  response.json({ ok: true });
});

const CRM_CUSTOMER_ROLES = ["owner", "manager", "support"] as const;

const crmCsvCell = (value: unknown) => {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const parseCrmTags = (value: unknown) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const tags = [...new Set(value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 10 || tags.some((tag) => tag.length > 30)) return null;
  return tags;
};

app.get("/api/admin/crm/pipeline", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (_request, response) => {
  try {
    response.json({ stages: CRM_STAGES, counts: await getCrmPipeline() });
  } catch (error) {
    console.error("CRM pipeline failed", error);
    response.status(500).json({ message: "Unable to load the pipeline." });
  }
});

app.get("/api/admin/crm/customers", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (request, response) => {
  const page = Number(request.query.page ?? 1);
  const stage = request.query.stage ? String(request.query.stage) : "";
  const tag = request.query.tag ? String(request.query.tag).trim().toLowerCase() : "";
  if (!Number.isSafeInteger(page) || page < 1 || (stage && !CRM_STAGES.includes(stage as CrmStage))) {
    response.status(400).json({ message: "Choose a valid CRM filter." });
    return;
  }
  try {
    const result = await listCrmCustomers({
      q: String(request.query.q || "").trim().slice(0, 100),
      stage: (stage || null) as CrmStage | null,
      tag: tag || null,
      page,
      pageSize: 25,
    });
    const maskMobile = sessionAdminRole(response) === "support";
    response.json({
      ...result,
      customers: result.customers.map((customer) => ({
        ...customer,
        mobile: maskMobile && customer.mobile ? `******${customer.mobile.slice(-4)}` : customer.mobile,
      })),
    });
  } catch (error) {
    console.error("CRM customer list failed", error);
    response.status(500).json({ message: "Unable to load CRM customers." });
  }
});

app.get("/api/admin/crm/customers/:id", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (request, response) => {
  const userId = String(request.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    response.status(400).json({ message: "Choose a valid customer." });
    return;
  }
  try {
    response.json(await getCrmTimeline(userId));
  } catch (error) {
    console.error("CRM timeline failed", error);
    response.status(500).json({ message: "Unable to load this customer's CRM record." });
  }
});

app.put("/api/admin/crm/customers/:id/profile", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (request, response) => {
  const userId = String(request.params.id);
  const stage = request.body.stage === undefined ? undefined : String(request.body.stage);
  const tags = parseCrmTags(request.body.tags);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || (stage !== undefined && !CRM_STAGES.includes(stage as CrmStage)) || tags === null) {
    response.status(400).json({ message: "Choose a valid stage and up to 10 tags of 30 characters or fewer." });
    return;
  }
  try {
    await updateCrmProfile(userId, { stage: stage as CrmStage | undefined, tags }, sessionAdminId(response) || "unknown");
    auditAdmin(request, response, "crm.profile.update", { type: "customer", id: userId, details: { stage, tags } });
    response.json(await getCrmTimeline(userId));
  } catch (error) {
    console.error("CRM profile update failed", error);
    response.status(500).json({ message: "Unable to update this customer." });
  }
});

app.post("/api/admin/crm/customers/:id/activities", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (request, response) => {
  const userId = String(request.params.id);
  const kind = String(request.body.kind || "note");
  const body = String(request.body.body || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !CRM_ACTIVITY_KINDS.includes(kind as CrmActivityKind) || body.length < 1 || body.length > 2000) {
    response.status(400).json({ message: "Choose a valid activity type and write 1 to 2000 characters." });
    return;
  }
  try {
    const activity = await addCrmActivity({ userId, kind: kind as CrmActivityKind, body, createdBy: sessionAdminId(response) || "unknown" });
    auditAdmin(request, response, "crm.activity.add", { type: "customer", id: userId, details: { kind } });
    response.status(201).json(activity);
  } catch (error) {
    console.error("CRM activity failed", error);
    response.status(500).json({ message: "Unable to save this activity." });
  }
});

app.post("/api/admin/crm/customers/:id/tasks", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (request, response) => {
  const userId = String(request.params.id);
  const title = String(request.body.title || "").trim();
  const dueInput = String(request.body.dueAt || "").trim();
  const dueDate = dueInput ? new Date(dueInput) : null;
  const assignee = String(request.body.assigneeEmail || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || title.length < 1 || title.length > 200 || (dueDate && Number.isNaN(dueDate.getTime())) || assignee.length > 200) {
    response.status(400).json({ message: "Enter a task title up to 200 characters and a valid due date." });
    return;
  }
  try {
    const task = await createCrmTask({
      userId,
      title,
      dueAt: dueDate ? dueDate.toISOString() : null,
      assigneeEmail: assignee || null,
      createdBy: sessionAdminId(response) || "unknown",
    });
    auditAdmin(request, response, "crm.task.create", { type: "customer", id: userId });
    response.status(201).json(task);
  } catch (error) {
    console.error("CRM task create failed", error);
    response.status(500).json({ message: "Unable to create this task." });
  }
});

app.patch("/api/admin/crm/tasks/:taskId", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (request, response) => {
  const taskId = Number(request.params.taskId);
  const status = String(request.body.status || "");
  if (!Number.isSafeInteger(taskId) || taskId < 1 || (status !== "open" && status !== "done")) {
    response.status(400).json({ message: "Choose a valid task and status." });
    return;
  }
  try {
    const task = await setCrmTaskStatus(taskId, status);
    if (!task) {
      response.status(404).json({ message: "Task not found." });
      return;
    }
    auditAdmin(request, response, "crm.task.update", { type: "task", id: String(taskId), details: { status } });
    response.json(task);
  } catch (error) {
    console.error("CRM task update failed", error);
    response.status(500).json({ message: "Unable to update this task." });
  }
});

app.get("/api/admin/crm/tasks", requireAdmin, requireAdminOrPartnerPage([...CRM_CUSTOMER_ROLES], ["crm"]), async (_request, response) => {
  try {
    response.json({ tasks: await listOpenCrmTasks() });
  } catch (error) {
    console.error("CRM task list failed", error);
    response.status(500).json({ message: "Unable to load tasks." });
  }
});

app.get("/api/admin/crm/export.csv", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  try {
    const rows = await getCrmExportRows();
    const header = ["Name", "Email", "Mobile", "Joined", "Stage", "Tags", "Paid payments", "Open tasks"];
    const lines = rows.map((row) => [row.name, row.email, row.mobile, row.created_at, row.stage, row.tags, row.paid_payments, row.open_tasks].map(crmCsvCell).join(","));
    auditAdmin(request, response, "crm.export", { type: "customers", details: { rows: rows.length } });
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="scorenow-crm-${new Date().toISOString().slice(0, 10)}.csv"`);
    response.send([header.join(","), ...lines].join("\r\n"));
  } catch (error) {
    console.error("CRM export failed", error);
    response.status(500).json({ message: "Unable to export CRM data." });
  }
});

// Which admin pages partner and agent logins may open. Any admin can read it; only the owner can change it.
app.get("/api/admin/partner-access", requireAdmin, async (_request, response) => {
  response.json({ pages: await enabledPartnerPages().catch(() => []), available: PARTNER_PAGE_IDS });
});

app.put("/api/admin/partner-access", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const submitted = Array.isArray(request.body?.pages) ? request.body.pages : null;
  if (!submitted || submitted.some((page: unknown) => !(PARTNER_PAGE_IDS as readonly unknown[]).includes(page))) {
    response.status(400).json({ message: "Choose pages from the list." });
    return;
  }
  const pages = PARTNER_PAGE_IDS.filter((page) => submitted.includes(page));
  try {
    await saveSiteContent(PARTNER_ACCESS_KEY, pages, sessionAdminId(response) || "unknown");
    auditAdmin(request, response, "partner_access_updated", { type: "site_content", id: PARTNER_ACCESS_KEY, details: { pages } });
    response.json({ pages, available: PARTNER_PAGE_IDS });
  } catch (error) {
    console.error("Partner access save failed", error);
    response.status(500).json({ message: "Unable to save partner page access." });
  }
});

app.get("/api/admin/partners", requireAdmin, requireAdminRoles("owner"), async (_request, response) => {
  try {
    response.json({ accounts: await listPartnerAccounts() });
  } catch (error) {
    console.error("Partner list failed", error);
    response.status(500).json({ message: "Unable to load partners and agents." });
  }
});

app.get("/api/admin/partners/:email/customers", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const email = String(request.params.email).toLowerCase();
  const role = request.query.role;
  if (!/^\S+@\S+\.\S+$/.test(email) || (role !== "partner" && role !== "agent")) {
    response.status(400).json({ message: "Choose a valid partner or agent." });
    return;
  }
  try {
    response.json({ customers: await getPortalCustomers(email, role) });
  } catch (error) {
    console.error("Partner customer list failed", error);
    response.status(500).json({ message: "Unable to load assigned customers." });
  }
});

app.put("/api/admin/customers/:id/assignment", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const userId = String(request.params.id);
  const ownerEmail = String(request.body.ownerEmail || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    response.status(400).json({ message: "Choose a valid customer and partner or agent." });
    return;
  }
  const assigned = await assignCustomerToOwner({ userId, ownerEmail, assignedBy: sessionAdminId(response) });
  if (!assigned) {
    response.status(404).json({ message: "Customer or active partner/agent not found." });
    return;
  }
  auditAdmin(request, response, "customer_assigned", { type: "customer", id: userId, details: { owner: ownerEmail } });
  void recordPartnerActivity({
    actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
    event: "customer_assigned", targetEmail: ownerEmail, details: { customerId: userId },
  });
  response.json({ ok: true });
});

app.delete("/api/admin/customers/:id/assignment", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const userId = String(request.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    response.status(400).json({ message: "Choose a valid customer." });
    return;
  }
  const removed = await unassignCustomer(userId);
  if (!removed) {
    response.status(404).json({ message: "This customer is not assigned to a partner or agent." });
    return;
  }
  auditAdmin(request, response, "customer_unassigned", { type: "customer", id: userId });
  void recordPartnerActivity({
    actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
    event: "customer_unassigned", details: { customerId: userId },
  });
  response.json({ ok: true });
});

app.get("/api/admin/commissions", requireAdmin, requireAdminRoles("owner"), async (_request, response) => {
  try {
    response.json({ commissions: await listCommissions() });
  } catch (error) {
    console.error("Commission list failed", error);
    response.status(500).json({ message: "Unable to load commissions." });
  }
});

app.post("/api/admin/commissions", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const payeeEmail = String(request.body.payeeEmail || "").trim().toLowerCase();
  const amountRupees = Number(request.body.amountRupees);
  const userId = request.body.userId ? String(request.body.userId) : null;
  const note = String(request.body.note || "").trim().slice(0, 300) || null;
  if (!/^\S+@\S+\.\S+$/.test(payeeEmail) || !Number.isFinite(amountRupees) || amountRupees <= 0 || amountRupees > 1000000 ||
      (userId !== null && !/^[0-9a-f-]{36}$/i.test(userId))) {
    response.status(400).json({ message: "Enter a valid partner or agent and an amount between ₹1 and ₹10,00,000." });
    return;
  }
  const commission = await createCommission({
    payeeEmail,
    userId,
    amountPaise: Math.round(amountRupees * 100),
    note,
    createdBy: sessionAdminId(response),
  });
  if (!commission) {
    response.status(404).json({ message: "Active partner or agent not found." });
    return;
  }
  auditAdmin(request, response, "commission_added", { type: "commission", id: commission.id, details: { payee: payeeEmail, amountRupees } });
  void recordPartnerActivity({
    actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
    event: "commission_added", targetEmail: payeeEmail, details: { amountRupees },
  });
  response.status(201).json({ id: commission.id });
});

app.patch("/api/admin/commissions/:id/paid", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const id = String(request.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    response.status(400).json({ message: "Choose a valid commission." });
    return;
  }
  const marked = await markCommissionPaid(id);
  if (!marked) {
    response.status(404).json({ message: "Pending commission not found." });
    return;
  }
  auditAdmin(request, response, "commission_paid", { type: "commission", id });
  void recordPartnerActivity({
    actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
    event: "commission_paid", details: { commissionId: id },
  });
  response.json({ ok: true });
});

// Partners and agents see only their own book of customers and their own earnings.
const partnerPortalSnapshot = async (email: string, role: PartnerRole) => {
  const [customers, earnings, commissions, activity] = await Promise.all([
    getPortalCustomers(email, role),
    getPortalEarnings(email),
    listCommissions(email),
    listPartnerActivity(email, 50),
  ]);
  return { role, customers, earnings, commissions, activity };
};

const partnerMonitorSnapshot = async () => {
  const [partners, activity] = await Promise.all([listPartnerAccounts(), listPartnerActivity(undefined, 100)]);
  const customerIds = activity.map((row) => row.details?.customerId).filter((id): id is string => typeof id === "string");
  const names = await listCustomerNames(customerIds);
  const enriched = activity.map((row) => {
    const customerId = row.details?.customerId;
    return typeof customerId === "string" && names.has(customerId)
      ? { ...row, details: { ...row.details, customerName: names.get(customerId) } }
      : row;
  });
  return { partners, activity: enriched };
};

// Customer-list changes that a partner's own view must refresh for. Snapshots are scoped server-side, so this only controls refresh timing.
const PORTAL_REFRESH_EVENTS = new Set(["customer_assigned", "customer_unassigned", "report_completed"]);

// Server-Sent Events over fetch with the Bearer header, so the session token never appears in a URL.
// Sends a snapshot on connect and after relevant changes (debounced). The heartbeat re-checks the session and disconnects revoked or expired ones.
const streamAdminSnapshots = (
  request: Request,
  response: Response,
  buildSnapshot: () => Promise<unknown>,
  isRelevant: (event: PartnerActivityEvent) => boolean,
) => {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  let closed = false;
  let debounce: NodeJS.Timeout | null = null;
  const send = (event: string, data: unknown) => {
    if (!closed) response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const push = () => {
    buildSnapshot()
      .then((data) => send("snapshot", data))
      .catch((error) => {
        console.error("Admin live snapshot failed", error);
        send("error", { message: "Live update failed. Refresh to try again." });
      });
  };
  const onActivity = (event: PartnerActivityEvent) => {
    if (!isRelevant(event)) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(push, 300);
  };
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    if (debounce) clearTimeout(debounce);
    partnerEvents.off(PARTNER_ACTIVITY_CHANNEL, onActivity);
    response.end();
  };
  const heartbeat = setInterval(() => {
    findAdminSession(bearerToken(request))
      .then((admin) => {
        if (!admin) {
          send("expired", {});
          close();
          return;
        }
        if (!closed) response.write(": keep-alive\n\n");
      })
      .catch(close);
  }, 25_000);
  partnerEvents.on(PARTNER_ACTIVITY_CHANNEL, onActivity);
  request.on("close", close);
  push();
};

app.get("/api/admin/portal", requireAdmin, requireAdminRoles("partner", "agent"), async (request, response) => {
  const email = sessionAdminId(response).toLowerCase();
  const role = sessionAdminRole(response) as PartnerRole;
  try {
    response.json(await partnerPortalSnapshot(email, role));
  } catch (error) {
    console.error("Partner portal load failed", error);
    response.status(500).json({ message: "Unable to load your portal." });
  }
});

app.get("/api/admin/portal/stream", requireAdmin, requireAdminRoles("partner", "agent"), (request, response) => {
  const email = sessionAdminId(response).toLowerCase();
  const role = sessionAdminRole(response) as PartnerRole;
  streamAdminSnapshots(
    request,
    response,
    () => partnerPortalSnapshot(email, role),
    (event) => event.actor_email === email || event.target_email === email || PORTAL_REFRESH_EVENTS.has(event.event),
  );
});

// Owner and manager only: all partners and agents with live status and activity.
app.get("/api/admin/partner-monitor", requireAdmin, requireAdminOrPartnerPage(["owner", "manager"], ["monitor"]), async (_request, response) => {
  try {
    response.json(await partnerMonitorSnapshot());
  } catch (error) {
    console.error("Partner monitor load failed", error);
    response.status(500).json({ message: "Unable to load partner monitoring." });
  }
});

app.get("/api/admin/partner-monitor/stream", requireAdmin, requireAdminOrPartnerPage(["owner", "manager"], ["monitor"]), (request, response) => {
  streamAdminSnapshots(request, response, partnerMonitorSnapshot, () => true);
});

// Partners and agents save their payout details here. The account number is only returned masked.
const maskAccount = (value: string | null) => (value ? `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : null);

const payoutProfileResponse = (profile: Awaited<ReturnType<typeof getPayoutProfile>>) => ({
  upiId: profile?.upi_id ?? null,
  bankAccountMasked: maskAccount(profile?.bank_account_number ?? null),
  ifsc: profile?.ifsc ?? null,
  hasBank: Boolean(profile?.bank_account_number && profile?.ifsc),
});

app.get("/api/admin/portal/payout-profile", requireAdmin, requireAdminRoles("partner", "agent"), async (_request, response) => {
  try {
    response.json(payoutProfileResponse(await getPayoutProfile(sessionAdminId(response))));
  } catch (error) {
    console.error("Payout profile load failed", error);
    response.status(500).json({ message: "Unable to load your payout details." });
  }
});

app.put("/api/admin/portal/payout-profile", requireAdmin, requireAdminRoles("partner", "agent"), async (request, response) => {
  const email = sessionAdminId(response);
  const fullName = String(request.body.fullName || "").trim().slice(0, 120);
  const upiId = String(request.body.upiId || "").trim().toLowerCase() || null;
  const bankAccountNumber = String(request.body.bankAccountNumber || "").replace(/\s/g, "") || null;
  const ifsc = String(request.body.ifsc || "").trim().toUpperCase() || null;

  if (fullName.length < 2) {
    response.status(400).json({ message: "Enter the full name as it appears on your bank account." });
    return;
  }
  if (upiId && !/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/.test(upiId)) {
    response.status(400).json({ message: "Enter a valid UPI ID, for example name@bank." });
    return;
  }
  if (bankAccountNumber && !/^\d{6,20}$/.test(bankAccountNumber)) {
    response.status(400).json({ message: "Enter a valid bank account number (6 to 20 digits)." });
    return;
  }
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    response.status(400).json({ message: "Enter a valid IFSC code." });
    return;
  }
  if (Boolean(bankAccountNumber) !== Boolean(ifsc)) {
    response.status(400).json({ message: "Enter both the bank account number and IFSC code, or leave both empty." });
    return;
  }
  if (!upiId && !bankAccountNumber) {
    response.status(400).json({ message: "Add a UPI ID or a bank account to receive payouts." });
    return;
  }

  try {
    await savePayoutProfile({ email, fullName, upiId, bankAccountNumber, ifsc });
    void recordPartnerActivity({ actorEmail: email, actorRole: sessionAdminRole(response), event: "payout_profile_updated" });
    response.json(payoutProfileResponse(await getPayoutProfile(email)));
  } catch (error) {
    console.error("Payout profile save failed", error);
    response.status(500).json({ message: "Unable to save your payout details." });
  }
});

app.post("/api/admin/commissions/pay-batch", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const payeeEmail = String(request.body.payeeEmail || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(payeeEmail)) {
    response.status(400).json({ message: "Choose a valid partner or agent." });
    return;
  }
  try {
    const result = await payPendingCommissions(payeeEmail);
    auditAdmin(request, response, "commission_batch_paid", { type: "commission", details: { payee: payeeEmail, payoutId: result.payoutId, amountPaise: result.amountPaise, count: result.count, mode: result.mode } });
    void recordPartnerActivity({
      actorEmail: sessionAdminId(response), actorRole: sessionAdminRole(response),
      event: "commission_batch_paid", targetEmail: payeeEmail, details: { amountRupees: result.amountPaise / 100, count: result.count },
    });
    response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PayoutError) {
      response.status(400).json({ message: error.message });
      return;
    }
    console.error("Commission batch payout failed", error);
    response.status(502).json({ message: error instanceof Error ? error.message : "Payout failed. Please try again." });
  }
});

app.post("/api/admin/logout", requireAdmin, async (request, response) => {
  await revokeAdminSession(bearerToken(request));
  auditAdmin(request, response, "logout");
  const role = sessionAdminRole(response);
  if (role === "partner" || role === "agent") {
    void recordPartnerActivity({ actorEmail: sessionAdminId(response), actorRole: role, event: "signed_out" });
  }
  response.json({ ok: true });
});

app.post("/api/admin/reports", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const bureau = request.body.bureau;
  if (!isBureau(bureau)) {
    response.status(400).json({ message: "Choose a valid credit bureau." });
    return;
  }
  if (request.body.consent !== true) {
    response.status(400).json({ message: "Confirm that the client has consented to this bureau report request." });
    return;
  }
  if (!isBureauAvailable(bureau)) {
    response.status(503).json({ message: `${bureauNames[bureau]} reports are not configured.` });
    return;
  }

  const applicant: Applicant = {
    fullName: String(request.body.fullName || "").trim(),
    pan: String(request.body.pan || "").trim().toUpperCase(),
    dateOfBirth: String(request.body.dateOfBirth || "").trim(),
    gender: String(request.body.gender || "").trim().toLowerCase() || null,
    addressLine1: String(request.body.addressLine1 || "").trim() || null,
    city: String(request.body.city || "").trim() || null,
    state: String(request.body.state || "").trim() || null,
    pincode: String(request.body.pincode || "").trim() || null,
    email: String(request.body.email || "").trim() || null,
    mobile: String(request.body.mobile || "").replace(/\D/g, ""),
  };
  if (applicant.fullName.length < 2 || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(applicant.pan) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(applicant.dateOfBirth) || applicant.mobile.length !== 10) {
    response.status(400).json({ message: "Enter a valid full name, PAN, date of birth, and 10-digit mobile number." });
    return;
  }
  const missing = missingApplicantFields(bureau, applicant);
  if (missing.length) {
    response.status(400).json({ message: `Enter ${missing.join(", ")} to request this report.` });
    return;
  }

  const consentIpAddress = requestIpAddress(request);
  const auditId = await createAdminReportAudit({
    adminId: sessionAdminId(response),
    bureau,
    panLast4: applicant.pan.slice(-4),
    mobileLast4: applicant.mobile.slice(-4),
    consentIpAddress,
    applicant,
  });
  auditAdmin(request, response, "manual_bureau_check", { type: "admin_report", id: String(auditId), details: { bureau, mobileLast4: applicant.mobile.slice(-4), panLast4: applicant.pan.slice(-4) } });

  try {
    const result = await fetchBureauReport(bureau, applicant, consentIpAddress);
    if (!result.ok) {
      await completeAdminReportAudit({ auditId, status: "failed", providerTransactionId: null, creditScore: null, failureReason: result.message, providerResponse: result.raw });
      response.status(502).json({ message: result.message, diagnostics: result.diagnostics });
      return;
    }

    const report = normalizeReport(bureau, result.raw);
    await completeAdminReportAudit({ auditId, status: "completed", providerTransactionId: result.providerTxnId, creditScore: report.score, failureReason: null,
      providerResponse: result.raw, normalizedReport: report });
    const document = await captureBureauDocument(result.raw, bureau, (html) => saveAdminReportDocument(auditId, { pdf: null, html }));
    if (document.pdf || document.html) {
      await saveAdminReportDocument(auditId, document).catch((error) => console.error("Admin report document save failed", error));
    }
    response.json({ auditId: String(auditId), bureau, providerTxnId: result.providerTxnId, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch this credit report.";
    await completeAdminReportAudit({ auditId, status: "failed", providerTransactionId: null, creditScore: null, failureReason: message });
    console.error("Admin bureau report request failed", error);
    response.status(502).json({ message: "Unable to fetch this credit report." });
  }
});

// The bureau's own PDF link (never the single-use htmlUrl) is still valid for ~24h after the check.
const bureauPdfUrl = (raw: unknown) => {
  const url = (raw as { data?: { data?: { pdf_report_url?: unknown } } } | null)?.data?.data?.pdf_report_url;
  return typeof url === "string" ? url : null;
};

type ReportFileRecord = {
  bureau: Bureau;
  reportDate: string;
  pdf: Buffer | null;
  html: string | null;
  raw?: unknown;
  report: Parameters<typeof generateReportPdf>[0]["report"];
};

const sendReportFile = async (response: Response, record: ReportFileRecord, savePdf: (pdf: Buffer) => Promise<void>) => {
  const cibilPdf = record.bureau === "cibil" && record.raw ? await tryGenerateCibilPdf(record.raw) : null;
  let pdf = cibilPdf ?? record.pdf;
  if (!pdf && record.html) pdf = await htmlToPdf(record.html);
  if (!pdf && record.raw) pdf = await downloadReportPdf(bureauPdfUrl(record.raw));
  if (pdf && pdf !== record.pdf) await savePdf(pdf).catch((error) => console.error("Report PDF save failed", error));
  const name = `ScoreNow-${record.bureau}-report-${record.reportDate}`;
  if (!pdf && record.html) {
    response.set({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.html"`,
      "Cache-Control": "private, no-store",
    }).send(record.html);
    return;
  }
  const generated = !pdf;
  pdf ??= await generateReportPdf({ report: record.report, reportDate: record.reportDate });
  response.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${generated ? `${name}-scorenow-summary` : name}.pdf"`,
    "X-Report-Source": generated ? "scorenow-summary" : "bureau",
    "Access-Control-Expose-Headers": "X-Report-Source",
    "Cache-Control": "private, no-store",
  }).send(pdf);
};

app.get("/api/admin/reports/:auditId/pdf", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const auditId = Number(request.params.auditId);
  if (!Number.isSafeInteger(auditId) || auditId < 1) {
    response.status(400).json({ message: "Choose a valid admin report." });
    return;
  }
  try {
    const record = await getAdminReportDocument(auditId);
    if (!record) {
      response.status(404).json({ message: "Completed admin report not found." });
      return;
    }
    await sendReportFile(response, record, (pdf) => saveAdminReportDocument(auditId, { pdf, html: null }));
  } catch (error) {
    console.error("Admin report PDF generation failed", error);
    response.status(500).json({ message: "Unable to generate this report PDF." });
  }
});

app.get("/api/admin/customer-reports/:requestId/pdf", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const requestId = String(request.params.requestId);
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    response.status(400).json({ message: "Choose a valid report." });
    return;
  }
  try {
    const record = await getReportPdf(null, requestId);
    if (!record) {
      response.status(404).json({ message: "Completed report not found." });
      return;
    }
    auditAdmin(request, response, "customer_report_download", { type: "customer", id: record.userId, details: { bureau: record.bureau, requestId } });
    await sendReportFile(response, record, (pdf) => saveReportPdf(record.requestId, pdf));
  } catch (error) {
    console.error("Admin customer report download failed", error);
    response.status(500).json({ message: "Unable to download this report." });
  }
});

const sendOtpEmail = async (to: string, code: string) => {
  const transport = createMailTransport();
  if (!transport) return false;
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "Scorenow Website <no-reply@scorenow.in>",
    to,
    subject: "Your Scorenow verification code",
    text: `Your Scorenow verification code is ${code}. It expires in 5 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#081446"><div style="padding:20px;background:#087af5;color:white"><h1 style="margin:0;font-size:20px">Scorenow</h1></div><div style="padding:22px;background:#f7fbff"><p>Your verification code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:6px">${code}</p><p style="color:#65708a;font-size:12px">This code expires in 5 minutes. If you did not request this, you can ignore this email.</p></div></div>`,
  });
  return true;
};

const sendOtpSms = async (mobile: string, code: string) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;
  if (!apiKey) return false;
  const template = process.env.TWOFACTOR_OTP_TEMPLATE || "Scorenow_Login_Otp";
  try {
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/91${mobile}/${code}/${encodeURIComponent(template)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => null) as { Status?: string; Details?: string } | null;
    if (response.ok && result?.Status === "Success") return true;
    console.error(`2Factor SMS failed for ******${mobile.slice(-4)}: HTTP ${response.status} ${String(result?.Details ?? "").slice(0, 200)}`);
    return false;
  } catch (error) {
    console.error("2Factor SMS request failed", error instanceof Error ? error.message : error);
    return false;
  }
};

const smsOtpAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_SMS_OTP_PER_IP = 10;
const SMS_OTP_WINDOW_MS = 60 * 60 * 1000;

const canSendSmsOtp = (ipAddress: string) => {
  const now = Date.now();
  const attempt = smsOtpAttempts.get(ipAddress);
  if (!attempt || attempt.resetAt <= now) {
    smsOtpAttempts.set(ipAddress, { count: 1, resetAt: now + SMS_OTP_WINDOW_MS });
    return true;
  }
  if (attempt.count >= MAX_SMS_OTP_PER_IP) return false;
  attempt.count += 1;
  return true;
};

const otpVerifyAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_OTP_VERIFY_ATTEMPTS = 5;
const OTP_VERIFY_WINDOW_MS = 15 * 60 * 1000;
const canVerifyOtp = (contactKey: string) => {
  const now = Date.now();
  const attempt = otpVerifyAttempts.get(contactKey);
  if (!attempt || attempt.resetAt <= now) {
    otpVerifyAttempts.set(contactKey, { count: 1, resetAt: now + OTP_VERIFY_WINDOW_MS });
    return true;
  }
  if (attempt.count >= MAX_OTP_VERIFY_ATTEMPTS) return false;
  attempt.count += 1;
  return true;
};

app.post("/api/auth/otp/request", async (request, response) => {
  const type = request.body.type === "email" ? "email" : request.body.type === "mobile" ? "mobile" : null;
  const value = String(request.body.value || "").trim();

  if (!type) {
    response.status(400).json({ message: "Specify a mobile or email contact type." });
    return;
  }

  try {
    if (type === "mobile") {
      const mobile = value.replace(/\D/g, "");
      if (mobile.length !== 10) {
        response.status(400).json({ message: "Enter a valid 10-digit mobile number." });
        return;
      }
      if (!process.env.TWOFACTOR_API_KEY) {
        response.status(503).json({ message: "SMS verification is unavailable. Please try again later." });
        return;
      }
      if (!canSendSmsOtp(requestIpAddress(request))) {
        response.status(429).json({ message: "Too many verification codes requested. Try again in an hour." });
        return;
      }
      const { code } = await createOtp({ mobile, purpose: "login" });
      const delivered = await sendOtpSms(mobile, code);
      if (!delivered) {
        response.status(503).json({ message: "SMS verification is unavailable. Please try again later." });
        return;
      }
      response.json({ message: "A verification code was sent to your mobile number." });
      return;
    }

    const email = value.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      response.status(400).json({ message: "Enter a valid email address." });
      return;
    }
    const user = await findUserByEmail(email);
    if (!user) {
      response.status(404).json({ message: "No account found with that email. Please sign in with your mobile number first." });
      return;
    }
    const { code } = await createOtp({ mobile: user.mobile, email, purpose: "login" });
    const delivered = await sendOtpEmail(email, code);
    if (!delivered) {
      response.status(503).json({ message: "Email verification is unavailable. Please try again later." });
      return;
    }
    response.json({ message: "A verification code was sent to your email." });
  } catch (error) {
    response.status(429).json({ message: error instanceof Error ? error.message : "Unable to send a verification code." });
  }
});

app.post("/api/auth/otp/verify", async (request, response) => {
  const type = request.body.type === "email" ? "email" : request.body.type === "mobile" ? "mobile" : null;
  const value = String(request.body.value || "").trim();
  const code = String(request.body.code || "").trim();
  const fullName = String(request.body.fullName || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  const intent = request.body.intent === "signup" ? "signup" : "login";

  if (!type || !value || !/^\d{6}$/.test(code)) {
    response.status(400).json({ message: "Enter the 6-digit code you received." });
    return;
  }
  if (!canVerifyOtp(`${type}:${value.toLowerCase()}`)) {
    response.status(429).json({ message: "Too many verification attempts. Wait 15 minutes and request a new code." });
    return;
  }
  if (intent === "signup" && (type !== "mobile" || fullName.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128)) {
    response.status(400).json({ message: "Sign-up requires your name, a valid email, and a password of 8 to 128 characters." });
    return;
  }

  try {
    if (type === "mobile") {
      const mobile = value.replace(/\D/g, "");
      await verifyOtp({ mobile, code, purpose: "login" });
      const user = await upsertUserByMobile({ mobile, fullName, email: email || undefined });
      if (intent === "signup" && !await setCustomerPassword(user.id, email, password)) {
        response.status(409).json({ message: "That email is already linked to another account, or the account cannot be updated." });
        return;
      }
      response.json({ message: "Verified successfully.", user, token: await startSession(request, user.id) });
      return;
    }

    const lookupEmail = value.toLowerCase();
    const user = await findUserByEmail(lookupEmail);
    if (!user) {
      response.status(404).json({ message: "No account found with that email." });
      return;
    }
    await verifyOtp({ mobile: user.mobile, code, purpose: "login" });
    const updatedUser = await markEmailVerified(user.id);
    response.json({ message: "Verified successfully.", user: updatedUser, token: await startSession(request, updatedUser.id) });
  } catch (error) {
    response.status(400).json({ message: error instanceof Error ? error.message : "Verification failed." });
  }
});

app.post("/api/auth/firebase-session", async (request, response) => {
  const idToken = String(request.body.idToken || "");
  const fullName = String(request.body.fullName || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  const intent = request.body.intent === "signup" ? "signup" : "login";
  if (!idToken) {
    response.status(400).json({ message: "Missing Firebase ID token." });
    return;
  }
  if (intent === "signup" && (fullName.length < 2 || !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 8 || password.length > 128)) {
    response.status(400).json({ message: "Sign-up requires your name, a valid email, and a password of 8 to 128 characters." });
    return;
  }

  try {
    const token = await verifyFirebasePhoneToken(idToken);
    const mobile = token.phone_number!.replace(/^\+91/, "").replace(/\D/g, "");
    if (mobile.length !== 10) throw new Error("Use an Indian mobile number for this account.");
    const user = await upsertUserByMobile({ mobile, fullName, email: email || undefined });
    if (intent === "signup" && !await setCustomerPassword(user.id, email, password)) {
      response.status(409).json({ message: "That email is already linked to another account, or the account cannot be updated." });
      return;
    }
    response.json({ message: "Phone verified successfully.", user, token: await startSession(request, user.id) });
  } catch (error) {
    console.error("Firebase phone session verification failed", error);
    response.status(503).json({ message: error instanceof Error ? error.message : "Unable to verify your mobile sign-in." });
  }
});

app.post("/api/auth/google-session", async (request, response) => {
  const ipAddress = requestIpAddress(request);
  if (!canAttemptCustomerEmailLogin(ipAddress)) {
    response.status(429).json({ message: "Too many sign-in attempts. Try again in 15 minutes." });
    return;
  }

  const idToken = String(request.body.idToken || "");
  if (!idToken) {
    response.status(400).json({ message: "Missing Google sign-in token." });
    return;
  }

  let token: Awaited<ReturnType<typeof verifyFirebaseGoogleToken>>;
  try {
    token = await verifyFirebaseGoogleToken(idToken);
  } catch (error) {
    console.error("Firebase Google token verification failed", error);
    response.status(401).json({ message: error instanceof Error ? error.message : "Unable to verify your Google sign-in." });
    return;
  }

  try {
    const user = await findUserByEmail(token.email!.trim().toLowerCase());
    if (!user) {
      response.status(404).json({ message: "No Scorenow account is linked to this Google email. Create an account with your mobile number first, then sign in with Google." });
      return;
    }
    const verifiedUser = user.email_verified ? user : await markEmailVerified(user.id);
    customerEmailLoginAttempts.delete(ipAddress);
    response.json({
      message: "Signed in successfully.",
      user: verifiedUser,
      token: await startSession(request, verifiedUser.id),
    });
  } catch (error) {
    console.error("Customer Google sign-in failed", error);
    response.status(500).json({ message: "Unable to sign in with Google right now. Please try again." });
  }
});

app.post("/api/auth/logout", async (request, response) => {
  const token = bearerToken(request);
  if (token) await revokeSession(token).catch(() => undefined);
  response.json({ message: "Logged out." });
});

app.get("/api/dashboard", requireUser, async (_request, response) => {
  try {
    response.json(await getDashboardStatus(sessionUser(response).id));
  } catch (error) {
    console.error("Dashboard status lookup failed", error);
    response.status(500).json({ message: "Unable to load your credit dashboard." });
  }
});

app.post("/api/profile", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const nameAsPerPan = String(request.body.nameAsPerPan || "").trim();
  const pan = String(request.body.pan || "").trim();
  const dateOfBirth = String(request.body.dateOfBirth || "").trim();
  const gender = String(request.body.gender || "").trim().toLowerCase();
  const addressLine1 = String(request.body.addressLine1 || "").trim();
  const city = String(request.body.city || "").trim();
  const state = String(request.body.state || "").trim();
  const pincode = String(request.body.pincode || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
  if (nameAsPerPan.length < 2 || !panPattern.test(pan) || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    response.status(400).json({ message: "Enter a valid PAN, name, and date of birth." });
    return;
  }
  if (!addressLine1 || !city || !stateCodes[state] || !/^\d{6}$/.test(pincode) || !["male", "female", "other"].includes(gender)) {
    response.status(400).json({ message: "Enter your gender, address, city, state, and 6-digit PIN code." });
    return;
  }
  if (!user.email && !/^\S+@\S+\.\S+$/.test(email)) {
    response.status(400).json({ message: "Enter a valid email address." });
    return;
  }

  try {
    if (!user.email) await setUserEmailIfMissing(user.id, email);
    const profile = await saveKycProfile({ userId: user.id, nameAsPerPan, pan, dateOfBirth, gender, addressLine1, city, state, pincode });
    response.status(201).json({ message: "Profile saved. You can now get your credit report.", profile });
  } catch (error) {
    console.error("KYC profile save failed", error);
    const message = error instanceof Error && error.message.includes("email") ? error.message : "We could not save those details. Please check them and try again.";
    response.status(400).json({ message });
  }
});

app.get("/api/reports/options", async (_request, response) => {
  try {
    response.json({
      price: await currentReportPrice(),
      paymentsEnabled: isSimulatedPayments() || isRazorpayConfigured(),
      paymentsMode: isSimulatedPayments() ? "simulated" : "razorpay",
      demoMode: isReportsDemoMode(),
      bureaus: BUREAUS.map((id) => ({ id, name: bureauNames[id], available: isBureauAvailable(id) })),
    });
  } catch (error) {
    console.error("Report options lookup failed", error);
    response.status(500).json({ message: "Unable to load report options." });
  }
});

const runReportFetch = async (userId: string, requestId: string, bureau: Bureau, consentIpAddress: string): Promise<ProviderDiagnostics | null> => {
  const applicant = await getApplicant(userId);
  if (!applicant) {
    await failReportRequest(requestId, "Complete your profile before fetching a report.");
    return null;
  }
  const result = await fetchBureauReport(bureau, applicant, consentIpAddress);
  if (!result.ok) {
    await failReportRequest(requestId, result.message, result.raw);
    return result.diagnostics;
  }
  const report = normalizeReport(bureau, result.raw);
  console.log(`Report normalized for ${bureau}:`, {
    score: report.score,
    accountsCount: report.accounts.length,
    enquiriesCount: report.enquiries.length,
    scoreFactorsCount: report.scoreFactors?.length ?? 0,
  });
  await completeReportRequest({
    userId,
    requestId,
    bureau,
    providerTxnId: result.providerTxnId,
    band: scoreBand(report.score),
    reportUrl: result.reportUrl,
    report,
    raw: result.raw,
  });
  const document = await captureBureauDocument(result.raw, bureau, (html) => saveReportDocument(requestId, { pdf: null, html }));
  if (document.pdf || document.html) {
    await saveReportDocument(requestId, document).catch((error) => console.error("Report document save failed", error));
  } else {
    console.warn(`No downloadable document captured for ${bureau} report ${requestId}`);
  }
  return result.diagnostics;
};

app.get("/api/reports/:requestId/pdf", requireUser, async (request, response) => {
  try {
    const record = await getReportPdf(sessionUser(response).id, String(request.params.requestId));
    if (!record) {
      response.status(404).json({ message: "Report not found." });
      return;
    }
    await sendReportFile(response, record, (pdf) => saveReportPdf(record.requestId, pdf));
  } catch (error) {
    console.error("Report PDF lookup failed", error);
    response.status(500).json({ message: "Unable to download the PDF right now." });
  }
});

app.get("/api/reports/:requestId", requireUser, async (request, response) => {
  try {
    const detail = await getReportDetail(sessionUser(response).id, String(request.params.requestId));
    if (!detail) {
      response.status(404).json({ message: "Report not found." });
      return;
    }
    // Debug: Log account/enquiry counts
    console.log(`Report detail for ${request.params.requestId}:`, {
      bureau: (detail as any).bureau,
      accountsCount: (detail as any).accounts?.length ?? 0,
      enquiriesCount: (detail as any).enquiries?.length ?? 0,
      firstAccountKeys: (detail as any).accounts?.[0] ? Object.keys((detail as any).accounts[0]) : [],
    });
    response.json(detail);
  } catch (error) {
    console.error("Report detail lookup failed", error);
    response.status(500).json({ message: "Unable to load this report." });
  }
});

app.post("/api/reports/demo", requireUser, async (request, response) => {
  const bureau = request.body.bureau;
  if (!isReportsDemoMode() || !isBureau(bureau)) {
    response.status(404).json({ message: "Demo reports are not available." });
    return;
  }
  try {
    const userId = sessionUser(response).id;
    const requestId = await createDemoReportRequest(userId, bureau);
    const raw = demoReportResponses[bureau];
    const report = normalizeReport(bureau, raw);
    await completeReportRequest({ userId, requestId, bureau, providerTxnId: null, band: scoreBand(report.score), reportUrl: null, report, raw });
    response.json(await getDashboardStatus(userId));
  } catch (error) {
    console.error("Demo report creation failed", error);
    response.status(500).json({ message: "Unable to create a demo report." });
  }
});

app.post("/api/reports/order", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const bureau = request.body.bureau;
  if (!isBureau(bureau)) {
    response.status(400).json({ message: "Choose a valid credit bureau (CIBIL, Equifax, Experian, or CRIF)." });
    return;
  }
  if (!isBureauAvailable(bureau)) {
    response.status(503).json({ message: `${bureauNames[bureau]} reports are not available yet.` });
    return;
  }
  if (!isSimulatedPayments() && !isRazorpayConfigured()) {
    response.status(503).json({ message: "Online payments are not configured yet. Please try again later." });
    return;
  }

  try {
    const applicant = await getApplicant(user.id);
    if (!applicant) {
      response.status(400).json({ message: "Complete your profile before buying a report." });
      return;
    }
    const missing = missingApplicantFields(bureau, applicant);
    if (missing.length) {
      response.status(400).json({ message: `Add your ${missing.join(", ")} to your profile to get a ${bureauNames[bureau]} report.` });
      return;
    }

    const simulated = isSimulatedPayments();
    const reportPrice = await currentReportPrice();
    const order = simulated
      ? { id: simulatedId("order"), amount: reportPrice * 100, currency: "INR" }
      : await createRazorpayOrder({
        amountPaise: reportPrice * 100,
        receipt: `rpt_${bureau}_${Date.now()}`,
        notes: { userId: user.id, bureau },
      });
    await createReportPayment({
      userId: user.id, bureau, orderId: order.id, amount: reportPrice, gstAmount: gstIncluded(reportPrice),
      gateway: simulated ? "simulated" : "razorpay",
    });
    response.status(201).json({
      simulated,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: simulated ? undefined : process.env.RAZORPAY_KEY_ID,
      bureau,
      bureauName: bureauNames[bureau],
      prefill: { name: user.full_name, email: user.email ?? undefined, contact: `+91${user.mobile}` },
    });
  } catch (error) {
    console.error("Report order creation failed", error);
    response.status(502).json({ message: "Unable to start the payment. Please try again." });
  }
});

app.post("/api/reports/verify", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const orderId = String(request.body.orderId || "");
  let paymentId = String(request.body.paymentId || "");
  const signature = String(request.body.signature || "");

  const payment = orderId ? await findReportPayment(user.id, orderId) : null;
  if (!payment || !isBureau(payment.report_bureau)) {
    response.status(404).json({ message: "We could not find that payment." });
    return;
  }
  if (payment.gateway === "simulated") {
    if (!isSimulatedPayments()) {
      await markPaymentFailed(payment.id, "Simulated payment order was rejected.");
      response.status(400).json({ message: "Simulated payments are no longer accepted. Please pay again." });
      return;
    }
    paymentId = simulatedId("pay");
  } else if (!paymentId || !signature || !isValidPaymentSignature(orderId, paymentId, signature)) {
    await markPaymentFailed(payment.id, "Payment signature verification failed.");
    response.status(400).json({ message: "Payment verification failed. If money was deducted, it will be refunded by Razorpay." });
    return;
  }

  try {
    const bureau = payment.report_bureau;
    const requestId = await markPaymentPaidAndCreateRequest({ userId: user.id, paymentDbId: payment.id, gatewayPaymentId: paymentId, bureau });
    if (!requestId) {
      response.status(409).json({ message: "This payment was already processed." });
      return;
    }
    const providerDiagnostics = await runReportFetch(user.id, requestId, bureau, requestIpAddress(request));
    response.json({ ...(await getDashboardStatus(user.id)), providerDiagnostics });
  } catch (error) {
    console.error("Report payment verification failed", error);
    response.status(500).json({ message: "Payment received, but we could not fetch the report yet. Use Retry on your dashboard." });
  }
});

app.get("/api/subscription", requireUser, async (_request, response) => {
  try {
    response.json({
      plans: await currentSubscriptionPlans(),
      paymentsEnabled: isSimulatedPayments() || isRazorpayConfigured(),
      paymentsMode: isSimulatedPayments() ? "simulated" : "razorpay",
      ...(await getUserSubscriptions(sessionUser(response).id)),
    });
  } catch (error) {
    console.error("Subscription lookup failed", error);
    response.status(500).json({ message: "Unable to load your subscription." });
  }
});

app.post("/api/subscription/order", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const plan = (await currentSubscriptionPlans()).find((item) => item.id === request.body.planId) ?? null;
  if (!plan) {
    response.status(400).json({ message: "Choose a valid plan." });
    return;
  }
  if (!isSimulatedPayments() && !isRazorpayConfigured()) {
    response.status(503).json({ message: "Online payments are not configured yet. Please try again later." });
    return;
  }
  try {
    const simulated = isSimulatedPayments();
    const order = simulated
      ? { id: simulatedId("order"), amount: plan.price * 100, currency: "INR" }
      : await createRazorpayOrder({ amountPaise: plan.price * 100, receipt: `sub_${plan.id}_${Date.now()}`, notes: { userId: user.id, planId: plan.id } });
    await createSubscriptionPayment({
      userId: user.id, planId: plan.id, orderId: order.id, amount: plan.price, gstAmount: gstIncluded(plan.price),
      gateway: simulated ? "simulated" : "razorpay",
    });
    response.status(201).json({
      simulated,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: simulated ? undefined : process.env.RAZORPAY_KEY_ID,
      planId: plan.id,
      planName: plan.name,
      prefill: { name: user.full_name, email: user.email ?? undefined, contact: `+91${user.mobile}` },
    });
  } catch (error) {
    console.error("Subscription order creation failed", error);
    response.status(502).json({ message: "Unable to start the payment. Please try again." });
  }
});

app.post("/api/subscription/verify", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const orderId = String(request.body.orderId || "");
  let paymentId = String(request.body.paymentId || "");
  const signature = String(request.body.signature || "");
  const payment = orderId ? await findSubscriptionPayment(user.id, orderId) : null;
  const plan = payment?.plan_id ? (await currentSubscriptionPlans()).find((item) => item.id === payment.plan_id) ?? null : null;
  if (!payment || !plan) {
    response.status(404).json({ message: "We could not find that payment." });
    return;
  }
  if (payment.gateway === "simulated") {
    if (!isSimulatedPayments()) {
      await markPaymentFailed(payment.id, "Simulated payment order was rejected.");
      response.status(400).json({ message: "Simulated payments are no longer accepted. Please pay again." });
      return;
    }
    paymentId = simulatedId("pay");
  } else if (!paymentId || !signature || !isValidPaymentSignature(orderId, paymentId, signature)) {
    await markPaymentFailed(payment.id, "Payment signature verification failed.");
    response.status(400).json({ message: "Payment verification failed. If money was deducted, it will be refunded by Razorpay." });
    return;
  }
  try {
    // Activate at the price recorded when the order was placed, so later catalogue edits never change what the customer paid for.
    const paidAmount = Math.round((Number(payment.amount) + Number(payment.gst_amount)) * 100) / 100;
    await activateSubscription({ userId: user.id, paymentDbId: payment.id, gatewayPaymentId: paymentId, plan: { ...plan, price: paidAmount } });
    response.json({ plans: await currentSubscriptionPlans(), ...(await getUserSubscriptions(user.id)) });
  } catch (error) {
    console.error("Subscription activation failed", error);
    response.status(500).json({ message: "Payment received, but we could not activate the plan. Please contact support." });
  }
});

app.post("/api/reports/fail", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const orderId = String(request.body.orderId || "").trim();
  if (!orderId || orderId.length > 200) {
    response.status(400).json({ message: "A valid payment order is required." });
    return;
  }

  const payment = await findReportPayment(user.id, orderId);
  if (!payment) {
    response.status(404).json({ message: "We could not find that payment." });
    return;
  }
  try {
    await recordPaymentFailure(payment.id);
  } catch (error) {
    console.error("Payment failure history update failed", error);
    response.status(500).json({ message: "Unable to update payment history." });
    return;
  }
  response.json({ ok: true });
});

// Lets a paying user retry a failed bureau fetch without paying again.
app.post("/api/reports/:requestId/retry", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const reportRequest = await findReportRequest(user.id, String(request.params.requestId));
  if (!reportRequest || reportRequest.status !== "failed") {
    response.status(400).json({ message: "This report cannot be retried." });
    return;
  }
  try {
    await markReportProcessing(reportRequest.id);
    const providerDiagnostics = await runReportFetch(user.id, reportRequest.id, reportRequest.bureau, requestIpAddress(request));
    response.json({ ...(await getDashboardStatus(user.id)), providerDiagnostics });
  } catch (error) {
    console.error("Report retry failed", error);
    response.status(500).json({ message: "Unable to fetch the report right now. Please try again." });
  }
});

const isCreditScorePinValid = (value: unknown) =>
  String(value || "") === (process.env.CIBIL_PAGE_PIN || "00998877");

app.post("/api/cibil-report/access", (request, response) => {
  if (!isCreditScorePinValid(request.body.pin)) {
    response.status(401).json({ message: "That PIN is not correct." });
    return;
  }
  response.json({ access: true });
});

app.post("/api/cibil-report", async (request, response) => {
  if (!isCreditScorePinValid(request.body.pin)) {
    response.status(401).json({ message: "Your page access has expired. Enter the PIN again." });
    return;
  }

  const token = process.env.CIBIL_API_TOKEN;
  if (!token) {
    response.status(503).json({ message: "CIBIL API is not configured. Set CIBIL_API_TOKEN on the backend." });
    return;
  }

  const firstName = String(request.body.first_name || "").trim();
  const lastName = String(request.body.last_name || "").trim();
  const idNumber = String(request.body.id_number || "").trim().toUpperCase();
  const streetAddress = String(request.body.street_address || "").trim();
  const city = String(request.body.city || "").trim();
  const postalCode = String(request.body.postal_code || "").trim();
  const region = String(request.body.region || "").trim();
  const email = String(request.body.email || "").trim();
  const phone = String(request.body.phone || "").replace(/\D/g, "");
  const dob = String(request.body.dob || "").trim();
  const gender = String(request.body.gender || "").trim();

  if (
    firstName.length < 2 || lastName.length < 1 || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(idNumber)
    || !streetAddress || !city || !/^\d{6}$/.test(postalCode) || !/^\d+$/.test(region)
    || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{10}$/.test(phone)
    || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !["Male", "Female"].includes(gender)
    || request.body.user_consent_data_share !== true
  ) {
    response.status(400).json({ message: "Complete every required field with valid details and accept the data-sharing consent." });
    return;
  }

  try {
    const upstream = await fetch("https://b2b.payprime.in/api/cibil-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        first_name: firstName,
        last_name: lastName,
        id_type: "TaxId",
        id_number: idNumber,
        street_address: streetAddress,
        city,
        postal_code: Number(postalCode),
        region,
        address_type: 1,
        email,
        phone: Number(phone),
        dob,
        gender,
        legal_copy_status: "Accept",
        user_consent_data_share: true,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const result: unknown = await upstream.json().catch(() => null);
    response.status(upstream.status).json(result ?? { message: "The CIBIL provider returned an unreadable response." });
  } catch (error) {
    console.error("CIBIL report request failed", error);
    response.status(502).json({ message: "Unable to reach the CIBIL report provider. Please try again." });
  }
});

// Bureau reports are fetched only after a verified Razorpay payment, through /api/reports/order and /api/reports/verify.
app.post("/api/equifax-report", requireUser, (_request, response) => {
  response.status(410).json({ message: "Please buy the report first. Bureau reports are fetched only after payment." });
});

// Bureau reports are fetched only after a verified Razorpay payment, through /api/reports/order and /api/reports/verify.
app.post("/api/crif-report", requireUser, (_request, response) => {
  response.status(410).json({ message: "Please buy the report first. Bureau reports are fetched only after payment." });
});

app.post("/api/inquiries", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const fullName = String(request.body.fullName || "").trim();
  const mobile = String(request.body.mobile || "").replace(/\D/g, "");
  const concern = String(request.body.concern || "").trim();
  const scoreRange = String(request.body.scoreRange || "").trim();

  if (fullName.length < 2 || fullName.length > 120) {
    response.status(400).json({ message: "Enter your name to request a callback." });
    return;
  }
  if (mobile.length !== 10) {
    response.status(400).json({ message: "Enter a valid 10-digit mobile number." });
    return;
  }
  if (!concern || concern.length > 300 || !scoreRange || scoreRange.length > 100) {
    response.status(400).json({ message: "Please complete the inquiry before requesting a callback." });
    return;
  }

  try {
    await saveWebsiteInquiry({ userId: user.id, fullName, mobile, concern, scoreRange });
    response.status(201).json({ message: "Your callback request was saved." });
  } catch (error) {
    console.error("Website inquiry database save failed", error);
    response.status(503).json({ message: "We could not save your callback request. Please contact us on WhatsApp instead." });
  }
});

// Neha Assistant - Shared Messaging Endpoints
app.post("/api/neha/start-conversation", requireUser, async (request, response) => {
  const user = sessionUser(response);
  try {
    const conversation = await createNehaConversation(user.id);
    if (!conversation) {
      response.status(500).json({ message: "Could not start conversation." });
      return;
    }
    response.status(201).json({ conversation });
  } catch (error) {
    console.error("Neha conversation creation failed", error);
    response.status(503).json({ message: "Could not start a conversation right now." });
  }
});

app.get("/api/neha/conversations", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const role = (request.query.role as 'customer' | 'admin' | 'partner') || 'customer';

  try {
    const conversations = await listNehaConversations(user.id, role);
    response.json({ conversations });
  } catch (error) {
    console.error("Neha conversations list failed", error);
    response.status(503).json({ message: "Could not load conversations." });
  }
});

app.get("/api/neha/messages/:conversationId", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const conversationId = String(request.params.conversationId);

  try {
    const conversation = await getNehaConversation(conversationId);
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    // Check if user has access to this conversation
    const hasAccess = conversation.customer_id === user.id ||
      conversation.assigned_to_id === user.id;

    if (!hasAccess) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const messages = await getNehaMessages(conversationId);
    response.json({ conversation, messages });
  } catch (error) {
    console.error("Neha messages fetch failed", error);
    response.status(503).json({ message: "Could not load messages." });
  }
});

app.post("/api/neha/send-message", requireUser, async (request, response) => {
  const user = sessionUser(response);
  const conversationId = String(request.body.conversationId || "").trim();
  const message = String(request.body.message || "").trim();

  if (!conversationId || !message || message.length > 5000) {
    response.status(400).json({ message: "Invalid message." });
    return;
  }

  try {
    const conversation = await getNehaConversation(conversationId);
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    // Customer can message their own conversation
    // Admin/Partner can message any conversation assigned to them
    const hasAccess = conversation.customer_id === user.id ||
      conversation.assigned_to_id === user.id;

    if (!hasAccess) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const senderType = conversation.customer_id === user.id ? 'customer' : conversation.assigned_to_role;
    const senderName = user.full_name;

    const saved = await saveNehaMessage(conversationId, user.id, senderType, senderName, message);

    // Emit real-time event
    partnerEvents.emit(NEHA_MESSAGE_CHANNEL, { conversationId, message: saved });

    response.status(201).json({ message: saved });
  } catch (error) {
    console.error("Neha message send failed", error);
    response.status(503).json({ message: "Could not send message." });
  }
});

app.post("/api/neha/agent-status", requireAdmin, async (request, response) => {
  const adminId = sessionAdminId(response);
  const adminRole = sessionAdminRole(response);
  const status = (request.body.status as 'online' | 'away' | 'offline') || 'online';

  if (!['online', 'away', 'offline'].includes(status)) {
    response.status(400).json({ message: "Invalid status." });
    return;
  }

  try {
    // Convert admin role to agent role (owner/manager/support/analyst -> admin)
    const agentRole = (adminRole === 'partner' || adminRole === 'agent') ? adminRole : 'admin';
    const agentStatus = await updateAgentStatus(adminId, adminId, agentRole as 'admin' | 'partner', status);
    partnerEvents.emit(AGENT_STATUS_CHANNEL, { agentId: adminId, status });
    response.json({ agentStatus });
  } catch (error) {
    console.error("Agent status update failed", error);
    response.status(503).json({ message: "Could not update status." });
  }
});

app.get("/api/neha/agents", async (_request, response) => {
  try {
    const agents = await getAvailableAgents();
    response.json({ agents });
  } catch (error) {
    console.error("Available agents fetch failed", error);
    response.status(503).json({ message: "Could not load agents." });
  }
});

app.get("/api/neha/stream/:conversationId", requireUser, (request, response) => {
  const user = sessionUser(response);
  const conversationId = String(request.params.conversationId);

  // Set SSE headers
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("Access-Control-Allow-Origin", "*");

  const onNewMessage = (event: { conversationId: string; message?: any }) => {
    if (event.conversationId === conversationId) {
      response.write(`data: ${JSON.stringify(event.message)}\n\n`);
    }
  };

  const onAgentStatus = (event: { agentId: string; status: string }) => {
    response.write(`data: ${JSON.stringify({ type: "agent-status", agentId: event.agentId, status: event.status })}\n\n`);
  };

  partnerEvents.on(NEHA_MESSAGE_CHANNEL, onNewMessage);
  partnerEvents.on(AGENT_STATUS_CHANNEL, onAgentStatus);

  request.on("close", () => {
    partnerEvents.off(NEHA_MESSAGE_CHANNEL, onNewMessage);
    partnerEvents.off(AGENT_STATUS_CHANNEL, onAgentStatus);
  });
});

app.post("/api/assessments", requireUser, upload.single("report"), async (request, response) => {
  const assessmentType = request.body.assessmentType === "business" ? "business" : "individual";
  const user = sessionUser(response);
  const requiredFields = assessmentType === "business"
    ? ["businessName", "fullName", "mobile", "email", "businessType"]
    : ["fullName", "mobile", "email", "city", "goal"];

  const missingField = requiredFields.find((field) => !String(request.body[field] || "").trim());
  if (missingField) {
    response.status(400).json({ message: `${fieldLabels[missingField]} is required.` });
    return;
  }

  const mobile = String(request.body.mobile).replace(/\D/g, "");
  const email = String(request.body.email).trim();
  if (mobile.length !== 10 || !/^\S+@\S+\.\S+$/.test(email)) {
    response.status(400).json({ message: "Enter a valid email address and 10-digit mobile number." });
    return;
  }

  const fields = assessmentType === "business"
    ? ["businessName", "fullName", "mobile", "email", "businessType", "cmr", "funding"]
    : ["fullName", "mobile", "email", "city", "score", "goal"];
  const formData = Object.fromEntries(fields.map((field) => [
    field,
    String(request.body[field] || "").trim(),
  ]));
  const rows = fields.map((field) => ({
    label: fieldLabels[field],
    value: formData[field] || "Not provided",
  }));
  const title = assessmentType === "business" ? "Business CMR Assessment" : "Personal Credit Assessment";
  const subjectName = assessmentType === "business" ? formData.businessName : formData.fullName;
  const text = [`New ${title}`, "", ...rows.map(({ label, value }) => `${label}: ${value}`), "", `Report attached: ${request.file ? "Yes" : "No"}`].join("\n");
  const htmlRows = rows.map(({ label, value }) => `<tr><td style="padding:10px 12px;color:#65708a;border-bottom:1px solid #e5edf6">${escapeHtml(label)}</td><td style="padding:10px 12px;color:#081446;font-weight:700;border-bottom:1px solid #e5edf6">${escapeHtml(value)}</td></tr>`).join("");

  try {
    await saveAssessment({
      userId: user.id,
      assessmentType,
      fields: formData,
      report: request.file,
    });
  } catch (error) {
    console.error("Assessment database save failed", error);
    response.status(503).json({ message: "We could not save your assessment. Please try again or contact us on WhatsApp." });
    return;
  }

  const transport = createMailTransport();
  if (!transport) {
    response.status(201).json({
      message: "Your assessment was saved securely. Our team will contact you shortly.",
      emailSent: false,
    });
    return;
  }

  try {
    const result = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "Scorenow Website <no-reply@scorenow.in>",
      to: "info@scorenow.in",
      replyTo: email,
      subject: `${title}: ${subjectName}`,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#081446"><div style="padding:22px;background:#087af5;color:white"><h1 style="margin:0;font-size:22px">Scorenow</h1><p style="margin:5px 0 0">${title}</p></div><div style="padding:22px;background:#f7fbff"><p>A new assessment was submitted through the Scorenow website.</p><table style="width:100%;border-collapse:collapse;background:white">${htmlRows}</table><p style="margin:18px 0 0;color:#65708a;font-size:12px">Credit report attached: <strong>${request.file ? "Yes" : "No"}</strong></p></div></div>`,
      attachments: request.file ? [{
        filename: path.basename(request.file.originalname),
        content: request.file.buffer,
        contentType: request.file.mimetype,
      }] : [],
    });
    response.status(201).json({
      message: "Your assessment was saved and sent to our team. We will contact you shortly.",
      emailSent: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Assessment email failed", error);
    response.status(201).json({
      message: "Your assessment was saved successfully. Our team will contact you shortly.",
      emailSent: false,
    });
  }
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({ message: "The selected report exceeds the 10 MB limit." });
    return;
  }
  response.status(400).json({ message: error.message || "Invalid assessment submission." });
});

// Health Assessment Requests
app.post("/api/health-assessment-requests", requireUser, async (request, response) => {
  try {
    const { fullName, mobile, email, requestType, description } = request.body;
    if (!fullName || !mobile) {
      response.status(400).json({ message: "Full name and mobile are required." });
      return;
    }
    
    const user = sessionUser(response);
    const result = await submitHealthAssessmentRequest({
      userId: user.id,
      fullName: String(fullName).trim(),
      mobile: String(mobile).replace(/\D/g, ""),
      email: email ? String(email).trim() : undefined,
      requestType: (requestType === "business" ? "business" : "personal") as "personal" | "business",
      description: description ? String(description).trim() : undefined,
    });
    
    response.status(201).json(result);
  } catch (error) {
    console.error("Health assessment request save failed", error);
    response.status(500).json({ message: "Failed to submit health assessment request." });
  }
});

app.get("/api/health-assessment-requests", requireUser, async (_request, response) => {
  try {
    const requests = await listHealthAssessmentRequests({ limit: 50 });
    response.json(requests);
  } catch (error) {
    console.error("Failed to fetch health assessment requests", error);
    response.status(500).json({ message: "Failed to fetch health assessment requests." });
  }
});

app.get("/api/admin/health-assessment-requests", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["assessments"]), async (request, response) => {
  try {
    const status = String(request.query.status || "");
    const limit = Math.min(parseInt(String(request.query.limit || 50)), 200);
    const offset = parseInt(String(request.query.offset || 0));
    
    const requests = await listHealthAssessmentRequests({
      status: status || undefined,
      limit,
      offset,
    });
    response.json(requests);
  } catch (error) {
    console.error("Failed to fetch health assessment requests", error);
    response.status(500).json({ message: "Failed to fetch health assessment requests." });
  }
});

app.put("/api/admin/health-assessment-requests/:id/status", requireAdmin, requireAdminOrPartnerPage(["owner", "manager", "support"], ["assessments"]), async (request, response) => {
  try {
    const { status } = request.body;
    if (!status || !["pending", "reviewed", "closed"].includes(status)) {
      response.status(400).json({ message: "Valid status is required." });
      return;
    }
    
    const adminId = sessionAdminId(response);
    const result = await updateHealthAssessmentStatus(
      String(request.params.id),
      status as "pending" | "reviewed" | "closed",
      adminId,
    );
    
    if (!result) {
      response.status(404).json({ message: "Health assessment request not found." });
      return;
    }
    
    response.json(result);
  } catch (error) {
    console.error("Failed to update health assessment status", error);
    response.status(500).json({ message: "Failed to update health assessment status." });
  }
});

// Testimonials
app.post("/api/testimonials", async (request, response) => {
  try {
    const { customerName, customerImageUrl, rating, reviewText, resultDescription } = request.body;
    if (!customerName || !rating || !reviewText) {
      response.status(400).json({ message: "Customer name, rating, and review text are required." });
      return;
    }
    
    if (rating < 1 || rating > 5) {
      response.status(400).json({ message: "Rating must be between 1 and 5." });
      return;
    }
    
    const result = await submitTestimonial({
      customerName: String(customerName).trim(),
      customerImageUrl: customerImageUrl ? String(customerImageUrl).trim() : undefined,
      rating: parseInt(String(rating)),
      reviewText: String(reviewText).trim(),
      resultDescription: resultDescription ? String(resultDescription).trim() : undefined,
    });
    
    response.status(201).json(result);
  } catch (error) {
    console.error("Testimonial save failed", error);
    response.status(500).json({ message: "Failed to submit testimonial." });
  }
});

app.get("/api/testimonials", async (_request, response) => {
  try {
    const testimonials = await listTestimonials(true);
    response.json(testimonials);
  } catch (error) {
    console.error("Failed to fetch testimonials", error);
    response.status(500).json({ message: "Failed to fetch testimonials." });
  }
});

app.get("/api/admin/testimonials", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  try {
    const publishedOnly = String(request.query.published || "false") === "true";
    const testimonials = await listTestimonials(publishedOnly);
    response.json(testimonials);
  } catch (error) {
    console.error("Failed to fetch testimonials", error);
    response.status(500).json({ message: "Failed to fetch testimonials." });
  }
});

app.put("/api/admin/testimonials/:id/publish", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  try {
    const result = await publishTestimonial(String(request.params.id));
    if (!result) {
      response.status(404).json({ message: "Testimonial not found." });
      return;
    }
    response.json(result);
  } catch (error) {
    console.error("Failed to publish testimonial", error);
    response.status(500).json({ message: "Failed to publish testimonial." });
  }
});

const isSafeImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

app.post("/api/admin/testimonials", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
  const { customerName, customerImageUrl, rating, reviewText, resultDescription, published } = request.body ?? {};
  const name = String(customerName ?? "").trim();
  const review = String(reviewText ?? "").trim();
  const imageUrl = String(customerImageUrl ?? "").trim();
  const ratingValue = Number(rating);
  if (name.length < 2 || name.length > 120) {
    response.status(400).json({ message: "Customer name must be 2–120 characters." });
    return;
  }
  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    response.status(400).json({ message: "Rating must be between 1 and 5." });
    return;
  }
  if (review.length < 10 || review.length > 1000) {
    response.status(400).json({ message: "Review must be 10–1000 characters." });
    return;
  }
  if (imageUrl && !isSafeImageUrl(imageUrl)) {
    response.status(400).json({ message: "Photo link must be a valid http or https URL." });
    return;
  }
  try {
    const result = await createTestimonial({
      customerName: name,
      customerImageUrl: imageUrl || undefined,
      rating: ratingValue,
      reviewText: review,
      resultDescription: String(resultDescription ?? "").trim() || undefined,
      published: published !== false,
    });
    response.status(201).json(result);
  } catch (error) {
    console.error("Failed to create testimonial", error);
    response.status(500).json({ message: "Failed to create testimonial." });
  }
});

app.put("/api/admin/testimonials/:id/unpublish", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  try {
    const result = await setTestimonialPublished(String(request.params.id), false);
    if (!result) {
      response.status(404).json({ message: "Testimonial not found." });
      return;
    }
    response.json(result);
  } catch (error) {
    console.error("Failed to unpublish testimonial", error);
    response.status(500).json({ message: "Failed to unpublish testimonial." });
  }
});

const publicSiteContent = async () => {
  const stored = await listSiteContent();
  const storedOrNull = (key: "service_plans" | "fd_plans" | "business_plan_prices") => (validateSiteContent(key, stored[key]).ok ? stored[key] : null);
  return {
    subscription_plans: resolveSubscriptionPlans(stored.subscription_plans),
    report_price: { amount: resolveReportPrice(stored.report_price) },
    service_plans: storedOrNull("service_plans"),
    fd_plans: storedOrNull("fd_plans"),
    business_plan_prices: storedOrNull("business_plan_prices"),
  };
};

// Public values come from the admin-editable catalogue; null means the site uses its built-in copy for that section.
app.get("/api/site-content", async (_request, response) => {
  try {
    response.json(await publicSiteContent());
  } catch (error) {
    console.error("Site content lookup failed", error);
    response.status(500).json({ message: "Unable to load site content." });
  }
});

app.put("/api/admin/site-content/:key", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const key = String(request.params.key);
  if (!isSiteContentKey(key)) {
    response.status(404).json({ message: "Unknown content section." });
    return;
  }
  const result = validateSiteContent(key, request.body?.value);
  if (!result.ok) {
    response.status(400).json({ message: result.error });
    return;
  }
  try {
    await saveSiteContent(key, result.value, sessionAdminId(response) || "unknown");
    auditAdmin(request, response, "site_content_updated", { type: "site_content", id: key });
    response.json(await publicSiteContent());
  } catch (error) {
    console.error("Site content save failed", error);
    response.status(500).json({ message: "Unable to save this section." });
  }
});

// Removes the admin override so the section goes back to the built-in default.
app.delete("/api/admin/site-content/:key", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  const key = String(request.params.key);
  if (!isSiteContentKey(key)) {
    response.status(404).json({ message: "Unknown content section." });
    return;
  }
  try {
    await deleteSiteContent(key);
    auditAdmin(request, response, "site_content_reset", { type: "site_content", id: key });
    response.json(await publicSiteContent());
  } catch (error) {
    console.error("Site content reset failed", error);
    response.status(500).json({ message: "Unable to reset this section." });
  }
});

app.delete("/api/admin/testimonials/:id", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
  try {
    await deleteTestimonial(String(request.params.id));
    response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete testimonial", error);
    response.status(500).json({ message: "Failed to delete testimonial." });
  }
});

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(port, (error?: Error) => {
      if (error) {
        console.error(`Unable to start Scorenow API on port ${port}`, error);
        process.exit(1);
      }
      console.log(`Scorenow API is running at http://localhost:${port}`);
      if (isSimulatedPayments()) console.warn("PAYMENTS_MODE=simulated: report payments are auto-approved and NOT charged.");
    });
  } catch (error) {
    console.error("Database initialization failed", error);
    process.exitCode = 1;
  }
};

void startServer();