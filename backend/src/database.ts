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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      mobile TEXT UNIQUE,
      email TEXT UNIQUE,
      full_name TEXT,
      firebase_uid TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id BIGSERIAL PRIMARY KEY,
      contact_type TEXT NOT NULL CHECK (contact_type IN ('mobile', 'email')),
      contact_value TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (contactType: string, contactValue: string, code: string) =>
  createHash("sha256").update(`${contactType}:${contactValue.toLowerCase()}:${code}`).digest("hex");

export const createOtp = async ({
  contactType,
  contactValue,
}: {
  contactType: "mobile" | "email";
  contactValue: string;
}) => {
  const { rows: recent } = await pool.query<{ created_at: Date }>(
    `SELECT created_at FROM otp_codes
     WHERE contact_type = $1 AND contact_value = $2
     ORDER BY created_at DESC LIMIT 1`,
    [contactType, contactValue],
  );
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new Error("Please wait before requesting another code.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = hashOtp(contactType, contactValue, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO otp_codes (contact_type, contact_value, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [contactType, contactValue, codeHash, expiresAt],
  );

  return { code, expiresAt };
};

export const verifyOtp = async ({
  contactType,
  contactValue,
  code,
}: {
  contactType: "mobile" | "email";
  contactValue: string;
  code: string;
}) => {
  const { rows } = await pool.query<{ id: number; code_hash: string; attempts: number; expires_at: Date; consumed_at: Date | null }>(
    `SELECT id, code_hash, attempts, expires_at, consumed_at FROM otp_codes
     WHERE contact_type = $1 AND contact_value = $2
     ORDER BY created_at DESC LIMIT 1`,
    [contactType, contactValue],
  );
  const record = rows[0];
  if (!record || record.consumed_at) {
    throw new Error("Request a new code and try again.");
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error("This code has expired. Request a new one.");
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error("Too many attempts. Request a new code.");
  }

  const matches = record.code_hash === hashOtp(contactType, contactValue, code);
  if (!matches) {
    await pool.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
    throw new Error("Incorrect code. Please try again.");
  }

  await pool.query(`UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1`, [record.id]);
};

export const upsertUserByContact = async ({
  contactType,
  contactValue,
  fullName,
}: {
  contactType: "mobile" | "email";
  contactValue: string;
  fullName?: string;
}) => {
  const column = contactType === "mobile" ? "mobile" : "email";
  const { rows } = await pool.query<{ id: number; mobile: string | null; email: string | null; full_name: string | null }>(
    `INSERT INTO app_users (${column}, full_name, last_login_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (${column}) DO UPDATE
       SET last_login_at = NOW(),
           full_name = COALESCE(app_users.full_name, EXCLUDED.full_name)
     RETURNING id, mobile, email, full_name`,
    [contactValue, fullName ?? null],
  );
  return rows[0];
};

export const upsertUserByFirebaseUid = async ({
  firebaseUid,
  mobile,
  email,
  fullName,
}: {
  firebaseUid: string;
  mobile?: string | null;
  email?: string | null;
  fullName?: string | null;
}) => {
  const { rows } = await pool.query<{ id: number; mobile: string | null; email: string | null; full_name: string | null }>(
    `INSERT INTO app_users (firebase_uid, mobile, email, full_name, last_login_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (firebase_uid) DO UPDATE
       SET last_login_at = NOW(),
           mobile = COALESCE(EXCLUDED.mobile, app_users.mobile),
           email = COALESCE(EXCLUDED.email, app_users.email),
           full_name = COALESCE(app_users.full_name, EXCLUDED.full_name)
     RETURNING id, mobile, email, full_name`,
    [firebaseUid, mobile ?? null, email ?? null, fullName ?? null],
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
