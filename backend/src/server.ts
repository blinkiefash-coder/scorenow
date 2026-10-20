import cors from "cors";
import "dotenv/config";
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "node:path";
import {
  createOtp,
  createCreditReportRequest,
  findUserByEmail,
  getDashboardStatus,
  initializeDatabase,
  markEmailVerified,
  saveAssessment,
  saveWebsiteInquiry,
  saveKycProfile,
  upsertUserByMobile,
  verifyOtp,
} from "./database.js";
import { verifyFirebasePhoneToken } from "./firebaseAdmin.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

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
  response.json({ status: "ok", service: "Score Now API" });
});

// Returns whether the code was actually delivered, so the caller can decide
// whether to echo a sample code back to the client for easy testing.
const sendOtpEmail = async (to: string, code: string) => {
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
const sendOtpSms = async (mobile: string, code: string) => {
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

  if (!type || !value || !/^\d{6}$/.test(code)) {
    response.status(400).json({ message: "Enter the 6-digit code you received." });
    return;
  }

  try {
    if (type === "mobile") {
      const mobile = value.replace(/\D/g, "");
      await verifyOtp({ mobile, code, purpose: "login" });
      const user = await upsertUserByMobile({ mobile, fullName, email: email || undefined });
      response.json({ message: "Verified successfully.", user });
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
    response.json({ message: "Verified successfully.", user: updatedUser });
  } catch (error) {
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
    const mobile = token.phone_number!.replace(/^\+91/, "").replace(/\D/g, "");
    if (mobile.length !== 10) throw new Error("Use an Indian mobile number for this account.");
    const user = await upsertUserByMobile({ mobile, fullName, email: email || undefined });
    response.json({ message: "Phone verified successfully.", user });
  } catch (error) {
    console.error("Firebase phone session verification failed", error);
    response.status(503).json({ message: error instanceof Error ? error.message : "Unable to verify your mobile sign-in." });
  }
});

app.get("/api/dashboard/:userId", async (request, response) => {
  try {
    response.json(await getDashboardStatus(request.params.userId));
  } catch (error) {
    console.error("Dashboard status lookup failed", error);
    response.status(500).json({ message: "Unable to load your credit dashboard." });
  }
});

app.post("/api/profile/:userId", async (request, response) => {
  const nameAsPerPan = String(request.body.nameAsPerPan || "").trim();
  const pan = String(request.body.pan || "").trim();
  const dateOfBirth = String(request.body.dateOfBirth || "").trim();
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
  if (nameAsPerPan.length < 2 || !panPattern.test(pan) || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    response.status(400).json({ message: "Enter a valid PAN, name, and date of birth." });
    return;
  }

  try {
    const profile = await saveKycProfile({
      userId: request.params.userId,
      nameAsPerPan,
      pan,
      dateOfBirth,
      gender: String(request.body.gender || "").trim(),
      addressLine1: String(request.body.addressLine1 || "").trim(),
      city: String(request.body.city || "").trim(),
      state: String(request.body.state || "").trim(),
      pincode: String(request.body.pincode || "").trim(),
    });
    response.status(201).json({ message: "Profile saved. You can now request your credit score.", profile });
  } catch (error) {
    console.error("KYC profile save failed", error);
    response.status(400).json({ message: "We could not save those details. Please check them and try again." });
  }
});

app.post("/api/credit-score/request", async (request, response) => {
  try {
    const requestRecord = await createCreditReportRequest(String(request.body.userId || ""));
    response.status(201).json({
      message: "Your score request is queued. The live bureau API will populate the report when connected.",
      request: requestRecord,
    });
  } catch (error) {
    console.error("Credit score request failed", error);
    response.status(400).json({ message: "Complete your profile before requesting a credit score." });
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

app.post("/api/inquiries", async (request, response) => {
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
    await saveWebsiteInquiry({ fullName, mobile, concern, scoreRange });
    response.status(201).json({ message: "Your callback request was saved." });
  } catch (error) {
    console.error("Website inquiry database save failed", error);
    response.status(503).json({ message: "We could not save your callback request. Please contact us on WhatsApp instead." });
  }
});

app.post("/api/assessments", upload.single("report"), async (request, response) => {
  const assessmentType = request.body.assessmentType === "business" ? "business" : "individual";
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

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Score Now API is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database initialization failed", error);
    process.exitCode = 1;
  }
};

void startServer();