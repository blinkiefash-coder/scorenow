import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { livePdfUrl, scoreBand, type Applicant, type Bureau } from "./bureaus.js";
import { normalizeReport, PARSER_VERSION, type NormalizedReport } from "./reportParser.js";
import { PARTNER_ACTIVITY_CHANNEL, partnerEvents, type PartnerActivityEvent } from "./realtime.js";

export const pool = new Pool({
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
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`);

  await pool.query(`ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`);
  await pool.query(`ALTER TABLE website_inquiries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`);

  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS report_bureau TEXT`);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT`);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      payment_id UUID UNIQUE REFERENCES payments(id),
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      months INTEGER NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS user_subscriptions_user_idx ON user_subscriptions (user_id, expires_at DESC)`);
  await pool.query(`ALTER TABLE credit_report_requests ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id)`);
  await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_url TEXT`);
  await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS raw_report JSONB`);
  await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS normalized_report JSONB`);
  await pool.query(`ALTER TABLE credit_report_requests ADD COLUMN IF NOT EXISTS provider_response JSONB`);
  await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_pdf BYTEA`);
  await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_pdf_source TEXT`);
  await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_html TEXT`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS report_pdf BYTEA`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS report_pdf_source TEXT`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS report_html TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_report_audit (
      id BIGSERIAL PRIMARY KEY,
      admin_id TEXT NOT NULL,
      bureau TEXT NOT NULL,
      pan_last4 TEXT NOT NULL,
      mobile_last4 TEXT NOT NULL,
      consent_granted BOOLEAN NOT NULL,
      consent_text_version TEXT NOT NULL,
      consent_ip_address TEXT,
      status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
      provider_transaction_id TEXT,
      credit_score INTEGER,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS applicant_details JSONB`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS provider_response JSONB`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS normalized_report JSONB`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS pan_hash TEXT`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS shared_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE admin_report_audit ADD COLUMN IF NOT EXISTS shared_by TEXT`);
  await pool.query(`CREATE INDEX IF NOT EXISTS admin_report_audit_pan_hash_idx ON admin_report_audit (pan_hash)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS admin_report_audit_created_at_idx ON admin_report_audit (created_at DESC)`);
  await pool.query(`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('manager', 'support', 'analyst')),
      status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'disabled')),
      password_salt TEXT,
      password_hash TEXT,
      pin_salt TEXT,
      pin_hash TEXT,
      invitation_token_hash TEXT,
      invitation_expires_at TIMESTAMPTZ,
      invited_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS invitation_token_hash TEXT`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS invited_by TEXT NOT NULL DEFAULT 'system'`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS parent_email TEXT`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE admin_accounts DROP CONSTRAINT IF EXISTS admin_accounts_role_check`);
  await pool.query(`ALTER TABLE admin_accounts ADD CONSTRAINT admin_accounts_role_check CHECK (role IN ('owner', 'manager', 'support', 'analyst', 'partner', 'agent'))`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_types (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      can_check_bureau BOOLEAN NOT NULL DEFAULT FALSE,
      built_in BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  for (const [key, label, canCheck] of DEFAULT_AGENT_TYPES) {
    await pool.query(
      `INSERT INTO agent_types (key, label, can_check_bureau, built_in) VALUES ($1, $2, $3, TRUE) ON CONFLICT (key) DO NOTHING`,
      [key, label, canCheck],
    );
  }
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS agent_type TEXT REFERENCES agent_types(key) ON DELETE SET NULL`);
  // NULL permissions means the role's default access; a list narrows (or, for partners, grants) specific abilities.
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS permissions TEXT[]`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS customer_scope TEXT NOT NULL DEFAULT 'all'`);
  await pool.query(`ALTER TABLE admin_accounts DROP CONSTRAINT IF EXISTS admin_accounts_customer_scope_check`);
  await pool.query(`ALTER TABLE admin_accounts ADD CONSTRAINT admin_accounts_customer_scope_check CHECK (customer_scope IN ('all', 'assigned'))`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_customer_assignments (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      admin_email TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, admin_email)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS staff_customer_assignments_admin_idx ON staff_customer_assignments (admin_email)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('call', 'whatsapp', 'email', 'visit', 'note')),
      outcome TEXT NOT NULL CHECK (outcome IN ('contacted', 'not_reachable', 'interested', 'not_interested', 'follow_up', 'documents_pending', 'converted')),
      note TEXT NOT NULL,
      next_follow_up_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS customer_interactions_user_idx ON customer_interactions (user_id, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_assignments (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      owner_email TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS customer_assignments_owner_idx ON customer_assignments (owner_email)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payee_email TEXT NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
      note TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ,
      source TEXT NOT NULL DEFAULT 'manual'
    )
  `);
  await pool.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'partner_commissions_source_check' AND conrelid = 'partner_commissions'::regclass
      ) THEN
        ALTER TABLE partner_commissions ADD CONSTRAINT partner_commissions_source_check
        CHECK (source IN ('manual', 'case_closure'));
      END IF;
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS partner_commissions_payee_idx ON partner_commissions (payee_email)`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS partner_commissions_case_closure_user_idx
    ON partner_commissions (user_id) WHERE source = 'case_closure' AND user_id IS NOT NULL
  `);
  await pool.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS razorpay_payout_id TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_payout_profiles (
      email TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      upi_id TEXT,
      bank_account_number TEXT,
      ifsc TEXT,
      razorpay_contact_id TEXT,
      razorpay_vpa_fund_account_id TEXT,
      razorpay_bank_fund_account_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_activity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      event TEXT NOT NULL,
      target_email TEXT,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS partner_activity_actor_idx ON partner_activity (actor_email, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS partner_activity_created_idx ON partner_activity (created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      status TEXT NOT NULL CHECK (status IN ('invited', 'claimed', 'cancelled')),
      invited_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      claimed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS customer_invites_mobile_idx ON customer_invites (mobile, status)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      requester_name TEXT NOT NULL,
      requester_mobile TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      assigned_to TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx ON support_tickets (status, created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'admin')),
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS support_ticket_comments_ticket_idx ON support_ticket_comments (ticket_id, created_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id BIGSERIAL PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_customer_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'interested', 'paid', 'closed')),
      tags TEXT[] NOT NULL DEFAULT '{}',
      application_status TEXT,
      assigned_admin_email TEXT,
      customer_remark TEXT,
      application_submitted_at TIMESTAMPTZ,
      customer_consent_at TIMESTAMPTZ,
      customer_consent_by TEXT,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS application_status TEXT`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS assigned_admin_email TEXT`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS customer_remark TEXT`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS customer_consent_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS customer_consent_by TEXT`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS progress_shared_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE crm_customer_profiles ADD COLUMN IF NOT EXISTS progress_shared_by TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('note', 'call', 'whatsapp', 'email')),
      body TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_activities_user_idx ON crm_activities (user_id, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_at TIMESTAMPTZ,
      assignee_email TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
      task_kind TEXT NOT NULL DEFAULT 'follow_up',
      review_status TEXT NOT NULL DEFAULT 'not_required',
      review_remark TEXT,
      result TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS task_kind TEXT NOT NULL DEFAULT 'follow_up'`);
  await pool.query(`ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'not_required'`);
  await pool.query(`ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS review_remark TEXT`);
  await pool.query(`ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS result TEXT`);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_tasks_open_due_idx ON crm_tasks (status, due_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_tasks_assignee_idx ON crm_tasks (assignee_email, review_status)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_application_events (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      application_status TEXT,
      visibility TEXT NOT NULL CHECK (visibility IN ('customer', 'internal')),
      remark TEXT,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_application_events_user_idx ON crm_application_events (user_id, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_application_documents (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL CHECK (document_type IN ('pan', 'aadhaar', 'other')),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      content BYTEA NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_application_documents_user_idx ON crm_application_documents (user_id, created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS health_assessment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      request_type TEXT NOT NULL DEFAULT 'personal' CHECK (request_type IN ('personal', 'business')),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'closed')),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by TEXT
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS health_assessment_requests_user_idx ON health_assessment_requests (user_id, submitted_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS health_assessment_requests_status_idx ON health_assessment_requests (status, submitted_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consent_events (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'data_sharing', 'sms_notifications', 'push_notifications')),
      granted BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS consent_events_user_idx ON consent_events (user_id, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refund_requests (
      id BIGSERIAL PRIMARY KEY,
      payment_id UUID NOT NULL UNIQUE REFERENCES payments(id),
      user_id UUID NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
      decided_by TEXT,
      decision_note TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS customer_notifications_user_idx ON customer_notifications (user_id, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      channel TEXT NOT NULL CHECK (channel IN ('sms', 'push')),
      status TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS canned_replies (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS reset_token_hash TEXT`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name TEXT NOT NULL,
      customer_image_url TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT NOT NULL,
      result_description TEXT,
      published BOOLEAN NOT NULL DEFAULT false,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS testimonials_published_idx ON testimonials (published, published_at DESC)`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS photo_data BYTEA`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS photo_mime TEXT`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS consent_obtained BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS consent_note TEXT`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS consent_recorded_by TEXT`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  // Entries published before consent tracking existed are withdrawn until consent is recorded.
  await pool.query(`UPDATE testimonials SET published = FALSE, published_at = NULL WHERE published AND NOT consent_obtained`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_publish_requires_consent') THEN
        ALTER TABLE testimonials ADD CONSTRAINT testimonials_publish_requires_consent CHECK (NOT published OR consent_obtained);
      END IF;
    END $$
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS neha_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      sender_id UUID,
      sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'partner', 'system')),
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS neha_messages_conversation_idx ON neha_messages (conversation_id, created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS neha_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES users(id),
      assigned_to_id TEXT,
      assigned_to_role TEXT CHECK (assigned_to_role IN ('admin', 'partner')),
      status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'pending')) DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS neha_conversations_customer_idx ON neha_conversations (customer_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS neha_conversations_assigned_idx ON neha_conversations (assigned_to_id, status)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_status (
      agent_id TEXT PRIMARY KEY,
      agent_name TEXT NOT NULL,
      agent_role TEXT NOT NULL CHECK (agent_role IN ('admin', 'partner')),
      status TEXT NOT NULL CHECK (status IN ('online', 'away', 'offline')) DEFAULT 'offline',
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT
    )
  `);
};

export const listSiteContent = async () => {
  const { rows } = await pool.query<{ key: string; value: unknown }>(`SELECT key, value FROM site_content`);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
};

export const saveSiteContent = async (key: string, value: unknown, adminId: string) => {
  await pool.query(
    `INSERT INTO site_content (key, value, updated_at, updated_by) VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [key, JSON.stringify(value), adminId],
  );
};

export const deleteSiteContent = async (key: string) => {
  await pool.query(`DELETE FROM site_content WHERE key = $1`, [key]);
};

// Admins see the name on the customer's PAN profile first, falling back to the registered account name.
const CUSTOMER_DISPLAY_NAME = `COALESCE(NULLIF(TRIM(k.name_as_per_pan), ''), NULLIF(TRIM(u.full_name), ''), NULLIF(u.email, ''), 'Customer')`;

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
  const { rows } = await pool.query<{ id: string; mobile: string; email: string | null; full_name: string; mustResetPassword: boolean }>(
    `SELECT u.id, u.mobile, u.email, COALESCE(NULLIF(TRIM(k.name_as_per_pan), ''), u.full_name) AS full_name,
            u.must_reset_password AS "mustResetPassword"
     FROM user_sessions s JOIN users u ON u.id = s.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
       AND u.status = 'active' AND u.role = 'customer'`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
};

// Customer-facing name: the PAN-verified KYC name when available, otherwise the account name.
export const withVerifiedName = async <T extends { id: string; full_name: string }>(user: T): Promise<T> => {
  const { rows } = await pool.query<{ name_as_per_pan: string }>(
    `SELECT name_as_per_pan FROM kyc_profiles WHERE user_id = $1 AND NULLIF(TRIM(name_as_per_pan), '') IS NOT NULL`,
    [user.id],
  );
  return rows[0] ? { ...user, full_name: rows[0].name_as_per_pan.trim() } : user;
};

export const revokeSession = async (token: string) => {
  await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)]);
};

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminRole = "owner" | "manager" | "support" | "analyst" | "partner" | "agent";

export const createAdminSession = async ({ adminId, role = "owner", ipAddress, userAgent }: {
  adminId: string;
  role?: AdminRole;
  ipAddress?: string;
  userAgent?: string;
}) => {
  const token = randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO admin_sessions (token_hash, admin_id, role, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [hashToken(token), adminId, role, ipAddress || null, userAgent?.slice(0, 500) || null, new Date(Date.now() + ADMIN_SESSION_TTL_MS)],
  );
  return token;
};

export const findAdminSession = async (token: string) => {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { rows } = await pool.query<{
    admin_id: string; role: AdminRole; expires_at: Date; permissions: string[] | null; customer_scope: "all" | "assigned";
    agent_type: string | null; agent_type_label: string | null; can_check_bureau: boolean;
  }>(
    `SELECT s.admin_id, COALESCE(a.role, s.role) AS role, s.expires_at, a.permissions, COALESCE(a.customer_scope, 'all') AS customer_scope,
            a.agent_type, t.label AS agent_type_label, COALESCE(t.can_check_bureau, FALSE) AS can_check_bureau
     FROM admin_sessions s
     LEFT JOIN admin_accounts a ON a.email = s.admin_id AND a.status = 'active'
     LEFT JOIN agent_types t ON t.key = a.agent_type
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
       AND (a.id IS NOT NULL OR s.admin_id = $2)`,
    [hashToken(token), process.env.ADMIN_LOGIN_ID || ""],
  );
  return rows[0] ?? null;
};

export const extendAdminSession = async (token: string) => {
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
  const { rowCount } = await pool.query(
    `UPDATE admin_sessions SET expires_at = $2
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hashToken(token), expiresAt],
  );
  return rowCount ? expiresAt : null;
};

export const revokeAdminSession = async (token: string) => {
  await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)]);
};

const deriveAdminSecret = (secret: string, salt: string) => scryptSync(secret, salt, 64).toString("hex");

export const authenticateDatabaseAdmin = async (email: string, password: string, pin: string) => {
  const { rows } = await pool.query<{
    email: string;
    password_salt: string;
    password_hash: string;
    pin_salt: string;
    pin_hash: string;
    role: AdminRole;
  }>(
    `SELECT email, password_salt, password_hash, pin_salt, pin_hash, role
     FROM admin_accounts WHERE email = $1 AND status = 'active'`,
    [email.toLowerCase()],
  );
  const account = rows[0];
  if (!account) return null;
  const passwordCandidate = Buffer.from(deriveAdminSecret(password, account.password_salt), "hex");
  const pinCandidate = Buffer.from(deriveAdminSecret(pin, account.pin_salt), "hex");
  const passwordHash = Buffer.from(account.password_hash, "hex");
  const pinHash = Buffer.from(account.pin_hash, "hex");
  if (passwordCandidate.length !== passwordHash.length || pinCandidate.length !== pinHash.length ||
      !timingSafeEqual(passwordCandidate, passwordHash) || !timingSafeEqual(pinCandidate, pinHash)) return null;
  return { adminId: account.email, role: account.role };
};

export const createAdminInvitation = async ({
  email,
  fullName,
  role,
  invitedBy,
  parentEmail,
}: {
  email: string;
  fullName: string;
  role: Exclude<AdminRole, "owner">;
  invitedBy: string;
  parentEmail?: string | null;
}) => {
  const token = randomBytes(32).toString("hex");
  const { rows } = await pool.query<{ email: string }>(
    `INSERT INTO admin_accounts (email, full_name, role, status, invitation_token_hash, invitation_expires_at, invited_by, parent_email)
     VALUES ($1, $2, $3, 'invited', $4, NOW() + INTERVAL '48 hours', $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       invitation_token_hash = EXCLUDED.invitation_token_hash,
       invitation_expires_at = EXCLUDED.invitation_expires_at,
       invited_by = EXCLUDED.invited_by,
       parent_email = EXCLUDED.parent_email,
       updated_at = NOW()
     WHERE admin_accounts.status = 'invited' AND admin_accounts.invitation_expires_at <= NOW()
     RETURNING email`,
    [email.toLowerCase(), fullName, role, hashToken(token), invitedBy, parentEmail ?? null],
  );
  if (!rows[0]) throw new Error("An active, unexpired, or previously accepted admin invitation already exists for this email.");
  return { ...rows[0], token };
};

export const acceptAdminInvitation = async ({ token, password, pin }: { token: string; password: string; pin: string }) => {
  const passwordSalt = randomBytes(16).toString("hex");
  const pinSalt = randomBytes(16).toString("hex");
  const { rows } = await pool.query<{ email: string; role: AdminRole }>(
    `UPDATE admin_accounts SET status = 'active', password_salt = $2, password_hash = $3,
       pin_salt = $4, pin_hash = $5, invitation_token_hash = NULL, invitation_expires_at = NULL, updated_at = NOW()
     WHERE invitation_token_hash = $1 AND status = 'invited' AND invitation_expires_at > NOW()
     RETURNING email, role`,
    [hashToken(token), passwordSalt, deriveAdminSecret(password, passwordSalt), pinSalt, deriveAdminSecret(pin, pinSalt)],
  );
  return rows[0] ?? null;
};

export const listAdminAccounts = async () => {
  const { rows } = await pool.query<{
    email: string; full_name: string; role: Exclude<AdminRole, "owner">; status: string; created_at: string;
    parent_email: string | null; permissions: string[] | null; customer_scope: CustomerScope; agent_type: string | null;
  }>(
    `SELECT email, full_name, role, status, created_at, parent_email, permissions, customer_scope, agent_type FROM admin_accounts WHERE is_primary = FALSE ORDER BY created_at DESC LIMIT 200`,
  );
  return rows;
};

// The primary owner lives in ADMIN_* environment variables until it is first edited from the admin team page.
export const getPrimaryAdminRow = async () => {
  const { rows } = await pool.query<{ email: string }>(`SELECT email FROM admin_accounts WHERE is_primary = TRUE LIMIT 1`);
  return rows[0] ?? null;
};

export const getPrimaryAdminEmail = async () => (await getPrimaryAdminRow())?.email ?? (process.env.ADMIN_LOGIN_ID || "").toLowerCase();

export const createPrimaryAdmin = async ({ previousEmail, email, password, pin }: {
  previousEmail: string; email: string; password: string; pin: string;
}) => {
  const passwordSalt = randomBytes(16).toString("hex");
  const pinSalt = randomBytes(16).toString("hex");
  await pool.query(
    `INSERT INTO admin_accounts (email, full_name, role, status, is_primary, password_salt, password_hash, pin_salt, pin_hash, invited_by)
     VALUES ($1, 'Primary admin', 'owner', 'active', TRUE, $2, $3, $4, $5, 'system')`,
    [email.toLowerCase(), passwordSalt, deriveAdminSecret(password, passwordSalt), pinSalt, deriveAdminSecret(pin, pinSalt)],
  );
  await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL`, [previousEmail.toLowerCase()]);
};

// Updates only the fields provided. Setting both a password and a PIN activates an invited account.
export const updateAdminCredentials = async ({ email, newEmail, password, pin }: {
  email: string; newEmail?: string; password?: string; pin?: string;
}) => {
  const passwordSalt = password ? randomBytes(16).toString("hex") : null;
  const pinSalt = pin ? randomBytes(16).toString("hex") : null;
  const { rows } = await pool.query<{ email: string }>(
    `UPDATE admin_accounts SET
       email = COALESCE($2, email),
       password_salt = COALESCE($3, password_salt),
       password_hash = COALESCE($4, password_hash),
       pin_salt = COALESCE($5, pin_salt),
       pin_hash = COALESCE($6, pin_hash),
       status = CASE WHEN status = 'invited' AND COALESCE($4, password_hash) IS NOT NULL AND COALESCE($6, pin_hash) IS NOT NULL
                     THEN 'active' ELSE status END,
       invitation_token_hash = CASE WHEN status = 'invited' AND COALESCE($4, password_hash) IS NOT NULL AND COALESCE($6, pin_hash) IS NOT NULL
                     THEN NULL ELSE invitation_token_hash END,
       invitation_expires_at = CASE WHEN status = 'invited' AND COALESCE($4, password_hash) IS NOT NULL AND COALESCE($6, pin_hash) IS NOT NULL
                     THEN NULL ELSE invitation_expires_at END,
       updated_at = NOW()
     WHERE email = $1 AND status IN ('invited', 'active', 'disabled')
     RETURNING email`,
    [
      email.toLowerCase(), newEmail?.toLowerCase() ?? null,
      passwordSalt, passwordSalt && password ? deriveAdminSecret(password, passwordSalt) : null,
      pinSalt, pinSalt && pin ? deriveAdminSecret(pin, pinSalt) : null,
    ],
  );
  if (!rows[0]) return null;
  await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL`, [email.toLowerCase()]);
  return rows[0];
};

export const setAdminAccountStatus = async (email: string, status: "active" | "disabled") => {
  const { rowCount } = await pool.query(
    `UPDATE admin_accounts SET status = $2, updated_at = NOW() WHERE email = $1 AND status IN ('active', 'disabled')`,
    [email.toLowerCase(), status],
  );
  if (rowCount) await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL`, [email.toLowerCase()]);
  return (rowCount ?? 0) > 0;
};

export type PartnerRole = Extract<AdminRole, "partner" | "agent">;

export type CustomerScope = "all" | "assigned";

// Owner-only change of a non-primary account's role, permissions, customer scope and (for agents) parent partner.
export const updateAdminAccess = async (email: string, access: {
  role: Exclude<AdminRole, "owner">; permissions: string[] | null; customerScope: CustomerScope; parentEmail: string | null;
}) => {
  const { rows } = await pool.query<{ email: string; role: AdminRole }>(
    `UPDATE admin_accounts SET role = $2, permissions = $3, customer_scope = $4, parent_email = $5, updated_at = NOW()
     WHERE email = $1 AND is_primary = FALSE
       AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM admin_accounts p WHERE p.email = $5 AND p.role = 'partner'))
     RETURNING email, role`,
    [email.toLowerCase(), access.role, access.permissions, access.customerScope, access.parentEmail],
  );
  return rows[0] ?? null;
};

export const getAdminAccount = async (email: string) => {
  const { rows } = await pool.query<{
    email: string; full_name: string; role: AdminRole; status: string; parent_email: string | null;
    permissions: string[] | null; customer_scope: CustomerScope; is_primary: boolean;
  }>(
    `SELECT email, full_name, role, status, parent_email, permissions, customer_scope, is_primary FROM admin_accounts WHERE email = $1`,
    [email.toLowerCase()],
  );
  return rows[0] ?? null;
};

// Account emails whose customers this login may see; null means every customer.
export const customerScopeOwners = async (adminEmail: string, role: AdminRole, customerScope: CustomerScope): Promise<string[] | null> => {
  const email = adminEmail.toLowerCase();
  if (role === "owner") return null;
  if (role === "partner") {
    const { rows } = await pool.query<{ email: string }>(
      `SELECT email FROM admin_accounts WHERE parent_email = $1 AND role = 'agent'`, [email],
    );
    return [email, ...rows.map((row) => row.email)];
  }
  if (role === "agent") return [email];
  return customerScope === "assigned" ? [email] : null;
};

// SQL condition limiting users (alias u) to the scope owners passed as parameter $index.
export const customerScopeCondition = (index: number) =>
  `(u.id IN (SELECT user_id FROM customer_assignments WHERE owner_email = ANY($${index}::text[]))
    OR u.id IN (SELECT user_id FROM staff_customer_assignments WHERE admin_email = ANY($${index}::text[])))`;

export const isCustomerInScope = async (userId: string, owners: string[] | null) => {
  if (!owners) return true;
  const { rows } = await pool.query(`SELECT 1 FROM users u WHERE u.id = $1 AND ${customerScopeCondition(2)}`, [userId, owners]);
  return rows.length > 0;
};

export const assignCustomerToStaff = async ({ userId, adminEmail, assignedBy }: { userId: string; adminEmail: string; assignedBy: string }) => {
  const { rowCount } = await pool.query(
    `INSERT INTO staff_customer_assignments (user_id, admin_email, assigned_by)
     SELECT u.id, a.email, $3 FROM users u, admin_accounts a
     WHERE u.id = $1 AND u.role = 'customer' AND a.email = $2 AND a.role IN ('manager', 'support', 'analyst') AND a.status = 'active'
     ON CONFLICT (user_id, admin_email) DO NOTHING`,
    [userId, adminEmail.toLowerCase(), assignedBy],
  );
  return (rowCount ?? 0) > 0;
};

export const unassignCustomerFromStaff = async (userId: string, adminEmail: string) => {
  const { rowCount } = await pool.query(
    `DELETE FROM staff_customer_assignments WHERE user_id = $1 AND admin_email = $2`, [userId, adminEmail.toLowerCase()],
  );
  return (rowCount ?? 0) > 0;
};

export const listStaffAssignments = async (userId: string) => {
  const { rows } = await pool.query<{ admin_email: string; full_name: string | null; role: string | null; created_at: string }>(
    `SELECT s.admin_email, a.full_name, a.role, s.created_at FROM staff_customer_assignments s
     LEFT JOIN admin_accounts a ON a.email = s.admin_email WHERE s.user_id = $1 ORDER BY s.created_at`,
    [userId],
  );
  return rows;
};

// Partner-side agent management: every query is pinned to the partner's own agents.
export const listPartnerAgents = async (partnerEmail: string) => {
  const { rows } = await pool.query<{
    email: string; full_name: string; status: string; created_at: string; assigned_customers: string;
    interactions_30d: string; last_interaction: string | null;
  }>(
    `SELECT a.email, a.full_name, a.status, a.created_at,
       (SELECT COUNT(*) FROM customer_assignments ca WHERE ca.owner_email = a.email) AS assigned_customers,
       (SELECT COUNT(*) FROM customer_interactions ci WHERE ci.actor_email = a.email AND ci.created_at > NOW() - INTERVAL '30 days') AS interactions_30d,
       (SELECT MAX(ci.created_at) FROM customer_interactions ci WHERE ci.actor_email = a.email) AS last_interaction
     FROM admin_accounts a WHERE a.parent_email = $1 AND a.role = 'agent' ORDER BY a.created_at DESC`,
    [partnerEmail.toLowerCase()],
  );
  return rows.map((row) => ({ ...row, assigned_customers: Number(row.assigned_customers), interactions_30d: Number(row.interactions_30d) }));
};

export const setPartnerAgentStatus = async (partnerEmail: string, agentEmail: string, status: "active" | "disabled") => {
  const { rowCount } = await pool.query(
    `UPDATE admin_accounts SET status = $3, updated_at = NOW()
     WHERE email = $2 AND parent_email = $1 AND role = 'agent' AND status IN ('active', 'disabled')`,
    [partnerEmail.toLowerCase(), agentEmail.toLowerCase(), status],
  );
  if (rowCount) await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL`, [agentEmail.toLowerCase()]);
  return (rowCount ?? 0) > 0;
};

// Moves one of the partner's customers to one of the partner's active agents, or back to the partner (agentEmail null).
export const assignPartnerCustomer = async ({ partnerEmail, userId, agentEmail }: { partnerEmail: string; userId: string; agentEmail: string | null }) => {
  const partner = partnerEmail.toLowerCase();
  const target = agentEmail ? agentEmail.toLowerCase() : partner;
  const { rowCount } = await pool.query(
    `UPDATE customer_assignments ca SET owner_email = $3, assigned_by = $1, created_at = NOW()
     WHERE ca.user_id = $2
       AND (ca.owner_email = $1 OR ca.owner_email IN (SELECT email FROM admin_accounts WHERE parent_email = $1 AND role = 'agent'))
       AND ($3 = $1 OR EXISTS (SELECT 1 FROM admin_accounts a WHERE a.email = $3 AND a.parent_email = $1 AND a.role = 'agent' AND a.status = 'active'))`,
    [partner, userId, target],
  );
  return (rowCount ?? 0) > 0;
};

export const INTERACTION_CHANNELS = ["call", "whatsapp", "email", "visit", "note"] as const;
export const INTERACTION_OUTCOMES = ["contacted", "not_reachable", "interested", "not_interested", "follow_up", "documents_pending", "converted"] as const;

export const addCustomerInteraction = async (input: {
  userId: string; actorEmail: string; actorRole: AdminRole; channel: (typeof INTERACTION_CHANNELS)[number];
  outcome: (typeof INTERACTION_OUTCOMES)[number]; note: string; nextFollowUpAt: string | null;
}) => {
  const { rows } = await pool.query(
    `INSERT INTO customer_interactions (user_id, actor_email, actor_role, channel, outcome, note, next_follow_up_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, actor_email, actor_role, channel, outcome, note, next_follow_up_at, created_at`,
    [input.userId, input.actorEmail.toLowerCase(), input.actorRole, input.channel, input.outcome, input.note, input.nextFollowUpAt],
  );
  return rows[0];
};

// Interactions for customers inside the caller's scope; optionally one customer.
export const listCustomerInteractions = async (owners: string[] | null, userId: string | null) => {
  const values: unknown[] = [];
  const conditions = ["TRUE"];
  if (owners) { values.push(owners); conditions.push(customerScopeCondition(values.length)); }
  if (userId) { values.push(userId); conditions.push(`u.id = $${values.length}`); }
  const { rows } = await pool.query(
    `SELECT ci.id, ci.user_id, COALESCE(NULLIF(TRIM(k.name_as_per_pan), ''), u.full_name) AS customer_name,
            ci.actor_email, ci.actor_role, ci.channel, ci.outcome, ci.note, ci.next_follow_up_at, ci.created_at
     FROM customer_interactions ci JOIN users u ON u.id = ci.user_id LEFT JOIN kyc_profiles k ON k.user_id = u.id
     WHERE ${conditions.join(" AND ")} ORDER BY ci.created_at DESC LIMIT 200`,
    values,
  );
  return rows;
};

// Activity is best-effort: a failed audit write must never fail the business action that triggered it.
export const recordPartnerActivity = async ({ actorEmail, actorRole, event, targetEmail = null, details = {} }: {
  actorEmail: string;
  actorRole: string;
  event: string;
  targetEmail?: string | null;
  details?: Record<string, unknown>;
}) => {
  try {
    const { rows } = await pool.query<PartnerActivityEvent>(
      `INSERT INTO partner_activity (actor_email, actor_role, event, target_email, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, actor_email, actor_role, event, target_email, details, created_at`,
      [actorEmail.toLowerCase(), actorRole, event, targetEmail?.toLowerCase() ?? null, JSON.stringify(details)],
    );
    partnerEvents.emit(PARTNER_ACTIVITY_CHANNEL, rows[0]);
  } catch (error) {
    console.error("Partner activity write failed", error);
  }
};

// Partners see events they performed or that concern them. Owner and manager pass no email to see everything.
export const listPartnerActivity = async (email?: string, limit = 100) => {
  const { rows } = await pool.query<PartnerActivityEvent>(
    `SELECT id, actor_email, actor_role, event, target_email, details, created_at
     FROM partner_activity
     WHERE $1::text IS NULL OR actor_email = $1 OR target_email = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [email ? email.toLowerCase() : null, Math.min(Math.max(limit, 1), 200)],
  );
  return rows;
};

// Used only for owner/manager monitoring. Partner-facing views must not call this.
export const listCustomerNames = async (userIds: string[]) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map<string, string>();
  const { rows } = await pool.query<{ id: string; full_name: string }>(
    `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name
     FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id
     WHERE u.id = ANY($1::uuid[])`,
    [ids],
  );
  return new Map(rows.map((row) => [row.id, row.full_name]));
};

// Owner-only overview. Partners see their direct customers plus customers of their agents.
export const listPartnerAccounts = async () => {
  const { rows } = await pool.query<{
    email: string; full_name: string; role: PartnerRole; status: string; parent_email: string | null;
    created_at: string; assigned_customers: string; completed_reports: string; agent_count: string;
    pending_paise: string; paid_paise: string; payout_ready: boolean;
    last_login: string | null; signed_in: boolean; last_activity: string | null;
  }>(`
    SELECT a.email, a.full_name, a.role, a.status, a.parent_email, a.created_at,
      (SELECT COUNT(*) FROM customer_assignments ca WHERE ca.owner_email = a.email) AS assigned_customers,
      (SELECT COUNT(DISTINCT r.id) FROM customer_assignments ca
         JOIN credit_report_requests r ON r.user_id = ca.user_id AND r.payment_id IS NOT NULL AND r.status = 'completed'
       WHERE ca.owner_email = a.email) AS completed_reports,
      (SELECT COUNT(*) FROM admin_accounts c WHERE c.parent_email = a.email AND c.role = 'agent') AS agent_count,
      (SELECT COALESCE(SUM(pc.amount_paise), 0) FROM partner_commissions pc WHERE pc.payee_email = a.email AND pc.status = 'pending') AS pending_paise,
      (SELECT COALESCE(SUM(pc.amount_paise), 0) FROM partner_commissions pc WHERE pc.payee_email = a.email AND pc.status = 'paid') AS paid_paise,
      EXISTS (SELECT 1 FROM partner_payout_profiles p WHERE p.email = a.email AND (p.upi_id IS NOT NULL OR (p.bank_account_number IS NOT NULL AND p.ifsc IS NOT NULL))) AS payout_ready,
      (SELECT MAX(s.created_at) FROM admin_sessions s WHERE s.admin_id = a.email) AS last_login,
      EXISTS (SELECT 1 FROM admin_sessions s WHERE s.admin_id = a.email AND s.revoked_at IS NULL AND s.expires_at > NOW()) AS signed_in,
      (SELECT MAX(pa.created_at) FROM partner_activity pa WHERE pa.actor_email = a.email) AS last_activity
    FROM admin_accounts a
    WHERE a.role IN ('partner', 'agent')
    ORDER BY a.role, a.created_at DESC
  `);
  return rows;
};

// Role is always taken from the verified admin session or owner-selected account, never from request input.
const portalOwnerScope = (role: PartnerRole) => role === "partner"
  ? `(ca.owner_email = $1 OR ca.owner_email IN (SELECT email FROM admin_accounts WHERE parent_email = $1 AND role = 'agent'))`
  : `ca.owner_email = $1`;

export const getPortalCustomers = async (email: string, role: PartnerRole) => {
  const { rows } = await pool.query<{
    id: string; full_name: string; owner_email: string; assigned_at: string; created_at: string;
    latest_report_status: string | null; paid: boolean; application_status: string | null; customer_remark: string | null;
    application_timeline: Array<{ status: string | null; remark: string | null; created_at: string }> | null;
  }>(`
    SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, ca.owner_email, ca.created_at AS assigned_at, u.created_at,
      p.application_status, p.customer_remark,
      (SELECT json_agg(json_build_object(
          'status', e.application_status, 'remark', e.remark, 'created_at', e.created_at
        ) ORDER BY e.created_at ASC)
       FROM crm_application_events e WHERE e.user_id = u.id AND e.visibility = 'customer') AS application_timeline,
      (SELECT r.status FROM credit_report_requests r WHERE r.user_id = u.id AND r.payment_id IS NOT NULL
       ORDER BY r.requested_at DESC LIMIT 1) AS latest_report_status,
      EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'paid') AS paid
    FROM customer_assignments ca
    JOIN users u ON u.id = ca.user_id
    LEFT JOIN kyc_profiles k ON k.user_id = u.id
    LEFT JOIN crm_customer_profiles p ON p.user_id = u.id
    WHERE ${portalOwnerScope(role)}
    ORDER BY ca.created_at DESC
    LIMIT 200
  `, [email.toLowerCase()]);
  return rows;
};

export const getPortalEarnings = async (email: string) => {
  const { rows } = await pool.query<{ pending_paise: string; paid_paise: string }>(
    `SELECT COALESCE(SUM(amount_paise) FILTER (WHERE status = 'pending'), 0) AS pending_paise,
            COALESCE(SUM(amount_paise) FILTER (WHERE status = 'paid'), 0) AS paid_paise
     FROM partner_commissions WHERE payee_email = $1`,
    [email.toLowerCase()],
  );
  return rows[0];
};

export const listCommissions = async (payeeEmail?: string) => {
  const { rows } = await pool.query<{
    id: string; payee_email: string; user_id: string | null; amount_paise: number; status: string;
    note: string | null; created_by: string; created_at: string; paid_at: string | null; razorpay_payout_id: string | null;
  }>(
    `SELECT id, payee_email, user_id, amount_paise, status, note, created_by, created_at, paid_at, razorpay_payout_id
     FROM partner_commissions WHERE ($1::text IS NULL OR payee_email = $1)
     ORDER BY created_at DESC LIMIT 200`,
    [payeeEmail?.toLowerCase() ?? null],
  );
  return rows;
};

export const createCommission = async ({
  payeeEmail, userId, amountPaise, note, createdBy,
}: { payeeEmail: string; userId: string | null; amountPaise: number; note: string | null; createdBy: string }) => {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO partner_commissions (payee_email, user_id, amount_paise, note, created_by)
     SELECT a.email, $2, $3, $4, $5 FROM admin_accounts a
     WHERE a.email = $1 AND a.role IN ('partner', 'agent') AND a.status = 'active'
       AND ($2::uuid IS NULL OR EXISTS (SELECT 1 FROM users u WHERE u.id = $2 AND u.role = 'customer'))
     RETURNING id`,
    [payeeEmail.toLowerCase(), userId, amountPaise, note, createdBy],
  );
  return rows[0] ?? null;
};

export const markCommissionPaid = async (id: string) => {
  const { rowCount } = await pool.query(
    `UPDATE partner_commissions SET status = 'paid', paid_at = NOW() WHERE id = $1 AND status = 'pending'`,
    [id],
  );
  return (rowCount ?? 0) > 0;
};

export type PayoutProfile = {
  email: string; full_name: string; upi_id: string | null; bank_account_number: string | null; ifsc: string | null;
  razorpay_contact_id: string | null; razorpay_vpa_fund_account_id: string | null; razorpay_bank_fund_account_id: string | null;
  updated_at: string;
};

export const getPayoutProfile = async (email: string) => {
  const { rows } = await pool.query<PayoutProfile>(`SELECT * FROM partner_payout_profiles WHERE email = $1`, [email.toLowerCase()]);
  return rows[0] ?? null;
};

// Changing UPI or bank details clears the matching RazorpayX fund account so a new one is created on the next payout.
export const savePayoutProfile = async ({ email, fullName, upiId, bankAccountNumber, ifsc }: {
  email: string; fullName: string; upiId: string | null; bankAccountNumber: string | null; ifsc: string | null;
}) => {
  await pool.query(
    `INSERT INTO partner_payout_profiles (email, full_name, upi_id, bank_account_number, ifsc)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       razorpay_vpa_fund_account_id = CASE WHEN partner_payout_profiles.upi_id IS DISTINCT FROM EXCLUDED.upi_id
         THEN NULL ELSE partner_payout_profiles.razorpay_vpa_fund_account_id END,
       razorpay_bank_fund_account_id = CASE WHEN partner_payout_profiles.bank_account_number IS DISTINCT FROM EXCLUDED.bank_account_number
         OR partner_payout_profiles.ifsc IS DISTINCT FROM EXCLUDED.ifsc THEN NULL ELSE partner_payout_profiles.razorpay_bank_fund_account_id END,
       upi_id = EXCLUDED.upi_id,
       bank_account_number = EXCLUDED.bank_account_number,
       ifsc = EXCLUDED.ifsc,
       updated_at = NOW()`,
    [email.toLowerCase(), fullName, upiId, bankAccountNumber, ifsc],
  );
};

export const setPayoutRazorpayIds = async (email: string, ids: { contactId?: string; vpaFundAccountId?: string; bankFundAccountId?: string }) => {
  await pool.query(
    `UPDATE partner_payout_profiles SET
       razorpay_contact_id = COALESCE($2, razorpay_contact_id),
       razorpay_vpa_fund_account_id = COALESCE($3, razorpay_vpa_fund_account_id),
       razorpay_bank_fund_account_id = COALESCE($4, razorpay_bank_fund_account_id)
     WHERE email = $1`,
    [email.toLowerCase(), ids.contactId ?? null, ids.vpaFundAccountId ?? null, ids.bankFundAccountId ?? null],
  );
};

export const getPendingCommissions = async (email: string) => {
  const { rows } = await pool.query<{ id: string; amount_paise: number }>(
    `SELECT id, amount_paise FROM partner_commissions WHERE payee_email = $1 AND status = 'pending' ORDER BY created_at`,
    [email.toLowerCase()],
  );
  return rows;
};

export const markCommissionsPaidWithPayout = async (ids: string[], payoutId: string) => {
  await pool.query(
    `UPDATE partner_commissions SET status = 'paid', paid_at = NOW(), razorpay_payout_id = $2
     WHERE id = ANY($1::uuid[]) AND status = 'pending'`,
    [ids, payoutId],
  );
};

export const assignCustomerToOwner = async ({ userId, ownerEmail, assignedBy }: { userId: string; ownerEmail: string; assignedBy: string }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const customer = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'customer' FOR UPDATE`,
      [userId],
    );
    if (!customer.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    const { rowCount } = await client.query(
      `INSERT INTO customer_assignments (user_id, owner_email, assigned_by)
       SELECT $1, a.email, $3 FROM admin_accounts a
       WHERE a.email = $2 AND a.role IN ('partner', 'agent') AND a.status = 'active'
       ON CONFLICT (user_id) DO UPDATE SET owner_email = EXCLUDED.owner_email, assigned_by = EXCLUDED.assigned_by, created_at = NOW()`,
      [userId, ownerEmail.toLowerCase(), assignedBy],
    );
    await client.query("COMMIT");
    return (rowCount ?? 0) > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const unassignCustomer = async (userId: string) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const customer = await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    if (!customer.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    const { rowCount } = await client.query(`DELETE FROM customer_assignments WHERE user_id = $1`, [userId]);
    await client.query("COMMIT");
    return (rowCount ?? 0) > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const createAdminReportAudit = async ({
  adminId,
  bureau,
  panLast4,
  mobileLast4,
  consentIpAddress,
  applicant,
}: {
  adminId: string;
  bureau: Bureau;
  panLast4: string;
  mobileLast4: string;
  consentIpAddress: string;
  applicant: Applicant;
}) => {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO admin_report_audit
       (admin_id, bureau, pan_last4, pan_hash, mobile_last4, consent_granted, consent_text_version, consent_ip_address, status, applicant_details)
     VALUES ($1, $2, $3, $4, $5, TRUE, 'admin-client-consent-v1', $6, 'processing', $7)
     RETURNING id`,
    [adminId, bureau, panLast4, createHash("sha256").update(applicant.pan.toUpperCase()).digest("hex"),
      mobileLast4, consentIpAddress, JSON.stringify({ ...applicant, pan: undefined })],
  );
  return rows[0].id;
};

export const completeAdminReportAudit = async ({
  auditId,
  status,
  providerTransactionId,
  creditScore,
  failureReason,
  providerResponse,
  normalizedReport,
}: {
  auditId: number;
  status: "completed" | "failed";
  providerTransactionId: string | null;
  creditScore: number | null;
  failureReason: string | null;
  providerResponse?: unknown | null;
  normalizedReport?: NormalizedReport | null;
}) => {
  await pool.query(
    `UPDATE admin_report_audit SET status = $2, provider_transaction_id = $3, credit_score = $4,
       failure_reason = $5, provider_response = $6, normalized_report = $7, completed_at = NOW()
     WHERE id = $1`,
    [auditId, status, providerTransactionId, creditScore, failureReason?.slice(0, 500) ?? null,
      providerResponse == null ? null : JSON.stringify(providerResponse),
      normalizedReport == null ? null : JSON.stringify(normalizedReport)],
  );
};

export const getAdminReportDocument = async (auditId: number) => {
  const { rows } = await pool.query<{
    id: number;
    bureau: Bureau;
    report_date: string;
    normalized_report: NormalizedReport | null;
    report_pdf: Buffer | null;
    report_pdf_source: string | null;
    report_html: string | null;
    provider_response: unknown;
  }>(
    `SELECT id, bureau, to_char(COALESCE(completed_at, created_at), 'YYYY-MM-DD') AS report_date, normalized_report, report_pdf, report_pdf_source, report_html,
            CASE WHEN report_pdf IS NULL OR bureau = 'cibil' THEN provider_response END AS provider_response
     FROM admin_report_audit
     WHERE id = $1 AND status = 'completed' AND normalized_report IS NOT NULL`,
    [auditId],
  );
  const row = rows[0];
  return row ? {
    id: row.id,
    bureau: row.bureau,
    reportDate: row.report_date,
    report: row.normalized_report!,
    pdf: row.report_pdf,
    pdfSource: row.report_pdf_source,
    html: row.report_html,
    raw: row.provider_response,
  } : null;
};

export type AdminActivityFilters = {
  q?: string; paymentStatus?: string; reportStatus?: string; bureau?: string; from?: string; to?: string;
};

const activityPaymentFilter = (filters: AdminActivityFilters) => {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (sql: (index: number) => string, value: unknown) => { values.push(value); clauses.push(sql(values.length)); };
  if (filters.q?.trim()) add((i) => `(${CUSTOMER_DISPLAY_NAME} ILIKE $${i} OR u.mobile ILIKE $${i} OR COALESCE(u.email, '') ILIKE $${i})`, `%${filters.q.trim()}%`);
  if (filters.paymentStatus === "paid") clauses.push(`p.status = 'paid'`);
  if (filters.paymentStatus === "failed") clauses.push(`(p.status = 'failed' OR (p.status = 'created' AND p.failure_reason IS NOT NULL))`);
  if (filters.paymentStatus === "pending") clauses.push(`(p.status = 'created' AND p.failure_reason IS NULL)`);
  if (filters.reportStatus === "none") clauses.push(`r.id IS NULL`);
  else if (["completed", "failed", "processing"].includes(filters.reportStatus || "")) add((i) => `r.status = $${i}`, filters.reportStatus);
  if (filters.bureau && /^[a-z]+$/.test(filters.bureau)) add((i) => `p.report_bureau = $${i}`, filters.bureau);
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) add((i) => `p.created_at >= $${i}::date`, filters.from);
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) add((i) => `p.created_at < $${i}::date + INTERVAL '1 day'`, filters.to);
  return { where: clauses.length ? clauses.join(" AND ") : "TRUE", values };
};

const ACTIVITY_PAYMENT_FROM = `FROM payments p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN kyc_profiles k ON k.user_id = u.id
      LEFT JOIN credit_report_requests r ON r.payment_id = p.id`;

export const exportAdminActivity = async (filters: AdminActivityFilters) => {
  const { where, values } = activityPaymentFilter(filters);
  const { rows } = await pool.query<{
    payment_id: string; customer: string; mobile_last4: string; bureau: string | null; payment_status: string;
    gateway: string; amount: string; report_status: string | null; failure_reason: string | null; created_at: string;
  }>(
    `SELECT p.id AS payment_id, ${CUSTOMER_DISPLAY_NAME} AS customer, RIGHT(u.mobile, 4) AS mobile_last4, p.report_bureau AS bureau,
            p.status AS payment_status, p.gateway, (p.amount + p.gst_amount)::text AS amount, r.status AS report_status,
            COALESCE(r.failure_reason, p.failure_reason) AS failure_reason, p.created_at
     ${ACTIVITY_PAYMENT_FROM}
     WHERE ${where}
     ORDER BY p.created_at DESC LIMIT 5000`,
    values,
  );
  return rows;
};

export const getAdminActivity = async (requestedPage = 1, filters: AdminActivityFilters = {}) => {
  const paymentFilter = activityPaymentFilter(filters);
  const pageSize = 50;
  const page = Math.max(1, Math.floor(requestedPage));
  const [summaryResult, paymentResult, filteredCount, reportResult] = await Promise.all([
    pool.query<{
      total_users: string;
      paid_payments: string;
      payment_revenue: string;
      failed_payments: string;
      report_requests: string;
      failed_report_requests: string;
      total_payments: string;
      total_admin_reports: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM payments WHERE status = 'paid') AS paid_payments,
        (SELECT COALESCE(SUM(amount + gst_amount), 0) FROM payments WHERE status = 'paid') AS payment_revenue,
        (SELECT COUNT(*) FROM payments WHERE status = 'failed' OR (status = 'created' AND failure_reason IS NOT NULL)) AS failed_payments,
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL) AS report_requests,
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'failed') AS failed_report_requests,
        (SELECT COUNT(*) FROM payments) AS total_payments,
        (SELECT COUNT(*) FROM admin_report_audit) AS total_admin_reports
    `),
    pool.query<{
      id: string;
      full_name: string;
      mobile_last4: string;
      bureau: Bureau | null;
      amount: string;
      gst_amount: string;
      gateway: string;
      status: string;
      failure_reason: string | null;
      created_at: string;
      paid_at: string | null;
      failure_at: string | null;
      report_request_id: string | null;
      report_status: string | null;
      report_failure_reason: string | null;
    }>(`
      SELECT p.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, RIGHT(u.mobile, 4) AS mobile_last4, p.report_bureau AS bureau,
             p.amount, p.gst_amount, p.gateway, p.status, p.failure_reason, p.created_at, p.paid_at, p.failure_at,
             r.id AS report_request_id, r.status AS report_status, r.failure_reason AS report_failure_reason
      ${ACTIVITY_PAYMENT_FROM}
      WHERE ${paymentFilter.where}
      ORDER BY p.created_at DESC
      LIMIT $${paymentFilter.values.length + 1} OFFSET $${paymentFilter.values.length + 2}
    `, [...paymentFilter.values, pageSize, (page - 1) * pageSize]),
    pool.query<{ count: string }>(`SELECT COUNT(*) AS count ${ACTIVITY_PAYMENT_FROM} WHERE ${paymentFilter.where}`, paymentFilter.values),
    pool.query<{
      id: string;
      full_name: string | null;
      mobile_last4: string;
      bureau: Bureau;
      status: string;
      credit_score: number | null;
      failure_reason: string | null;
      admin_id: string;
      created_at: string;
      completed_at: string | null;
    }>(`
      SELECT id, applicant_details->>'fullName' AS full_name, mobile_last4, bureau, status,
             credit_score, failure_reason, admin_id, created_at, completed_at
      FROM admin_report_audit
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [pageSize, (page - 1) * pageSize]),
  ]);
  const summary = summaryResult.rows[0];
  return {
    summary: {
      totalUsers: Number(summary.total_users),
      paidPayments: Number(summary.paid_payments),
      paymentRevenue: Number(summary.payment_revenue),
      failedPayments: Number(summary.failed_payments),
      reportRequests: Number(summary.report_requests),
      failedReportRequests: Number(summary.failed_report_requests),
      totalPayments: Number(summary.total_payments),
      totalAdminReports: Number(summary.total_admin_reports),
    },
    payments: paymentResult.rows,
    adminReports: reportResult.rows,
    pagination: {
      page,
      pageSize,
      totalPayments: Number(filteredCount.rows[0]?.count ?? 0),
      totalAdminReports: Number(summary.total_admin_reports),
    },
  };
};

export const getAdminCustomers = async (search: string, requestedPage = 1, maskContact = false, scopeOwners: string[] | null = null) => {
  const pageSize = 50;
  const page = Math.max(1, Math.floor(requestedPage));
  const normalizedSearch = search.trim();
  const panSearch = /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(normalizedSearch)
    ? normalizedSearch.toUpperCase()
    : null;
  const panHash = panSearch ? createHash("sha256").update(panSearch).digest("hex") : null;
  const pattern = `%${normalizedSearch}%`;
  const searchFilter = normalizedSearch
    ? `(${CUSTOMER_DISPLAY_NAME} ILIKE $1 OR u.mobile ILIKE $2 OR COALESCE(u.email, '') ILIKE $1
        OR ($3::text IS NOT NULL AND k.pan_hash = $3))`
    : "TRUE";
  const baseValues: unknown[] = normalizedSearch ? [pattern, pattern, panHash] : [];
  const values = scopeOwners ? [...baseValues, scopeOwners] : baseValues;
  const filter = scopeOwners ? `${searchFilter} AND ${customerScopeCondition(values.length)}` : searchFilter;
  const [customers, count, manualChecks] = await Promise.all([
    pool.query<{
      id: string; full_name: string; mobile: string; email: string | null; status: string;
      created_at: string; pan_last4: string | null; kyc_status: string | null;
      total_payments: string; paid_payments: string; latest_report_status: string | null;
      last_login: string | null; journey_stage: string; profile_complete: boolean;
    }>(
      `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, u.mobile, u.email, u.status, u.created_at, k.pan_last4, k.kyc_status,
              (k.user_id IS NOT NULL) AS profile_complete,
              COUNT(DISTINCT p.id) AS total_payments,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'paid') AS paid_payments,
              (SELECT r.status FROM credit_report_requests r WHERE r.user_id = u.id AND r.payment_id IS NOT NULL
               ORDER BY r.requested_at DESC LIMIT 1) AS latest_report_status,
              (SELECT MAX(s.created_at) FROM user_sessions s WHERE s.user_id = u.id) AS last_login,
              CASE
                WHEN EXISTS (SELECT 1 FROM credit_report_requests r WHERE r.user_id = u.id AND r.payment_id IS NOT NULL AND r.status = 'completed') THEN 'Report ready'
                WHEN EXISTS (SELECT 1 FROM payments p2 WHERE p2.user_id = u.id AND p2.status = 'paid') THEN 'Payment complete'
                WHEN EXISTS (SELECT 1 FROM payments p2 WHERE p2.user_id = u.id) THEN 'Payment started'
                WHEN k.user_id IS NOT NULL THEN 'Profile complete'
                WHEN EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = u.id) THEN 'Signed in'
                ELSE 'Account created'
              END AS journey_stage
       FROM users u
       LEFT JOIN kyc_profiles k ON k.user_id = u.id
       LEFT JOIN payments p ON p.user_id = u.id
       WHERE ${filter}
       GROUP BY u.id, k.user_id, k.pan_last4, k.kyc_status, k.name_as_per_pan
       ORDER BY u.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT u.id) AS count FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id WHERE ${filter}`,
      values,
    ),
    panSearch && !scopeOwners
      ? pool.query<{
        id: string; full_name: string | null; bureau: Bureau; status: string;
        credit_score: number | null; failure_reason: string | null; mobile_last4: string;
        admin_id: string; created_at: string; completed_at: string | null;
      }>(
        `SELECT id, applicant_details->>'fullName' AS full_name, bureau, status, credit_score,
                failure_reason, mobile_last4, admin_id, created_at, completed_at
         FROM admin_report_audit
         WHERE pan_hash = $1 OR upper(applicant_details->>'pan') = $2
         ORDER BY created_at DESC LIMIT 50`,
        [panHash, panSearch],
      )
      : Promise.resolve({ rows: [] as {
        id: string; full_name: string | null; bureau: Bureau; status: string;
        credit_score: number | null; failure_reason: string | null; mobile_last4: string;
        admin_id: string; created_at: string; completed_at: string | null;
      }[] }),
  ]);
  return {
    customers: maskContact ? customers.rows.map((row) => ({ ...row, mobile: maskMobile(row.mobile), email: maskEmail(row.email) })) : customers.rows,
    manualChecks: manualChecks.rows,
    pagination: { page, pageSize, total: Number(count.rows[0]?.count ?? 0) },
  };
};

export const getAdminAnalytics = async (requestedDays = 14) => {
  const days = [7, 14, 30, 90].includes(requestedDays) ? requestedDays : 14;
  const [summary, trend, funnel, bureaus] = await Promise.all([
    pool.query<{
      total_users: string; active_users: string; verified_profiles: string; total_payments: string;
      paid_payments: string; revenue: string; failed_payments: string; report_requests: string;
      completed_reports: string; failed_reports: string; open_tickets: string; signed_in_users: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'customer' AND status = 'active') AS active_users,
        (SELECT COUNT(DISTINCT user_id) FROM kyc_profiles) AS verified_profiles,
        (SELECT COUNT(*) FROM payments) AS total_payments,
        (SELECT COUNT(*) FROM payments WHERE status = 'paid') AS paid_payments,
        (SELECT COALESCE(SUM(amount + gst_amount), 0) FROM payments WHERE status = 'paid') AS revenue,
        (SELECT COUNT(*) FROM payments WHERE status = 'failed' OR (status = 'created' AND failure_reason IS NOT NULL)) AS failed_payments,
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL) AS report_requests,
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'completed') AS completed_reports,
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'failed') AS failed_reports,
        (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress')) AS open_tickets,
        (SELECT COUNT(DISTINCT s.user_id) FROM user_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.revoked_at IS NULL AND s.expires_at > NOW() AND u.role = 'customer' AND u.status = 'active') AS signed_in_users
    `),
    pool.query<{
      day: string; signups: string; paid_orders: string; revenue: string; failed_attempts: string;
      reports_completed: string; reports_failed: string;
    }>(`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day', CURRENT_DATE, INTERVAL '1 day')::date AS day
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
        (SELECT COUNT(*) FROM users u WHERE u.created_at >= days.day AND u.created_at < days.day + INTERVAL '1 day' AND u.role = 'customer') AS signups,
        (SELECT COUNT(*) FROM payments p WHERE p.paid_at >= days.day AND p.paid_at < days.day + INTERVAL '1 day') AS paid_orders,
        (SELECT COALESCE(SUM(p.amount + p.gst_amount), 0) FROM payments p WHERE p.paid_at >= days.day AND p.paid_at < days.day + INTERVAL '1 day') AS revenue,
        (SELECT COUNT(*) FROM payments p WHERE p.failure_at >= days.day AND p.failure_at < days.day + INTERVAL '1 day') AS failed_attempts,
        (SELECT COUNT(*) FROM credit_report_requests r WHERE r.payment_id IS NOT NULL AND r.status = 'completed'
          AND COALESCE(r.completed_at, r.requested_at) >= days.day AND COALESCE(r.completed_at, r.requested_at) < days.day + INTERVAL '1 day') AS reports_completed,
        (SELECT COUNT(*) FROM credit_report_requests r WHERE r.payment_id IS NOT NULL AND r.status = 'failed'
          AND r.requested_at >= days.day AND r.requested_at < days.day + INTERVAL '1 day') AS reports_failed
      FROM days ORDER BY days.day
    `, [days]),
    pool.query<{ signed_up: string; profile_complete: string; payment_started: string; payment_paid: string; report_ready: string }>(`
      SELECT
        COUNT(DISTINCT u.id) AS signed_up,
        COUNT(DISTINCT u.id) FILTER (WHERE k.user_id IS NOT NULL) AS profile_complete,
        COUNT(DISTINCT u.id) FILTER (WHERE p.user_id IS NOT NULL) AS payment_started,
        COUNT(DISTINCT u.id) FILTER (WHERE p.user_id IS NOT NULL AND p.status = 'paid') AS payment_paid,
        COUNT(DISTINCT u.id) FILTER (WHERE r.user_id IS NOT NULL AND r.status = 'completed') AS report_ready
      FROM users u
      LEFT JOIN kyc_profiles k ON k.user_id = u.id
      LEFT JOIN (SELECT DISTINCT user_id, status FROM payments) p ON p.user_id = u.id
      LEFT JOIN (SELECT DISTINCT user_id, status FROM credit_report_requests WHERE payment_id IS NOT NULL) r ON r.user_id = u.id
      WHERE u.role = 'customer'
    `),
    pool.query<{ bureau: string; paid_orders: string; revenue: string; completed: string; failed: string }>(`
      SELECT p.report_bureau AS bureau,
        COUNT(*) FILTER (WHERE p.status = 'paid') AS paid_orders,
        COALESCE(SUM(p.amount + p.gst_amount) FILTER (WHERE p.status = 'paid'), 0) AS revenue,
        COUNT(r.id) FILTER (WHERE r.status = 'completed') AS completed,
        COUNT(r.id) FILTER (WHERE r.status = 'failed') AS failed
      FROM payments p
      LEFT JOIN credit_report_requests r ON r.payment_id = p.id
      WHERE p.report_bureau IS NOT NULL AND p.created_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
      GROUP BY p.report_bureau ORDER BY paid_orders DESC
    `, [days]),
  ]);
  const counts = summary.rows[0];
  const steps = funnel.rows[0];
  return {
    summary: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value)])),
    trend: trend.rows.map((row) => ({
      ...row,
      signups: Number(row.signups),
      paid_orders: Number(row.paid_orders),
      revenue: Number(row.revenue),
      failed_attempts: Number(row.failed_attempts),
      reports_completed: Number(row.reports_completed),
      reports_failed: Number(row.reports_failed),
    })),
    days,
    bureaus: bureaus.rows.map((row) => ({
      bureau: row.bureau,
      paid_orders: Number(row.paid_orders),
      revenue: Number(row.revenue),
      completed: Number(row.completed),
      failed: Number(row.failed),
    })),
    funnel: [
      { step: "Account created", count: Number(steps.signed_up) },
      { step: "Profile completed", count: Number(steps.profile_complete) },
      { step: "Payment started", count: Number(steps.payment_started) },
      { step: "Payment completed", count: Number(steps.payment_paid) },
      { step: "Report ready", count: Number(steps.report_ready) },
    ],
  };
};

export const getRevenueReport = async (fromDate: string, toDate: string) => {
  const [daily, commissions] = await Promise.all([
    pool.query<{ day: string; paid_count: string; revenue: string }>(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*) AS paid_count,
              COALESCE(SUM(amount + gst_amount), 0) AS revenue
       FROM payments
       WHERE status = 'paid' AND created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
       GROUP BY created_at::date ORDER BY created_at::date`,
      [fromDate, toDate],
    ),
    pool.query<{ status: string; count: string; amount_paise: string }>(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_paise), 0) AS amount_paise
       FROM partner_commissions
       WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
       GROUP BY status`,
      [fromDate, toDate],
    ),
  ]);
  const totalRevenue = daily.rows.reduce((sum, row) => sum + Number(row.revenue), 0);
  const commissionByStatus = Object.fromEntries(commissions.rows.map((row) => [row.status, {
    count: Number(row.count),
    amountPaise: Number(row.amount_paise),
  }]));
  return {
    from: fromDate,
    to: toDate,
    totalRevenue,
    paidPayments: daily.rows.reduce((sum, row) => sum + Number(row.paid_count), 0),
    daily: daily.rows.map((row) => ({ day: row.day, paidCount: Number(row.paid_count), revenue: Number(row.revenue) })),
    commissions: {
      pending: commissionByStatus.pending ?? { count: 0, amountPaise: 0 },
      paid: commissionByStatus.paid ?? { count: 0, amountPaise: 0 },
    },
  };
};

export const listSupportTickets = async (status: string, userId: string | null = null) => {
  const allowedStatuses = ["open", "in_progress", "resolved", "closed"];
  const filterStatus = allowedStatuses.includes(status) ? status : null;
  const { rows } = await pool.query<{
    id: string; requester_name: string; requester_mobile: string; subject: string; message: string;
    status: "open" | "in_progress" | "resolved" | "closed"; priority: string; assigned_to: string | null;
    created_by: string; created_at: string; updated_at: string;
  }>(
    `SELECT id, requester_name, requester_mobile, subject, message, status, priority, assigned_to, created_by, created_at, updated_at
     FROM support_tickets
     WHERE user_id IS NOT NULL AND ($1::text IS NULL OR status = $1) AND ($2::uuid IS NULL OR user_id = $2)
     ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC
     LIMIT 200`,
    [filterStatus, userId],
  );
  if (!rows.length) return rows.map((ticket) => ({ ...ticket, comments: [] }));
  const { rows: comments } = await pool.query<{
    id: string; ticket_id: string; author_type: "customer" | "admin"; author_id: string;
    author_name: string; message: string; created_at: string;
  }>(
    `SELECT id, ticket_id, author_type, author_id, author_name, message, created_at
     FROM support_ticket_comments WHERE ticket_id = ANY($1::uuid[]) ORDER BY created_at`,
    [rows.map((ticket) => ticket.id)],
  );
  const commentsByTicket = new Map<string, typeof comments>();
  for (const comment of comments) {
    const ticketComments = commentsByTicket.get(comment.ticket_id) ?? [];
    ticketComments.push(comment);
    commentsByTicket.set(comment.ticket_id, ticketComments);
  }
  return rows.map((ticket) => ({ ...ticket, comments: commentsByTicket.get(ticket.id) ?? [] }));
};

export const createSupportTicket = async ({
  requesterName, requesterMobile, subject, message, priority, createdBy, userId = null,
}: {
  requesterName: string; requesterMobile: string; subject: string; message: string;
  priority: "low" | "normal" | "high" | "urgent"; createdBy: string; userId?: string | null;
}) => {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO support_tickets (user_id, requester_name, requester_mobile, subject, message, status, priority, created_by)
     VALUES ($1, $2, $3, $4, $5, 'open', $6, $7) RETURNING id`,
    [userId, requesterName, requesterMobile, subject, message, priority, createdBy],
  );
  return rows[0].id;
};

export const addSupportTicketComment = async ({
  ticketId, authorType, authorId, authorName, message, userId = null,
}: {
  ticketId: string;
  authorType: "customer" | "admin";
  authorId: string;
  authorName: string;
  message: string;
  userId?: string | null;
}) => {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO support_ticket_comments (ticket_id, author_type, author_id, author_name, message)
     SELECT id, $2, $3, $4, $5 FROM support_tickets
     WHERE id = $1 AND user_id IS NOT NULL AND ($6::uuid IS NULL OR user_id = $6)
       AND ($2 = 'admin' OR status <> 'closed')
     RETURNING id`,
    [ticketId, authorType, authorId, authorName, message, userId],
  );
  if (!rows[0]) return false;
  await pool.query(
    `UPDATE support_tickets SET
       status = CASE WHEN $2 = 'customer' AND status = 'resolved' THEN 'open' ELSE status END,
       updated_at = NOW()
     WHERE id = $1`,
    [ticketId, authorType],
  );
  return true;
};

export const getSupportTicketAssignee = async (id: string) => {
  const { rows } = await pool.query<{ assigned_to: string | null }>(`SELECT assigned_to FROM support_tickets WHERE id = $1`, [id]);
  return rows[0] ? { exists: true, assignedTo: rows[0].assigned_to } : { exists: false, assignedTo: null };
};

export const updateSupportTicket = async (id: string, status: string, assignedTo: string | null) => {
  if (!["open", "in_progress", "resolved", "closed"].includes(status)) return false;
  const { rowCount } = await pool.query(
    `UPDATE support_tickets SET status = $2, assigned_to = $3, updated_at = NOW() WHERE id = $1`,
    [id, status, assignedTo],
  );
  return (rowCount ?? 0) > 0;
};

export const deleteCustomerAccount = async (userId: string) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `UPDATE users SET status = 'blocked', full_name = NULL, mobile = 'deleted-' || id::text, email = NULL,
         password_salt = NULL, password_hash = NULL, email_verified = FALSE, updated_at = NOW()
       WHERE id = $1 AND role = 'customer'`,
      [userId],
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE health_assessment_requests SET full_name = 'Deleted user', mobile = 'deleted', email = NULL, description = NULL
       WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `UPDATE support_tickets SET requester_name = 'Deleted user', requester_mobile = 'deleted', subject = '[removed]', message = '[removed on account deletion]'
       WHERE user_id = $1`,
      [userId],
    );
    await client.query(`DELETE FROM crm_customer_profiles WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM push_tokens WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM customer_notifications WHERE user_id = $1`, [userId]);
    await client.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const recordConsent = async (userId: string, consentType: string, granted: boolean) => {
  await pool.query(`INSERT INTO consent_events (user_id, consent_type, granted) VALUES ($1, $2, $3)`, [userId, consentType, granted]);
};

export const getCurrentConsents = async (userId: string) => {
  const { rows } = await pool.query<{ consent_type: string; granted: boolean; created_at: string }>(
    `SELECT DISTINCT ON (consent_type) consent_type, granted, created_at
     FROM consent_events WHERE user_id = $1 ORDER BY consent_type, created_at DESC`,
    [userId],
  );
  return rows;
};

export const listConsentHistory = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT consent_type, granted, created_at FROM consent_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return rows;
};

export const listCustomerPayments = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.report_bureau, p.plan_id, p.amount, p.gst_amount, p.status, p.created_at,
       (SELECT r.status FROM refund_requests r WHERE r.payment_id = p.id ORDER BY r.created_at DESC LIMIT 1) AS refund_status
     FROM payments p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 50`,
    [userId],
  );
  return rows;
};

export const getPaymentForUser = async (userId: string, paymentId: string) => {
  const { rows } = await pool.query(
    `SELECT id, gateway, gateway_order_id, amount, gst_amount, status, report_bureau, plan_id, created_at
     FROM payments WHERE id = $1 AND user_id = $2`,
    [paymentId, userId],
  );
  return rows[0] ?? null;
};

export const createRefundRequest = async (userId: string, paymentId: string, reason: string) => {
  const { rows } = await pool.query(
    `INSERT INTO refund_requests (payment_id, user_id, reason)
     SELECT p.id, p.user_id, $3 FROM payments p WHERE p.id = $2 AND p.user_id = $1 AND p.status = 'paid'
     ON CONFLICT (payment_id) DO NOTHING
     RETURNING id, status, created_at`,
    [userId, paymentId, reason],
  );
  return rows[0] ?? null;
};

export const listRefundRequests = async (status: string | null) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.payment_id, r.reason, r.status, r.decided_by, r.decision_note, r.decided_at, r.created_at,
       p.amount, p.gst_amount, p.report_bureau, p.plan_id, u.full_name AS customer_name, u.mobile AS customer_mobile
     FROM refund_requests r
     JOIN payments p ON p.id = r.payment_id
     JOIN users u ON u.id = r.user_id
     WHERE ($1::text IS NULL OR r.status = $1)
     ORDER BY r.created_at DESC LIMIT 200`,
    [status],
  );
  return rows;
};

export const decideRefundRequest = async (id: number, decision: "approved" | "rejected" | "processed", decidedBy: string, note: string | null) => {
  const { rows } = await pool.query<{ user_id: string }>(
    `UPDATE refund_requests SET status = $2, decided_by = $3, decision_note = $4, decided_at = NOW()
     WHERE id = $1 AND (
       (status = 'pending' AND $2 IN ('approved', 'rejected')) OR
       (status = 'approved' AND $2 = 'processed'))
     RETURNING user_id`,
    [id, decision, decidedBy, note],
  );
  return rows[0] ?? null;
};

export const addCustomerNotification = async (userId: string, title: string, body: string) => {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO customer_notifications (user_id, title, body) VALUES ($1, $2, $3) RETURNING id`,
    [userId, title, body],
  );
  return rows[0];
};

export const listCustomerNotifications = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT id, title, body, read_at, created_at FROM customer_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return rows;
};

export const markCustomerNotificationsRead = async (userId: string, id: string | null) => {
  const { rowCount } = await pool.query(
    `UPDATE customer_notifications SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL AND ($2::bigint IS NULL OR id = $2::bigint)`,
    [userId, id],
  );
  return rowCount ?? 0;
};

export const recordNotificationDelivery = async (userId: string, channel: "sms" | "push", status: "sent" | "skipped" | "failed", detail: string | null) => {
  await pool.query(
    `INSERT INTO notification_deliveries (user_id, channel, status, detail) VALUES ($1, $2, $3, $4)`,
    [userId, channel, status, detail],
  );
};

export const savePushToken = async (userId: string, token: string, platform: "android" | "ios" | "web") => {
  await pool.query(
    `INSERT INTO push_tokens (token, user_id, platform) VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform`,
    [token, userId, platform],
  );
};

export const listPushTokens = async (userId: string) => {
  const { rows } = await pool.query<{ token: string }>(`SELECT token FROM push_tokens WHERE user_id = $1`, [userId]);
  return rows.map((row) => row.token);
};

export const listCannedReplies = async () => {
  const { rows } = await pool.query(`SELECT id, title, body, created_by, updated_at FROM canned_replies ORDER BY title LIMIT 200`);
  return rows;
};

export const saveCannedReply = async (id: string | null, title: string, body: string, adminId: string) => {
  if (id) {
    const { rows } = await pool.query(
      `UPDATE canned_replies SET title = $2, body = $3, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id, title, body],
    );
    return rows[0] ?? null;
  }
  const { rows } = await pool.query(
    `INSERT INTO canned_replies (title, body, created_by) VALUES ($1, $2, $3) RETURNING id`,
    [title, body, adminId],
  );
  return rows[0];
};

export const deleteCannedReply = async (id: string) => {
  const { rowCount } = await pool.query(`DELETE FROM canned_replies WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
};

export const createAdminPasswordReset = async (email: string) => {
  const token = randomBytes(32).toString("hex");
  const { rows } = await pool.query<{ email: string }>(
    `UPDATE admin_accounts SET reset_token_hash = $2, reset_expires_at = NOW() + INTERVAL '2 hours', updated_at = NOW()
     WHERE email = $1 AND status = 'active' RETURNING email`,
    [email.toLowerCase(), hashToken(token)],
  );
  if (!rows[0]) return null;
  return { email: rows[0].email, token };
};

export const acceptAdminPasswordReset = async (token: string, password: string) => {
  const passwordSalt = randomBytes(16).toString("hex");
  const { rows } = await pool.query<{ email: string }>(
    `UPDATE admin_accounts SET password_salt = $2, password_hash = $3, reset_token_hash = NULL, reset_expires_at = NULL, updated_at = NOW()
     WHERE reset_token_hash = $1 AND status = 'active' AND reset_expires_at > NOW()
     RETURNING email`,
    [hashToken(token), passwordSalt, deriveAdminSecret(password, passwordSalt)],
  );
  if (!rows[0]) return null;
  await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL`, [rows[0].email]);
  return rows[0];
};

export const exportRows = async (kind: "customers" | "payments" | "refunds") => {
  if (kind === "customers") {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.mobile, u.email, u.status, u.created_at FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC LIMIT 50000`,
    );
    return rows;
  }
  if (kind === "payments") {
    const { rows } = await pool.query(
      `SELECT p.id, p.gateway_order_id, p.amount, p.gst_amount, p.status, p.report_bureau, p.plan_id, p.created_at
       FROM payments p ORDER BY p.created_at DESC LIMIT 50000`,
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT r.id, r.payment_id, r.status, r.reason, r.decided_by, r.decided_at, r.created_at FROM refund_requests r ORDER BY r.created_at DESC LIMIT 50000`,
  );
  return rows;
};

export const createCustomerInvitation = async ({
  fullName, mobile, email, invitedBy,
}: {
  fullName: string; mobile: string; email: string | null; invitedBy: string;
}) => {
  const { rows: existingUsers } = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE mobile = $1 AND role = 'customer' LIMIT 1`,
    [mobile],
  );
  if (existingUsers.length) throw new Error("An account already exists for this mobile number.");
  const { rows: pendingInvites } = await pool.query<{ id: string }>(
    `SELECT id FROM customer_invites WHERE mobile = $1 AND status = 'invited' ORDER BY created_at DESC LIMIT 1`,
    [mobile],
  );
  if (pendingInvites[0]) {
    const { rows } = await pool.query<{ id: string }>(
      `UPDATE customer_invites SET full_name = $2, email = $3, invited_by = $4, created_at = NOW()
       WHERE id = $1 RETURNING id`,
      [pendingInvites[0].id, fullName, email, invitedBy],
    );
    return rows[0].id;
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO customer_invites (full_name, mobile, email, status, invited_by)
     VALUES ($1, $2, $3, 'invited', $4) RETURNING id`,
    [fullName, mobile, email, invitedBy],
  );
  return rows[0].id;
};

export const listCustomerInvitations = async () => {
  const { rows } = await pool.query<{
    id: string; full_name: string; mobile: string; email: string | null; status: string; created_at: string;
  }>(
    `SELECT id, full_name, mobile, email, status, created_at FROM customer_invites ORDER BY created_at DESC LIMIT 100`,
  );
  return rows;
};

export const cancelCustomerInvitation = async (id: string) => {
  const { rowCount } = await pool.query(
    `UPDATE customer_invites SET status = 'cancelled' WHERE id = $1 AND status = 'invited'`,
    [id],
  );
  return (rowCount ?? 0) > 0;
};

export const listAdminUsers = async () => {
  const { rows } = await pool.query<{
    id: string; full_name: string; mobile: string; email: string | null; role: string;
    status: string; created_at: string; last_login: string | null;
  }>(`
    SELECT u.id, u.full_name, u.mobile, u.email, u.role, u.status, u.created_at,
           (SELECT MAX(s.created_at) FROM user_sessions s WHERE s.user_id = u.id) AS last_login
    FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC LIMIT 200
  `);
  return rows;
};

export type CustomerProfileEdit = {
  fullName: string; mobile: string; email: string | null;
  kyc: null | { nameAsPerPan: string; dateOfBirth: string; gender: string | null; addressLine1: string | null; addressLine2: string | null; city: string | null; state: string | null; pincode: string | null };
};

export class CustomerEditError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export const getCustomerProfileForEdit = async (userId: string) => {
  const { rows } = await pool.query<{
    full_name: string; mobile: string; email: string | null; pan_last4: string | null; has_kyc: boolean; name_as_per_pan: string | null;
    date_of_birth: string | null; gender: string | null; address_line1: string | null; address_line2: string | null;
    city: string | null; state: string | null; pincode: string | null;
  }>(
    `SELECT u.full_name, u.mobile, u.email, k.pan_last4, (k.user_id IS NOT NULL) AS has_kyc, k.name_as_per_pan,
            to_char(k.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, k.gender, k.address_line1, k.address_line2, k.city, k.state, k.pincode
     FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id WHERE u.id = $1 AND u.role = 'customer'`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    fullName: row.full_name, mobile: row.mobile, email: row.email, panLast4: row.pan_last4,
    kyc: row.has_kyc ? {
      nameAsPerPan: row.name_as_per_pan ?? "", dateOfBirth: row.date_of_birth ?? "", gender: row.gender,
      addressLine1: row.address_line1, addressLine2: row.address_line2, city: row.city, state: row.state, pincode: row.pincode,
    } : null,
  };
};

// Returns the list of changed field names (values are not returned so PII stays out of the audit log).
export const updateCustomerProfile = async (userId: string, input: CustomerProfileEdit) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ full_name: string; mobile: string; email: string | null; has_kyc: boolean; name_as_per_pan: string | null; date_of_birth: string | null; gender: string | null; address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; pincode: string | null }>(
      `SELECT u.full_name, u.mobile, u.email, (k.user_id IS NOT NULL) AS has_kyc, k.name_as_per_pan, to_char(k.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
              k.gender, k.address_line1, k.address_line2, k.city, k.state, k.pincode
       FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id WHERE u.id = $1 AND u.role = 'customer' FOR UPDATE OF u`,
      [userId],
    );
    const before = current.rows[0];
    if (!before) throw new CustomerEditError("Customer account not found.", 404);
    const changed: string[] = [];
    if (before.full_name !== input.fullName) changed.push("name");
    if (before.mobile !== input.mobile) changed.push("mobile");
    if ((before.email ?? null) !== input.email) changed.push("email");
    await client.query(
      `UPDATE users SET full_name = $2::text, mobile = $3::varchar, email = $4::text,
              mobile_verified = CASE WHEN mobile = $3::varchar THEN mobile_verified ELSE FALSE END,
              email_verified = CASE WHEN email IS NOT DISTINCT FROM $4::text THEN email_verified ELSE FALSE END,
              updated_at = NOW()
       WHERE id = $1`,
      [userId, input.fullName, input.mobile, input.email],
    );
    if (input.kyc) {
      if (!before.has_kyc) throw new CustomerEditError("This customer hasn't completed their profile yet, so there are no KYC details to edit.");
      const k = input.kyc;
      const pairs: [string, unknown, unknown][] = [
        ["name as per PAN", before.name_as_per_pan, k.nameAsPerPan], ["date of birth", before.date_of_birth, k.dateOfBirth],
        ["gender", before.gender, k.gender], ["address", `${before.address_line1 ?? ""}|${before.address_line2 ?? ""}`, `${k.addressLine1 ?? ""}|${k.addressLine2 ?? ""}`],
        ["city", before.city, k.city], ["state", before.state, k.state], ["pincode", before.pincode, k.pincode],
      ];
      for (const [label, a, b] of pairs) if ((a ?? null) !== (b ?? null)) changed.push(label);
      await client.query(
        `UPDATE kyc_profiles SET name_as_per_pan = $2, date_of_birth = $3, gender = $4, address_line1 = $5, address_line2 = $6,
                city = $7, state = $8, pincode = $9, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, k.nameAsPerPan, k.dateOfBirth, k.gender, k.addressLine1, k.addressLine2, k.city, k.state, k.pincode],
      );
    }
    await client.query("COMMIT");
    return changed;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const pg = error as { code?: string; constraint?: string };
    if (pg.code === "23505") {
      throw new CustomerEditError(pg.constraint === "users_email_key" ? "Another account already uses this email." : "Another account already uses this mobile number.", 409);
    }
    throw error;
  } finally {
    client.release();
  }
};

export const setCustomerAccountStatus = async (userId: string, status: "active" | "blocked") => {
  const { rowCount } = await pool.query(
    `UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 AND role = 'customer'`,
    [userId, status],
  );
  if (status === "blocked" && rowCount) {
    await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
  }
  return (rowCount ?? 0) > 0;
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
  const inviteResult = await pool.query<{ full_name: string; email: string | null }>(
    `SELECT full_name, email FROM customer_invites
     WHERE mobile = $1 AND status = 'invited' ORDER BY created_at DESC LIMIT 1`,
    [mobile],
  );
  const { rows } = await pool.query<{
    id: string; mobile: string; email: string | null; full_name: string; email_verified: boolean; status: string;
  }>(
    `INSERT INTO users (mobile, full_name, mobile_verified)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (mobile) DO UPDATE
       SET mobile_verified = TRUE,
           updated_at = NOW()
     RETURNING id, mobile, email, full_name, email_verified, status`,
    [mobile, fullName?.trim() || inviteResult.rows[0]?.full_name || "Scorenow User"],
  );
  const user = rows[0];
  if (user.status !== "active") throw new Error("This account is currently disabled. Please contact support.");
  if (inviteResult.rows[0]) {
    await pool.query(
      `UPDATE customer_invites SET status = 'claimed', claimed_at = NOW() WHERE mobile = $1 AND status = 'invited'`,
      [mobile],
    );
  }
  if (!user.email && email) {
    try {
      const { rows: updated } = await pool.query<{
        id: string; mobile: string; email: string | null; full_name: string; email_verified: boolean; status: string;
      }>(
        `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, mobile, email, full_name, email_verified, status`,
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
    `SELECT id, mobile, email, full_name, email_verified FROM users WHERE LOWER(email) = $1 AND status = 'active' AND role = 'customer'`,
    [email],
  );
  return rows[0] ?? null;
};

export const setCustomerPassword = async (userId: string, email: string, password: string) => {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE users SET email = COALESCE(email, $2), password_salt = $3, password_hash = $4, updated_at = NOW()
     WHERE id = $1 AND role = 'customer' AND status = 'active'
       AND (email IS NULL OR LOWER(email) = $2)
     RETURNING id`,
    [userId, email, salt, passwordHash],
  );
  return Boolean(rows[0]);
};

export const authenticateCustomerByEmail = async (email: string, password: string) => {
  const { rows } = await pool.query<{
    id: string; mobile: string; email: string; full_name: string;
    password_salt: string | null; password_hash: string | null; must_reset_password: boolean;
  }>(
    `SELECT id, mobile, email, full_name, password_salt, password_hash, must_reset_password
     FROM users WHERE LOWER(email) = $1 AND status = 'active' AND role = 'customer'`,
    [email],
  );
  const user = rows[0];
  if (!user?.password_salt || !user.password_hash || !/^[0-9a-f]{32}$/.test(user.password_salt) ||
      !/^[0-9a-f]{128}$/.test(user.password_hash)) return null;

  const candidate = scryptSync(password, user.password_salt, 64);
  const expected = Buffer.from(user.password_hash, "hex");
  if (!timingSafeEqual(candidate, expected)) return null;
  return { id: user.id, mobile: user.mobile, email: user.email, full_name: user.full_name, mustResetPassword: user.must_reset_password };
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

const encryptKycDocument = (content: Buffer) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kycKey(), iv);
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
};

const decryptKycDocument = (payload: Buffer) => {
  if (payload.length < 28) throw new Error("Stored application document is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", kycKey(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
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
  total_outstanding: string | null;
  is_demo: boolean;
};

type DashboardReportRow = ReportSummary & {
  credit_report_id: string | null;
  raw_report: unknown | null;
  normalized_report: NormalizedReport | null;
};

// Counts, per month, how many accounts were paid late (1+ days past due) out of those with a reported status.
const monthlyPaymentSignal = (accounts: NormalizedReport["accounts"] | undefined) => {
  const months = new Map<string, { month: string; late: number; reported: number }>();
  for (const account of accounts ?? []) {
    for (const entry of account.paymentHistory) {
      if (!entry.month || entry.daysPastDue === null) continue;
      const item = months.get(entry.month) ?? { month: entry.month, late: 0, reported: 0 };
      item.reported += 1;
      if (entry.daysPastDue > 0) item.late += 1;
      months.set(entry.month, item);
    }
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
};

const persistNormalizedReport = async (reportId: string, report: NormalizedReport) => {
  await pool.query(
    `UPDATE credit_reports SET normalized_report = $2, credit_score = $3, score_band = $4,
       total_accounts = $5, active_accounts = $6, overdue_accounts = $7,
       enquiries_last_6_months = $8, total_outstanding = $9
     WHERE id = $1`,
    [reportId, JSON.stringify(report), report.score, scoreBand(report.score), report.summary.totalAccounts,
      report.summary.activeAccounts, report.summary.overdueAccounts, report.summary.enquiriesLast6Months,
      report.summary.totalBalance],
  );
};

// Demo requests have no payment; they only exist when REPORTS_DEMO_MODE is on outside production.
const VISIBLE_REQUEST = `(r.payment_id IS NOT NULL OR r.provider = 'demo')`;

export const getDashboardStatus = async (userId: string) => {
  const [profileResult, reportResult, historyResult] = await Promise.all([
    pool.query<{ id: string; name_as_per_pan: string; date_of_birth: string; city: string | null; state: string | null; pan_last4: string | null; kyc_status: string }>(
      `SELECT id, name_as_per_pan, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, city, state, pan_last4, kyc_status
       FROM kyc_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    ),
      pool.query<DashboardReportRow>(
      `SELECT DISTINCT ON (r.bureau)
         r.id AS request_id, r.bureau, r.status, r.failure_reason, r.requested_at, r.provider = 'demo' AS is_demo,
         c.credit_score, c.score_band, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_url,
         c.total_accounts, c.active_accounts, c.overdue_accounts, c.enquiries_last_6_months, c.total_outstanding,
         c.id AS credit_report_id, c.raw_report, c.normalized_report
       FROM credit_report_requests r
       LEFT JOIN credit_reports c ON c.request_id = r.id
       WHERE r.user_id = $1 AND ${VISIBLE_REQUEST}
       ORDER BY r.bureau, r.requested_at DESC`,
      [userId],
    ),
    pool.query<{ bureau: Bureau; score: number; date: string }>(
      `SELECT r.bureau, c.credit_score AS score, to_char(COALESCE(c.report_date, r.requested_at::date), 'YYYY-MM-DD') AS date
       FROM credit_report_requests r
       JOIN credit_reports c ON c.request_id = r.id
       WHERE r.user_id = $1 AND ${VISIBLE_REQUEST} AND r.status = 'completed' AND c.credit_score IS NOT NULL
         AND COALESCE(c.report_date, r.requested_at::date) >= (CURRENT_DATE - INTERVAL '6 months')
       ORDER BY date ASC, r.requested_at ASC`,
      [userId],
    ),
  ]);
  const reports = await Promise.all(reportResult.rows.map(async (row) => {
    const { credit_report_id, raw_report, normalized_report, ...dashboardRow } = row;
    if (!credit_report_id || !raw_report || normalized_report?.parserVersion === PARSER_VERSION) {
      return { ...dashboardRow, payment_months: monthlyPaymentSignal(normalized_report?.accounts) };
    }

    const report = normalizeReport(row.bureau, raw_report);
    await persistNormalizedReport(credit_report_id, report);
    return {
      ...dashboardRow,
      credit_score: report.score,
      score_band: scoreBand(report.score),
      total_accounts: report.summary.totalAccounts,
      active_accounts: report.summary.activeAccounts,
      overdue_accounts: report.summary.overdueAccounts,
      enquiries_last_6_months: report.summary.enquiriesLast6Months,
      total_outstanding: String(report.summary.totalBalance),
      payment_months: monthlyPaymentSignal(report.accounts),
    };
  }));
  return {
    profile: profileResult.rows[0] ?? null,
    reports,
    history: historyResult.rows.map((row) => ({ bureau: row.bureau, score: Number(row.score), date: row.date })),
  };
};

export const createReportPayment = async ({
  userId,
  bureau,
  orderId,
  amount,
  gstAmount,
  gateway,
}: {
  userId: string;
  bureau: Bureau;
  orderId: string;
  amount: number;
  gstAmount: number;
  gateway: "razorpay" | "simulated";
}) => {
  await pool.query(
    `INSERT INTO payments (user_id, gateway, gateway_order_id, amount, gst_amount, status, report_bureau)
     VALUES ($1, $6, $2, $3, $4, 'created', $5)`,
    [userId, orderId, amount, gstAmount, bureau, gateway],
  );
};

export const findReportPayment = async (userId: string, orderId: string) => {
  const { rows } = await pool.query<{ id: string; status: string; gateway: string; report_bureau: Bureau | null }>(
    `SELECT id, status, gateway, report_bureau FROM payments WHERE user_id = $1 AND gateway_order_id = $2`,
    [userId, orderId],
  );
  return rows[0] ?? null;
};

export const markPaymentFailed = async (paymentId: string, failureReason: string) => {
  await pool.query(
    `UPDATE payments SET status = 'failed', failure_reason = $2, failure_at = NOW() WHERE id = $1 AND status = 'created'`,
    [paymentId, failureReason.slice(0, 500)],
  );
};

export const recordPaymentFailure = async (paymentId: string) => {
  await pool.query(
    `UPDATE payments SET failure_reason = 'The payment gateway reported a failed payment attempt.', failure_at = NOW()
     WHERE id = $1 AND status = 'created'`,
    [paymentId],
  );
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
      `UPDATE payments SET status = 'paid', gateway_payment_id = $2, failure_reason = NULL, failure_at = NULL, paid_at = NOW()
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

export const createDemoReportRequest = async (userId: string, bureau: Bureau) => {
  const consent = await pool.query<{ id: string }>(
    `INSERT INTO user_consents (user_id, consent_type, consent_text_version, granted)
     VALUES ($1, 'credit_report_pull', 'demo-report-v1', TRUE) RETURNING id`,
    [userId],
  );
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO credit_report_requests (user_id, consent_id, bureau, provider, status)
     VALUES ($1, $2, $3, 'demo', 'processing') RETURNING id`,
    [userId, consent.rows[0].id, bureau],
  );
  return rows[0].id;
};

export const findReportRequest = async (userId: string, requestId: string) => {
  const { rows } = await pool.query<{ id: string; bureau: Bureau; status: string }>(
    `SELECT r.id, r.bureau, r.status FROM credit_report_requests r
     WHERE r.id::text = $1 AND r.user_id = $2 AND ${VISIBLE_REQUEST}`,
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
  band,
  reportUrl,
  report,
  raw,
}: {
  userId: string;
  requestId: string;
  bureau: Bureau;
  providerTxnId: string | null;
  band: string | null;
  reportUrl: string | null;
  report: NormalizedReport;
  raw: unknown;
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE credit_report_requests SET status = 'completed', provider_request_id = $2, completed_at = NOW(), failure_reason = NULL,
         provider_response = $3
       WHERE id = $1`,
      [requestId, providerTxnId, JSON.stringify(raw)],
    );
    await client.query(
      `INSERT INTO credit_reports (user_id, request_id, bureau, credit_score, score_band, report_date, report_url, raw_report, normalized_report,
         total_accounts, active_accounts, overdue_accounts, enquiries_last_6_months, total_outstanding)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10, $11, $12, $13, $14)`,
      [userId, requestId, bureau, report.score, band, report.reportDate, reportUrl, JSON.stringify(raw), JSON.stringify(report),
        report.summary.totalAccounts, report.summary.activeAccounts, report.summary.overdueAccounts, report.summary.enquiriesLast6Months,
        report.summary.totalBalance],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  try {
    const { rows: owners } = await pool.query<{ owner_email: string; role: string }>(
      `SELECT ca.owner_email, a.role FROM customer_assignments ca
       JOIN admin_accounts a ON a.email = ca.owner_email
       WHERE ca.user_id = $1`,
      [userId],
    );
    if (owners[0]) {
      await recordPartnerActivity({
        actorEmail: owners[0].owner_email,
        actorRole: owners[0].role,
        event: "report_completed",
        details: { customerId: userId, bureau },
      });
    }
  } catch (error) {
    console.error("Report completion activity lookup failed", error);
  }
};

export const failReportRequest = async (requestId: string, reason: string, raw: unknown = null) => {
  await pool.query(
    `UPDATE credit_report_requests SET status = 'failed', failure_reason = $2, provider_response = $3 WHERE id = $1`,
    [requestId, reason.slice(0, 500), raw === null ? null : JSON.stringify(raw)],
  );
};

// Returns the parsed report, re-parsing the saved raw response when the parser has been improved since it was stored.
export const getReportDetail = async (userId: string, requestId: string) => {
  const { rows } = await pool.query<{
    id: string; bureau: Bureau; report_url: string | null; report_date: string; raw_report: unknown; normalized_report: NormalizedReport | null; is_demo: boolean; has_pdf: boolean;
  }>(
    `SELECT c.id, c.bureau, c.report_url, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.raw_report, c.normalized_report, r.provider = 'demo' AS is_demo,
            c.report_pdf IS NOT NULL AS has_pdf
     FROM credit_reports c JOIN credit_report_requests r ON r.id = c.request_id
     WHERE c.request_id::text = $1 AND c.user_id = $2 AND ${VISIBLE_REQUEST}`,
    [requestId, userId],
  );
  const row = rows[0];
  if (!row) return null;
  let report = row.normalized_report;
  if (!report || report.parserVersion !== PARSER_VERSION) {
    report = normalizeReport(row.bureau, row.raw_report);
    await persistNormalizedReport(row.id, report);
  }
  return {
    ...report,
    reportDate: report.reportDate ?? row.report_date,
    reportUrl: row.report_url,
    isDemo: row.is_demo,
    pdfAvailable: true,
  };
};

export const getReportPdf = async (userId: string | null, requestId: string) => {
  const { rows } = await pool.query<{
    request_id: string;
    user_id: string;
    bureau: Bureau;
    report_date: string;
    report_pdf: Buffer | null;
    report_pdf_source: string | null;
    report_html: string | null;
    raw_report: unknown;
    normalized_report: NormalizedReport | null;
  }>(
    `SELECT c.request_id, c.user_id, c.bureau, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_pdf, c.report_pdf_source, c.report_html,
            c.raw_report, c.normalized_report
     FROM credit_reports c JOIN credit_report_requests r ON r.id = c.request_id
     WHERE c.request_id::text = $1 AND ($2::text IS NULL OR c.user_id::text = $2) AND ${VISIBLE_REQUEST}`,
    [requestId, userId],
  );
  const row = rows[0];
  if (!row) return null;
  let report = row.normalized_report;
  if (!report || report.parserVersion !== PARSER_VERSION) {
    report = normalizeReport(row.bureau, row.raw_report);
    await persistNormalizedReport(row.request_id, report);
  }
  return {
    requestId: row.request_id,
    userId: row.user_id,
    bureau: row.bureau,
    reportDate: row.report_date,
    pdf: row.report_pdf,
    pdfSource: row.report_pdf_source,
    html: row.report_html,
    raw: row.report_pdf && row.bureau !== "cibil" ? null : row.raw_report,
    report,
  };
};

export const saveReportPdf = async (requestId: string, pdf: Buffer, pdfSource?: "bureau") => {
  await pool.query(
    `UPDATE credit_reports SET report_pdf = $2, report_pdf_source = COALESCE($3, report_pdf_source) WHERE request_id = $1`,
    [requestId, pdf, pdfSource ?? null],
  );
};

export const saveReportDocument = async (requestId: string, document: { pdf: Buffer | null; html: string | null; pdfSource?: "bureau" }) => {
  await pool.query(
    `UPDATE credit_reports SET report_pdf = COALESCE($2, report_pdf), report_pdf_source = COALESCE($4, report_pdf_source),
       report_html = COALESCE($3, report_html) WHERE request_id = $1`,
    [requestId, document.pdf, document.html, document.pdfSource ?? null],
  );
};

export const saveAdminReportDocument = async (auditId: number, document: { pdf: Buffer | null; html: string | null; pdfSource?: "bureau" }) => {
  await pool.query(
    `UPDATE admin_report_audit SET report_pdf = COALESCE($2, report_pdf), report_pdf_source = COALESCE($4, report_pdf_source),
       report_html = COALESCE($3, report_html) WHERE id = $1`,
    [auditId, document.pdf, document.html, document.pdfSource ?? null],
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO website_inquiries (user_id, full_name, mobile, concern, score_range)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, fullName, mobile, concern, scoreRange],
    );
    await client.query(
      `INSERT INTO support_tickets
         (user_id, requester_name, requester_mobile, subject, message, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, 'open', 'normal', 'website-inquiry')`,
      [userId, fullName, mobile, concern.slice(0, 180), `${concern}\nCredit score range: ${scoreRange}`],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const maskMobile = (mobile: string | null) => mobile ? `••••••${mobile.slice(-4)}` : mobile;
export const maskEmail = (email: string | null) => {
  if (!email) return email;
  const [user, domain] = email.split("@");
  return domain ? `${user.slice(0, 2)}•••@${domain}` : "•••";
};

export const recordAdminAudit = async ({
  adminId, action, targetType = null, targetId = null, details = null, ipAddress = null,
}: {
  adminId: string; action: string; targetType?: string | null; targetId?: string | null;
  details?: Record<string, unknown> | null; ipAddress?: string | null;
}) => {
  await pool.query(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`,
    [adminId, action, targetType, targetId, details ? JSON.stringify(details) : null, ipAddress],
  );
};

export const listAdminAudit = async ({ page = 1, action = "", adminId = "" }: { page?: number; action?: string; adminId?: string }) => {
  const pageSize = 50;
  const safePage = Math.max(1, Math.floor(page));
  const values = [action || null, adminId ? `%${adminId}%` : null];
  const where = `($1::text IS NULL OR action = $1) AND ($2::text IS NULL OR admin_id ILIKE $2)`;
  const [rows, count, actions] = await Promise.all([
    pool.query<{
      id: string; admin_id: string; action: string; target_type: string | null; target_id: string | null;
      details: Record<string, unknown> | null; ip_address: string | null; created_at: string;
    }>(
      `SELECT id, admin_id, action, target_type, target_id, details, ip_address, created_at FROM admin_audit_log
       WHERE ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [...values, pageSize, (safePage - 1) * pageSize],
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM admin_audit_log WHERE ${where}`, values),
    pool.query<{ action: string }>(`SELECT DISTINCT action FROM admin_audit_log ORDER BY action`),
  ]);
  return {
    entries: rows.rows,
    actions: actions.rows.map((row) => row.action),
    pagination: { page: safePage, pageSize, total: Number(count.rows[0]?.count ?? 0) },
  };
};

export const getAdminCustomerDetail = async (userId: string, maskContact = false) => {
  const { rows } = await pool.query<{
    id: string; full_name: string; account_name: string; mobile: string; email: string | null; status: string;
    created_at: string; mobile_verified: boolean; email_verified: boolean; pan_last4: string | null; kyc_status: string | null;
    city: string | null; state: string | null; profile_complete: boolean; profile_updated_at: string | null;
  }>(
    `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, u.full_name AS account_name, u.mobile, u.email, u.status, u.created_at,
            u.mobile_verified, u.email_verified, k.pan_last4, k.kyc_status, k.city, k.state,
            (k.user_id IS NOT NULL) AS profile_complete, k.updated_at AS profile_updated_at
     FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id WHERE u.id = $1`,
    [userId],
  );
  const customer = rows[0];
  if (!customer) return null;
  const [payments, reports, tickets, sessions, audit] = await Promise.all([
    pool.query<{ id: string; bureau: string | null; amount: string; status: string; gateway: string; failure_reason: string | null; created_at: string; paid_at: string | null }>(
      `SELECT id, report_bureau AS bureau, (amount + gst_amount)::text AS amount, status, gateway, failure_reason, created_at, paid_at
       FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [userId]),
    pool.query<{ id: string; bureau: string; status: string; failure_reason: string | null; requested_at: string; completed_at: string | null; credit_score: number | null; is_paid: boolean }>(
      `SELECT r.id, r.bureau, r.status, r.failure_reason, r.requested_at, r.completed_at, c.credit_score, (r.payment_id IS NOT NULL) AS is_paid
       FROM credit_report_requests r LEFT JOIN credit_reports c ON c.request_id = r.id
       WHERE r.user_id = $1 ORDER BY r.requested_at DESC LIMIT 50`, [userId]),
    pool.query<{ id: string; subject: string; status: string; priority: string; created_at: string }>(
      `SELECT id, subject, status, priority, created_at FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [userId]),
    pool.query<{ created_at: string; expires_at: string; revoked_at: string | null; ip_address: string | null; user_agent: string | null }>(
      `SELECT created_at, expires_at, revoked_at, host(ip_address) AS ip_address, LEFT(user_agent, 120) AS user_agent
       FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [userId]),
    pool.query<{ admin_id: string; action: string; details: Record<string, unknown> | null; created_at: string }>(
      `SELECT admin_id, action, details, created_at FROM admin_audit_log
       WHERE target_type = 'customer' AND target_id = $1 ORDER BY created_at DESC LIMIT 20`, [userId]),
  ]);
  return {
    customer: maskContact ? { ...customer, mobile: maskMobile(customer.mobile)!, email: maskEmail(customer.email) } : customer,
    payments: payments.rows,
    reports: reports.rows,
    tickets: tickets.rows,
    sessions: maskContact ? sessions.rows.map((row) => ({ ...row, ip_address: null })) : sessions.rows,
    adminActions: audit.rows,
  };
};

export const findCustomerForFollowUp = async (userId: string) => {
  const { rows } = await pool.query<{ id: string; full_name: string; mobile: string }>(
    `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, u.mobile FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id WHERE u.id = $1`,
    [userId],
  );
  return rows[0] ?? null;
};

// Paid report requests that failed, or have been stuck in processing, can be retried by an admin.
export const findAdminRetryableReport = async (requestId: string) => {
  const { rows } = await pool.query<{ id: string; user_id: string; bureau: Bureau; status: string }>(
    `SELECT id, user_id, bureau, status FROM credit_report_requests
     WHERE id::text = $1 AND payment_id IS NOT NULL
       AND (status = 'failed' OR (status = 'processing' AND requested_at < NOW() - INTERVAL '15 minutes'))`,
    [requestId],
  );
  return rows[0] ?? null;
};

export const getAdminAttention = async () => {
  const { rows } = await pool.query<{
    failed_reports: string; stuck_reports: string; stuck_payments: string; open_tickets: string; unassigned_tickets: string; failed_admin_checks: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'failed') AS failed_reports,
      (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'processing' AND requested_at < NOW() - INTERVAL '15 minutes') AS stuck_reports,
      (SELECT COUNT(*) FROM payments WHERE status = 'created' AND failure_reason IS NULL AND created_at < NOW() - INTERVAL '30 minutes') AS stuck_payments,
      (SELECT COUNT(*) FROM support_tickets WHERE user_id IS NOT NULL AND status IN ('open', 'in_progress')) AS open_tickets,
      (SELECT COUNT(*) FROM support_tickets WHERE user_id IS NOT NULL AND status IN ('open', 'in_progress') AND assigned_to IS NULL) AS unassigned_tickets,
      (SELECT COUNT(*) FROM admin_report_audit WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') AS failed_admin_checks
  `);
  return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)])) as Record<
    "failed_reports" | "stuck_reports" | "stuck_payments" | "open_tickets" | "unassigned_tickets" | "failed_admin_checks", number>;
};

export const getFailedOperations = async () => {
  const [reports, payments, adminChecks] = await Promise.all([
    pool.query<{ id: string; user_id: string; customer: string; mobile_last4: string; bureau: string; status: string; failure_reason: string | null; requested_at: string }>(
      `SELECT r.id, r.user_id, ${CUSTOMER_DISPLAY_NAME} AS customer, RIGHT(u.mobile, 4) AS mobile_last4, r.bureau, r.status, r.failure_reason, r.requested_at
       FROM credit_report_requests r JOIN users u ON u.id = r.user_id LEFT JOIN kyc_profiles k ON k.user_id = u.id
       WHERE r.payment_id IS NOT NULL AND (r.status = 'failed' OR (r.status = 'processing' AND r.requested_at < NOW() - INTERVAL '15 minutes'))
       ORDER BY r.requested_at DESC LIMIT 100`),
    pool.query<{ id: string; user_id: string; customer: string; mobile_last4: string; bureau: string | null; amount: string; gateway: string; failure_reason: string | null; created_at: string }>(
      `SELECT p.id, p.user_id, ${CUSTOMER_DISPLAY_NAME} AS customer, RIGHT(u.mobile, 4) AS mobile_last4, p.report_bureau AS bureau,
              (p.amount + p.gst_amount)::text AS amount, p.gateway, p.failure_reason, p.created_at
       FROM payments p JOIN users u ON u.id = p.user_id LEFT JOIN kyc_profiles k ON k.user_id = u.id
       WHERE p.status = 'failed' OR (p.status = 'created' AND (p.failure_reason IS NOT NULL OR p.created_at < NOW() - INTERVAL '30 minutes'))
       ORDER BY p.created_at DESC LIMIT 100`),
    pool.query<{ id: string; full_name: string | null; mobile_last4: string; bureau: string; failure_reason: string | null; admin_id: string; created_at: string }>(
      `SELECT id, applicant_details->>'fullName' AS full_name, mobile_last4, bureau, failure_reason, admin_id, created_at
       FROM admin_report_audit WHERE status = 'failed' AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC LIMIT 50`),
  ]);
  return { reports: reports.rows, payments: payments.rows, adminChecks: adminChecks.rows };
};

export const getHealthStats = async () => {
  const started = Date.now();
  await pool.query("SELECT 1");
  const databaseLatencyMs = Date.now() - started;
  const [recent, bureaus] = await Promise.all([
    pool.query<{ failed_reports_24h: string; completed_reports_24h: string; failed_payments_24h: string; paid_payments_24h: string; last_signup: string | null; last_payment: string | null }>(`
      SELECT
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'failed' AND requested_at > NOW() - INTERVAL '24 hours') AS failed_reports_24h,
        (SELECT COUNT(*) FROM credit_report_requests WHERE payment_id IS NOT NULL AND status = 'completed' AND requested_at > NOW() - INTERVAL '24 hours') AS completed_reports_24h,
        (SELECT COUNT(*) FROM payments WHERE failure_at > NOW() - INTERVAL '24 hours') AS failed_payments_24h,
        (SELECT COUNT(*) FROM payments WHERE paid_at > NOW() - INTERVAL '24 hours') AS paid_payments_24h,
        (SELECT MAX(created_at) FROM users) AS last_signup,
        (SELECT MAX(paid_at) FROM payments) AS last_payment
    `),
    pool.query<{ bureau: string; last_success: string | null; last_failure: string | null; last_failure_reason: string | null; failures_7d: string; successes_7d: string }>(`
      SELECT b.bureau,
        (SELECT MAX(COALESCE(completed_at, requested_at)) FROM credit_report_requests WHERE bureau = b.bureau AND status = 'completed') AS last_success,
        (SELECT MAX(requested_at) FROM credit_report_requests WHERE bureau = b.bureau AND status = 'failed') AS last_failure,
        (SELECT failure_reason FROM credit_report_requests WHERE bureau = b.bureau AND status = 'failed' ORDER BY requested_at DESC LIMIT 1) AS last_failure_reason,
        (SELECT COUNT(*) FROM credit_report_requests WHERE bureau = b.bureau AND status = 'failed' AND requested_at > NOW() - INTERVAL '7 days') AS failures_7d,
        (SELECT COUNT(*) FROM credit_report_requests WHERE bureau = b.bureau AND status = 'completed' AND requested_at > NOW() - INTERVAL '7 days') AS successes_7d
      FROM (VALUES ('cibil'), ('equifax'), ('experian'), ('crif')) AS b(bureau)
    `),
  ]);
  const counts = recent.rows[0];
  return {
    databaseLatencyMs,
    recent: {
      failedReports24h: Number(counts.failed_reports_24h),
      completedReports24h: Number(counts.completed_reports_24h),
      failedPayments24h: Number(counts.failed_payments_24h),
      paidPayments24h: Number(counts.paid_payments_24h),
      lastSignup: counts.last_signup,
      lastPayment: counts.last_payment,
    },
    bureaus: bureaus.rows.map((row) => ({ ...row, failures_7d: Number(row.failures_7d), successes_7d: Number(row.successes_7d) })),
  };
};

export const createSubscriptionPayment = async ({
  userId, planId, orderId, amount, gstAmount, gateway,
}: { userId: string; planId: string; orderId: string; amount: number; gstAmount: number; gateway: "razorpay" | "simulated" }) => {
  await pool.query(
    `INSERT INTO payments (user_id, gateway, gateway_order_id, amount, gst_amount, status, plan_id)
     VALUES ($1, $2, $3, $4, $5, 'created', $6)`,
    [userId, gateway, orderId, amount - gstAmount, gstAmount, planId],
  );
};

export const findSubscriptionPayment = async (userId: string, orderId: string) => {
  const { rows } = await pool.query<{ id: string; gateway: string; plan_id: string | null; amount: string; gst_amount: string }>(
    `SELECT id, gateway, plan_id, amount, gst_amount FROM payments WHERE user_id = $1 AND gateway_order_id = $2 AND plan_id IS NOT NULL`,
    [userId, orderId],
  );
  return rows[0] ?? null;
};

// Marks the payment paid and starts the subscription exactly once; a plan bought while one is active starts when it ends.
export const activateSubscription = async ({
  userId, paymentDbId, gatewayPaymentId, plan,
}: { userId: string; paymentDbId: string; gatewayPaymentId: string; plan: { id: string; name: string; months: number; price: number } }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paid = await client.query(
      `UPDATE payments SET status = 'paid', gateway_payment_id = $2, failure_reason = NULL, failure_at = NULL, paid_at = NOW()
       WHERE id = $1 AND status = 'created'`,
      [paymentDbId, gatewayPaymentId],
    );
    if (paid.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    await client.query(
      `INSERT INTO user_subscriptions (user_id, payment_id, plan_id, plan_name, months, amount, starts_at, expires_at)
       SELECT $1, $2, $3, $4, $5, $6, s.start_at, s.start_at + make_interval(months => $5::int)
       FROM (SELECT GREATEST(NOW(), COALESCE((SELECT MAX(expires_at) FROM user_subscriptions WHERE user_id = $1), NOW())) AS start_at) s`,
      [userId, paymentDbId, plan.id, plan.name, plan.months, plan.price],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getUserSubscriptions = async (userId: string) => {
  const { rows } = await pool.query<{
    id: string; plan_id: string; plan_name: string; months: number; amount: string;
    starts_at: Date; expires_at: Date; created_at: Date; status: "active" | "upcoming" | "expired";
  }>(
    `SELECT id, plan_id, plan_name, months, amount, starts_at, expires_at, created_at,
            CASE WHEN expires_at <= NOW() THEN 'expired' WHEN starts_at > NOW() THEN 'upcoming' ELSE 'active' END AS status
     FROM user_subscriptions WHERE user_id = $1 ORDER BY starts_at DESC LIMIT 50`,
    [userId],
  );
  const items = rows.map((row) => ({
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    months: row.months,
    amount: Number(row.amount),
    startsAt: row.starts_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    purchasedAt: row.created_at.toISOString(),
    status: row.status,
  }));
  const active = items.find((item) => item.status === "active") ?? null;
  const lastExpiry = items.reduce((max, item) => (item.status !== "expired" && item.expiresAt > max ? item.expiresAt : max), "");
  return { current: active, validUntil: lastExpiry || null, history: items };
};

export const CRM_STAGES = ["new", "contacted", "interested", "paid", "closed"] as const;
export type CrmStage = (typeof CRM_STAGES)[number];
export const CRM_ACTIVITY_KINDS = ["note", "call", "whatsapp", "email"] as const;
export type CrmActivityKind = (typeof CRM_ACTIVITY_KINDS)[number];
export const CRM_APPLICATION_STATUSES = [
  "submitted", "under_review", "correction_required", "approved_for_processing", "verification_assigned",
  "verification_in_progress", "verification_completed", "final_review", "approved", "rejected",
] as const;
export type CrmApplicationStatus = (typeof CRM_APPLICATION_STATUSES)[number];

export class CrmApplicationConflict extends Error {}

type CrmApplicationDocumentInput = {
  documentType: "pan" | "aadhaar" | "other";
  fileName: string;
  mimeType: string;
  content: Buffer;
};

const crmCustomerFrom = `
  FROM users u
  LEFT JOIN kyc_profiles k ON k.user_id = u.id
  LEFT JOIN crm_customer_profiles p ON p.user_id = u.id`;

export const listCrmCustomers = async ({
  q, stage, tag, page, pageSize, scopeOwners = null,
}: { q: string; stage: CrmStage | null; tag: string | null; page: number; pageSize: number; scopeOwners?: string[] | null }) => {
  const values: unknown[] = [];
  const conditions = ["TRUE"];
  if (scopeOwners) {
    values.push(scopeOwners);
    conditions.push(customerScopeCondition(values.length));
  }
  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(${CUSTOMER_DISPLAY_NAME} ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.mobile LIKE $${values.length})`);
  }
  if (stage) {
    values.push(stage);
    conditions.push(`COALESCE(p.stage, 'new') = $${values.length}`);
  }
  if (tag) {
    values.push(tag);
    conditions.push(`$${values.length} = ANY(COALESCE(p.tags, '{}'))`);
  }
  const where = conditions.join(" AND ");
  const [rows, count] = await Promise.all([
    pool.query<{
      id: string; name: string; email: string | null; mobile: string | null; created_at: string;
      stage: CrmStage; tags: string[]; last_activity_at: string | null; open_tasks: string;
    }>(
      `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS name, u.email, u.mobile, u.created_at,
              COALESCE(p.stage, 'new') AS stage, COALESCE(p.tags, '{}') AS tags,
              (SELECT MAX(a.created_at) FROM crm_activities a WHERE a.user_id = u.id) AS last_activity_at,
              (SELECT COUNT(*) FROM crm_tasks t WHERE t.user_id = u.id AND t.status = 'open') AS open_tasks
       ${crmCustomerFrom}
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) AS count ${crmCustomerFrom} WHERE ${where}`, values),
  ]);
  return {
    total: Number(count.rows[0]?.count ?? 0),
    customers: rows.rows.map((row) => ({ ...row, open_tasks: Number(row.open_tasks) })),
  };
};

export const getCrmPipeline = async () => {
  const { rows } = await pool.query<{ stage: CrmStage; count: string }>(
    `SELECT COALESCE(p.stage, 'new') AS stage, COUNT(*) AS count
     FROM users u LEFT JOIN crm_customer_profiles p ON p.user_id = u.id
     GROUP BY 1`,
  );
  const counts = Object.fromEntries(CRM_STAGES.map((stage) => [stage, 0])) as Record<CrmStage, number>;
  for (const row of rows) counts[row.stage] = Number(row.count);
  return counts;
};

export const getCrmTimeline = async (userId: string, includeCommission = false) => {
  const [profile, activities, payments, reports, tasks] = await Promise.all([
    pool.query<{
      stage: CrmStage; tags: string[]; updated_by: string | null; updated_at: string | null;
      partner_email: string | null; commission_amount_paise: number | null;
      commission_awarded_at: string | null; commission_status: "pending" | "paid" | null;
    }>(
      `SELECT COALESCE(p.stage, 'new') AS stage, COALESCE(p.tags, '{}') AS tags, p.updated_by, p.updated_at,
              CASE WHEN assigned.role = 'partner' THEN assigned.email
                   WHEN assigned.role = 'agent' AND parent.role = 'partner' THEN parent.email END AS partner_email,
              closed_commission.amount_paise AS commission_amount_paise,
              closed_commission.created_at AS commission_awarded_at,
              closed_commission.status AS commission_status
       FROM users u
       LEFT JOIN crm_customer_profiles p ON p.user_id = u.id
       LEFT JOIN customer_assignments ca ON ca.user_id = u.id
       LEFT JOIN admin_accounts assigned ON assigned.email = ca.owner_email
       LEFT JOIN admin_accounts parent ON parent.email = assigned.parent_email
       LEFT JOIN LATERAL (
         SELECT amount_paise, created_at, status FROM partner_commissions
         WHERE user_id = u.id AND source = 'case_closure'
         ORDER BY created_at DESC LIMIT 1
       ) closed_commission ON $2::boolean
       WHERE u.id = $1`,
      [userId, includeCommission],
    ),
    pool.query(
      `SELECT id, kind, body, created_by, created_at FROM crm_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    ),
    pool.query(
      `SELECT id, plan_name, amount, status, failure_reason, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId],
    ),
    pool.query(
      `SELECT id, bureau, status, requested_at FROM credit_report_requests
       WHERE user_id = $1 AND payment_id IS NOT NULL ORDER BY requested_at DESC LIMIT 20`,
      [userId],
    ),
    pool.query(
      `SELECT id, title, due_at, assignee_email, status, created_by, created_at, completed_at
       FROM crm_tasks WHERE user_id = $1 ORDER BY status ASC, due_at ASC NULLS LAST, created_at DESC LIMIT 100`,
      [userId],
    ),
  ]);
  return {
    profile: profile.rows[0] ?? {
      stage: "new" as CrmStage, tags: [], updated_by: null, updated_at: null,
      partner_email: null, commission_amount_paise: null, commission_awarded_at: null, commission_status: null,
    },
    activities: activities.rows,
    payments: payments.rows,
    reports: reports.rows,
    tasks: tasks.rows,
  };
};

export const updateCrmProfile = async (
  userId: string,
  changes: { stage?: CrmStage; tags?: string[] },
  adminId: string,
) => {
  await pool.query(
    `INSERT INTO crm_customer_profiles (user_id, stage, tags, updated_by, updated_at)
     VALUES ($1, COALESCE($2::text, 'new'), COALESCE($3::text[], '{}'), $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       stage = COALESCE($2::text, crm_customer_profiles.stage),
       tags = COALESCE($3::text[], crm_customer_profiles.tags),
       updated_by = $4,
       updated_at = NOW()`,
    [userId, changes.stage ?? null, changes.tags ?? null, adminId],
  );
};

export const closeCrmCustomerCase = async ({
  userId, adminId, commissionAmountPaise, tags,
}: { userId: string; adminId: string; commissionAmountPaise: number | null; tags?: string[] }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    if (!user.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const assignment = await client.query<{ owner_email: string }>(
      `SELECT owner_email FROM customer_assignments WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    let partnerEmail: string | null = null;
    if (assignment.rows[0]) {
      const partner = await client.query<{ email: string | null }>(
        `SELECT CASE WHEN assigned.role = 'partner' THEN assigned.email
                     WHEN assigned.role = 'agent' AND parent.role = 'partner' THEN parent.email END AS email
         FROM admin_accounts assigned
         LEFT JOIN admin_accounts parent ON parent.email = assigned.parent_email
         WHERE assigned.email = $1`,
        [assignment.rows[0].owner_email],
      );
      partnerEmail = partner.rows[0]?.email ?? null;
    }
    if (partnerEmail && commissionAmountPaise === null) {
      throw new CrmApplicationConflict("Set the partner commission amount before closing this case.");
    }
    if (!partnerEmail && commissionAmountPaise !== null) {
      throw new CrmApplicationConflict("This customer is not assigned to a partner.");
    }

    if (partnerEmail) {
      const existing = await client.query(
        `SELECT id FROM partner_commissions WHERE user_id = $1 AND source = 'case_closure' FOR UPDATE`,
        [userId],
      );
      if (existing.rows[0]) throw new CrmApplicationConflict("A closure commission has already been awarded for this case.");
    }

    await client.query(
      `INSERT INTO crm_customer_profiles (user_id, stage, tags, updated_by, updated_at)
       VALUES ($1, 'closed', COALESCE($3::text[], '{}'), $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         stage = 'closed', tags = COALESCE($3::text[], crm_customer_profiles.tags),
         updated_by = $2, updated_at = NOW()`,
      [userId, adminId.toLowerCase(), tags ?? null],
    );

    let commissionId: string | null = null;
    if (partnerEmail && commissionAmountPaise !== null) {
      const commission = await client.query<{ id: string }>(
        `INSERT INTO partner_commissions (payee_email, user_id, amount_paise, note, created_by, source)
         VALUES ($1, $2, $3, $4, $5, 'case_closure')
         RETURNING id`,
        [partnerEmail, userId, commissionAmountPaise, `Closed-case commission - ${user.rows[0].full_name.slice(0, 200)}`, adminId.toLowerCase()],
      );
      commissionId = commission.rows[0].id;
    }

    await client.query("COMMIT");
    return { partnerEmail, amountPaise: commissionAmountPaise, commissionId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const addCrmActivity = async ({
  userId, kind, body, createdBy,
}: { userId: string; kind: CrmActivityKind; body: string; createdBy: string }) => {
  const { rows } = await pool.query(
    `INSERT INTO crm_activities (user_id, kind, body, created_by) VALUES ($1, $2, $3, $4)
     RETURNING id, kind, body, created_by, created_at`,
    [userId, kind, body, createdBy],
  );
  return rows[0];
};

export const createCrmTask = async ({
  userId, title, dueAt, assigneeEmail, createdBy,
}: { userId: string; title: string; dueAt: string | null; assigneeEmail: string | null; createdBy: string }) => {
  const { rows } = await pool.query(
    `INSERT INTO crm_tasks (user_id, title, due_at, assignee_email, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, due_at, assignee_email, status, created_by, created_at, completed_at`,
    [userId, title, dueAt, assigneeEmail, createdBy],
  );
  return rows[0];
};

export const createCrmApplication = async ({
  partnerEmail, fullName, mobile, email, pan, dateOfBirth, gender, addressLine1, city, state, pincode, customerRemark, documents,
}: {
  partnerEmail: string; fullName: string; mobile: string; email: string; pan: string; dateOfBirth: string; gender: string;
  addressLine1: string; city: string; state: string; pincode: string; customerRemark: string | null;
  documents: CrmApplicationDocumentInput[];
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const partner = await client.query(
      `SELECT email FROM admin_accounts WHERE email = $1 AND role = 'partner' AND status = 'active' FOR SHARE`,
      [partnerEmail.toLowerCase()],
    );
    if (!partner.rows[0]) throw new CrmApplicationConflict("An active partner account is required to submit an application.");

    const matches = await client.query<{
      id: string; mobile: string; email: string | null; role: string; status: string;
    }>(
      `SELECT id, mobile, email, role, status FROM users
       WHERE mobile = $1 OR LOWER(email) = $2
       ORDER BY CASE WHEN mobile = $1 THEN 0 ELSE 1 END
       FOR UPDATE`,
      [mobile, email.toLowerCase()],
    );
    if (matches.rows.length > 1) {
      throw new CrmApplicationConflict("The mobile number and email belong to different customer accounts.");
    }

    let userId: string;
    if (matches.rows[0]) {
      const existing = matches.rows[0];
      if (existing.role !== "customer" || existing.status !== "active" ||
          existing.mobile !== mobile || (existing.email && existing.email.toLowerCase() !== email.toLowerCase())) {
        throw new CrmApplicationConflict("A customer account already exists with different contact details.");
      }
      userId = existing.id;
      const assignment = await client.query<{ owner_email: string }>(
        `SELECT owner_email FROM customer_assignments WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      if (assignment.rows[0] && assignment.rows[0].owner_email !== partnerEmail.toLowerCase()) {
        throw new CrmApplicationConflict("This customer is already assigned to another partner.");
      }
      const application = await client.query<{ application_status: string | null }>(
        `SELECT application_status FROM crm_customer_profiles WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      if (application.rows[0]?.application_status) {
        throw new CrmApplicationConflict("An application already exists for this customer.");
      }
      if (!existing.email) {
        await client.query(`UPDATE users SET email = $2, full_name = $3, updated_at = NOW() WHERE id = $1`, [userId, email.toLowerCase(), fullName]);
      }
    } else {
      const created = await client.query<{ id: string }>(
        `INSERT INTO users (mobile, email, full_name, mobile_verified)
         VALUES ($1, $2, $3, FALSE) RETURNING id`,
        [mobile, email.toLowerCase(), fullName],
      );
      userId = created.rows[0].id;
    }

    const normalizedPan = pan.toUpperCase().replace(/\s/g, "");
    const panHash = createHash("sha256").update(normalizedPan).digest("hex");
    const normalizedGender = ["female", "male", "other"].includes(gender.toLowerCase()) ? gender.toLowerCase() : null;
    await client.query(
      `INSERT INTO kyc_profiles
        (user_id, name_as_per_pan, pan_encrypted, pan_hash, pan_last4, date_of_birth, gender, address_line1, city, state, pincode, kyc_status, verification_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'application')
       ON CONFLICT (user_id) DO UPDATE SET
         name_as_per_pan = EXCLUDED.name_as_per_pan, pan_encrypted = EXCLUDED.pan_encrypted, pan_hash = EXCLUDED.pan_hash,
         pan_last4 = EXCLUDED.pan_last4, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender,
         address_line1 = EXCLUDED.address_line1, city = EXCLUDED.city, state = EXCLUDED.state, pincode = EXCLUDED.pincode,
         updated_at = NOW()`,
      [userId, fullName, encryptPan(normalizedPan), panHash, normalizedPan.slice(-4), dateOfBirth, normalizedGender, addressLine1, city, state, pincode],
    );
    await client.query(
      `INSERT INTO customer_assignments (user_id, owner_email, assigned_by)
       VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO UPDATE SET owner_email = EXCLUDED.owner_email, assigned_by = EXCLUDED.assigned_by, created_at = NOW()`,
      [userId, partnerEmail.toLowerCase()],
    );
    const savedProfile = await client.query(
      `INSERT INTO crm_customer_profiles
        (user_id, application_status, customer_remark, application_submitted_at, customer_consent_at, customer_consent_by, updated_by, updated_at)
       VALUES ($1, 'submitted', $2, NOW(), NOW(), $3, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         application_status = 'submitted', customer_remark = EXCLUDED.customer_remark,
         assigned_admin_email = NULL, application_submitted_at = NOW(), customer_consent_at = NOW(),
         customer_consent_by = EXCLUDED.customer_consent_by, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       WHERE crm_customer_profiles.application_status IS NULL
       RETURNING user_id`,
      [userId, customerRemark, partnerEmail.toLowerCase()],
    );
    if (!savedProfile.rows[0]) throw new CrmApplicationConflict("An application already exists for this customer.");

    for (const document of documents) {
      await client.query(
        `INSERT INTO crm_application_documents (user_id, document_type, file_name, mime_type, content, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, document.documentType, document.fileName, document.mimeType, encryptKycDocument(document.content), partnerEmail.toLowerCase()],
      );
    }
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, remark, actor_email, actor_role)
       VALUES ($1, 'submitted', 'submitted', 'customer', $2, $3, 'partner')`,
      [userId, customerRemark || "Application submitted for review.", partnerEmail.toLowerCase()],
    );
    await client.query("COMMIT");
    return { userId, applicationStatus: "submitted" as const };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listCrmApplications = async (email: string, role: "owner" | "manager") => {
  const { rows } = await pool.query(
    `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, u.email, u.mobile,
            p.application_status, p.customer_remark, p.assigned_admin_email, p.application_submitted_at,
            ca.owner_email AS partner_email, p.updated_at,
            (SELECT COUNT(*) FROM crm_tasks t WHERE t.user_id = u.id AND t.task_kind = 'verification'
              AND t.review_status <> 'approved') AS open_verifications
     FROM crm_customer_profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     LEFT JOIN customer_assignments ca ON ca.user_id = u.id
     WHERE p.application_status IS NOT NULL AND ($1 = 'owner' OR p.assigned_admin_email = $2)
     ORDER BY p.updated_at DESC`,
    [role, email.toLowerCase()],
  );
  return rows;
};

export const getCrmApplicationDetail = async (userId: string, email: string, role: "owner" | "manager") => {
  const { rows } = await pool.query(
    `SELECT u.id, ${CUSTOMER_DISPLAY_NAME} AS full_name, u.email, u.mobile,
            to_char(k.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, k.gender, k.pan_last4,
            k.address_line1, k.city, k.state, k.pincode,
            p.application_status, p.customer_remark, p.assigned_admin_email, p.application_submitted_at,
            ca.owner_email AS partner_email
     FROM crm_customer_profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     LEFT JOIN customer_assignments ca ON ca.user_id = u.id
     WHERE u.id = $1 AND p.application_status IS NOT NULL AND ($2 = 'owner' OR p.assigned_admin_email = $3)`,
    [userId, role, email.toLowerCase()],
  );
  if (!rows[0]) return null;
  const [tasks, events, documents] = await Promise.all([
    pool.query(
      `SELECT id, title, due_at, assignee_email, status, task_kind, review_status, review_remark, result, created_by, created_at, completed_at
       FROM crm_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    ),
    pool.query(
      `SELECT id, event_type, application_status, visibility, remark, actor_email, actor_role, details, created_at
       FROM crm_application_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    ),
    listCrmApplicationDocuments(userId),
  ]);
  return { application: rows[0], tasks: tasks.rows, events: events.rows, documents };
};

export const listCrmApplicationDocuments = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT id, document_type, file_name, mime_type, octet_length(content) AS size, uploaded_by, created_at
     FROM crm_application_documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
};

export const getCrmApplicationDocument = async (userId: string, documentId: number, email: string, role: "owner" | "manager") => {
  const { rows } = await pool.query<{ file_name: string; mime_type: string; content: Buffer }>(
    `SELECT d.file_name, d.mime_type, d.content FROM crm_application_documents d
     JOIN crm_customer_profiles p ON p.user_id = d.user_id
     WHERE d.user_id = $1 AND d.id = $2 AND p.application_status IS NOT NULL
       AND ($3 = 'owner' OR p.assigned_admin_email = $4)`,
    [userId, documentId, role, email.toLowerCase()],
  );
  const document = rows[0];
  return document ? { ...document, content: decryptKycDocument(document.content) } : null;
};

export const listCrmApplicationAssignees = async () => {
  const { rows } = await pool.query<{ email: string; full_name: string; role: "manager" | "agent" }>(
    `SELECT email, full_name, role FROM admin_accounts
     WHERE role IN ('manager', 'agent') AND status = 'active' ORDER BY role, full_name`,
  );
  return {
    admins: rows.filter((row) => row.role === "manager"),
    agents: rows.filter((row) => row.role === "agent"),
  };
};

export const transitionCrmApplication = async ({
  userId, email, role, status, allowedStatuses, eventType, visibility, remark, assignedAdminEmail,
}: {
  userId: string; email: string; role: "owner" | "manager"; status: CrmApplicationStatus;
  allowedStatuses: CrmApplicationStatus[]; eventType: string;
  visibility: "customer" | "internal"; remark?: string | null; assignedAdminEmail?: string | null;
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      application_status: CrmApplicationStatus; assigned_admin_email: string | null; owner_email: string | null;
      customer_remark: string | null;
    }>(
      `SELECT p.application_status, p.assigned_admin_email, p.customer_remark, ca.owner_email
       FROM crm_customer_profiles p LEFT JOIN customer_assignments ca ON ca.user_id = p.user_id
       WHERE p.user_id = $1 AND p.application_status IS NOT NULL FOR UPDATE OF p`,
      [userId],
    );
    const current = rows[0];
    if (!current || (role === "manager" && current.assigned_admin_email !== email.toLowerCase())) {
      await client.query("ROLLBACK");
      return null;
    }
    if (!allowedStatuses.includes(current.application_status)) {
      throw new CrmApplicationConflict("The application changed stage. Refresh and try again.");
    }
    if (eventType === "send_to_superadmin") {
      const tasks = await client.query<{ total: string; incomplete: string }>(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE review_status <> 'approved') AS incomplete
         FROM crm_tasks WHERE user_id = $1 AND task_kind = 'verification'`,
        [userId],
      );
      if (Number(tasks.rows[0]?.total) === 0 || Number(tasks.rows[0]?.incomplete) > 0) {
        throw new CrmApplicationConflict("Complete and approve all verification tasks before final review.");
      }
    }
    let nextAdmin = assignedAdminEmail === undefined ? current.assigned_admin_email : assignedAdminEmail?.toLowerCase() ?? null;
    if (assignedAdminEmail) {
      const admin = await client.query(
        `SELECT email FROM admin_accounts WHERE email = $1 AND role = 'manager' AND status = 'active'`,
        [assignedAdminEmail.toLowerCase()],
      );
      if (!admin.rows[0]) throw new CrmApplicationConflict("Choose an active admin account.");
    }
    if (status === "final_review") nextAdmin = null;
    const nextRemark = remark === undefined ? current.customer_remark : remark || null;
    await client.query(
      `UPDATE crm_customer_profiles SET application_status = $2, assigned_admin_email = $3,
         customer_remark = $4, updated_by = $5, updated_at = NOW() WHERE user_id = $1`,
      [userId, status, nextAdmin, nextRemark, email.toLowerCase()],
    );
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, remark, actor_email, actor_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, eventType, status, visibility, nextRemark, email.toLowerCase(), role],
    );
    await client.query("COMMIT");
    return { ownerEmail: current.owner_email, applicationStatus: status, assignedAdminEmail: nextAdmin };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const resubmitCrmApplication = async (
  userId: string, partnerEmail: string, remark: string | null, documents: CrmApplicationDocumentInput[] = [],
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE crm_customer_profiles p SET application_status =
           CASE WHEN p.assigned_admin_email IS NULL THEN 'submitted' ELSE 'under_review' END,
        customer_remark = COALESCE($3, 'Application corrections submitted for review.'),
        updated_by = $2, updated_at = NOW()
       FROM customer_assignments ca
       WHERE p.user_id = $1 AND ca.user_id = p.user_id AND ca.owner_email = $2
         AND p.application_status = 'correction_required'
       RETURNING p.user_id, p.assigned_admin_email, p.application_status`,
      [userId, partnerEmail.toLowerCase(), remark],
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, remark, actor_email, actor_role)
       VALUES ($1, 'resubmitted', $2, 'customer', $3, $4, 'partner')`,
      [userId, rows[0].application_status, remark || "Application corrections submitted for review.", partnerEmail.toLowerCase()],
    );
    for (const document of documents) {
      await client.query(
        `INSERT INTO crm_application_documents (user_id, document_type, file_name, mime_type, content, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, document.documentType, document.fileName, document.mimeType, encryptKycDocument(document.content), partnerEmail.toLowerCase()],
      );
    }
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const createCrmVerificationTask = async ({
  userId, managerEmail, agentEmail, title, dueAt,
}: { userId: string; managerEmail: string; agentEmail: string; title: string; dueAt: string | null }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const application = await client.query<{ owner_email: string | null; application_status: CrmApplicationStatus }>(
      `SELECT ca.owner_email, p.application_status FROM crm_customer_profiles p LEFT JOIN customer_assignments ca ON ca.user_id = p.user_id
       WHERE p.user_id = $1 AND p.application_status IS NOT NULL AND p.assigned_admin_email = $2
       FOR UPDATE OF p`,
      [userId, managerEmail.toLowerCase()],
    );
    if (!application.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    if (!["approved_for_processing", "verification_assigned", "verification_in_progress", "verification_completed"].includes(application.rows[0].application_status)) {
      throw new CrmApplicationConflict("This application is not ready for verification assignment.");
    }
    const agent = await client.query(
      `SELECT email FROM admin_accounts WHERE email = $1 AND role = 'agent' AND status = 'active'`,
      [agentEmail.toLowerCase()],
    );
    if (!agent.rows[0]) throw new CrmApplicationConflict("Choose an active agent account.");
    const task = await client.query<{ id: string }>(
      `INSERT INTO crm_tasks (user_id, title, due_at, assignee_email, task_kind, review_status, created_by)
       VALUES ($1, $2, $3, $4, 'verification', 'assigned', $5) RETURNING id`,
      [userId, title, dueAt, agentEmail.toLowerCase(), managerEmail.toLowerCase()],
    );
    await client.query(
      `UPDATE crm_customer_profiles SET application_status = 'verification_assigned',
         customer_remark = 'Required verification work has been assigned.',
         updated_by = $2, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, managerEmail.toLowerCase()],
    );
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, actor_email, actor_role, details)
       VALUES ($1, 'verification_assigned', 'verification_assigned', 'internal', $2, 'manager', $3)`,
      [userId, managerEmail.toLowerCase(), JSON.stringify({ taskId: task.rows[0].id })],
    );
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, remark, actor_email, actor_role)
       VALUES ($1, 'verification_assigned', 'verification_assigned', 'customer',
         'Required verification work has been assigned.', $2, 'manager')`,
      [userId, managerEmail.toLowerCase()],
    );
    await client.query("COMMIT");
    return { id: task.rows[0].id, ownerEmail: application.rows[0].owner_email, agentEmail: agentEmail.toLowerCase() };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listMyCrmVerificationTasks = async (agentEmail: string) => {
  const { rows } = await pool.query(
    `SELECT t.id, t.user_id, ${CUSTOMER_DISPLAY_NAME} AS customer_name, t.title, t.due_at,
            t.review_status, t.review_remark, t.result, t.created_at, p.application_status
     FROM crm_tasks t JOIN users u ON u.id = t.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     LEFT JOIN crm_customer_profiles p ON p.user_id = u.id
     WHERE t.task_kind = 'verification' AND t.assignee_email = $1 AND t.review_status <> 'approved'
     ORDER BY t.due_at ASC NULLS LAST, t.created_at ASC LIMIT 200`,
    [agentEmail.toLowerCase()],
  );
  return rows;
};

export const getMyCrmVerificationTask = async (taskId: number, agentEmail: string) => {
  const task = await pool.query(
    `SELECT t.id, t.user_id, t.title, t.due_at, t.review_status, t.review_remark, t.result, t.created_at,
            u.email, u.mobile, ${CUSTOMER_DISPLAY_NAME} AS full_name,
            to_char(k.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, k.gender, k.pan_last4,
            k.address_line1, k.city, k.state, k.pincode,
            p.application_status, p.customer_remark, ca.owner_email AS partner_email
     FROM crm_tasks t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     LEFT JOIN crm_customer_profiles p ON p.user_id = u.id
     LEFT JOIN customer_assignments ca ON ca.user_id = u.id
     WHERE t.id = $1 AND t.task_kind = 'verification' AND t.assignee_email = $2`,
    [taskId, agentEmail.toLowerCase()],
  );
  if (!task.rows[0]) return null;
  const comments = await pool.query(
    `SELECT id, remark, actor_email, actor_role, created_at
     FROM crm_application_events
     WHERE user_id = $1 AND event_type = 'verification_comment' AND visibility = 'internal'
     ORDER BY created_at ASC`,
    [task.rows[0].user_id],
  );
  return { task: task.rows[0], comments: comments.rows };
};

export const addMyCrmVerificationComment = async ({
  taskId, agentEmail, comment,
}: { taskId: number; agentEmail: string; comment: string }) => {
  const task = await pool.query<{ user_id: string; review_status: string }>(
    `SELECT user_id, review_status FROM crm_tasks
     WHERE id = $1 AND task_kind = 'verification' AND assignee_email = $2`,
    [taskId, agentEmail.toLowerCase()],
  );
  const current = task.rows[0];
  if (!current) return null;
  if (current.review_status === "approved") throw new CrmApplicationConflict("Approved verification work is read-only.");
  await pool.query(
    `INSERT INTO crm_application_events (user_id, event_type, visibility, remark, actor_email, actor_role, details)
     VALUES ($1, 'verification_comment', 'internal', $2, $3, 'agent', $4)`,
    [current.user_id, comment, agentEmail.toLowerCase(), JSON.stringify({ taskId })],
  );
  return { userId: current.user_id };
};

export const updateMyCrmVerificationTask = async ({
  taskId, agentEmail, action, result,
}: { taskId: number; agentEmail: string; action: "start" | "submit"; result?: string }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const task = await client.query<{
      user_id: string; review_status: string; owner_email: string | null; assigned_admin_email: string | null;
    }>(
      `SELECT t.user_id, t.review_status, ca.owner_email, p.assigned_admin_email
       FROM crm_tasks t JOIN crm_customer_profiles p ON p.user_id = t.user_id
       LEFT JOIN customer_assignments ca ON ca.user_id = t.user_id
       WHERE t.id = $1 AND t.task_kind = 'verification' AND t.assignee_email = $2 FOR UPDATE OF t`,
      [taskId, agentEmail.toLowerCase()],
    );
    const current = task.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }
    const allowed = action === "start"
      ? ["assigned", "returned"].includes(current.review_status)
      : ["assigned", "in_progress", "returned"].includes(current.review_status);
    if (!allowed) throw new CrmApplicationConflict("This task is not ready for that action.");
    const status = action === "start" ? "in_progress" : "submitted";
    await client.query(
      `UPDATE crm_tasks SET review_status = $2, result = COALESCE($3, result) WHERE id = $1`,
      [taskId, status, result ?? null],
    );
    if (action === "start") {
      const started = await client.query(
        `UPDATE crm_customer_profiles SET application_status = 'verification_in_progress',
           customer_remark = 'Verification work is in progress.',
           updated_by = $2, updated_at = NOW()
         WHERE user_id = $1 AND application_status = 'verification_assigned'
         RETURNING user_id`,
        [current.user_id, agentEmail.toLowerCase()],
      );
      if (started.rows[0]) {
        await client.query(
          `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, remark, actor_email, actor_role)
           VALUES ($1, 'verification_started', 'verification_in_progress', 'customer',
             'Verification work is in progress.', $2, 'system')`,
          [current.user_id, agentEmail.toLowerCase()],
        );
      }
    }
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, actor_email, actor_role, details)
       VALUES ($1, $2, NULL, 'internal', $3, 'agent', $4)`,
      [current.user_id, action === "start" ? "verification_started" : "verification_submitted",
        agentEmail.toLowerCase(), JSON.stringify({ taskId })],
    );
    await client.query("COMMIT");
    return {
      userId: current.user_id, ownerEmail: current.owner_email,
      assignedAdminEmail: current.assigned_admin_email, status,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const reviewCrmVerificationTask = async ({
  taskId, email, role, action, remark,
}: { taskId: number; email: string; role: "owner" | "manager"; action: "approve" | "return"; remark: string | null }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      user_id: string; review_status: string; assignee_email: string | null;
      assigned_admin_email: string | null; owner_email: string | null;
    }>(
      `SELECT t.user_id, t.review_status, t.assignee_email, p.assigned_admin_email, ca.owner_email
       FROM crm_tasks t JOIN crm_customer_profiles p ON p.user_id = t.user_id
       LEFT JOIN customer_assignments ca ON ca.user_id = t.user_id
       WHERE t.id = $1 AND t.task_kind = 'verification' FOR UPDATE OF t, p`,
      [taskId],
    );
    const task = rows[0];
    if (!task || (role === "manager" && task.assigned_admin_email !== email.toLowerCase())) {
      await client.query("ROLLBACK");
      return null;
    }
    if (task.review_status !== "submitted") throw new CrmApplicationConflict("Only submitted verification work can be reviewed.");
    const approved = action === "approve";
    await client.query(
      `UPDATE crm_tasks SET review_status = $2, status = $3, review_remark = $4,
         completed_at = CASE WHEN $3 = 'done' THEN NOW() ELSE NULL END WHERE id = $1`,
      [taskId, approved ? "approved" : "returned", approved ? "done" : "open", remark],
    );
    let applicationStatus: CrmApplicationStatus = "verification_in_progress";
    if (approved) {
      const remaining = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM crm_tasks
         WHERE user_id = $1 AND task_kind = 'verification' AND review_status <> 'approved'`,
        [task.user_id],
      );
      if (Number(remaining.rows[0]?.count) === 0) {
        applicationStatus = "verification_completed";
        await client.query(
          `UPDATE crm_customer_profiles SET application_status = $2,
             customer_remark = 'All required verifications are complete. The application is ready for final review.',
             updated_by = $3, updated_at = NOW()
           WHERE user_id = $1`,
          [task.user_id, applicationStatus, email.toLowerCase()],
        );
      }
    }
    const customerRemark = applicationStatus === "verification_completed"
      ? "All required verifications are complete. The application is ready for final review."
      : remark;
    await client.query(
      `INSERT INTO crm_application_events (user_id, event_type, application_status, visibility, remark, actor_email, actor_role, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [task.user_id, approved ? "verification_approved" : "verification_returned",
        approved && applicationStatus === "verification_completed" ? applicationStatus : null,
        approved && applicationStatus === "verification_completed" ? "customer" : "internal",
        approved && applicationStatus === "verification_completed" ? customerRemark : remark,
        email.toLowerCase(), role, JSON.stringify({ taskId })],
    );
    await client.query("COMMIT");
    return {
      userId: task.user_id, ownerEmail: task.owner_email,
      assignedAdminEmail: task.assigned_admin_email, agentEmail: task.assignee_email, applicationStatus,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const setCrmTaskStatus = async (taskId: number, status: "open" | "done") => {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE crm_tasks SET status = $2::text, completed_at = CASE WHEN $2::text = 'done' THEN NOW() ELSE NULL END
     WHERE id = $1 RETURNING id`,
    [taskId, status],
  );
  return rows[0] ?? null;
};

export const listOpenCrmTasks = async () => {
  const { rows } = await pool.query(
    `SELECT t.id, t.user_id, t.title, t.due_at, t.assignee_email, t.created_by, t.created_at, ${CUSTOMER_DISPLAY_NAME} AS customer_name, u.mobile
     FROM crm_tasks t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     WHERE t.status = 'open'
     ORDER BY t.due_at ASC NULLS LAST, t.created_at ASC
     LIMIT 200`,
  );
  return rows;
};

export const getCrmExportRows = async () => {
  const { rows } = await pool.query(
    `SELECT ${CUSTOMER_DISPLAY_NAME} AS name, u.email, u.mobile, u.created_at,
            COALESCE(p.stage, 'new') AS stage, array_to_string(COALESCE(p.tags, '{}'), ' | ') AS tags,
            (SELECT COUNT(*) FROM payments pay WHERE pay.user_id = u.id AND pay.status = 'paid') AS paid_payments,
            (SELECT COUNT(*) FROM crm_tasks t WHERE t.user_id = u.id AND t.status = 'open') AS open_tasks
     ${crmCustomerFrom}
     ORDER BY u.created_at DESC`,
  );
  return rows;
};

// Health Assessment Requests
export const submitHealthAssessmentRequest = async ({
  userId, fullName, mobile, email, requestType, description,
}: { userId: string; fullName: string; mobile: string; email?: string; requestType: 'personal' | 'business'; description?: string }) => {
  const { rows } = await pool.query(
    `INSERT INTO health_assessment_requests (user_id, full_name, mobile, email, request_type, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, full_name, mobile, email, request_type, description, status, submitted_at, reviewed_at, reviewed_by`,
    [userId, fullName, mobile, email ?? null, requestType, description ?? null],
  );
  return rows[0];
};

export const listHealthAssessmentRequests = async (filters?: { status?: string; limit?: number; offset?: number }) => {
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  const params: unknown[] = [];
  const statusFilter = filters?.status ? `WHERE h.status = $${params.push(filters.status)}` : '';
  const limitParam = params.push(limit);
  const offsetParam = params.push(offset);

  const { rows } = await pool.query(
    `SELECT h.id, h.user_id, h.full_name, h.mobile, h.email, h.request_type, h.description, h.status, 
            h.submitted_at, h.reviewed_at, h.reviewed_by, ${CUSTOMER_DISPLAY_NAME} AS customer_name
     FROM health_assessment_requests h
     LEFT JOIN users u ON u.id = h.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     ${statusFilter}
     ORDER BY h.submitted_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );
  return rows;
};

export const getHealthAssessmentRequest = async (requestId: string) => {
  const { rows } = await pool.query(
    `SELECT h.id, h.user_id, h.full_name, h.mobile, h.email, h.request_type, h.description, h.status, 
            h.submitted_at, h.reviewed_at, h.reviewed_by, ${CUSTOMER_DISPLAY_NAME} AS customer_name
     FROM health_assessment_requests h
     LEFT JOIN users u ON u.id = h.user_id
     LEFT JOIN kyc_profiles k ON k.user_id = u.id
     WHERE h.id = $1`,
    [requestId],
  );
  return rows[0] ?? null;
};

export const updateHealthAssessmentStatus = async (requestId: string, status: 'pending' | 'reviewed' | 'closed', reviewedBy?: string) => {
  const { rows } = await pool.query(
    `UPDATE health_assessment_requests
     SET status = $2, reviewed_at = NOW(), reviewed_by = $3
     WHERE id = $1
     RETURNING id, user_id, full_name, mobile, email, request_type, description, status, submitted_at, reviewed_at, reviewed_by`,
    [requestId, status, reviewedBy ?? null],
  );
  return rows[0] ?? null;
};

// Testimonials
// The public photo URL points at our own photo endpoint when an image was uploaded; otherwise the stored link is used.
const TESTIMONIAL_COLUMNS = `id, customer_name, rating, review_text, result_description, published, submitted_at, published_at, updated_at,
  consent_obtained, consent_note, consent_recorded_at, consent_recorded_by,
  CASE WHEN photo_data IS NOT NULL THEN '/api/testimonials/' || id || '/photo?v=' || EXTRACT(EPOCH FROM updated_at)::bigint
       ELSE customer_image_url END AS customer_image_url,
  (photo_data IS NOT NULL) AS has_uploaded_photo`;

export type TestimonialInput = {
  customerName: string;
  rating: number;
  reviewText: string;
  resultDescription?: string;
  customerImageUrl?: string;
  photo?: { data: Buffer; mime: string } | null;
  removePhoto?: boolean;
  consentObtained: boolean;
  consentNote?: string;
  published: boolean;
};

export const submitTestimonial = async ({
  customerName, customerImageUrl, rating, reviewText, resultDescription,
}: { customerName: string; customerImageUrl?: string; rating: number; reviewText: string; resultDescription?: string }) => {
  const { rows } = await pool.query(
    `INSERT INTO testimonials (customer_name, customer_image_url, rating, review_text, result_description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${TESTIMONIAL_COLUMNS}`,
    [customerName, customerImageUrl ?? null, rating, reviewText, resultDescription ?? null],
  );
  return rows[0];
};

// Public listings only ever include entries that are both published and consented.
export const listTestimonials = async (publishedOnly = true) => {
  const { rows } = await pool.query(
    `SELECT ${TESTIMONIAL_COLUMNS}
     FROM testimonials
     ${publishedOnly ? 'WHERE published = true AND consent_obtained = true' : ''}
     ORDER BY published_at DESC NULLS LAST, submitted_at DESC
     LIMIT 100`,
  );
  return rows;
};

// Public callers only receive photos for published, consented entries; admins can preview drafts.
export const getTestimonialPhoto = async (testimonialId: string, publicOnly = true) => {
  const { rows } = await pool.query<{ photo_data: Buffer; photo_mime: string }>(
    `SELECT photo_data, photo_mime FROM testimonials
     WHERE id = $1 AND photo_data IS NOT NULL ${publicOnly ? 'AND published = true AND consent_obtained = true' : ''}`,
    [testimonialId],
  );
  return rows[0] ?? null;
};

export const createTestimonial = async (input: TestimonialInput, adminId: string) => {
  const published = input.published && input.consentObtained;
  const { rows } = await pool.query(
    `INSERT INTO testimonials (customer_name, customer_image_url, rating, review_text, result_description,
       photo_data, photo_mime, consent_obtained, consent_note, consent_recorded_at, consent_recorded_by, published, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $8 THEN NOW() END, CASE WHEN $8 THEN $10::text END, $11, CASE WHEN $11 THEN NOW() END)
     RETURNING ${TESTIMONIAL_COLUMNS}`,
    [input.customerName, input.customerImageUrl ?? null, input.rating, input.reviewText, input.resultDescription ?? null,
      input.photo?.data ?? null, input.photo?.mime ?? null, input.consentObtained, input.consentNote ?? null, adminId, published],
  );
  return rows[0];
};

export const updateTestimonial = async (testimonialId: string, input: TestimonialInput, adminId: string) => {
  const published = input.published && input.consentObtained;
  const { rows } = await pool.query(
    `UPDATE testimonials SET
       customer_name = $2, rating = $3, review_text = $4, result_description = $5, customer_image_url = $6,
       photo_data = CASE WHEN $7::bytea IS NOT NULL THEN $7::bytea WHEN $9 THEN NULL ELSE photo_data END,
       photo_mime = CASE WHEN $7::bytea IS NOT NULL THEN $8 WHEN $9 THEN NULL ELSE photo_mime END,
       consent_recorded_at = CASE WHEN $10 AND NOT consent_obtained THEN NOW() WHEN NOT $10 THEN NULL ELSE consent_recorded_at END,
       consent_recorded_by = CASE WHEN $10 AND NOT consent_obtained THEN $12::text WHEN NOT $10 THEN NULL ELSE consent_recorded_by END,
       consent_obtained = $10, consent_note = $11,
       published_at = CASE WHEN $13 AND NOT published THEN NOW() WHEN NOT $13 THEN NULL ELSE published_at END,
       published = $13,
       updated_at = NOW()
     WHERE id = $1
     RETURNING ${TESTIMONIAL_COLUMNS}`,
    [testimonialId, input.customerName, input.rating, input.reviewText, input.resultDescription ?? null, input.customerImageUrl ?? null,
      input.photo?.data ?? null, input.photo?.mime ?? null, Boolean(input.removePhoto), input.consentObtained, input.consentNote ?? null, adminId, published],
  );
  return rows[0] ?? null;
};

// Publishing is refused (returns "no-consent") until customer consent has been recorded.
export const setTestimonialPublished = async (testimonialId: string, published: boolean) => {
  const { rows } = await pool.query(
    `UPDATE testimonials
     SET published = $2, published_at = CASE WHEN $2 THEN NOW() ELSE NULL END, updated_at = NOW()
     WHERE id = $1 AND (NOT $2 OR consent_obtained)
     RETURNING ${TESTIMONIAL_COLUMNS}`,
    [testimonialId, published],
  );
  if (rows[0]) return rows[0];
  const exists = await pool.query(`SELECT 1 FROM testimonials WHERE id = $1`, [testimonialId]);
  return exists.rows[0] ? 'no-consent' as const : null;
};

export const deleteTestimonial = async (testimonialId: string) => {
  const { rowCount } = await pool.query(`DELETE FROM testimonials WHERE id = $1`, [testimonialId]);
  return (rowCount ?? 0) > 0;
};

// Neha Assistant - Shared Messaging Functions

export const createNehaConversation = async (customerId: string) => {
  const { rows } = await pool.query(
    `INSERT INTO neha_conversations (customer_id, status)
     VALUES ($1, 'open')
     RETURNING id, customer_id, assigned_to_id, assigned_to_role, status, created_at`,
    [customerId],
  );
  return rows[0] ?? null;
};

export const getNehaConversation = async (conversationId: string, userId?: string) => {
  const { rows } = await pool.query(
    `SELECT id, customer_id, assigned_to_id, assigned_to_role, status, created_at, closed_at
     FROM neha_conversations
     WHERE id = $1`,
    [conversationId],
  );
  return rows[0] ?? null;
};

export const listNehaConversations = async (userId: string, role: 'customer' | 'admin' | 'partner') => {
  let query = '';
  const params: (string)[] = [];
  
  if (role === 'customer') {
    query = `SELECT id, customer_id, assigned_to_id, assigned_to_role, status, created_at, closed_at
             FROM neha_conversations
             WHERE customer_id = $1
             ORDER BY created_at DESC`;
    params.push(userId);
  } else if (role === 'admin' || role === 'partner') {
    query = `SELECT id, customer_id, assigned_to_id, assigned_to_role, status, created_at, closed_at
             FROM neha_conversations
             WHERE assigned_to_id = $1 OR assigned_to_role = $2
             ORDER BY created_at DESC`;
    params.push(userId, role);
  }

  const { rows } = await pool.query(query, params);
  return rows;
};

export const saveNehaMessage = async (conversationId: string, senderId: string | null, senderType: 'customer' | 'admin' | 'partner' | 'system', senderName: string, message: string) => {
  const { rows } = await pool.query(
    `INSERT INTO neha_messages (conversation_id, sender_id, sender_type, sender_name, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, conversation_id, sender_id, sender_type, sender_name, message, created_at`,
    [conversationId, senderId ?? null, senderType, senderName, message],
  );
  return rows[0] ?? null;
};

export const getNehaMessages = async (conversationId: string, limit = 50) => {
  const { rows } = await pool.query(
    `SELECT id, conversation_id, sender_id, sender_type, sender_name, message, created_at
     FROM neha_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit],
  );
  return rows;
};

export const updateAgentStatus = async (agentId: string, agentName: string, agentRole: 'admin' | 'partner', status: 'online' | 'away' | 'offline') => {
  const { rows } = await pool.query(
    `INSERT INTO agent_status (agent_id, agent_name, agent_role, status, last_active, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (agent_id) DO UPDATE SET status = $4, last_active = NOW(), updated_at = NOW()
     RETURNING agent_id, agent_name, agent_role, status, last_active`,
    [agentId, agentName, agentRole, status],
  );
  return rows[0] ?? null;
};

export const getAvailableAgents = async () => {
  const { rows } = await pool.query(
    `SELECT agent_id, agent_name, agent_role, status, last_active
     FROM agent_status
     WHERE status IN ('online', 'away')
     ORDER BY status = 'online' DESC, last_active DESC`,
  );
  return rows;
};

export const getAllAgentStatus = async () => {
  const { rows } = await pool.query(
    `SELECT agent_id, agent_name, agent_role, status, last_active
     FROM agent_status
     ORDER BY last_active DESC`,
  );
  return rows;
};

export const assignNehaConversation = async (conversationId: string, agentId: string, agentRole: 'admin' | 'partner') => {
  const { rows } = await pool.query(
    `UPDATE neha_conversations
     SET assigned_to_id = $2, assigned_to_role = $3
     WHERE id = $1
     RETURNING id, customer_id, assigned_to_id, assigned_to_role, status, created_at`,
    [conversationId, agentId, agentRole],
  );
  return rows[0] ?? null;
};

export const closeNehaConversation = async (conversationId: string) => {
  const { rows } = await pool.query(
    `UPDATE neha_conversations
     SET status = 'closed', closed_at = NOW()
     WHERE id = $1
     RETURNING id, customer_id, assigned_to_id, assigned_to_role, status, created_at, closed_at`,
    [conversationId],
  );
  return rows[0] ?? null;
};


export const DEFAULT_CUSTOMER_PASSWORD = "Customer@123";

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
};

export class CustomerShareError extends Error {}

// Links a completed admin bureau check to the customer, creating a customer login
// (default password, forced reset on first sign-in) when the customer has no password yet.
export const shareAdminReportWithCustomer = async (auditId: number, sharedBy: string) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const audit = await client.query<{ applicant_details: { fullName?: string; mobile?: string; email?: string | null } | null; shared_user_id: string | null }>(
      `SELECT applicant_details, shared_user_id FROM admin_report_audit
       WHERE id = $1 AND status = 'completed' AND normalized_report IS NOT NULL FOR UPDATE`,
      [auditId],
    );
    if (!audit.rows[0]) throw new CustomerShareError("Completed bureau report not found.");
    const applicant = audit.rows[0].applicant_details ?? {};
    const mobile = String(applicant.mobile || "").replace(/\D/g, "");
    const email = String(applicant.email || "").trim().toLowerCase() || null;
    const fullName = String(applicant.fullName || "").trim() || "Scorenow customer";
    if (mobile.length !== 10) throw new CustomerShareError("This report has no valid customer mobile number.");

    const matches = await client.query<{ id: string; email: string | null; role: string; status: string; password_hash: string | null }>(
      `SELECT id, email, role, status, password_hash FROM users
       WHERE mobile = $1 OR ($2::text IS NOT NULL AND LOWER(email) = $2) FOR UPDATE`,
      [mobile, email],
    );
    if (matches.rows.length > 1) throw new CustomerShareError("The mobile number and email belong to different customer accounts.");
    const existing = matches.rows[0];
    if (existing && (existing.role !== "customer" || existing.status !== "active")) {
      throw new CustomerShareError("This mobile number belongs to an account that cannot receive shared reports.");
    }

    let userId: string;
    let loginCreated = false;
    let loginEmail = existing?.email ?? email;
    if (!existing) {
      if (!email) throw new CustomerShareError("Add the customer's email in the bureau check to create their login.");
      const { salt, hash } = hashPassword(DEFAULT_CUSTOMER_PASSWORD);
      const created = await client.query<{ id: string }>(
        `INSERT INTO users (mobile, email, full_name, mobile_verified, password_salt, password_hash, must_reset_password)
         VALUES ($1, $2, $3, FALSE, $4, $5, TRUE) RETURNING id`,
        [mobile, email, fullName, salt, hash],
      );
      userId = created.rows[0].id;
      loginCreated = true;
    } else {
      userId = existing.id;
      if (!existing.password_hash && loginEmail) {
        const { salt, hash } = hashPassword(DEFAULT_CUSTOMER_PASSWORD);
        await client.query(
          `UPDATE users SET email = COALESCE(email, $2), password_salt = $3, password_hash = $4,
             must_reset_password = TRUE, updated_at = NOW() WHERE id = $1`,
          [userId, loginEmail, salt, hash],
        );
        loginCreated = true;
      }
    }
    loginEmail = loginEmail ?? null;
    await client.query(
      `UPDATE admin_report_audit SET shared_user_id = $2, shared_at = NOW(), shared_by = $3 WHERE id = $1`,
      [auditId, userId, sharedBy],
    );
    await client.query("COMMIT");
    return { userId, loginCreated, loginEmail, alreadyShared: audit.rows[0].shared_user_id === userId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

// Shares a customer's application progress, plus any completed admin bureau checks run
// for the same mobile number. Partners may only share customers assigned to them.
export const shareCustomerProgress = async (userId: string, sharedBy: string, partnerEmail: string | null) => {
  if (partnerEmail) {
    const { rows } = await pool.query(
      `SELECT 1 FROM customer_assignments WHERE user_id = $1 AND owner_email = $2`,
      [userId, partnerEmail.toLowerCase()],
    );
    if (!rows[0]) throw new CustomerShareError("This customer is not assigned to you.");
  }
  const profile = await pool.query<{ mobile: string }>(
    `UPDATE crm_customer_profiles p SET progress_shared_at = NOW(), progress_shared_by = $2
     FROM users u WHERE p.user_id = $1 AND u.id = p.user_id AND p.application_status IS NOT NULL
     RETURNING u.mobile`,
    [userId, sharedBy],
  );
  if (!profile.rows[0]) throw new CustomerShareError("No application exists for this customer yet.");
  const reports = await pool.query(
    `UPDATE admin_report_audit SET shared_user_id = $1, shared_at = NOW(), shared_by = $3
     WHERE status = 'completed' AND normalized_report IS NOT NULL AND shared_user_id IS NULL
       AND applicant_details->>'mobile' = $2`,
    [userId, profile.rows[0].mobile, sharedBy],
  );
  return { reportsShared: reports.rowCount ?? 0 };
};

export const getCustomerSharedItems = async (userId: string) => {
  const [progress, timeline, reports] = await Promise.all([
    pool.query<{ status: string; remark: string | null; shared_at: string; updated_at: string }>(
      `SELECT application_status AS status, customer_remark AS remark, progress_shared_at AS shared_at, updated_at
       FROM crm_customer_profiles WHERE user_id = $1 AND progress_shared_at IS NOT NULL AND application_status IS NOT NULL`,
      [userId],
    ),
    pool.query<{ status: string; remark: string | null; created_at: string }>(
      `SELECT application_status AS status, remark, created_at FROM crm_application_events
       WHERE user_id = $1 AND visibility = 'customer' AND application_status IS NOT NULL ORDER BY created_at`,
      [userId],
    ),
    pool.query<{ id: string; bureau: string; credit_score: number | null; report_date: string; shared_at: string }>(
      `SELECT id::text, bureau, credit_score, to_char(COALESCE(completed_at, created_at), 'YYYY-MM-DD') AS report_date, shared_at
       FROM admin_report_audit WHERE shared_user_id = $1 AND status = 'completed' ORDER BY shared_at DESC`,
      [userId],
    ),
  ]);
  return {
    progress: progress.rows[0] ? { ...progress.rows[0], timeline: timeline.rows } : null,
    reports: reports.rows,
  };
};

export const getSharedReportForCustomer = async (userId: string, auditId: number) => {
  const { rows } = await pool.query(`SELECT 1 FROM admin_report_audit WHERE id = $1 AND shared_user_id = $2`, [auditId, userId]);
  return rows[0] ? getAdminReportDocument(auditId) : null;
};

export const changeCustomerPassword = async (userId: string, newPassword: string, currentPassword: string | null) => {
  const { rows } = await pool.query<{ password_salt: string | null; password_hash: string | null; must_reset_password: boolean }>(
    `SELECT password_salt, password_hash, must_reset_password FROM users WHERE id = $1 AND role = 'customer' AND status = 'active'`,
    [userId],
  );
  const user = rows[0];
  if (!user) return "not_found" as const;
  if (!user.must_reset_password && user.password_salt && user.password_hash) {
    const candidate = scryptSync(currentPassword ?? "", user.password_salt, 64);
    if (!timingSafeEqual(candidate, Buffer.from(user.password_hash, "hex"))) return "wrong_password" as const;
  }
  const { salt, hash } = hashPassword(newPassword);
  await pool.query(
    `UPDATE users SET password_salt = $2, password_hash = $3, must_reset_password = FALSE, updated_at = NOW() WHERE id = $1`,
    [userId, salt, hash],
  );
  return "ok" as const;
};


// Built-in agent departments. [key, label, can run bureau checks by default]
export const DEFAULT_AGENT_TYPES: ReadonlyArray<readonly [string, string, boolean]> = [
  ["credit_bureau", "Credit bureau agent", true],
  ["verification", "Field / verification agent", true],
  ["customer_handling", "Customer handling", true],
  ["call_center", "Call center", false],
  ["collections", "Collections", false],
  ["documentation", "Documentation / KYC", false],
  ["sales", "Sales / telecalling", false],
  ["legal_hearing", "Legal hearing", false],
  ["hr", "HR", false],
];

export type AgentType = { key: string; label: string; can_check_bureau: boolean; built_in: boolean; agent_count: number };

export const listAgentTypes = async () => {
  const { rows } = await pool.query<AgentType>(
    `SELECT t.key, t.label, t.can_check_bureau, t.built_in,
            (SELECT COUNT(*)::int FROM admin_accounts a WHERE a.agent_type = t.key) AS agent_count
     FROM agent_types t ORDER BY t.built_in DESC, t.label`,
  );
  return rows;
};

export const createAgentType = async (label: string, canCheckBureau: boolean) => {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "agent_type";
  const { rows } = await pool.query<{ key: string }>(
    `INSERT INTO agent_types (key, label, can_check_bureau)
     VALUES ($1 || CASE WHEN EXISTS (SELECT 1 FROM agent_types WHERE key = $1) THEN '_' || substr(md5(random()::text), 1, 4) ELSE '' END, $2, $3)
     RETURNING key`,
    [base, label, canCheckBureau],
  );
  return rows[0].key;
};

export const updateAgentType = async (key: string, changes: { label?: string; canCheckBureau?: boolean }) => {
  const { rowCount } = await pool.query(
    `UPDATE agent_types SET label = COALESCE($2, label), can_check_bureau = COALESCE($3, can_check_bureau) WHERE key = $1`,
    [key, changes.label ?? null, changes.canCheckBureau ?? null],
  );
  return Boolean(rowCount);
};

export const deleteAgentType = async (key: string) => {
  const { rowCount } = await pool.query(`DELETE FROM agent_types WHERE key = $1 AND built_in = FALSE`, [key]);
  return Boolean(rowCount);
};

export const listAgentsWithTypes = async () => {
  const { rows } = await pool.query<{
    email: string; full_name: string; status: string; parent_email: string | null; agent_type: string | null;
  }>(
    `SELECT email, full_name, status, parent_email, agent_type FROM admin_accounts
     WHERE role = 'agent' AND status IN ('active', 'invited', 'disabled') ORDER BY full_name`,
  );
  return rows;
};

export const setAgentType = async (email: string, agentType: string | null) => {
  const { rowCount } = await pool.query(
    `UPDATE admin_accounts SET agent_type = $2, updated_at = NOW()
     WHERE email = $1 AND role = 'agent' AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM agent_types WHERE key = $2))`,
    [email.toLowerCase(), agentType],
  );
  return Boolean(rowCount);
};
