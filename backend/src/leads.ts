import { randomBytes, scryptSync } from "node:crypto";
import type { PoolClient } from "pg";
import { DEFAULT_CUSTOMER_PASSWORD, pool } from "./database.js";

export const LEAD_SOURCES = ["Franchise partner", "Google Ads", "TATA AIG referral", "Website form", "WhatsApp", "Walk-in"] as const;
export const LEAD_PRODUCTS = ["CIBIL check", "Credit report", "Dispute support", "Credit score repair", "Car insurance", "Loan assistance", "Health insurance"] as const;
// Only credit products run the dispute ladder; insurance and loan leads never escalate to the bank or RBI.
export const DISPUTE_PRODUCTS: readonly string[] = ["CIBIL check", "Credit report", "Dispute support", "Credit score repair"];
export const LEAD_STATUSES = ["new", "contacted", "follow_up", "converted", "lost"] as const;
export const WORK_STEPS = ["Call customer", "Collect documents", "Bank details", "Payment", "Submit request", "Work done"] as const;
export const DISPUTE_STAGES = ["Online dispute", "Manual dispute", "Call customer care", "Email to bank", "Grievance", "RBI complaint", "Resolved"] as const;
export const DISPUTE_SLA_DAYS = [15, 15, 7, 15, 30, 30] as const;
export const DISPUTE_HOW = [
  "Raise the dispute online on the bureau portal and send the dispute email with proof.",
  "Raise a manual dispute: send a signed letter and documents to the bureau.",
  "Call customer care of the bureau or bank, raise the dispute and note the ticket number.",
  "Email the bank directly with proof and ask for correction of the report.",
  "File a grievance with the bank: no solution in 30 days or the reply was not satisfactory.",
  "Raise a complaint with the Reserve Bank of India (Ombudsman) and attach all earlier replies.",
] as const;
export const BUREAUS = ["CIBIL", "Experian", "Equifax", "CRIF High Mark"] as const;
export const PARTNER_STAGES = ["New Lead", "Contacted", "Interested", "Customer Agreed", "Bank Details Pending", "Documents Pending", "Payment Pending", "Request Submitted"] as const;
export const FOLLOW_UP_OUTCOMES = ["Spoke to customer", "No answer", "Call back later", "Documents received", "Not interested"] as const;

type LeadStatus = (typeof LEAD_STATUSES)[number];
type Scores = Record<string, { from: number; to: number }>;
export type LeadViewer = { email: string; role: string };
export class LeadError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

type LeadRow = {
  id: string; name: string; phone: string; email: string | null; product: string; source: string
  partner_email: string | null; partner_name: string | null; partner_stage: string | null; status: LeadStatus; step: number
  next_call: string; received: string; dispute_stage: number | null; stage_started: string | null
  scores: Scores; target_score: number; cmr_rank: number | null; payment_pending: number
  acceptance: string | null; acceptance_reason: string | null; user_id: string | null; created_by: string; updated_at: string
  dispute_bureau: string | null
};

type Mailer = (to: string, subject: string, text: string) => Promise<boolean>;
let mailer: Mailer | null = null;
export const setLeadMailer = (send: Mailer) => { mailer = send; };

export const initializeLeads = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      product TEXT NOT NULL,
      source TEXT NOT NULL,
      partner_email TEXT,
      partner_stage TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'follow_up', 'converted', 'lost')),
      step SMALLINT NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 5),
      next_call DATE NOT NULL DEFAULT CURRENT_DATE,
      dispute_stage SMALLINT CHECK (dispute_stage BETWEEN 0 AND 6),
      stage_started DATE,
      scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      target_score SMALLINT NOT NULL DEFAULT 700,
      cmr_rank SMALLINT CHECK (cmr_rank BETWEEN 1 AND 10),
      payment_pending INTEGER NOT NULL DEFAULT 0 CHECK (payment_pending >= 0),
      acceptance TEXT CHECK (acceptance IN ('pending', 'accepted', 'rejected')),
      acceptance_reason TEXT,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_leads_partner_idx ON crm_leads (partner_email)`);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS area TEXT`);
  await pool.query(`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS dispute_bureau TEXT`);
  // Customers already imported into the lead desk; kept so a lead deleted by an Admin is not imported again.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_lead_synced_users (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_lead_log (
      id BIGSERIAL PRIMARY KEY,
      lead_id BIGINT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS crm_lead_log_lead_idx ON crm_lead_log (lead_id, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_lead_notifications (
      id BIGSERIAL PRIMARY KEY,
      lead_id BIGINT REFERENCES crm_leads(id) ON DELETE SET NULL,
      partner_email TEXT,
      lead_name TEXT NOT NULL,
      to_email TEXT,
      body TEXT NOT NULL,
      delivery TEXT NOT NULL DEFAULT 'pending' CHECK (delivery IN ('pending', 'sent', 'not_sent', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const LEAD_COLUMNS = `l.id::text AS id, l.name, l.phone, l.email, l.product, l.source, l.partner_email, a.full_name AS partner_name,
  l.partner_stage, l.status, l.step, to_char(l.next_call, 'YYYY-MM-DD') AS next_call, to_char(l.created_at, 'YYYY-MM-DD') AS received,
  l.dispute_stage, to_char(l.stage_started, 'YYYY-MM-DD') AS stage_started, l.scores, l.target_score, l.cmr_rank, l.payment_pending,
  l.acceptance, l.acceptance_reason, l.user_id, l.created_by, l.updated_at, l.dispute_bureau`;
const LEAD_FROM = `crm_leads l LEFT JOIN admin_accounts a ON LOWER(a.email) = LOWER(l.partner_email)`;

// Partners see their own leads; agents created by a partner see that partner's leads; everyone else sees all.
const leadScope = async (viewer: LeadViewer): Promise<string | null> => {
  if (viewer.role === "partner") return viewer.email.toLowerCase();
  if (viewer.role === "agent") {
    const { rows } = await pool.query<{ parent_email: string | null }>(
      `SELECT c.parent_email FROM admin_accounts c JOIN admin_accounts p ON LOWER(p.email) = LOWER(c.parent_email) AND p.role = 'partner'
       WHERE LOWER(c.email) = LOWER($1)`,
      [viewer.email],
    );
    return rows[0]?.parent_email?.toLowerCase() ?? null;
  }
  return null;
};

const canDecide = (viewer: LeadViewer, scope: string | null) => scope === null && ["owner", "manager", "support", "agent"].includes(viewer.role);
const canDelete = (viewer: LeadViewer) => viewer.role === "owner" || viewer.role === "manager";

const today = async (client: PoolClient | typeof pool = pool) =>
  (await client.query<{ d: string }>(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d`)).rows[0].d;

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

const cleanText = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const cleanPhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};
const cleanEmail = (value: unknown) => {
  const email = cleanText(value, 200).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new LeadError("Enter a valid customer email.");
  return email;
};
const pick = <T extends string>(value: unknown, options: readonly T[], label: string): T => {
  const text = String(value ?? "");
  if (!(options as readonly string[]).includes(text)) throw new LeadError(`Choose a valid ${label}.`);
  return text as T;
};

const toLead = (row: LeadRow, day: string) => {
  const ds = row.dispute_stage;
  const eta = ds !== null && ds < 6 && row.stage_started ? addDays(row.stage_started, DISPUTE_SLA_DAYS[ds]) : null;
  const closed = row.status === "converted" || row.status === "lost";
  return {
    id: row.id, name: row.name, phone: row.phone, email: row.email, product: row.product, source: row.source,
    partnerEmail: row.partner_email, partnerName: row.partner_name, partnerStage: row.partner_stage,
    status: row.status, step: row.step, nextCall: row.next_call, received: row.received,
    due: !closed && row.next_call <= day,
    disputeStage: ds, stageStarted: row.stage_started, disputeEta: eta, disputeBureau: row.dispute_bureau,
    scores: row.scores ?? {}, targetScore: row.target_score, cmrRank: row.cmr_rank, paymentPending: row.payment_pending,
    acceptance: row.acceptance, acceptanceReason: row.acceptance_reason, userId: row.user_id, createdBy: row.created_by,
  };
};
export type Lead = ReturnType<typeof toLead>;

const isPaying = (lead: Lead) => lead.paymentPending > 0 && lead.status !== "lost";
// Case filter from the dispute panel: a stage index (0-6), "open" (any unresolved case), "none" or "pay" (payment pending).
const matchesCase = (lead: Lead, filter?: string) => {
  if (!filter) return true;
  if (filter === "open") return lead.disputeStage !== null && lead.disputeStage < 6;
  if (filter === "none") return lead.disputeStage === null;
  if (filter === "pay") return isPaying(lead);
  return /^[0-6]$/.test(filter) && lead.disputeStage === Number(filter);
};

const scopedLeads = async (scope: string | null) => {
  const { rows } = await pool.query<LeadRow>(
    `SELECT ${LEAD_COLUMNS} FROM ${LEAD_FROM} WHERE ($1::text IS NULL OR LOWER(l.partner_email) = $1)
     ORDER BY l.created_at DESC LIMIT 5000`,
    [scope],
  );
  return rows;
};

// Brings every customer account (website sign-ups and partner-submitted customers) into the lead desk once,
// with their partner, CRM stage and latest bureau scores, so the dashboard reflects real customers.
export const syncCustomerLeads = async () => {
  // One statement: claiming the customer in crm_lead_synced_users (primary key) makes concurrent loads import each customer only once.
  const { rowCount } = await pool.query(`
    WITH claimed AS (
      INSERT INTO crm_lead_synced_users (user_id)
      SELECT u.id FROM users u WHERE u.role = 'customer' AND NOT EXISTS (SELECT 1 FROM crm_lead_synced_users s WHERE s.user_id = u.id)
      ON CONFLICT DO NOTHING RETURNING user_id
    ), candidates AS (
      SELECT u.id, u.full_name, u.mobile, u.email, u.created_at, COALESCE(p.stage, 'new') AS stage,
        CASE WHEN owner.role = 'partner' THEN LOWER(owner.email)
             WHEN parent.role = 'partner' THEN LOWER(parent.email) END AS partner_email
      FROM claimed
      JOIN users u ON u.id = claimed.user_id
      LEFT JOIN crm_customer_profiles p ON p.user_id = u.id
      LEFT JOIN customer_assignments ca ON ca.user_id = u.id
      LEFT JOIN admin_accounts owner ON LOWER(owner.email) = LOWER(ca.owner_email)
      LEFT JOIN admin_accounts parent ON LOWER(parent.email) = LOWER(owner.parent_email)
      WHERE NOT EXISTS (SELECT 1 FROM crm_leads l WHERE l.user_id = u.id OR RIGHT(regexp_replace(l.phone, '\\D', '', 'g'), 10) = u.mobile)
    ), scores AS (
      SELECT r.user_id, jsonb_object_agg(r.label, jsonb_build_object('from', r.credit_score, 'to', r.credit_score)) AS scores
      FROM (
        SELECT DISTINCT ON (r.user_id, r.bureau) r.user_id, c.credit_score,
          CASE r.bureau WHEN 'cibil' THEN 'CIBIL' WHEN 'experian' THEN 'Experian' WHEN 'equifax' THEN 'Equifax' ELSE 'CRIF High Mark' END AS label
        FROM credit_report_requests r JOIN credit_reports c ON c.request_id = r.id
        WHERE c.credit_score BETWEEN 300 AND 900 AND r.user_id IN (SELECT id FROM candidates)
        ORDER BY r.user_id, r.bureau, r.requested_at DESC
      ) r GROUP BY r.user_id
    )
    INSERT INTO crm_leads (name, phone, email, product, source, partner_email, status, step, scores, acceptance, user_id, created_by, created_at)
    SELECT c.full_name, c.mobile, c.email, CASE WHEN sc.scores IS NULL THEN 'CIBIL check' ELSE 'Credit report' END,
      CASE WHEN c.partner_email IS NULL THEN 'Website form' ELSE 'Franchise partner' END, c.partner_email,
      CASE c.stage WHEN 'contacted' THEN 'contacted' WHEN 'interested' THEN 'follow_up' WHEN 'paid' THEN 'converted' WHEN 'closed' THEN 'converted' ELSE 'new' END,
      CASE c.stage WHEN 'paid' THEN 4 WHEN 'closed' THEN 5 ELSE 0 END,
      COALESCE(sc.scores, '{}'::jsonb), CASE WHEN c.partner_email IS NULL THEN NULL ELSE 'accepted' END, c.id, 'system', c.created_at
    FROM candidates c LEFT JOIN scores sc ON sc.user_id = c.id`);
  return rowCount ?? 0;
};

export const listLeads = async (viewer: LeadViewer, filters: { q?: string; source?: string; partner?: string; status?: string; dispute?: string }) => {
  const [scope, day] = await Promise.all([
    leadScope(viewer),
    today(),
    syncCustomerLeads().catch((error) => console.error("Customer lead sync failed", error)),
  ]);
  const [leadRows, partners, notifications] = await Promise.all([
    scopedLeads(scope),
    pool.query<{ email: string; full_name: string; area: string | null }>(
      `SELECT email, full_name, area FROM admin_accounts WHERE role = 'partner' AND status = 'active'
         AND ($1::text IS NULL OR LOWER(email) = $1) ORDER BY full_name`,
      [scope],
    ).then((result) => result.rows),
    pool.query(
      `SELECT id, lead_id::text AS "leadId", lead_name AS "leadName", to_email AS "toEmail", body, delivery, created_at AS "createdAt"
       FROM crm_lead_notifications WHERE ($1::text IS NULL OR LOWER(partner_email) = $1) ORDER BY created_at DESC LIMIT 8`,
      [scope],
    ).then((result) => result.rows),
  ]);
  const all = leadRows.map((row) => toLead(row, day));
  const q = (filters.q ?? "").toLowerCase().trim();
  const leads = all.filter((lead) =>
    (!filters.source || lead.source === filters.source)
    && (!filters.partner || (lead.partnerEmail ?? "").toLowerCase() === filters.partner.toLowerCase())
    && (!filters.status || lead.status === filters.status)
    && matchesCase(lead, filters.dispute)
    && (!q || `${lead.name} ${lead.phone} ${lead.product} ${lead.email ?? ""}`.toLowerCase().includes(q)));

  const partnerRows = partners.map((partner) => {
    const mine = all.filter((lead) => (lead.partnerEmail ?? "").toLowerCase() === partner.email.toLowerCase());
    const converted = mine.filter((lead) => lead.status === "converted").length;
    return {
      email: partner.email, name: partner.full_name, area: partner.area, total: mine.length, converted,
      open: mine.filter((lead) => lead.status !== "converted" && lead.status !== "lost").length,
      pending: mine.filter((lead) => lead.acceptance === "pending").length,
    };
  });
  const paying = all.filter(isPaying);
  const soon = addDays(day, 3);

  return {
    today: day,
    leads: leads.slice(0, 300),
    filteredTotal: leads.length,
    summary: {
      total: all.length,
      due: all.filter((lead) => lead.due).length,
      converted: all.filter((lead) => lead.status === "converted").length,
      byStatus: Object.fromEntries(LEAD_STATUSES.map((status) => [status, all.filter((lead) => lead.status === status).length])),
      bySource: LEAD_SOURCES.map((source) => ({ source, count: all.filter((lead) => lead.source === source).length })).sort((a, b) => b.count - a.count),
      byDispute: DISPUTE_STAGES.map((stage, index) => ({ stage, count: all.filter((lead) => lead.disputeStage === index).length })),
      disputeCases: all.filter((lead) => lead.disputeStage !== null).length,
      openCases: all.filter((lead) => lead.disputeStage !== null && lead.disputeStage < 6).length,
      casesDueSoon: all.filter((lead) => lead.disputeEta !== null && lead.disputeEta <= soon).length,
      paymentPending: { amount: paying.reduce((sum, lead) => sum + lead.paymentPending, 0), customers: paying.length },
      dueLeads: all.filter((lead) => lead.due).slice(0, 5),
      pendingAcceptance: all.filter((lead) => lead.acceptance === "pending").length,
    },
    partners: partnerRows,
    notifications,
    permissions: { canDecide: canDecide(viewer, scope), canDelete: canDelete(viewer), canEditPartners: canDelete(viewer), partnerScoped: scope !== null },
    options: {
      sources: scope ? ["Franchise partner"] : LEAD_SOURCES, products: LEAD_PRODUCTS, statuses: LEAD_STATUSES, steps: WORK_STEPS,
      disputeStages: DISPUTE_STAGES, disputeSla: DISPUTE_SLA_DAYS, disputeHow: DISPUTE_HOW, bureaus: BUREAUS,
      partnerStages: PARTNER_STAGES, outcomes: FOLLOW_UP_OUTCOMES,
    },
  };
};

const loadForUpdate = async (client: PoolClient, id: string, scope: string | null) => {
  if (!/^\d{1,18}$/.test(id)) throw new LeadError("Choose a valid lead.");
  const { rows } = await client.query<LeadRow>(
    `SELECT ${LEAD_COLUMNS} FROM ${LEAD_FROM} WHERE l.id = $1 AND ($2::text IS NULL OR LOWER(l.partner_email) = $2) FOR UPDATE OF l`,
    [id, scope],
  );
  if (!rows[0]) throw new LeadError("Lead not found.", 404);
  return rows[0];
};

export const getLead = async (viewer: LeadViewer, id: string) => {
  const scope = await leadScope(viewer);
  const client = await pool.connect();
  try {
    const row = await loadForUpdate(client, id, scope);
    const day = await today(client);
    const log = (await client.query(
      `SELECT id, body, created_by AS "createdBy", to_char(created_at, 'YYYY-MM-DD') AS "date" FROM crm_lead_log WHERE lead_id = $1 ORDER BY created_at DESC, id DESC LIMIT 200`,
      [id],
    )).rows;
    return { lead: toLead(row, day), log };
  } finally {
    client.release();
  }
};

const logLead = (client: PoolClient, leadId: string, body: string, by: string) =>
  client.query(`INSERT INTO crm_lead_log (lead_id, body, created_by) VALUES ($1, $2, $3)`, [leadId, body.slice(0, 2000), by]);

type Outbox = { id: string; to: string; name: string; body: string }[];

const notifyLead = async (client: PoolClient, lead: { id: string; name: string; email: string | null; partner_email: string | null }, body: string, outbox: Outbox) => {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO crm_lead_notifications (lead_id, partner_email, lead_name, to_email, body, delivery) VALUES ($1, LOWER($2), $3, $4, $5, $6) RETURNING id::text`,
    [lead.id, lead.partner_email, lead.name, lead.email, body, lead.email ? "pending" : "not_sent"],
  );
  if (lead.email) outbox.push({ id: rows[0].id, to: lead.email, name: lead.name, body });
};

// Emails are sent after the transaction commits so a slow or failing mail server never rolls back CRM work.
const flushOutbox = async (outbox: Outbox) => {
  for (const item of outbox) {
    let delivery = "not_sent";
    try {
      if (mailer && await mailer(item.to, "Update on your Scorenow case", `Hi ${item.name},\n\n${item.body}.\n\nThe Scorenow team`)) delivery = "sent";
    } catch (error) {
      console.error("Lead notification email failed", error);
      delivery = "failed";
    }
    await pool.query(`UPDATE crm_lead_notifications SET delivery = $2 WHERE id = $1`, [item.id, delivery]).catch(() => undefined);
  }
};

// Links the converted lead to a customer account, creating a login with the default password when needed.
const ensureCustomerLogin = async (client: PoolClient, lead: LeadRow, by: string) => {
  if (lead.user_id) return null;
  const mobile = cleanPhone(lead.phone);
  if (mobile.length !== 10) return "Customer login not created: the lead has no valid 10-digit mobile number.";
  const email = lead.email?.toLowerCase() ?? null;
  const matches = await client.query<{ id: string; email: string | null; role: string; password_hash: string | null }>(
    `SELECT id, email, role, password_hash FROM users WHERE mobile = $1 OR ($2::text IS NOT NULL AND LOWER(email) = $2)`,
    [mobile, email],
  );
  if (matches.rows.length > 1) return "Customer login not created: the mobile and email belong to different accounts.";
  const existing = matches.rows[0];
  if (existing && existing.role !== "customer") return "Customer login not created: this mobile belongs to a staff account.";
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(DEFAULT_CUSTOMER_PASSWORD, salt, 64).toString("hex");
  let userId = existing?.id;
  let message: string;
  if (!existing) {
    if (!email) return "Customer login not created: add the customer's email first.";
    userId = (await client.query<{ id: string }>(
      `INSERT INTO users (mobile, email, full_name, mobile_verified, password_salt, password_hash, must_reset_password)
       VALUES ($1, $2, $3, FALSE, $4, $5, TRUE) RETURNING id`,
      [mobile, email, lead.name, salt, hash],
    )).rows[0].id;
    message = `Customer login created for ${email} with password ${DEFAULT_CUSTOMER_PASSWORD}. They must set a new password on first sign-in.`;
  } else if (!existing.password_hash && (existing.email || email)) {
    await client.query(
      `UPDATE users SET email = COALESCE(email, $2), password_salt = $3, password_hash = $4, must_reset_password = TRUE, updated_at = NOW() WHERE id = $1`,
      [existing.id, email, salt, hash],
    );
    message = `Customer login created for ${existing.email ?? email} with password ${DEFAULT_CUSTOMER_PASSWORD}. They must set a new password on first sign-in.`;
  } else {
    message = "Linked to the customer's existing Scorenow account.";
  }
  await client.query(`UPDATE crm_leads SET user_id = $2 WHERE id = $1`, [lead.id, userId]);
  await logLead(client, lead.id, message, by);
  return message;
};

export const createLead = async (viewer: LeadViewer, input: Record<string, unknown>) => {
  const scope = await leadScope(viewer);
  const name = cleanText(input.name, 120);
  const phone = cleanPhone(input.phone);
  if (!name) throw new LeadError("Enter the customer's name.");
  if (phone.length !== 10) throw new LeadError("Enter a valid 10-digit mobile number.");
  const email = cleanEmail(input.email);
  const product = pick(input.product, LEAD_PRODUCTS, "product");
  const source = scope ? "Franchise partner" : pick(input.source, LEAD_SOURCES, "source");
  let partnerEmail: string | null = null;
  let partnerStage: string | null = null;
  if (source === "Franchise partner") {
    partnerEmail = scope ?? cleanText(input.partnerEmail, 200).toLowerCase();
    const partner = await pool.query(`SELECT 1 FROM admin_accounts WHERE LOWER(email) = $1 AND role = 'partner' AND status = 'active'`, [partnerEmail]);
    if (!partner.rows[0]) throw new LeadError("Choose an active franchise partner.");
    partnerStage = input.partnerStage ? pick(input.partnerStage, PARTNER_STAGES, "partner stage") : "New Lead";
  }
  // Leads sent in by a partner wait for the operations team to accept them; staff-added leads are accepted already.
  const acceptance = source === "Franchise partner" ? (scope ? "pending" : "accepted") : null;
  const disputeStage = DISPUTE_PRODUCTS.includes(product) ? 0 : null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO crm_leads (name, phone, email, product, source, partner_email, partner_stage, dispute_stage, stage_started, acceptance, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8::smallint IS NULL THEN NULL ELSE CURRENT_DATE END, $9, $10) RETURNING id::text`,
      [name, phone, email, product, source, partnerEmail, partnerStage, disputeStage, acceptance, viewer.email],
    );
    await logLead(client, rows[0].id, `Lead added via ${source}${partnerEmail ? ` (${partnerEmail})` : ""}`, viewer.email);
    await client.query("COMMIT");
    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteLead = async (viewer: LeadViewer, id: string) => {
  if (!canDelete(viewer)) throw new LeadError("Only the Superadmin or Admin can delete leads.", 403);
  if (!/^\d{1,18}$/.test(id)) throw new LeadError("Choose a valid lead.");
  const { rowCount } = await pool.query(`DELETE FROM crm_leads WHERE id = $1`, [id]);
  if (!rowCount) throw new LeadError("Lead not found.", 404);
};

const WORKFLOW_ACTIONS = new Set(["next_step", "work_done", "dispute_next", "dispute_resolve", "raise_dispute", "scores"]);

export const runLeadAction = async (viewer: LeadViewer, id: string, action: string, input: Record<string, unknown>) => {
  const scope = await leadScope(viewer);
  const outbox: Outbox = [];
  const client = await pool.connect();
  let message = "Saved.";
  try {
    await client.query("BEGIN");
    const lead = await loadForUpdate(client, id, scope);
    const day = await today(client);
    const by = viewer.email;
    const note = cleanText(input.note, 500);
    const withNote = note ? `: ${note}` : "";
    const closed = lead.status === "converted" || lead.status === "lost";
    if (lead.acceptance === "pending" && WORKFLOW_ACTIONS.has(action)) throw new LeadError("Accept this partner lead before working on it.");
    if (lead.acceptance === "rejected" && action !== "reopen") throw new LeadError("This partner lead was rejected. Reopen it to work on it again.");
    let next = { status: lead.status, step: lead.step, dispute: lead.dispute_stage, stageStarted: lead.stage_started };
    const convert = () => { next = { ...next, status: "converted", step: 5, dispute: next.dispute === null ? null : 6 }; };
    const notify = (body: string) => notifyLead(client, lead, body, outbox);

    switch (action) {
      case "next_step": {
        if (closed) throw new LeadError("Reopen the lead first.");
        const step = Math.min(5, lead.step + 1);
        if (step === 5) { convert(); await logLead(client, id, "Work done", by); await notify("Your request is complete. Work done"); }
        else { next = { ...next, step, status: lead.status === "new" ? "contacted" : lead.status }; await logLead(client, id, `Moved to: ${WORK_STEPS[step]}`, by); }
        break;
      }
      case "work_done":
        if (closed) throw new LeadError("Reopen the lead first.");
        convert();
        await logLead(client, id, "Marked work done", by);
        await notify("Your request is complete. Work done");
        break;
      case "reopen":
        next = { ...next, status: "contacted", step: Math.min(lead.step, 4), dispute: lead.dispute_stage === 6 ? 5 : lead.dispute_stage };
        if (lead.acceptance === "rejected") await client.query(`UPDATE crm_leads SET acceptance = 'accepted' WHERE id = $1`, [id]);
        await logLead(client, id, "Reopened", by);
        break;
      case "status": {
        const status = pick(input.status, LEAD_STATUSES, "status");
        if (status === "converted") convert(); else next = { ...next, status };
        await logLead(client, id, `Status changed to ${status.replace("_", "-")}`, by);
        break;
      }
      case "follow_up": {
        const outcome = pick(input.outcome, FOLLOW_UP_OUTCOMES, "call outcome");
        const nextCall = cleanText(input.nextCall, 10);
        if (nextCall && !/^\d{4}-\d{2}-\d{2}$/.test(nextCall)) throw new LeadError("Choose a valid next call date.");
        await logLead(client, id, `${outcome}${withNote}`, by);
        if (nextCall) await client.query(`UPDATE crm_leads SET next_call = $2 WHERE id = $1`, [id, nextCall]);
        if (outcome === "Not interested") next = { ...next, status: "lost" };
        else if (lead.status !== "converted") {
          next = { ...next, status: outcome === "Spoke to customer" ? "contacted" : "follow_up" };
          if (outcome === "Spoke to customer") next.step = Math.max(next.step, 1);
          if (outcome === "Documents received") next.step = Math.max(next.step, 2);
        }
        break;
      }
      case "edit": {
        const name = cleanText(input.name, 120);
        const phone = cleanPhone(input.phone);
        if (!name) throw new LeadError("Enter the customer's name.");
        if (phone.length !== 10) throw new LeadError("Enter a valid 10-digit mobile number.");
        const product = pick(input.product, LEAD_PRODUCTS, "product");
        const partnerStage = lead.partner_email && input.partnerStage ? pick(input.partnerStage, PARTNER_STAGES, "partner stage") : lead.partner_stage;
        // Switching to a credit product starts the dispute ladder; switching away keeps any history already recorded.
        if (lead.dispute_stage === null && DISPUTE_PRODUCTS.includes(product)) next = { ...next, dispute: 0, stageStarted: day };
        await client.query(`UPDATE crm_leads SET name = $2, phone = $3, email = $4, product = $5, partner_stage = $6 WHERE id = $1`,
          [id, name, phone, cleanEmail(input.email), product, partnerStage]);
        await logLead(client, id, "Details updated", by);
        break;
      }
      case "dispute_next": {
        if (lead.dispute_stage === null || lead.dispute_stage >= 5) throw new LeadError("There is no next dispute stage.");
        const stage = lead.dispute_stage + 1;
        next = { ...next, dispute: stage, stageStarted: day, status: lead.status === "new" ? "contacted" : lead.status };
        await logLead(client, id, `Stage done: ${DISPUTE_STAGES[lead.dispute_stage]}${withNote}. Next: ${DISPUTE_STAGES[stage]}`, by);
        await notify(`Your case moved to ${DISPUTE_STAGES[stage]}`);
        break;
      }
      case "dispute_resolve":
        if (lead.dispute_stage === null) throw new LeadError("This lead has no dispute case.");
        convert();
        await logLead(client, id, `Case resolved${withNote}`, by);
        await notify("Your case is resolved");
        break;
      case "raise_dispute": {
        const bureau = pick(input.bureau, [...BUREAUS, "CMR report"], "bureau");
        const opening = lead.dispute_stage === null || lead.dispute_stage === 6;
        if (opening) {
          // A new case (or a fresh one after an earlier case was resolved) starts at the first stage today.
          next = { ...next, dispute: 0, stageStarted: day, status: "contacted", step: Math.min(lead.step, 4) };
        }
        await client.query(`UPDATE crm_leads SET dispute_bureau = $2 WHERE id = $1`, [id, bureau]);
        await logLead(client, id, `${opening ? "Dispute case opened" : "Dispute raised"} with ${bureau}${withNote}`, by);
        await notify(opening ? `A dispute case was opened with ${bureau}. First step: ${DISPUTE_STAGES[0]}` : `A dispute was raised with ${bureau}`);
        if (opening) message = `Dispute case opened with ${bureau}.`;
        break;
      }
      case "scores": {
        const scores: Scores = { ...(lead.scores ?? {}) };
        const incoming = (input.scores ?? {}) as Record<string, unknown>;
        for (const bureau of BUREAUS) {
          if (incoming[bureau] === undefined || incoming[bureau] === "" || incoming[bureau] === null) continue;
          const value = Number(incoming[bureau]);
          if (!Number.isInteger(value) || value < 300 || value > 900) throw new LeadError(`${bureau} score must be between 300 and 900.`);
          scores[bureau] = { from: scores[bureau]?.from ?? value, to: value };
        }
        const target = Number(input.targetScore ?? lead.target_score);
        if (!Number.isInteger(target) || target < 300 || target > 900) throw new LeadError("Target score must be between 300 and 900.");
        const cmr = input.cmrRank === "" || input.cmrRank === null || input.cmrRank === undefined ? null : Number(input.cmrRank);
        if (cmr !== null && (!Number.isInteger(cmr) || cmr < 1 || cmr > 10)) throw new LeadError("CMR rank must be 1 to 10.");
        const pay = Number(input.paymentPending ?? 0);
        if (!Number.isFinite(pay) || pay < 0 || pay > 10_000_000) throw new LeadError("Enter a valid pending payment.");
        await client.query(`UPDATE crm_leads SET scores = $2, target_score = $3, cmr_rank = $4, payment_pending = $5, email = COALESCE($6, email) WHERE id = $1`,
          [id, JSON.stringify(scores), target, cmr, Math.round(pay), cleanEmail(input.email)]);
        await logLead(client, id, "Scores and details updated", by);
        await notify("Your credit scores were updated");
        if (BUREAUS.every((bureau) => (scores[bureau]?.to ?? 0) >= target) && lead.status !== "converted") {
          convert();
          await logLead(client, id, "Score target reached on all 4 bureaus", by);
          await notify("Your score target is complete. Work done");
        }
        break;
      }
      case "accept":
      case "reject": {
        if (!canDecide(viewer, scope)) throw new LeadError("Only the operations team can accept or reject partner leads.", 403);
        if (lead.acceptance !== "pending") throw new LeadError("This lead is not waiting for a decision.");
        const reason = cleanText(input.reason, 500);
        if (action === "reject" && !reason) throw new LeadError("Write the reason for rejecting this lead.");
        await client.query(`UPDATE crm_leads SET acceptance = $2, acceptance_reason = $3 WHERE id = $1`, [id, action === "accept" ? "accepted" : "rejected", reason || null]);
        next = { ...next, status: action === "accept" ? "contacted" : "lost" };
        await logLead(client, id, action === "accept" ? `Partner lead accepted${reason ? `: ${reason}` : ""}` : `Partner lead rejected: ${reason}`, by);
        await notify(action === "accept" ? "Your request was accepted by the Scorenow team" : `Your request could not be accepted: ${reason}`);
        break;
      }
      default:
        throw new LeadError("Unknown lead action.");
    }

    await client.query(
      `UPDATE crm_leads SET status = $2, step = $3, dispute_stage = $4, stage_started = $5, updated_at = NOW() WHERE id = $1`,
      [id, next.status, next.step, next.dispute, next.stageStarted],
    );
    if (next.status === "converted" && lead.status !== "converted") {
      message = (await ensureCustomerLogin(client, { ...lead, email: (await client.query<{ email: string | null }>(`SELECT email FROM crm_leads WHERE id = $1`, [id])).rows[0].email }, by)) ?? "Lead converted.";
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  void flushOutbox(outbox);
  return message;
};

// Moves each open dispute up one stage once its stage deadline has passed, and tells the customer.
export const runLeadEscalation = async () => {
  const outbox: Outbox = [];
  const client = await pool.connect();
  let moved = 0;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<LeadRow>(
      `SELECT ${LEAD_COLUMNS} FROM ${LEAD_FROM}
       WHERE l.status NOT IN ('converted', 'lost') AND COALESCE(l.acceptance, '') NOT IN ('pending', 'rejected')
         AND l.dispute_stage < 5 AND l.stage_started IS NOT NULL
         AND CURRENT_DATE > l.stage_started + (ARRAY[15, 15, 7, 15, 30, 30])[l.dispute_stage + 1]
       FOR UPDATE OF l`,
    );
    for (const lead of rows) {
      const from = DISPUTE_STAGES[lead.dispute_stage!];
      const to = DISPUTE_STAGES[lead.dispute_stage! + 1];
      await client.query(`UPDATE crm_leads SET dispute_stage = dispute_stage + 1, stage_started = CURRENT_DATE, updated_at = NOW() WHERE id = $1`, [lead.id]);
      await logLead(client, lead.id, `Auto: no solution by the deadline at ${from}. Moved to ${to}`, "system");
      await notifyLead(client, lead, `Your case moved to ${to} (automatic, no solution by the deadline)`, outbox);
      moved += 1;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  await flushOutbox(outbox);
  return moved;
};

export const setPartnerArea = async (viewer: LeadViewer, partnerEmail: string, area: string) => {
  if (!canDelete(viewer)) throw new LeadError("Only the Superadmin or Admin can change a partner's area.", 403);
  const clean = area.trim().replace(/\s+/g, " ").slice(0, 80);
  const { rowCount } = await pool.query(
    `UPDATE admin_accounts SET area = $2, updated_at = NOW() WHERE LOWER(email) = LOWER($1) AND role = 'partner'`,
    [partnerEmail, clean || null],
  );
  if (!rowCount) throw new LeadError("Franchise partner not found.", 404);
  return clean || null;
};
