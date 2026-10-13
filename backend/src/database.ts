import { createHash, randomInt } from "node:crypto";
import { Pool } from "pg";

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

export const saveAssessment = async ({
  assessmentType,
  fields,
  report,
}: {
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
      (assessment_type, form_data, report_content, report_filename, report_mime_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      assessmentType,
      JSON.stringify(fields),
      report?.buffer ?? null,
      report?.originalname ?? null,
      report?.mimetype ?? null,
    ],
  );
};

export const saveWebsiteInquiry = async ({
  fullName,
  mobile,
  concern,
  scoreRange,
}: {
  fullName: string;
  mobile: string;
  concern: string;
  scoreRange: string;
}) => {
  await pool.query(
    `INSERT INTO website_inquiries (full_name, mobile, concern, score_range)
     VALUES ($1, $2, $3, $4)`,
    [fullName, mobile, concern, scoreRange],
  );
};
