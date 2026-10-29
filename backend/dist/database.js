import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { scoreBand } from "./bureaus.js";
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
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await pool.query(`ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE website_inquiries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS report_bureau TEXT`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE credit_report_requests ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id)`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_url TEXT`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS raw_report JSONB`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS normalized_report JSONB`);
    await pool.query(`ALTER TABLE credit_report_requests ADD COLUMN IF NOT EXISTS provider_response JSONB`);
    await pool.query(`ALTER TABLE credit_reports ADD COLUMN IF NOT EXISTS report_pdf BYTEA`);
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
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
       AND u.status = 'active' AND u.role = 'customer'`, [hashToken(token)]);
    return rows[0] ?? null;
};
export const revokeSession = async (token) => {
    await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)]);
};
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const createAdminSession = async ({ adminId, role = "owner", ipAddress, userAgent }) => {
    const token = randomBytes(32).toString("hex");
    await pool.query(`INSERT INTO admin_sessions (token_hash, admin_id, role, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`, [hashToken(token), adminId, role, ipAddress || null, userAgent?.slice(0, 500) || null, new Date(Date.now() + ADMIN_SESSION_TTL_MS)]);
    return token;
};
export const findAdminSession = async (token) => {
    if (!/^[0-9a-f]{64}$/.test(token))
        return null;
    const { rows } = await pool.query(`SELECT s.admin_id, COALESCE(a.role, s.role) AS role
     FROM admin_sessions s
     LEFT JOIN admin_accounts a ON a.email = s.admin_id AND a.status = 'active'
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
       AND (a.id IS NOT NULL OR s.admin_id = $2)`, [hashToken(token), process.env.ADMIN_LOGIN_ID || ""]);
    return rows[0] ?? null;
};
export const revokeAdminSession = async (token) => {
    await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)]);
};
const deriveAdminSecret = (secret, salt) => scryptSync(secret, salt, 64).toString("hex");
export const authenticateDatabaseAdmin = async (email, password, pin) => {
    const { rows } = await pool.query(`SELECT email, password_salt, password_hash, pin_salt, pin_hash, role
     FROM admin_accounts WHERE email = $1 AND status = 'active'`, [email.toLowerCase()]);
    const account = rows[0];
    if (!account)
        return null;
    const passwordCandidate = Buffer.from(deriveAdminSecret(password, account.password_salt), "hex");
    const pinCandidate = Buffer.from(deriveAdminSecret(pin, account.pin_salt), "hex");
    const passwordHash = Buffer.from(account.password_hash, "hex");
    const pinHash = Buffer.from(account.pin_hash, "hex");
    if (passwordCandidate.length !== passwordHash.length || pinCandidate.length !== pinHash.length ||
        !timingSafeEqual(passwordCandidate, passwordHash) || !timingSafeEqual(pinCandidate, pinHash))
        return null;
    return { adminId: account.email, role: account.role };
};
export const createAdminInvitation = async ({ email, fullName, role, invitedBy, }) => {
    const token = randomBytes(32).toString("hex");
    const { rows } = await pool.query(`INSERT INTO admin_accounts (email, full_name, role, status, invitation_token_hash, invitation_expires_at, invited_by)
     VALUES ($1, $2, $3, 'invited', $4, NOW() + INTERVAL '48 hours', $5)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       invitation_token_hash = EXCLUDED.invitation_token_hash,
       invitation_expires_at = EXCLUDED.invitation_expires_at,
       invited_by = EXCLUDED.invited_by,
       updated_at = NOW()
     WHERE admin_accounts.status = 'invited' AND admin_accounts.invitation_expires_at <= NOW()
     RETURNING email`, [email.toLowerCase(), fullName, role, hashToken(token), invitedBy]);
    if (!rows[0])
        throw new Error("An active, unexpired, or previously accepted admin invitation already exists for this email.");
    return { ...rows[0], token };
};
export const acceptAdminInvitation = async ({ token, password, pin }) => {
    const passwordSalt = randomBytes(16).toString("hex");
    const pinSalt = randomBytes(16).toString("hex");
    const { rows } = await pool.query(`UPDATE admin_accounts SET status = 'active', password_salt = $2, password_hash = $3,
       pin_salt = $4, pin_hash = $5, invitation_token_hash = NULL, invitation_expires_at = NULL, updated_at = NOW()
     WHERE invitation_token_hash = $1 AND status = 'invited' AND invitation_expires_at > NOW()
     RETURNING email, role`, [hashToken(token), passwordSalt, deriveAdminSecret(password, passwordSalt), pinSalt, deriveAdminSecret(pin, pinSalt)]);
    return rows[0] ?? null;
};
export const listAdminAccounts = async () => {
    const { rows } = await pool.query(`SELECT email, full_name, role, status, created_at FROM admin_accounts ORDER BY created_at DESC LIMIT 200`);
    return rows;
};
export const setAdminAccountStatus = async (email, status) => {
    const { rowCount } = await pool.query(`UPDATE admin_accounts SET status = $2, updated_at = NOW() WHERE email = $1 AND status IN ('active', 'disabled')`, [email.toLowerCase(), status]);
    if (rowCount)
        await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = $1 AND revoked_at IS NULL`, [email.toLowerCase()]);
    return (rowCount ?? 0) > 0;
};
export const createAdminReportAudit = async ({ adminId, bureau, panLast4, mobileLast4, consentIpAddress, applicant, }) => {
    const { rows } = await pool.query(`INSERT INTO admin_report_audit
       (admin_id, bureau, pan_last4, pan_hash, mobile_last4, consent_granted, consent_text_version, consent_ip_address, status, applicant_details)
     VALUES ($1, $2, $3, $4, $5, TRUE, 'admin-client-consent-v1', $6, 'processing', $7)
     RETURNING id`, [adminId, bureau, panLast4, createHash("sha256").update(applicant.pan.toUpperCase()).digest("hex"),
        mobileLast4, consentIpAddress, JSON.stringify({ ...applicant, pan: undefined })]);
    return rows[0].id;
};
export const completeAdminReportAudit = async ({ auditId, status, providerTransactionId, creditScore, failureReason, providerResponse, normalizedReport, }) => {
    await pool.query(`UPDATE admin_report_audit SET status = $2, provider_transaction_id = $3, credit_score = $4,
       failure_reason = $5, provider_response = $6, normalized_report = $7, completed_at = NOW()
     WHERE id = $1`, [auditId, status, providerTransactionId, creditScore, failureReason?.slice(0, 500) ?? null,
        providerResponse == null ? null : JSON.stringify(providerResponse),
        normalizedReport == null ? null : JSON.stringify(normalizedReport)]);
};
export const getAdminReportDocument = async (auditId) => {
    const { rows } = await pool.query(`SELECT id, bureau, to_char(COALESCE(completed_at, created_at), 'YYYY-MM-DD') AS report_date, normalized_report
     FROM admin_report_audit
     WHERE id = $1 AND status = 'completed' AND normalized_report IS NOT NULL`, [auditId]);
    const row = rows[0];
    return row ? {
        id: row.id,
        bureau: row.bureau,
        reportDate: row.report_date,
        report: row.normalized_report,
    } : null;
};
export const getAdminActivity = async (requestedPage = 1) => {
    const pageSize = 50;
    const page = Math.max(1, Math.floor(requestedPage));
    const [summaryResult, paymentResult, reportResult] = await Promise.all([
        pool.query(`
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
        pool.query(`
      SELECT p.id, u.full_name, RIGHT(u.mobile, 4) AS mobile_last4, p.report_bureau AS bureau,
             p.amount, p.gst_amount, p.gateway, p.status, p.failure_reason, p.created_at, p.paid_at, p.failure_at,
             r.status AS report_status, r.failure_reason AS report_failure_reason
      FROM payments p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN credit_report_requests r ON r.payment_id = p.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [pageSize, (page - 1) * pageSize]),
        pool.query(`
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
            totalPayments: Number(summary.total_payments),
            totalAdminReports: Number(summary.total_admin_reports),
        },
    };
};
export const getAdminCustomers = async (search, requestedPage = 1) => {
    const pageSize = 50;
    const page = Math.max(1, Math.floor(requestedPage));
    const normalizedSearch = search.trim();
    const panSearch = /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(normalizedSearch)
        ? normalizedSearch.toUpperCase()
        : null;
    const panHash = panSearch ? createHash("sha256").update(panSearch).digest("hex") : null;
    const pattern = `%${normalizedSearch}%`;
    const filter = normalizedSearch
        ? `(u.full_name ILIKE $1 OR u.mobile ILIKE $2 OR COALESCE(u.email, '') ILIKE $1
        OR ($3::text IS NOT NULL AND k.pan_hash = $3))`
        : "TRUE";
    const values = normalizedSearch ? [pattern, pattern, panHash] : [];
    const [customers, count, manualChecks] = await Promise.all([
        pool.query(`SELECT u.id, u.full_name, u.mobile, u.email, u.status, u.created_at, k.pan_last4, k.kyc_status,
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
       GROUP BY u.id, k.user_id, k.pan_last4, k.kyc_status
       ORDER BY u.created_at DESC
       LIMIT $${normalizedSearch ? "4" : "1"} OFFSET $${normalizedSearch ? "5" : "2"}`, normalizedSearch ? [...values, pageSize, (page - 1) * pageSize] : [pageSize, (page - 1) * pageSize]),
        pool.query(`SELECT COUNT(DISTINCT u.id) AS count FROM users u LEFT JOIN kyc_profiles k ON k.user_id = u.id WHERE ${filter}`, values),
        panSearch
            ? pool.query(`SELECT id, applicant_details->>'fullName' AS full_name, bureau, status, credit_score,
                failure_reason, mobile_last4, admin_id, created_at, completed_at
         FROM admin_report_audit
         WHERE pan_hash = $1 OR upper(applicant_details->>'pan') = $2
         ORDER BY created_at DESC LIMIT 50`, [panHash, panSearch])
            : Promise.resolve({ rows: [] }),
    ]);
    return {
        customers: customers.rows,
        manualChecks: manualChecks.rows,
        pagination: { page, pageSize, total: Number(count.rows[0]?.count ?? 0) },
    };
};
export const getAdminAnalytics = async () => {
    const [summary, trend, funnel] = await Promise.all([
        pool.query(`
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
        pool.query(`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
        (SELECT COUNT(*) FROM users u WHERE u.created_at >= days.day AND u.created_at < days.day + INTERVAL '1 day' AND u.role = 'customer') AS signups,
        (SELECT COUNT(*) FROM payments p WHERE p.paid_at >= days.day AND p.paid_at < days.day + INTERVAL '1 day') AS paid_orders,
        (SELECT COALESCE(SUM(p.amount + p.gst_amount), 0) FROM payments p WHERE p.paid_at >= days.day AND p.paid_at < days.day + INTERVAL '1 day') AS revenue,
        (SELECT COUNT(*) FROM payments p WHERE p.failure_at >= days.day AND p.failure_at < days.day + INTERVAL '1 day') AS failed_attempts
      FROM days ORDER BY days.day
    `),
        pool.query(`
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
export const listSupportTickets = async (status, userId = null) => {
    const allowedStatuses = ["open", "in_progress", "resolved", "closed"];
    const filterStatus = allowedStatuses.includes(status) ? status : null;
    const { rows } = await pool.query(`SELECT id, requester_name, requester_mobile, subject, message, status, priority, assigned_to, created_by, created_at, updated_at
     FROM support_tickets
     WHERE user_id IS NOT NULL AND ($1::text IS NULL OR status = $1) AND ($2::uuid IS NULL OR user_id = $2)
     ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC
     LIMIT 200`, [filterStatus, userId]);
    if (!rows.length)
        return rows.map((ticket) => ({ ...ticket, comments: [] }));
    const { rows: comments } = await pool.query(`SELECT id, ticket_id, author_type, author_id, author_name, message, created_at
     FROM support_ticket_comments WHERE ticket_id = ANY($1::uuid[]) ORDER BY created_at`, [rows.map((ticket) => ticket.id)]);
    const commentsByTicket = new Map();
    for (const comment of comments) {
        const ticketComments = commentsByTicket.get(comment.ticket_id) ?? [];
        ticketComments.push(comment);
        commentsByTicket.set(comment.ticket_id, ticketComments);
    }
    return rows.map((ticket) => ({ ...ticket, comments: commentsByTicket.get(ticket.id) ?? [] }));
};
export const createSupportTicket = async ({ requesterName, requesterMobile, subject, message, priority, createdBy, userId = null, }) => {
    const { rows } = await pool.query(`INSERT INTO support_tickets (user_id, requester_name, requester_mobile, subject, message, status, priority, created_by)
     VALUES ($1, $2, $3, $4, $5, 'open', $6, $7) RETURNING id`, [userId, requesterName, requesterMobile, subject, message, priority, createdBy]);
    return rows[0].id;
};
export const addSupportTicketComment = async ({ ticketId, authorType, authorId, authorName, message, userId = null, }) => {
    const { rows } = await pool.query(`INSERT INTO support_ticket_comments (ticket_id, author_type, author_id, author_name, message)
     SELECT id, $2, $3, $4, $5 FROM support_tickets
     WHERE id = $1 AND user_id IS NOT NULL AND ($6::uuid IS NULL OR user_id = $6)
       AND ($2 = 'admin' OR status <> 'closed')
     RETURNING id`, [ticketId, authorType, authorId, authorName, message, userId]);
    if (!rows[0])
        return false;
    await pool.query(`UPDATE support_tickets SET
       status = CASE WHEN $2 = 'customer' AND status = 'resolved' THEN 'open' ELSE status END,
       updated_at = NOW()
     WHERE id = $1`, [ticketId, authorType]);
    return true;
};
export const updateSupportTicket = async (id, status, assignedTo) => {
    if (!["open", "in_progress", "resolved", "closed"].includes(status))
        return false;
    const { rowCount } = await pool.query(`UPDATE support_tickets SET status = $2, assigned_to = $3, updated_at = NOW() WHERE id = $1`, [id, status, assignedTo]);
    return (rowCount ?? 0) > 0;
};
export const createCustomerInvitation = async ({ fullName, mobile, email, invitedBy, }) => {
    const { rows: existingUsers } = await pool.query(`SELECT id FROM users WHERE mobile = $1 AND role = 'customer' LIMIT 1`, [mobile]);
    if (existingUsers.length)
        throw new Error("An account already exists for this mobile number.");
    const { rows: pendingInvites } = await pool.query(`SELECT id FROM customer_invites WHERE mobile = $1 AND status = 'invited' ORDER BY created_at DESC LIMIT 1`, [mobile]);
    if (pendingInvites[0]) {
        const { rows } = await pool.query(`UPDATE customer_invites SET full_name = $2, email = $3, invited_by = $4, created_at = NOW()
       WHERE id = $1 RETURNING id`, [pendingInvites[0].id, fullName, email, invitedBy]);
        return rows[0].id;
    }
    const { rows } = await pool.query(`INSERT INTO customer_invites (full_name, mobile, email, status, invited_by)
     VALUES ($1, $2, $3, 'invited', $4) RETURNING id`, [fullName, mobile, email, invitedBy]);
    return rows[0].id;
};
export const listCustomerInvitations = async () => {
    const { rows } = await pool.query(`SELECT id, full_name, mobile, email, status, created_at FROM customer_invites ORDER BY created_at DESC LIMIT 100`);
    return rows;
};
export const cancelCustomerInvitation = async (id) => {
    const { rowCount } = await pool.query(`UPDATE customer_invites SET status = 'cancelled' WHERE id = $1 AND status = 'invited'`, [id]);
    return (rowCount ?? 0) > 0;
};
export const listAdminUsers = async () => {
    const { rows } = await pool.query(`
    SELECT u.id, u.full_name, u.mobile, u.email, u.role, u.status, u.created_at,
           (SELECT MAX(s.created_at) FROM user_sessions s WHERE s.user_id = u.id) AS last_login
    FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC LIMIT 200
  `);
    return rows;
};
export const setCustomerAccountStatus = async (userId, status) => {
    const { rowCount } = await pool.query(`UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 AND role = 'customer'`, [userId, status]);
    if (status === "blocked" && rowCount) {
        await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
    }
    return (rowCount ?? 0) > 0;
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
    const inviteResult = await pool.query(`SELECT full_name, email FROM customer_invites
     WHERE mobile = $1 AND status = 'invited' ORDER BY created_at DESC LIMIT 1`, [mobile]);
    const { rows } = await pool.query(`INSERT INTO users (mobile, full_name, mobile_verified)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (mobile) DO UPDATE
       SET mobile_verified = TRUE,
           updated_at = NOW()
     RETURNING id, mobile, email, full_name, email_verified, status`, [mobile, fullName?.trim() || inviteResult.rows[0]?.full_name || "Score Now User"]);
    const user = rows[0];
    if (user.status !== "active")
        throw new Error("This account is currently disabled. Please contact support.");
    if (inviteResult.rows[0]) {
        await pool.query(`UPDATE customer_invites SET status = 'claimed', claimed_at = NOW() WHERE mobile = $1 AND status = 'invited'`, [mobile]);
    }
    if (!user.email && email) {
        try {
            const { rows: updated } = await pool.query(`UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, mobile, email, full_name, email_verified, status`, [email, user.id]);
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
    const { rows } = await pool.query(`SELECT id, mobile, email, full_name, email_verified FROM users WHERE LOWER(email) = $1 AND status = 'active' AND role = 'customer'`, [email]);
    return rows[0] ?? null;
};
export const setCustomerPassword = async (userId, email, password) => {
    const salt = randomBytes(16).toString("hex");
    const passwordHash = scryptSync(password, salt, 64).toString("hex");
    const { rows } = await pool.query(`UPDATE users SET email = COALESCE(email, $2), password_salt = $3, password_hash = $4, updated_at = NOW()
     WHERE id = $1 AND role = 'customer' AND status = 'active'
       AND (email IS NULL OR LOWER(email) = $2)
     RETURNING id`, [userId, email, salt, passwordHash]);
    return Boolean(rows[0]);
};
export const authenticateCustomerByEmail = async (email, password) => {
    const { rows } = await pool.query(`SELECT id, mobile, email, full_name, password_salt, password_hash
     FROM users WHERE LOWER(email) = $1 AND status = 'active' AND role = 'customer'`, [email]);
    const user = rows[0];
    if (!user?.password_salt || !user.password_hash || !/^[0-9a-f]{32}$/.test(user.password_salt) ||
        !/^[0-9a-f]{128}$/.test(user.password_hash))
        return null;
    const candidate = scryptSync(password, user.password_salt, 64);
    const expected = Buffer.from(user.password_hash, "hex");
    if (!timingSafeEqual(candidate, expected))
        return null;
    return { id: user.id, mobile: user.mobile, email: user.email, full_name: user.full_name };
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
const persistNormalizedReport = async (reportId, report) => {
    await pool.query(`UPDATE credit_reports SET normalized_report = $2, credit_score = $3, score_band = $4,
       total_accounts = $5, active_accounts = $6, overdue_accounts = $7,
       enquiries_last_6_months = $8, total_outstanding = $9
     WHERE id = $1`, [reportId, JSON.stringify(report), report.score, scoreBand(report.score), report.summary.totalAccounts,
        report.summary.activeAccounts, report.summary.overdueAccounts, report.summary.enquiriesLast6Months,
        report.summary.totalBalance]);
};
// Demo requests have no payment; they only exist when REPORTS_DEMO_MODE is on outside production.
const VISIBLE_REQUEST = `(r.payment_id IS NOT NULL OR r.provider = 'demo')`;
export const getDashboardStatus = async (userId) => {
    const [profileResult, reportResult] = await Promise.all([
        pool.query(`SELECT id, name_as_per_pan, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, city, state, pan_last4, kyc_status
       FROM kyc_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId]),
        pool.query(`SELECT DISTINCT ON (r.bureau)
         r.id AS request_id, r.bureau, r.status, r.failure_reason, r.requested_at, r.provider = 'demo' AS is_demo,
         c.credit_score, c.score_band, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_url,
         c.total_accounts, c.active_accounts, c.overdue_accounts, c.enquiries_last_6_months, c.total_outstanding,
         c.id AS credit_report_id, c.raw_report, c.normalized_report
       FROM credit_report_requests r
       LEFT JOIN credit_reports c ON c.request_id = r.id
       WHERE r.user_id = $1 AND ${VISIBLE_REQUEST}
       ORDER BY r.bureau, r.requested_at DESC`, [userId]),
    ]);
    const reports = await Promise.all(reportResult.rows.map(async (row) => {
        const { credit_report_id, raw_report, normalized_report, ...dashboardRow } = row;
        if (!credit_report_id || !raw_report || normalized_report?.parserVersion === PARSER_VERSION)
            return dashboardRow;
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
        };
    }));
    return { profile: profileResult.rows[0] ?? null, reports };
};
export const createReportPayment = async ({ userId, bureau, orderId, amount, gstAmount, gateway, }) => {
    await pool.query(`INSERT INTO payments (user_id, gateway, gateway_order_id, amount, gst_amount, status, report_bureau)
     VALUES ($1, $6, $2, $3, $4, 'created', $5)`, [userId, orderId, amount, gstAmount, bureau, gateway]);
};
export const findReportPayment = async (userId, orderId) => {
    const { rows } = await pool.query(`SELECT id, status, gateway, report_bureau FROM payments WHERE user_id = $1 AND gateway_order_id = $2`, [userId, orderId]);
    return rows[0] ?? null;
};
export const markPaymentFailed = async (paymentId, failureReason) => {
    await pool.query(`UPDATE payments SET status = 'failed', failure_reason = $2, failure_at = NOW() WHERE id = $1 AND status = 'created'`, [paymentId, failureReason.slice(0, 500)]);
};
export const recordPaymentFailure = async (paymentId) => {
    await pool.query(`UPDATE payments SET failure_reason = 'The payment gateway reported a failed payment attempt.', failure_at = NOW()
     WHERE id = $1 AND status = 'created'`, [paymentId]);
};
// Marks the payment paid and opens its report request exactly once, even if verify is called twice.
export const markPaymentPaidAndCreateRequest = async ({ userId, paymentDbId, gatewayPaymentId, bureau, }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const paid = await client.query(`UPDATE payments SET status = 'paid', gateway_payment_id = $2, failure_reason = NULL, failure_at = NULL, paid_at = NOW()
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
export const getReportPdf = async (userId, requestId) => {
    const { rows } = await pool.query(`SELECT c.request_id, c.bureau, to_char(c.report_date, 'YYYY-MM-DD') AS report_date, c.report_pdf,
            c.raw_report, c.normalized_report
     FROM credit_reports c JOIN credit_report_requests r ON r.id = c.request_id
     WHERE c.request_id::text = $1 AND c.user_id = $2 AND ${VISIBLE_REQUEST}`, [requestId, userId]);
    const row = rows[0];
    if (!row)
        return null;
    let report = row.normalized_report;
    if (!report || report.parserVersion !== PARSER_VERSION) {
        report = normalizeReport(row.bureau, row.raw_report);
        await persistNormalizedReport(row.request_id, report);
    }
    return {
        requestId: row.request_id,
        bureau: row.bureau,
        reportDate: row.report_date,
        pdf: row.report_pdf,
        raw: row.report_pdf ? null : row.raw_report,
        report,
    };
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
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO website_inquiries (user_id, full_name, mobile, concern, score_range)
       VALUES ($1, $2, $3, $4, $5)`, [userId, fullName, mobile, concern, scoreRange]);
        await client.query(`INSERT INTO support_tickets
         (user_id, requester_name, requester_mobile, subject, message, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, 'open', 'normal', 'website-inquiry')`, [userId, fullName, mobile, concern.slice(0, 180), `${concern}\nCredit score range: ${scoreRange}`]);
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
