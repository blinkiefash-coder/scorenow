import cors from "cors";
import "dotenv/config";
import { createHash, timingSafeEqual } from "node:crypto";
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "node:path";
import { BUREAUS, bureauNames, fetchBureauReport, downloadReportPdf, isBureau, isBureauAvailable, livePdfUrl, missingApplicantFields, scoreBand, stateCodes, } from "./bureaus.js";
import { completeReportRequest, authenticateDatabaseAdmin, createDemoReportRequest, createAdminReportAudit, addSupportTicketComment, createAdminSession, completeAdminReportAudit, createOtp, createCustomerInvitation, createAdminInvitation, acceptAdminInvitation, createReportPayment, createSession, failReportRequest, findReportPayment, findReportRequest, findSessionUser, findAdminSession, findUserByEmail, getApplicant, getAdminActivity, getAdminAnalytics, getAdminCustomers, getAdminReportDocument, getDashboardStatus, getReportDetail, getReportPdf, initializeDatabase, listAdminAccounts, listAdminUsers, listCustomerInvitations, listSupportTickets, markEmailVerified, markPaymentFailed, markPaymentPaidAndCreateRequest, recordPaymentFailure, markReportProcessing, revokeSession, revokeAdminSession, setAdminAccountStatus, setCustomerAccountStatus, updateSupportTicket, createSupportTicket, cancelCustomerInvitation, saveAssessment, saveReportPdf, saveWebsiteInquiry, saveKycProfile, setUserEmailIfMissing, upsertUserByMobile, verifyOtp, } from "./database.js";
import { generateReportPdf } from "./reportPdf.js";
import { verifyFirebasePhoneToken } from "./firebaseAdmin.js";
import { demoReportResponses, isReportsDemoMode } from "./demoReports.js";
import { createRazorpayOrder, isRazorpayConfigured, isSimulatedPayments, isValidPaymentSignature, simulatedId } from "./razorpay.js";
import { normalizeReport } from "./reportParser.js";
const app = express();
const port = Number(process.env.PORT) || 3000;
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
const bearerToken = (request) => (request.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
const requestIpAddress = (request) => request.ip || request.socket.remoteAddress || "0.0.0.0";
const requireUser = async (request, response, next) => {
    const user = await findSessionUser(bearerToken(request)).catch(() => null);
    if (!user) {
        response.status(401).json({ message: "Please log in or sign up to continue." });
        return;
    }
    response.locals.user = user;
    next();
};
const sessionUser = (response) => response.locals.user;
const sessionAdminId = (response) => response.locals.adminId;
const sessionAdminRole = (response) => response.locals.adminRole;
const startSession = (request, userId) => createSession({ userId, ipAddress: request.ip, userAgent: request.get("user-agent") });
const REPORT_PRICE_RUPEES = 99;
const REPORT_GST_RUPEES = Math.round((REPORT_PRICE_RUPEES - REPORT_PRICE_RUPEES / 1.18) * 100) / 100;
const requireAdmin = async (request, response, next) => {
    const token = bearerToken(request);
    const admin = await findAdminSession(token).catch(() => null);
    if (!admin) {
        response.status(401).json({ message: "Admin sign-in is required." });
        return;
    }
    response.locals.adminId = admin.admin_id;
    response.locals.adminRole = admin.role;
    next();
};
const requireAdminRoles = (...roles) => (request, response, next) => {
    if (!roles.includes(sessionAdminRole(response))) {
        response.status(403).json({ message: "Your admin role does not have access to this action." });
        return;
    }
    next();
};
const adminLoginAttempts = new Map();
const MAX_ADMIN_LOGIN_ATTEMPTS = 5;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const equalSecret = (candidate, expected) => timingSafeEqual(createHash("sha256").update(candidate).digest(), createHash("sha256").update(expected).digest());
const canAttemptAdminLogin = (ipAddress) => {
    const now = Date.now();
    const attempt = adminLoginAttempts.get(ipAddress);
    if (!attempt || attempt.resetAt <= now) {
        adminLoginAttempts.set(ipAddress, { count: 1, resetAt: now + ADMIN_LOGIN_WINDOW_MS });
        return true;
    }
    if (attempt.count >= MAX_ADMIN_LOGIN_ATTEMPTS)
        return false;
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
const escapeHtml = (value) => value
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
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS)
        return null;
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
};
const fieldLabels = {
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
    response.json({ status: "ok", service: "Score Now API" });
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
    const rootConfigured = Boolean(adminId && password.length >= 12 && /^\d{6}$/.test(pin));
    const isRootAdmin = rootConfigured &&
        equalSecret(submittedId, adminId) &&
        equalSecret(submittedPassword, password) &&
        equalSecret(submittedPin, pin);
    if (!databaseAdmin && !isRootAdmin) {
        if (!rootConfigured) {
            response.status(503).json({ message: "No administrator credentials are configured." });
            return;
        }
        response.status(401).json({ message: "Invalid admin credentials." });
        return;
    }
    adminLoginAttempts.delete(ipAddress);
    const sessionAdmin = databaseAdmin ?? { adminId, role: "owner" };
    const token = await createAdminSession({
        adminId: sessionAdmin.adminId,
        role: sessionAdmin.role,
        ipAddress,
        userAgent: request.get("user-agent"),
    });
    response.json({ token, adminId: sessionAdmin.adminId, role: sessionAdmin.role });
});
app.get("/api/admin/session", requireAdmin, (request, response) => {
    response.json({ adminId: sessionAdminId(response), role: sessionAdminRole(response) });
});
app.get("/api/admin/activity", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
    const page = Number(request.query.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1) {
        response.status(400).json({ message: "Choose a valid activity page." });
        return;
    }
    try {
        response.json(await getAdminActivity(page));
    }
    catch (error) {
        console.error("Admin activity load failed", error);
        response.status(500).json({ message: "Unable to load admin activity." });
    }
});
app.get("/api/admin/customers", requireAdmin, requireAdminRoles("owner", "manager", "support", "analyst"), async (request, response) => {
    const page = Number(request.query.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1) {
        response.status(400).json({ message: "Choose a valid customer page." });
        return;
    }
    try {
        response.json(await getAdminCustomers(String(request.query.q || "").slice(0, 100), page));
    }
    catch (error) {
        console.error("Admin customer search failed", error);
        response.status(500).json({ message: "Unable to search customers." });
    }
});
app.get("/api/admin/customer-accounts", requireAdmin, requireAdminRoles("owner", "manager"), async (_request, response) => {
    try {
        const [customers, invitations] = await Promise.all([listAdminUsers(), listCustomerInvitations()]);
        response.json({ customers, invitations });
    }
    catch (error) {
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
        response.status(201).json({
            invitationId,
            message: "Invitation recorded. The customer should sign up with this mobile number and verify it by OTP.",
        });
    }
    catch (error) {
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
    response.json({ ok: true });
});
app.patch("/api/admin/customers/:id/status", requireAdmin, requireAdminRoles("owner", "manager"), async (request, response) => {
    const userId = String(request.params.id);
    const status = request.body.status;
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !["active", "blocked"].includes(status)) {
        response.status(400).json({ message: "Choose a valid customer and status." });
        return;
    }
    const updated = await setCustomerAccountStatus(userId, status);
    if (!updated) {
        response.status(404).json({ message: "Customer account not found." });
        return;
    }
    response.json({ ok: true });
});
app.get("/api/admin/analytics", requireAdmin, requireAdminRoles("owner", "manager", "analyst"), async (_request, response) => {
    try {
        response.json(await getAdminAnalytics());
    }
    catch (error) {
        console.error("Admin analytics load failed", error);
        response.status(500).json({ message: "Unable to load analytics." });
    }
});
app.get("/api/admin/tickets", requireAdmin, requireAdminRoles("owner", "manager", "support"), async (request, response) => {
    const status = String(request.query.status || "");
    try {
        response.json({ tickets: await listSupportTickets(status) });
    }
    catch (error) {
        console.error("Support ticket list failed", error);
        response.status(500).json({ message: "Unable to load support tickets." });
    }
});
app.get("/api/support/tickets", requireUser, async (_request, response) => {
    try {
        response.json({ tickets: await listSupportTickets("", sessionUser(response).id) });
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error("Customer support ticket reply failed", error);
        response.status(500).json({ message: "Unable to send your reply." });
    }
});
app.post("/api/admin/tickets/:id/comments", requireAdmin, requireAdminRoles("owner", "manager", "support"), async (request, response) => {
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
        response.status(201).json({ ok: true });
    }
    catch (error) {
        console.error("Admin support ticket reply failed", error);
        response.status(500).json({ message: "Unable to send the ticket reply." });
    }
});
app.patch("/api/admin/tickets/:id", requireAdmin, requireAdminRoles("owner", "manager", "support"), async (request, response) => {
    const status = String(request.body.status || "");
    const assignedTo = String(request.body.assignedTo || "").trim() || null;
    const updated = await updateSupportTicket(String(request.params.id), status, assignedTo);
    if (!updated) {
        response.status(404).json({ message: "Support ticket not found or status is invalid." });
        return;
    }
    response.json({ ok: true });
});
app.get("/api/admin/team", requireAdmin, requireAdminRoles("owner"), async (_request, response) => {
    try {
        response.json({ admins: await listAdminAccounts(), primaryAdmin: process.env.ADMIN_LOGIN_ID || null });
    }
    catch (error) {
        console.error("Admin team list failed", error);
        response.status(500).json({ message: "Unable to load admin team." });
    }
});
app.post("/api/admin/team/invitations", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
    const fullName = String(request.body.fullName || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    const role = request.body.role;
    if (fullName.length < 2 || fullName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) ||
        !["manager", "support", "analyst"].includes(role) || email === (process.env.ADMIN_LOGIN_ID || "").toLowerCase()) {
        response.status(400).json({ message: "Enter a valid name, email, and non-owner role." });
        return;
    }
    try {
        const invite = await createAdminInvitation({ fullName, email, role, invitedBy: sessionAdminId(response) });
        const requestOrigin = request.get("origin");
        const requestAppUrl = requestOrigin && /^https?:\/\//i.test(requestOrigin) ? new URL(requestOrigin).origin : null;
        const baseUrl = process.env.ADMIN_APP_URL || requestAppUrl || `${request.protocol}://${request.get("host")}`;
        response.status(201).json({ email: invite.email, role, invitationUrl: `${baseUrl}/admin?invite=${invite.token}` });
    }
    catch (error) {
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
    response.status(201).json({ token: sessionToken, adminId: admin.email, role: admin.role });
});
app.patch("/api/admin/team/:email/status", requireAdmin, requireAdminRoles("owner"), async (request, response) => {
    const email = String(request.params.email).toLowerCase();
    const status = request.body.status;
    if (!/^\S+@\S+\.\S+$/.test(email) || !["active", "disabled"].includes(status) ||
        email === (process.env.ADMIN_LOGIN_ID || "").toLowerCase() || email === sessionAdminId(response).toLowerCase()) {
        response.status(400).json({ message: "Choose a valid admin account and status. You cannot disable the primary admin or your own account." });
        return;
    }
    const updated = await setAdminAccountStatus(email, status);
    if (!updated) {
        response.status(404).json({ message: "Admin account not found." });
        return;
    }
    response.json({ ok: true });
});
app.post("/api/admin/logout", requireAdmin, async (request, response) => {
    await revokeAdminSession(bearerToken(request));
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
    const applicant = {
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
        response.json({ auditId: String(auditId), bureau, providerTxnId: result.providerTxnId, report });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unable to fetch this credit report.";
        await completeAdminReportAudit({ auditId, status: "failed", providerTransactionId: null, creditScore: null, failureReason: message });
        console.error("Admin bureau report request failed", error);
        response.status(502).json({ message: "Unable to fetch this credit report." });
    }
});
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
        const pdf = await generateReportPdf({ report: record.report, reportDate: record.reportDate });
        response.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="ScoreNow-${record.bureau}-report-copy-${record.reportDate}.pdf"`,
            "Cache-Control": "private, no-store",
        }).send(pdf);
    }
    catch (error) {
        console.error("Admin report PDF generation failed", error);
        response.status(500).json({ message: "Unable to generate this report PDF." });
    }
});
// Returns whether the code was actually delivered, so the caller can decide
// whether to echo a sample code back to the client for easy testing.
const sendOtpEmail = async (to, code) => {
    const transport = createMailTransport();
    if (!transport) {
        console.log(`[dev] Email OTP for ${to}: ${code}`);
        return false;
    }
    await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || "Score Now Website <no-reply@scorenow.in>",
        to,
        subject: "Your Score Now verification code",
        text: `Your Score Now verification code is ${code}. It expires in 5 minutes.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#081446"><div style="padding:20px;background:#087af5;color:white"><h1 style="margin:0;font-size:20px">Score Now</h1></div><div style="padding:22px;background:#f7fbff"><p>Your verification code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:6px">${code}</p><p style="color:#65708a;font-size:12px">This code expires in 5 minutes. If you did not request this, you can ignore this email.</p></div></div>`,
    });
    return true;
};
// No SMS gateway is wired up yet; log the code so OTP login still works in development.
const sendOtpSms = async (mobile, code) => {
    console.log(`[dev] SMS OTP for +91${mobile}: ${code}`);
    return false;
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
            const { code } = await createOtp({ mobile, purpose: "login" });
            const delivered = await sendOtpSms(mobile, code);
            response.json({ message: "A verification code was sent to your mobile number.", devCode: !delivered && process.env.NODE_ENV !== "production" ? code : undefined });
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
        response.json({ message: "A verification code was sent to your email.", devCode: !delivered && process.env.NODE_ENV !== "production" ? code : undefined });
    }
    catch (error) {
        response.status(429).json({ message: error instanceof Error ? error.message : "Unable to send a verification code." });
    }
});
app.post("/api/auth/otp/verify", async (request, response) => {
    const type = request.body.type === "email" ? "email" : request.body.type === "mobile" ? "mobile" : null;
    const value = String(request.body.value || "").trim();
    const code = String(request.body.code || "").trim();
    const fullName = String(request.body.fullName || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    if (!type || !value || !/^\d{6}$/.test(code)) {
        response.status(400).json({ message: "Enter the 6-digit code you received." });
        return;
    }
    try {
        if (type === "mobile") {
            const mobile = value.replace(/\D/g, "");
            await verifyOtp({ mobile, code, purpose: "login" });
            const user = await upsertUserByMobile({ mobile, fullName, email: email || undefined });
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
    }
    catch (error) {
        response.status(400).json({ message: error instanceof Error ? error.message : "Verification failed." });
    }
});
app.post("/api/auth/firebase-session", async (request, response) => {
    const idToken = String(request.body.idToken || "");
    const fullName = String(request.body.fullName || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    if (!idToken) {
        response.status(400).json({ message: "Missing Firebase ID token." });
        return;
    }
    try {
        const token = await verifyFirebasePhoneToken(idToken);
        const mobile = token.phone_number.replace(/^\+91/, "").replace(/\D/g, "");
        if (mobile.length !== 10)
            throw new Error("Use an Indian mobile number for this account.");
        const user = await upsertUserByMobile({ mobile, fullName, email: email || undefined });
        response.json({ message: "Phone verified successfully.", user, token: await startSession(request, user.id) });
    }
    catch (error) {
        console.error("Firebase phone session verification failed", error);
        response.status(503).json({ message: error instanceof Error ? error.message : "Unable to verify your mobile sign-in." });
    }
});
app.post("/api/auth/logout", async (request, response) => {
    const token = bearerToken(request);
    if (token)
        await revokeSession(token).catch(() => undefined);
    response.json({ message: "Logged out." });
});
app.get("/api/dashboard", requireUser, async (_request, response) => {
    try {
        response.json(await getDashboardStatus(sessionUser(response).id));
    }
    catch (error) {
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
        if (!user.email)
            await setUserEmailIfMissing(user.id, email);
        const profile = await saveKycProfile({ userId: user.id, nameAsPerPan, pan, dateOfBirth, gender, addressLine1, city, state, pincode });
        response.status(201).json({ message: "Profile saved. You can now get your credit report.", profile });
    }
    catch (error) {
        console.error("KYC profile save failed", error);
        const message = error instanceof Error && error.message.includes("email") ? error.message : "We could not save those details. Please check them and try again.";
        response.status(400).json({ message });
    }
});
app.get("/api/reports/options", (_request, response) => {
    response.json({
        price: REPORT_PRICE_RUPEES,
        paymentsEnabled: isSimulatedPayments() || isRazorpayConfigured(),
        paymentsMode: isSimulatedPayments() ? "simulated" : "razorpay",
        demoMode: isReportsDemoMode(),
        bureaus: BUREAUS.map((id) => ({ id, name: bureauNames[id], available: isBureauAvailable(id) })),
    });
});
const runReportFetch = async (userId, requestId, bureau, consentIpAddress) => {
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
    const pdfUrl = livePdfUrl(result.raw);
    console.log(`PDF URL for ${bureau} report:`, pdfUrl ? "found" : "not found", {
        hasData: !!(result.raw?.data?.data),
        hasPdfUrl: !!(result.raw?.data?.data?.pdf_report_url),
    });
    const pdf = await downloadReportPdf(pdfUrl);
    if (pdf) {
        await saveReportPdf(requestId, pdf).catch((error) => console.error("Report PDF save failed", error));
    }
    else {
        console.warn(`Failed to download PDF for ${bureau} report ${requestId}`);
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
        let pdf = record.pdf;
        let generatedCopy = false;
        if (!pdf) {
            pdf = await downloadReportPdf(livePdfUrl(record.raw));
            if (pdf)
                await saveReportPdf(record.requestId, pdf);
        }
        if (!pdf) {
            pdf = await generateReportPdf({ report: record.report, reportDate: record.reportDate });
            generatedCopy = true;
        }
        response.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="ScoreNow-${record.bureau}-${generatedCopy ? "report-copy" : "report"}-${record.reportDate}.pdf"`,
            "Cache-Control": "private, no-store",
        }).send(pdf);
    }
    catch (error) {
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
        response.json(detail);
    }
    catch (error) {
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
    }
    catch (error) {
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
        const order = simulated
            ? { id: simulatedId("order"), amount: REPORT_PRICE_RUPEES * 100, currency: "INR" }
            : await createRazorpayOrder({
                amountPaise: REPORT_PRICE_RUPEES * 100,
                receipt: `rpt_${bureau}_${Date.now()}`,
                notes: { userId: user.id, bureau },
            });
        await createReportPayment({
            userId: user.id, bureau, orderId: order.id, amount: REPORT_PRICE_RUPEES, gstAmount: REPORT_GST_RUPEES,
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
    }
    catch (error) {
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
    }
    else if (!paymentId || !signature || !isValidPaymentSignature(orderId, paymentId, signature)) {
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
    }
    catch (error) {
        console.error("Report payment verification failed", error);
        response.status(500).json({ message: "Payment received, but we could not fetch the report yet. Use Retry on your dashboard." });
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error("Report retry failed", error);
        response.status(500).json({ message: "Unable to fetch the report right now. Please try again." });
    }
});
const isCreditScorePinValid = (value) => String(value || "") === (process.env.CIBIL_PAGE_PIN || "00998877");
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
    if (firstName.length < 2 || lastName.length < 1 || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(idNumber)
        || !streetAddress || !city || !/^\d{6}$/.test(postalCode) || !/^\d+$/.test(region)
        || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{10}$/.test(phone)
        || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !["Male", "Female"].includes(gender)
        || request.body.user_consent_data_share !== true) {
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
        const result = await upstream.json().catch(() => null);
        response.status(upstream.status).json(result ?? { message: "The CIBIL provider returned an unreadable response." });
    }
    catch (error) {
        console.error("CIBIL report request failed", error);
        response.status(502).json({ message: "Unable to reach the CIBIL report provider. Please try again." });
    }
});
// Equifax report endpoint
app.post("/api/equifax-report", requireUser, async (request, response) => {
    const user = sessionUser(response);
    try {
        const applicant = await getApplicant(user.id);
        if (!applicant) {
            response.status(400).json({ message: "Complete your profile before fetching a report." });
            return;
        }
        const missing = missingApplicantFields("equifax", applicant);
        if (missing.length) {
            response.status(400).json({ message: `Add your ${missing.join(", ")} to your profile to get an Equifax report.` });
            return;
        }
        const result = await fetchBureauReport("equifax", applicant, requestIpAddress(request));
        if (!result.ok) {
            response.status(400).json({ message: result.message, diagnostics: result.diagnostics });
            return;
        }
        response.json({
            ok: true,
            message: "Equifax report fetched successfully",
            data: result.raw,
            reportUrl: result.reportUrl,
            providerTxnId: result.providerTxnId,
        });
    }
    catch (error) {
        console.error("Equifax report request failed", error);
        response.status(502).json({ message: "Unable to reach the Equifax report provider. Please try again." });
    }
});
// CRIF report endpoint
app.post("/api/crif-report", requireUser, async (request, response) => {
    const user = sessionUser(response);
    try {
        const applicant = await getApplicant(user.id);
        if (!applicant) {
            response.status(400).json({ message: "Complete your profile before fetching a report." });
            return;
        }
        const missing = missingApplicantFields("crif", applicant);
        if (missing.length) {
            response.status(400).json({ message: `Add your ${missing.join(", ")} to your profile to get a CRIF report.` });
            return;
        }
        const result = await fetchBureauReport("crif", applicant, requestIpAddress(request));
        if (!result.ok) {
            response.status(400).json({ message: result.message, diagnostics: result.diagnostics });
            return;
        }
        response.json({
            ok: true,
            message: "CRIF report fetched successfully",
            data: result.raw,
            reportUrl: result.reportUrl,
            providerTxnId: result.providerTxnId,
        });
    }
    catch (error) {
        console.error("CRIF report request failed", error);
        response.status(502).json({ message: "Unable to reach the CRIF report provider. Please try again." });
    }
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
    }
    catch (error) {
        console.error("Website inquiry database save failed", error);
        response.status(503).json({ message: "We could not save your callback request. Please contact us on WhatsApp instead." });
    }
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
    }
    catch (error) {
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
            from: process.env.SMTP_FROM || process.env.SMTP_USER || "Score Now Website <no-reply@scorenow.in>",
            to: "info@scorenow.in",
            replyTo: email,
            subject: `${title}: ${subjectName}`,
            text,
            html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#081446"><div style="padding:22px;background:#087af5;color:white"><h1 style="margin:0;font-size:22px">Score Now</h1><p style="margin:5px 0 0">${title}</p></div><div style="padding:22px;background:#f7fbff"><p>A new assessment was submitted through the Score Now website.</p><table style="width:100%;border-collapse:collapse;background:white">${htmlRows}</table><p style="margin:18px 0 0;color:#65708a;font-size:12px">Credit report attached: <strong>${request.file ? "Yes" : "No"}</strong></p></div></div>`,
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
    }
    catch (error) {
        console.error("Assessment email failed", error);
        response.status(201).json({
            message: "Your assessment was saved successfully. Our team will contact you shortly.",
            emailSent: false,
        });
    }
});
app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        response.status(413).json({ message: "The selected report exceeds the 10 MB limit." });
        return;
    }
    response.status(400).json({ message: error.message || "Invalid assessment submission." });
});
const startServer = async () => {
    try {
        await initializeDatabase();
        app.listen(port, (error) => {
            if (error) {
                console.error(`Unable to start Score Now API on port ${port}`, error);
                process.exit(1);
            }
            console.log(`Score Now API is running at http://localhost:${port}`);
            if (isSimulatedPayments())
                console.warn("PAYMENTS_MODE=simulated: report payments are auto-approved and NOT charged.");
        });
    }
    catch (error) {
        console.error("Database initialization failed", error);
        process.exitCode = 1;
    }
};
void startServer();
