import cors from "cors";
import "dotenv/config";
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "node:path";

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

  const transport = createMailTransport();
  if (!transport) {
    response.status(503).json({ message: "Email delivery is not configured yet. Please contact us by WhatsApp or phone." });
    return;
  }

  const fields = assessmentType === "business"
    ? ["businessName", "fullName", "mobile", "email", "businessType", "cmr", "funding"]
    : ["fullName", "mobile", "email", "city", "score", "goal"];
  const rows = fields.map((field) => ({
    label: fieldLabels[field],
    value: String(request.body[field] || "Not provided").trim(),
  }));
  const title = assessmentType === "business" ? "Business CMR Assessment" : "Personal Credit Assessment";
  const subjectName = assessmentType === "business" ? request.body.businessName : request.body.fullName;
  const text = [`New ${title}`, "", ...rows.map(({ label, value }) => `${label}: ${value}`), "", `Report attached: ${request.file ? "Yes" : "No"}`].join("\n");
  const htmlRows = rows.map(({ label, value }) => `<tr><td style="padding:10px 12px;color:#65708a;border-bottom:1px solid #e5edf6">${escapeHtml(label)}</td><td style="padding:10px 12px;color:#081446;font-weight:700;border-bottom:1px solid #e5edf6">${escapeHtml(value)}</td></tr>`).join("");

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
    response.status(201).json({ message: "Assessment sent successfully.", messageId: result.messageId });
  } catch (error) {
    console.error("Assessment email failed", error);
    response.status(502).json({ message: "We could not send your assessment. Please try again or contact us on WhatsApp." });
  }
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({ message: "The selected report exceeds the 10 MB limit." });
    return;
  }
  response.status(400).json({ message: error.message || "Invalid assessment submission." });
});

app.listen(port, () => {
  console.log(`Score Now API is running at http://localhost:${port}`);
});