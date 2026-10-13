import { createCipheriv, createHash, randomBytes, randomInt } from "node:crypto";
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

const encryptPan = (pan: string) => {
  const key = createHash("sha256")
    .update(process.env.KYC_ENCRYPTION_KEY || "scorenow-local-development-key")
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(pan, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
};

export const getDashboardStatus = async (userId: string) => {
  const [profileResult, reportResult] = await Promise.all([
    pool.query<{ id: string; name_as_per_pan: string; date_of_birth: string; city: string | null; kyc_status: string }>(
      `SELECT id, name_as_per_pan, date_of_birth, city, kyc_status FROM kyc_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    ),
    pool.query<{ id: string; credit_score: number | null; score_band: string | null; report_date: string; bureau: string; active_accounts: number | null; total_accounts: number | null; overdue_accounts: number | null; enquiries_last_6_months: number | null }>(
      `SELECT id, credit_score, score_band, report_date, bureau, active_accounts, total_accounts, overdue_accounts, enquiries_last_6_months
       FROM credit_reports WHERE user_id = $1 ORDER BY report_date DESC, created_at DESC LIMIT 1`,
      [userId],
    ),
  ]);
  return { profile: profileResult.rows[0] ?? null, report: reportResult.rows[0] ?? null };
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

export const createCreditReportRequest = async (userId: string) => {
  const consent = await pool.query<{ id: string }>(
    `INSERT INTO user_consents (user_id, consent_type, consent_text_version, granted)
     VALUES ($1, 'credit_report_pull', 'credit-score-sample-v1', TRUE)
     RETURNING id`,
    [userId],
  );
  const { rows } = await pool.query<{ id: string; status: string; requested_at: string }>(
    `INSERT INTO credit_report_requests (user_id, consent_id, bureau, provider, status)
     VALUES ($1, $2, 'cibil', 'sample-provider', 'initiated')
     RETURNING id, status, requested_at`,
    [userId, consent.rows[0].id],
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
