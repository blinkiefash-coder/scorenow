import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";
import { Pool } from "pg";
import type { Applicant, Bureau, ReportMetrics } from "./bureaus.js";

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
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const createSession = async ({ userId, ipAddress, userAgent }: { userId: string; ipAddress?: string; userAgent?: string }) => {
  const token = randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashToken(token), ipAddress || null, userAgent?.slice(0, 500) || null, new Date(Date.now() + SESSION_TTL_MS)],
  );
  return token;
};

export const findSessionUser = async (token: string) => {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { rows } = await pool.query<{ id: string; mobile: string; email: string | null; full_name: string }>(
    `SELECT u.id, u.mobile, u.email, u.full_name
     FROM user_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
};

export const revokeSession = async (token: string) => {
  await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)]);
};

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (mobile: string, code: string) =>
  createHash("sha256").update(`${mobile}:${code}`).digest("hex");

export const createOtp = async ({
  mobile,
  email,
  purpose = "login",
}: {
  mobile: string;
  email?: string;
  purpose?: "login" | "kyc" | "credit_consent";
}) => {
  const { rows: recent } = await pool.query<{ created_at: Date }>(
    `SELECT created_at FROM otp_verifications
     WHERE mobile = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`,
    [mobile, purpose],
  );
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new Error("Please wait before requesting another code.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpHash = hashOtp(mobile, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO otp_verifications (mobile, email, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [mobile, email ?? null, otpHash, purpose, expiresAt],
  );

  return { code, expiresAt };
};

export const verifyOtp = async ({
  mobile,
  code,
  purpose = "login",
}: {
  mobile: string;
  code: string;
  purpose?: "login" | "kyc" | "credit_consent";
}) => {
  const { rows } = await pool.query<{ id: string; otp_hash: string; attempts: number; expires_at: Date; verified_at: Date | null }>(
    `SELECT id, otp_hash, attempts, expires_at, verified_at FROM otp_verifications
     WHERE mobile = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`,
    [mobile, purpose],
  );
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

export const upsertUserByMobile = async ({
  mobile,
  fullName,
  email,
}: {
  mobile: string;
  fullName?: string;
  email?: string;
}) => {
  const { rows } = await pool.query<{ id: string; mobile: string; email: string | null; full_name: string; email_verified: boolean }>(
    `INSERT INTO users (mobile, full_name, mobile_verified)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (mobile) DO UPDATE
       SET mobile_verified = TRUE,
           updated_at = NOW()
     RETURNING id, mobile, email, full_name, email_verified`,
    [mobile, fullName?.trim() || "Score Now User"],
  );
  const user = rows[0];
  if (!user.email && email) {
    try {
      const { rows: updated } = await pool.query<{ id: string; mobile: string; email: string | null; full_name: string; email_verified: boolean }>(
        `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, mobile, email, full_name, email_verified`,
        [email, user.id],
      );
      return updated[0];
    } catch {
      // Email already belongs to another account; keep the user signed in without it.
      return user;
    }
  }
  return user;
};


export const findUserByEmail = async (email: string) => {
  const { rows } = await pool.query<{ id: string; mobile: string; email: string | null; full_name: string; email_verified: boolean }>(
    `SELECT id, mobile, email, full_name, email_verified FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
};

export const markEmailVerified = async (userId: string) => {
  const { rows } = await pool.query<{ id: string; mobile: string; email: string | null; full_name: string; email_verified: boolean }>(
    `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1
     RETURNING id, mobile, email, full_name, email_verified`,
    [userId],
  );
  return rows[0];
};

const kycKey = () => createHash("sha256")
  .update(process.env.KYC_ENCRYPTION_KEY || "scorenow-local-development-key")
  .digest();

const encryptPan = (pan: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kycKey(), iv);
  const encrypted = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
};

const decryptPan = (payload: Buffer) => {
  const decipher = createDecipheriv("aes-256-gcm", kycKey(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
};

export const getApplicant = async (userId: string): Promise<Applicant | null> => {
  const { rows } = await pool.query<{
    name_as_per_pan: string; pan_encrypted: Buffer; date_of_birth: string; gender: string | null;
    address_line1: string | null; city: string | null; state: string | null; pincode: string | null;
    email: string | null; mobile: string;
  }>(
    `SELECT k.name_as_per_pan, k.pan_encrypted, to_char(k.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, k.gender,
            k.address_line1, k.city, k.state, k.pincode, u.email, u.mobile
     FROM kyc_profiles k JOIN users u ON u.id = k.user_id WHERE k.user_id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
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

export const setUserEmailIfMissing = async (userId: string, email: string) => {
  try {
    await pool.query(`UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 AND email IS NULL`, [email, userId]);
  } catch {
    throw new Error("That email is already linked to another account.");
  }
};

type ReportSummary = {
  request_id: string;
  bureau: Bureau;
  status: string;
  failure_reason: string | null;
  requested_at: string;
  credit_score: number | null;
  score_band: string | null;
  report_date: string | null;
  report_url: string | null;
  total_accounts: number | null;
  active_accounts: number | null;
  overdue_accounts: number | null;
  enquiries_last_6_months: number | null;
};

export const getDashboardStatus = async (userId: string) => {
  const [profileResult, reportResult] = await Promise.all([
    pool.query<{ id: string; name_as_per_pan: string; date_of_birth: string; city: string | null; kyc_status: string }>(
      `SELECT id, name_as_per_pan, date_of_birth, city, kyc_status FROM kyc_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    ),
    pool.query<ReportSummary>(
      `SELECT DISTINCT ON (r.bureau)
         r.id AS request_id, r.bureau, r.status, r.failure_reason, r.requested_at,
         c.credit_score, c.score_band, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_url,
         c.total_accounts, c.active_accounts, c.overdue_accounts, c.enquiries_last_6_months
       FROM credit_report_requests r
       LEFT JOIN credit_reports c ON c.request_id = r.id
       WHERE r.user_id = $1 AND r.payment_id IS NOT NULL
       ORDER BY r.bureau, r.requested_at DESC`,
      [userId],
    ),
  ]);
  return { profile: profileResult.rows[0] ?? null, reports: reportResult.rows };
};

export const createReportPayment = async ({
  userId,
  bureau,
  orderId,
  amount,
  gstAmount,
}: {
  userId: string;
  bureau: Bureau;
  orderId: string;
  amount: number;
  gstAmount: number;
}) => {
  await pool.query(
    `INSERT INTO payments (user_id, gateway, gateway_order_id, amount, gst_amount, status, report_bureau)
     VALUES ($1, 'razorpay', $2, $3, $4, 'created', $5)`,
    [userId, orderId, amount, gstAmount, bureau],
  );
};

export const findReportPayment = async (userId: string, orderId: string) => {
  const { rows } = await pool.query<{ id: string; status: string; report_bureau: Bureau | null }>(
    `SELECT id, status, report_bureau FROM payments WHERE user_id = $1 AND gateway_order_id = $2`,
    [userId, orderId],
  );
  return rows[0] ?? null;
};

export const markPaymentFailed = async (paymentId: string) => {
  await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'created'`, [paymentId]);
};

// Marks the payment paid and opens its report request exactly once, even if verify is called twice.
export const markPaymentPaidAndCreateRequest = async ({
  userId,
  paymentDbId,
  gatewayPaymentId,
  bureau,
}: {
  userId: string;
  paymentDbId: string;
  gatewayPaymentId: string;
  bureau: Bureau;
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paid = await client.query(
      `UPDATE payments SET status = 'paid', gateway_payment_id = $2, paid_at = NOW()
       WHERE id = $1 AND status = 'created'`,
      [paymentDbId, gatewayPaymentId],
    );
    if (paid.rowCount === 0) {
      await client.query("ROLLBACK");
      const { rows } = await pool.query<{ id: string }>(`SELECT id FROM credit_report_requests WHERE payment_id = $1`, [paymentDbId]);
      return rows[0]?.id ?? null;
    }
    const consent = await client.query<{ id: string }>(
      `INSERT INTO user_consents (user_id, consent_type, consent_text_version, granted)
       VALUES ($1, 'credit_report_pull', 'paid-report-v1', TRUE) RETURNING id`,
      [userId],
    );
    const request = await client.query<{ id: string }>(
      `INSERT INTO credit_report_requests (user_id, consent_id, bureau, provider, status, payment_id)
       VALUES ($1, $2, $3, 'payprime', 'processing', $4) RETURNING id`,
      [userId, consent.rows[0].id, bureau, paymentDbId],
    );
    await client.query("COMMIT");
    return request.rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const findReportRequest = async (userId: string, requestId: string) => {
  const { rows } = await pool.query<{ id: string; bureau: Bureau; status: string }>(
    `SELECT id, bureau, status FROM credit_report_requests
     WHERE id::text = $1 AND user_id = $2 AND payment_id IS NOT NULL`,
    [requestId, userId],
  );
  return rows[0] ?? null;
};

export const markReportProcessing = async (requestId: string) => {
  await pool.query(`UPDATE credit_report_requests SET status = 'processing', failure_reason = NULL WHERE id = $1`, [requestId]);
};

export const completeReportRequest = async ({
  userId,
  requestId,
  bureau,
  providerTxnId,
  score,
  band,
  reportUrl,
  metrics,
  raw,
}: {
  userId: string;
  requestId: string;
  bureau: Bureau;
  providerTxnId: string | null;
  score: number | null;
  band: string | null;
  reportUrl: string | null;
  metrics: ReportMetrics;
  raw: unknown;
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE credit_report_requests SET status = 'completed', provider_request_id = $2, completed_at = NOW(), failure_reason = NULL
       WHERE id = $1`,
      [requestId, providerTxnId],
    );
    await client.query(
      `INSERT INTO credit_reports (user_id, request_id, bureau, credit_score, score_band, report_date, report_url, raw_report,
         total_accounts, active_accounts, overdue_accounts, enquiries_last_6_months)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, $11)`,
      [userId, requestId, bureau, score, band, reportUrl, JSON.stringify(raw),
        metrics.totalAccounts, metrics.activeAccounts, metrics.overdueAccounts, metrics.enquiriesLast6Months],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const failReportRequest = async (requestId: string, reason: string) => {
  await pool.query(
    `UPDATE credit_report_requests SET status = 'failed', failure_reason = $2 WHERE id = $1`,
    [requestId, reason.slice(0, 500)],
  );
};

export const saveKycProfile = async ({
  userId,
  nameAsPerPan,
  pan,
  dateOfBirth,
  gender,
  addressLine1,
  city,
  state,
  pincode,
}: {
  userId: string;
  nameAsPerPan: string;
  pan: string;
  dateOfBirth: string;
  gender?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) => {
  const normalizedPan = pan.toUpperCase().replace(/\s/g, "");
  const panHash = createHash("sha256").update(normalizedPan).digest("hex");
  const normalizedGender = ["female", "male", "other"].includes((gender || "").toLowerCase())
    ? (gender || "").toLowerCase()
    : null;
  const { rows } = await pool.query<{ id: string; name_as_per_pan: string; date_of_birth: string; city: string | null; kyc_status: string }>(
    `INSERT INTO kyc_profiles
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
     RETURNING id, name_as_per_pan, date_of_birth, city, kyc_status`,
    [userId, nameAsPerPan.trim(), encryptPan(normalizedPan), panHash, normalizedPan.slice(-4), dateOfBirth, normalizedGender, addressLine1 || null, city || null, state || null, pincode || null],
  );
  return rows[0];
};

export const saveAssessment = async ({
  userId,
  assessmentType,
  fields,
  report,
}: {
  userId: string;
  assessmentType: "individual" | "business";
  fields: Record<string, string>;
  report?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
}) => {
  await pool.query(
    `INSERT INTO assessment_submissions
      (user_id, assessment_type, form_data, report_content, report_filename, report_mime_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      assessmentType,
      JSON.stringify(fields),
      report?.buffer ?? null,
      report?.originalname ?? null,
      report?.mimetype ?? null,
    ],
  );
};

export const saveWebsiteInquiry = async ({
  userId,
  fullName,
  mobile,
  concern,
  scoreRange,
}: {
  userId: string;
  fullName: string;
  mobile: string;
  concern: string;
  scoreRange: string;
}) => {
  await pool.query(
    `INSERT INTO website_inquiries (user_id, full_name, mobile, concern, score_range)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, fullName, mobile, concern, scoreRange],
  );
};
