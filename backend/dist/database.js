import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";
import { Pool } from "pg";
import { livePdfUrl } from "./bureaus.js";
import { normalizeReport, PARSER_VERSION } from "./reportParser.js";
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export const initializeDatabase = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be configured before the API can start.");
    }
    await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_submissions (
      id BIGSERIAL PRIMARY KEY,
      assessment_type TEXT NOT NULL CHECK (assessment_type IN ('individual', 'business')),
      form_data JSONB NOT NULL,
      report_content BYTEA,
      report_filename TEXT,
      report_mime_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS website_inquiries (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      concern TEXT NOT NULL,
      score_range TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    // Additive column on the existing otp_verifications table so an OTP request
    // can also be delivered by email (mobile stays required, matching `users.mobile`).
    await pool.query(`ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS email TEXT`);
    await pool.query(`ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE website_inquiries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS report_bureau TEXT`);
    await pool.query(`ALTER TABLE credit_report_requests ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id)`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_url TEXT`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS raw_report JSONB`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS normalized_report JSONB`);
    await pool.query(`ALTER TABLE credit_report_requests ADD COLUMN IF NOT EXISTS provider_response JSONB`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_pdf BYTEA`);
};
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export const createSession = async ({ userId, ipAddress, userAgent }) => {
    const token = randomBytes(32).toString("hex");
    await pool.query(`INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`, [userId, hashToken(token), ipAddress || null, userAgent?.slice(0, 500) || null, new Date(Date.now() + SESSION_TTL_MS)]);
    return token;
};
export const findSessionUser = async (token) => {
    if (!/^[0-9a-f]{64}$/.test(token))
        return null;
    const { rows } = await pool.query(`SELECT u.id, u.mobile, u.email, u.full_name
     FROM user_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`, [hashToken(token)]);
    return rows[0] ?? null;
};
export const revokeSession = async (token) => {
    await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)]);
};
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const hashOtp = (mobile, code) => createHash("sha256").update(`${mobile}:${code}`).digest("hex");
export const createOtp = async ({ mobile, email, purpose = "login", }) => {
    const { rows: recent } = await pool.query(`SELECT created_at FROM otp_verifications
     WHERE mobile = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`, [mobile, purpose]);
    if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
        throw new Error("Please wait before requesting another code.");
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpHash = hashOtp(mobile, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await pool.query(`INSERT INTO otp_verifications (mobile, email, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)`, [mobile, email ?? null, otpHash, purpose, expiresAt]);
    return { code, expiresAt };
};
export const verifyOtp = async ({ mobile, code, purpose = "login", }) => {
    const { rows } = await pool.query(`SELECT id, otp_hash, attempts, expires_at, verified_at FROM otp_verifications
     WHERE mobile = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`, [mobile, purpose]);
    const record = rows[0];
    if (!record || record.verified_at) {
        throw new Error("Request a new code and try again.");
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
        throw new Error("This code has expired. Request a new one.");
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
        throw new Error("Too many attempts. Request a new code.");
    }
    const matches = record.otp_hash === hashOtp(mobile, code);
    if (!matches) {
        await pool.query(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
        throw new Error("Incorrect code. Please try again.");
    }
    await pool.query(`UPDATE otp_verifications SET verified_at = NOW() WHERE id = $1`, [record.id]);
};
export const upsertUserByMobile = async ({ mobile, fullName, email, }) => {
    const { rows } = await pool.query(`INSERT INTO users (mobile, full_name, mobile_verified)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (mobile) DO UPDATE
       SET mobile_verified = TRUE,
           updated_at = NOW()
     RETURNING id, mobile, email, full_name, email_verified`, [mobile, fullName?.trim() || "Score Now User"]);
    const user = rows[0];
    if (!user.email && email) {
        try {
            const { rows: updated } = await pool.query(`UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, mobile, email, full_name, email_verified`, [email, user.id]);
            return updated[0];
        }
        catch {
            // Email already belongs to another account; keep the user signed in without it.
            return user;
        }
    }
    return user;
};
export const findUserByEmail = async (email) => {
    const { rows } = await pool.query(`SELECT id, mobile, email, full_name, email_verified FROM users WHERE email = $1`, [email]);
    return rows[0] ?? null;
};
export const markEmailVerified = async (userId) => {
    const { rows } = await pool.query(`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1
     RETURNING id, mobile, email, full_name, email_verified`, [userId]);
    return rows[0];
};
const kycKey = () => createHash("sha256")
    .update(process.env.KYC_ENCRYPTION_KEY || "scorenow-local-development-key")
    .digest();
const encryptPan = (pan) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", kycKey(), iv);
    const encrypted = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
};
const decryptPan = (payload) => {
    const decipher = createDecipheriv("aes-256-gcm", kycKey(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
};
export const getApplicant = async (userId) => {
    const { rows } = await pool.query(`SELECT k.name_as_per_pan, k.pan_encrypted, to_char(k.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, k.gender,
            k.address_line1, k.city, k.state, k.pincode, u.email, u.mobile
     FROM kyc_profiles k JOIN users u ON u.id = k.user_id WHERE k.user_id = $1`, [userId]);
    const row = rows[0];
    if (!row)
        return null;
    return {
        fullName: row.name_as_per_pan,
        pan: decryptPan(row.pan_encrypted),
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        addressLine1: row.address_line1,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        email: row.email,
        mobile: row.mobile,
    };
};
export const setUserEmailIfMissing = async (userId, email) => {
    try {
        await pool.query(`UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 AND email IS NULL`, [email, userId]);
    }
    catch {
        throw new Error("That email is already linked to another account.");
    }
};
// Demo requests have no payment; they only exist when REPORTS_DEMO_MODE is on outside production.
const VISIBLE_REQUEST = `(r.payment_id IS NOT NULL OR r.provider = 'demo')`;
export const getDashboardStatus = async (userId) => {
    const [profileResult, reportResult] = await Promise.all([
        pool.query(`SELECT id, name_as_per_pan, date_of_birth, city, kyc_status FROM kyc_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId]),
        pool.query(`SELECT DISTINCT ON (r.bureau)
         r.id AS request_id, r.bureau, r.status, r.failure_reason, r.requested_at, r.provider = 'demo' AS is_demo,
         c.credit_score, c.score_band, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_url,
         c.total_accounts, c.active_accounts, c.overdue_accounts, c.enquiries_last_6_months, c.total_outstanding
       FROM credit_report_requests r
       LEFT JOIN credit_reports c ON c.request_id = r.id
       WHERE r.user_id = $1 AND ${VISIBLE_REQUEST}
       ORDER BY r.bureau, r.requested_at DESC`, [userId]),
    ]);
    return { profile: profileResult.rows[0] ?? null, reports: reportResult.rows };
};
export const createReportPayment = async ({ userId, bureau, orderId, amount, gstAmount, gateway, }) => {
    await pool.query(`INSERT INTO payments (user_id, gateway, gateway_order_id, amount, gst_amount, status, report_bureau)
     VALUES ($1, $6, $2, $3, $4, 'created', $5)`, [userId, orderId, amount, gstAmount, bureau, gateway]);
};
export const findReportPayment = async (userId, orderId) => {
    const { rows } = await pool.query(`SELECT id, status, gateway, report_bureau FROM payments WHERE user_id = $1 AND gateway_order_id = $2`, [userId, orderId]);
    return rows[0] ?? null;
};
export const markPaymentFailed = async (paymentId) => {
    await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'created'`, [paymentId]);
};
// Marks the payment paid and opens its report request exactly once, even if verify is called twice.
export const markPaymentPaidAndCreateRequest = async ({ userId, paymentDbId, gatewayPaymentId, bureau, }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const paid = await client.query(`UPDATE payments SET status = 'paid', gateway_payment_id = $2, paid_at = NOW()
       WHERE id = $1 AND status = 'created'`, [paymentDbId, gatewayPaymentId]);
        if (paid.rowCount === 0) {
            await client.query("ROLLBACK");
            const { rows } = await pool.query(`SELECT id FROM credit_report_requests WHERE payment_id = $1`, [paymentDbId]);
            return rows[0]?.id ?? null;
        }
        const consent = await client.query(`INSERT INTO user_consents (user_id, consent_type, consent_text_version, granted)
       VALUES ($1, 'credit_report_pull', 'paid-report-v1', TRUE) RETURNING id`, [userId]);
        const request = await client.query(`INSERT INTO credit_report_requests (user_id, consent_id, bureau, provider, status, payment_id)
       VALUES ($1, $2, $3, 'payprime', 'processing', $4) RETURNING id`, [userId, consent.rows[0].id, bureau, paymentDbId]);
        await client.query("COMMIT");
        return request.rows[0].id;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
};
export const createDemoReportRequest = async (userId, bureau) => {
    const consent = await pool.query(`INSERT INTO user_consents (user_id, consent_type, consent_text_version, granted)
     VALUES ($1, 'credit_report_pull', 'demo-report-v1', TRUE) RETURNING id`, [userId]);
    const { rows } = await pool.query(`INSERT INTO credit_report_requests (user_id, consent_id, bureau, provider, status)
     VALUES ($1, $2, $3, 'demo', 'processing') RETURNING id`, [userId, consent.rows[0].id, bureau]);
    return rows[0].id;
};
export const findReportRequest = async (userId, requestId) => {
    const { rows } = await pool.query(`SELECT r.id, r.bureau, r.status FROM credit_report_requests r
     WHERE r.id::text = $1 AND r.user_id = $2 AND ${VISIBLE_REQUEST}`, [requestId, userId]);
    return rows[0] ?? null;
};
export const markReportProcessing = async (requestId) => {
    await pool.query(`UPDATE credit_report_requests SET status = 'processing', failure_reason = NULL WHERE id = $1`, [requestId]);
};
export const completeReportRequest = async ({ userId, requestId, bureau, providerTxnId, band, reportUrl, report, raw, }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`UPDATE credit_report_requests SET status = 'completed', provider_request_id = $2, completed_at = NOW(), failure_reason = NULL,
         provider_response = $3
       WHERE id = $1`, [requestId, providerTxnId, JSON.stringify(raw)]);
        await client.query(`INSERT INTO credit_reports (user_id, request_id, bureau, credit_score, score_band, report_date, report_url, raw_report, normalized_report,
         total_accounts, active_accounts, overdue_accounts, enquiries_last_6_months, total_outstanding)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10, $11, $12, $13, $14)`, [userId, requestId, bureau, report.score, band, report.reportDate, reportUrl, JSON.stringify(raw), JSON.stringify(report),
            report.summary.totalAccounts, report.summary.activeAccounts, report.summary.overdueAccounts, report.summary.enquiriesLast6Months,
            report.summary.totalBalance]);
        await client.query("COMMIT");
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
};
export const failReportRequest = async (requestId, reason, raw = null) => {
    await pool.query(`UPDATE credit_report_requests SET status = 'failed', failure_reason = $2, provider_response = $3 WHERE id = $1`, [requestId, reason.slice(0, 500), raw === null ? null : JSON.stringify(raw)]);
};
// Returns the parsed report, re-parsing the saved raw response when the parser has been improved since it was stored.
export const getReportDetail = async (userId, requestId) => {
    const { rows } = await pool.query(`SELECT c.id, c.bureau, c.report_url, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.raw_report, c.normalized_report, r.provider = 'demo' AS is_demo,
            c.report_pdf IS NOT NULL AS has_pdf
     FROM credit_reports c JOIN credit_report_requests r ON r.id = c.request_id
     WHERE c.request_id::text = $1 AND c.user_id = $2 AND ${VISIBLE_REQUEST}`, [requestId, userId]);
    const row = rows[0];
    if (!row)
        return null;
    let report = row.normalized_report;
    if (!report || report.parserVersion !== PARSER_VERSION) {
        report = normalizeReport(row.bureau, row.raw_report);
        await pool.query(`UPDATE credit_reports SET normalized_report = $2 WHERE id = $1`, [row.id, JSON.stringify(report)]);
    }
    return {
        ...report,
        reportDate: report.reportDate ?? row.report_date,
        reportUrl: row.report_url,
        isDemo: row.is_demo,
        pdfAvailable: row.has_pdf || Boolean(livePdfUrl(row.raw_report)),
    };
};
export const getReportPdf = async (userId, requestId) => {
    const { rows } = await pool.query(`SELECT c.request_id, c.bureau, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_pdf,
            CASE WHEN c.report_pdf IS NULL THEN c.raw_report END AS raw_report
     FROM credit_reports c JOIN credit_report_requests r ON r.id = c.request_id
     WHERE c.request_id::text = $1 AND c.user_id = $2 AND ${VISIBLE_REQUEST}`, [requestId, userId]);
    const row = rows[0];
    return row ? { requestId: row.request_id, bureau: row.bureau, reportDate: row.report_date, pdf: row.report_pdf, raw: row.raw_report } : null;
};
export const saveReportPdf = async (requestId, pdf) => {
    await pool.query(`UPDATE credit_reports SET report_pdf = $2 WHERE request_id = $1`, [requestId, pdf]);
};
export const saveKycProfile = async ({ userId, nameAsPerPan, pan, dateOfBirth, gender, addressLine1, city, state, pincode, }) => {
    const normalizedPan = pan.toUpperCase().replace(/\s/g, "");
    const panHash = createHash("sha256").update(normalizedPan).digest("hex");
    const normalizedGender = ["female", "male", "other"].includes((gender || "").toLowerCase())
        ? (gender || "").toLowerCase()
        : null;
    const { rows } = await pool.query(`INSERT INTO kyc_profiles
      (user_id, name_as_per_pan, pan_encrypted, pan_hash, pan_last4, date_of_birth, gender, address_line1, city, state, pincode, kyc_status, verification_provider)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'sample-flow')
     ON CONFLICT (user_id) DO UPDATE SET
       name_as_per_pan = EXCLUDED.name_as_per_pan,
       pan_encrypted = EXCLUDED.pan_encrypted,
       pan_hash = EXCLUDED.pan_hash,
       pan_last4 = EXCLUDED.pan_last4,
       date_of_birth = EXCLUDED.date_of_birth,
       gender = EXCLUDED.gender,
       address_line1 = EXCLUDED.address_line1,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       pincode = EXCLUDED.pincode,
       updated_at = NOW()
     RETURNING id, name_as_per_pan, date_of_birth, city, kyc_status`, [userId, nameAsPerPan.trim(), encryptPan(normalizedPan), panHash, normalizedPan.slice(-4), dateOfBirth, normalizedGender, addressLine1 || null, city || null, state || null, pincode || null]);
    return rows[0];
};
export const saveAssessment = async ({ userId, assessmentType, fields, report, }) => {
    await pool.query(`INSERT INTO assessment_submissions
      (user_id, assessment_type, form_data, report_content, report_filename, report_mime_type)
     VALUES ($1, $2, $3, $4, $5, $6)`, [
        userId,
        assessmentType,
        JSON.stringify(fields),
        report?.buffer ?? null,
        report?.originalname ?? null,
        report?.mimetype ?? null,
    ]);
};
export const saveWebsiteInquiry = async ({ userId, fullName, mobile, concern, scoreRange, }) => {
    await pool.query(`INSERT INTO website_inquiries (user_id, full_name, mobile, concern, score_range)
     VALUES ($1, $2, $3, $4, $5)`, [userId, fullName, mobile, concern, scoreRange]);
};
