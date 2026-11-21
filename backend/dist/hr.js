import { pool } from "./database.js";
// People & HR: employee profiles, attendance, leave, requests and approvals, payroll, holidays and announcements.
// Employees are internal staff accounts (Admin, support, analyst and company agents); partners and partner agents are not.
export const LEAVE_DEFAULTS = [
    ["casual", "Casual leave", 12, true],
    ["sick", "Sick leave", 10, true],
    ["earned", "Earned leave", 15, true],
    ["unpaid", "Unpaid leave", 0, false],
];
export const REQUEST_KINDS = {
    reimbursement: "Expense reimbursement",
    advance: "Salary advance",
    asset: "Laptop or equipment",
    wfh: "Work from home",
    document: "Letter or document",
    other: "Other request",
};
export const EMPLOYMENT_TYPES = ["Full time", "Part time", "Contract", "Intern"];
export const DEPARTMENTS = ["Operations", "Credit bureau", "Customer handling", "Call center", "Sales", "HR", "Legal", "Finance", "Technology", "Management"];
const HR_STATUSES = ["active", "notice", "exited"];
const ATTENDANCE_MODES = ["office", "wfh", "field"];
const TZ = "Asia/Kolkata";
export class HrError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
let mailer = null;
export const setHrMailer = (send) => { mailer = send; };
const mail = (to, subject, text) => {
    if (!mailer)
        return;
    void mailer(to, subject, `${text}\n\nScorenow HR`).catch((error) => console.error("HR email failed", error));
};
export const initializeHr = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_profiles (
      email TEXT PRIMARY KEY,
      employee_code TEXT,
      designation TEXT,
      department TEXT,
      phone TEXT,
      joined_on DATE,
      employment_type TEXT,
      reports_to TEXT,
      monthly_salary INTEGER NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0),
      bank_account TEXT,
      ifsc TEXT,
      pan TEXT,
      hr_status TEXT NOT NULL DEFAULT 'active' CHECK (hr_status IN ('active', 'notice', 'exited')),
      exit_on DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_leave_policy (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      yearly_quota NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (yearly_quota >= 0),
      paid BOOLEAN NOT NULL DEFAULT TRUE,
      sort SMALLINT NOT NULL DEFAULT 0
    )
  `);
    for (const [index, [key, label, quota, paid]] of LEAVE_DEFAULTS.entries()) {
        await pool.query(`INSERT INTO hr_leave_policy (key, label, yearly_quota, paid, sort) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`, [key, label, quota, paid, index]);
    }
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_leaves (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      type TEXT NOT NULL REFERENCES hr_leave_policy(key),
      from_date DATE NOT NULL,
      to_date DATE NOT NULL CHECK (to_date >= from_date),
      half_day BOOLEAN NOT NULL DEFAULT FALSE,
      days NUMERIC(5,1) NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
      decided_by TEXT,
      decision_note TEXT,
      decided_at TIMESTAMPTZ,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`CREATE INDEX IF NOT EXISTS hr_leaves_email_idx ON hr_leaves (LOWER(email), from_date DESC)`);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_attendance (
      email TEXT NOT NULL,
      day DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'half_day', 'absent')),
      mode TEXT NOT NULL DEFAULT 'office' CHECK (mode IN ('office', 'wfh', 'field')),
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      marked_by TEXT NOT NULL,
      PRIMARY KEY (email, day)
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_requests (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      amount INTEGER CHECK (amount >= 0),
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
      decided_by TEXT,
      decision_note TEXT,
      decided_at TIMESTAMPTZ,
      settled_month TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_payroll (
      month TEXT NOT NULL,
      email TEXT NOT NULL,
      salary INTEGER NOT NULL,
      days_in_month SMALLINT NOT NULL,
      paid_days SMALLINT NOT NULL,
      earned INTEGER NOT NULL,
      lop_days NUMERIC(5,1) NOT NULL DEFAULT 0,
      lop_amount INTEGER NOT NULL DEFAULT 0,
      reimbursements INTEGER NOT NULL DEFAULT 0,
      advances INTEGER NOT NULL DEFAULT 0,
      bonus INTEGER NOT NULL DEFAULT 0,
      other_deductions INTEGER NOT NULL DEFAULT 0,
      net INTEGER NOT NULL,
      request_ids BIGINT[] NOT NULL DEFAULT '{}',
      note TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
      paid_on DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (month, email)
    )
  `);
    await pool.query(`CREATE TABLE IF NOT EXISTS hr_holidays (day DATE PRIMARY KEY, name TEXT NOT NULL)`);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_announcements (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};
// ---------- helpers ----------
const text = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);
const monthBounds = (month) => {
    const [y, m] = month.split("-").map(Number);
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { start: `${month}-01`, end: `${month}-${String(dim).padStart(2, "0")}`, dim };
};
const isSunday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
const money = (value, label, max = 10_000_000) => {
    if (value === "" || value === null || value === undefined)
        return 0;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > max)
        throw new HrError(`Enter a valid ${label}.`);
    return Math.round(amount);
};
const todayIst = async (client = pool) => (await client.query(`SELECT to_char((NOW() AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS d`)).rows[0].d;
const holidaySet = async (client, from, to) => new Set((await client.query(`SELECT to_char(day, 'YYYY-MM-DD') AS d FROM hr_holidays WHERE day BETWEEN $1 AND $2`, [from, to])).rows.map((row) => row.d));
// Working days in a range: Sundays and company holidays are not counted.
const workingDays = (from, to, holidays) => {
    let count = 0;
    for (let day = from; day <= to; day = addDays(day, 1))
        if (!isSunday(day) && !holidays.has(day))
            count += 1;
    return count;
};
// Every staff login is an employee, including agents working under a partner; partners themselves are not.
const EMPLOYEE_SQL = `a.role IN ('manager', 'support', 'analyst', 'agent')`;
export const isHrEmployee = async (email) => (await pool.query(`SELECT 1 FROM admin_accounts a WHERE LOWER(a.email) = LOWER($1) AND ${EMPLOYEE_SQL}`, [email])).rows.length > 0;
const context = async (viewer) => {
    const email = viewer.email.toLowerCase();
    const isOwner = viewer.role === "owner";
    const isAdmin = isOwner || viewer.role === "manager";
    const { rows } = await pool.query(`SELECT 1 FROM admin_accounts a WHERE LOWER(a.email) = $1 AND ${EMPLOYEE_SQL}`, [email]);
    const isEmployee = rows.length > 0;
    if (!isAdmin && !isEmployee)
        throw new HrError("People & HR is for Scorenow staff only.", 403);
    return { email, role: viewer.role, isAdmin, isOwner, isEmployee };
};
const requireAdmin = (ctx) => { if (!ctx.isAdmin)
    throw new HrError("Only the Superadmin or Admin can do this.", 403); };
const requireOwner = (ctx) => { if (!ctx.isOwner)
    throw new HrError("Only the Superadmin can manage salary and payroll.", 403); };
const employeeAccount = async (client, email) => {
    const { rows } = await client.query(`SELECT LOWER(a.email) AS email, a.full_name, a.role FROM admin_accounts a WHERE LOWER(a.email) = LOWER($1) AND ${EMPLOYEE_SQL}`, [email]);
    if (!rows[0])
        throw new HrError("Employee not found.", 404);
    return rows[0];
};
// Superadmin decides for everyone; an Admin decides for staff below Admin; nobody approves their own request.
const assertCanDecide = (ctx, target) => {
    requireAdmin(ctx);
    if (target.email.toLowerCase() === ctx.email)
        throw new HrError("You cannot approve your own request. The Superadmin will review it.", 403);
    if (!ctx.isOwner && target.role === "manager")
        throw new HrError("Only the Superadmin can decide requests from another Admin.", 403);
};
const loadPolicy = async () => (await pool.query(`SELECT key, label, yearly_quota::float AS quota, paid FROM hr_leave_policy ORDER BY sort, key`)).rows;
const LEAVE_COLS = `l.id::text AS id, LOWER(l.email) AS email, a.full_name AS name, a.role, l.type, to_char(l.from_date, 'YYYY-MM-DD') AS "from",
  to_char(l.to_date, 'YYYY-MM-DD') AS "to", l.half_day AS "halfDay", l.days::float AS days, l.reason, l.status, l.decided_by AS "decidedBy",
  l.decision_note AS "decisionNote", l.created_by AS "createdBy", to_char(l.created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS "createdOn"`;
const REQUEST_COLS = `r.id::text AS id, LOWER(r.email) AS email, a.full_name AS name, a.role, r.kind, r.title, r.amount, r.details, r.status,
  r.decided_by AS "decidedBy", r.decision_note AS "decisionNote", r.settled_month AS "settledMonth",
  to_char(r.created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS "createdOn"`;
const PAY_COLS = `p.month, LOWER(p.email) AS email, a.full_name AS name, p.salary, p.days_in_month AS "daysInMonth", p.paid_days AS "paidDays",
  p.earned, p.lop_days::float AS "lopDays", p.lop_amount AS "lopAmount", p.reimbursements, p.advances, p.bonus,
  p.other_deductions AS "otherDeductions", p.net, p.note, p.status, to_char(p.paid_on, 'YYYY-MM-DD') AS "paidOn"`;
const balancesFor = async (email, year, policy) => {
    const { rows } = await pool.query(`SELECT type, status, SUM(days)::float AS days FROM hr_leaves WHERE LOWER(email) = $1 AND status IN ('approved', 'pending')
       AND to_char(from_date, 'YYYY') = $2 GROUP BY type, status`, [email, year]);
    return policy.map((item) => {
        const used = rows.find((row) => row.type === item.key && row.status === "approved")?.days ?? 0;
        const pending = rows.find((row) => row.type === item.key && row.status === "pending")?.days ?? 0;
        return { ...item, used, pending, left: item.paid ? Math.max(0, item.quota - used) : null };
    });
};
export const getHrDashboard = async (viewer) => {
    const ctx = await context(viewer);
    const [day, policy] = await Promise.all([todayIst(), loadPolicy()]);
    const year = day.slice(0, 4);
    const month = day.slice(0, 7);
    const shared = Promise.all([
        pool.query(`SELECT to_char(day, 'YYYY-MM-DD') AS day, name FROM hr_holidays WHERE day >= $1::date - 30 ORDER BY day LIMIT 40`, [day]).then((r) => r.rows),
        pool.query(`SELECT id::text AS id, title, body, created_by AS "createdBy", to_char(created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS date
      FROM hr_announcements ORDER BY created_at DESC LIMIT 6`).then((r) => r.rows),
    ]);
    const mine = ctx.isEmployee ? Promise.all([
        pool.query(`SELECT a.full_name AS name, a.role, t.label AS "agentType", h.employee_code AS "employeeCode", h.designation, h.department, h.phone,
      to_char(h.joined_on, 'YYYY-MM-DD') AS "joinedOn", h.employment_type AS "employmentType", h.reports_to AS "reportsTo",
      COALESCE(h.monthly_salary, 0) AS "monthlySalary", COALESCE(h.hr_status, 'active') AS "hrStatus"
      FROM admin_accounts a LEFT JOIN hr_profiles h ON h.email = LOWER(a.email) LEFT JOIN agent_types t ON t.key = a.agent_type WHERE LOWER(a.email) = $1`, [ctx.email]).then((r) => r.rows[0]),
        pool.query(`SELECT status, mode, check_in AS "checkIn", check_out AS "checkOut" FROM hr_attendance WHERE LOWER(email) = $1 AND day = $2`, [ctx.email, day]).then((r) => r.rows[0] ?? null),
        balancesFor(ctx.email, year, policy),
        pool.query(`SELECT ${LEAVE_COLS} FROM hr_leaves l JOIN admin_accounts a ON LOWER(a.email) = LOWER(l.email) WHERE LOWER(l.email) = $1 ORDER BY l.from_date DESC LIMIT 20`, [ctx.email]).then((r) => r.rows),
        pool.query(`SELECT ${REQUEST_COLS} FROM hr_requests r JOIN admin_accounts a ON LOWER(a.email) = LOWER(r.email) WHERE LOWER(r.email) = $1 ORDER BY r.created_at DESC LIMIT 20`, [ctx.email]).then((r) => r.rows),
        pool.query(`SELECT ${PAY_COLS} FROM hr_payroll p JOIN admin_accounts a ON LOWER(a.email) = LOWER(p.email) WHERE LOWER(p.email) = $1 AND p.status = 'paid' ORDER BY p.month DESC LIMIT 12`, [ctx.email]).then((r) => r.rows),
        pool.query(`SELECT COUNT(*)::int AS n FROM hr_attendance WHERE LOWER(email) = $1 AND to_char(day, 'YYYY-MM') = $2 AND status <> 'absent'`, [ctx.email, month]).then((r) => r.rows[0].n),
    ]) : null;
    const team = ctx.isAdmin ? Promise.all([
        pool.query(`SELECT LOWER(a.email) AS email, a.full_name AS name, a.role, a.status AS "accountStatus", t.label AS "agentType",
        h.employee_code AS "employeeCode", h.designation, h.department, h.phone, to_char(h.joined_on, 'YYYY-MM-DD') AS "joinedOn",
        h.employment_type AS "employmentType", h.reports_to AS "reportsTo", COALESCE(h.monthly_salary, 0) AS "monthlySalary",
        h.bank_account AS "bankAccount", h.ifsc, h.pan, COALESCE(h.hr_status, 'active') AS "hrStatus", to_char(h.exit_on, 'YYYY-MM-DD') AS "exitOn",
        att.status AS "todayStatus", att.mode AS "todayMode", att.check_in AS "checkIn", att.check_out AS "checkOut",
        lv.type AS "onLeave"
      FROM admin_accounts a
      LEFT JOIN hr_profiles h ON h.email = LOWER(a.email)
      LEFT JOIN agent_types t ON t.key = a.agent_type
      LEFT JOIN hr_attendance att ON LOWER(att.email) = LOWER(a.email) AND att.day = $1
      LEFT JOIN LATERAL (SELECT type FROM hr_leaves WHERE LOWER(email) = LOWER(a.email) AND status = 'approved' AND $1 BETWEEN from_date AND to_date LIMIT 1) lv ON TRUE
      WHERE ${EMPLOYEE_SQL} ORDER BY a.full_name`, [day]).then((r) => r.rows),
        pool.query(`SELECT ${LEAVE_COLS} FROM hr_leaves l JOIN admin_accounts a ON LOWER(a.email) = LOWER(l.email) WHERE l.status = 'pending' ORDER BY l.from_date LIMIT 100`).then((r) => r.rows),
        pool.query(`SELECT ${REQUEST_COLS} FROM hr_requests r JOIN admin_accounts a ON LOWER(a.email) = LOWER(r.email) WHERE r.status = 'pending' ORDER BY r.created_at LIMIT 100`).then((r) => r.rows),
        pool.query(`SELECT ${LEAVE_COLS} FROM hr_leaves l JOIN admin_accounts a ON LOWER(a.email) = LOWER(l.email) WHERE l.status <> 'pending' ORDER BY COALESCE(l.decided_at, l.created_at) DESC LIMIT 30`).then((r) => r.rows),
        pool.query(`SELECT ${REQUEST_COLS} FROM hr_requests r JOIN admin_accounts a ON LOWER(a.email) = LOWER(r.email) WHERE r.status <> 'pending' ORDER BY COALESCE(r.decided_at, r.created_at) DESC LIMIT 30`).then((r) => r.rows),
        pool.query(`SELECT ${LEAVE_COLS} FROM hr_leaves l JOIN admin_accounts a ON LOWER(a.email) = LOWER(l.email)
      WHERE l.status = 'approved' AND l.to_date >= $1 AND l.from_date <= $1::date + 14 ORDER BY l.from_date LIMIT 30`, [day]).then((r) => r.rows),
        pool.query(`SELECT status, SUM(net)::int AS net, COUNT(*)::int AS n FROM hr_payroll WHERE month = $1 GROUP BY status`, [month]).then((r) => r.rows),
    ]) : null;
    const [[holidays, announcements], me, admin] = await Promise.all([shared, mine, team]);
    let teamData = null;
    if (admin) {
        const [employees, pendingLeaves, pendingRequests, recentLeaves, recentRequests, upcomingLeaves, payroll] = admin;
        const visible = employees.map((employee) => ctx.isOwner ? employee : { ...employee, monthlySalary: null, bankAccount: null, ifsc: null, pan: null });
        const working = employees.filter((employee) => employee.hrStatus !== "exited");
        const isHoliday = isSunday(day) || holidays.some((holiday) => holiday.day === day);
        const departments = new Map();
        for (const employee of working)
            departments.set(employee.department || "Not set", (departments.get(employee.department || "Not set") ?? 0) + 1);
        teamData = {
            employees: visible,
            pendingLeaves, pendingRequests, recentLeaves, recentRequests, upcomingLeaves,
            kpis: {
                headcount: working.length,
                present: working.filter((employee) => employee.todayStatus && employee.todayStatus !== "absent").length,
                onLeave: working.filter((employee) => employee.onLeave).length,
                notMarked: isHoliday ? 0 : working.filter((employee) => !employee.todayStatus && !employee.onLeave).length,
                pendingApprovals: pendingLeaves.length + pendingRequests.length,
                monthlyPayroll: ctx.isOwner ? working.reduce((sum, employee) => sum + Number(employee.monthlySalary ?? 0), 0) : null,
                payrollStatus: ctx.isOwner ? payroll : null,
                isHoliday,
            },
            byDepartment: [...departments.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        };
    }
    let meData = null;
    if (me) {
        const [profile, attendance, balances, leaves, requests, payslips, presentDays] = me;
        meData = { profile, attendance, balances, leaves, requests, payslips, presentDays };
    }
    return {
        today: day,
        viewer: { email: ctx.email, role: ctx.role, isAdmin: ctx.isAdmin, isOwner: ctx.isOwner, isEmployee: ctx.isEmployee },
        me: meData,
        team: teamData,
        holidays, announcements,
        options: {
            leaveTypes: policy,
            requestKinds: Object.entries(REQUEST_KINDS).map(([key, label]) => ({ key, label })),
            employmentTypes: EMPLOYMENT_TYPES, departments: DEPARTMENTS, modes: ATTENDANCE_MODES,
        },
    };
};
// ---------- employees ----------
export const updateEmployee = async (viewer, email, input) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    const account = await employeeAccount(pool, email);
    const joinedOn = text(input.joinedOn, 10);
    const exitOn = text(input.exitOn, 10);
    if (joinedOn && !isDate(joinedOn))
        throw new HrError("Choose a valid joining date.");
    if (exitOn && !isDate(exitOn))
        throw new HrError("Choose a valid last working day.");
    const hrStatus = text(input.hrStatus, 10) || "active";
    if (!HR_STATUSES.includes(hrStatus))
        throw new HrError("Choose a valid employment status.");
    if (hrStatus === "exited" && !exitOn)
        throw new HrError("Enter the last working day for an employee who has left.");
    const employmentType = text(input.employmentType, 20);
    if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType))
        throw new HrError("Choose a valid employment type.");
    const phone = String(input.phone ?? "").replace(/\D/g, "").slice(-10);
    if (phone && phone.length !== 10)
        throw new HrError("Enter a valid 10-digit phone number.");
    // Salary, bank and tax details are only visible to and editable by the Superadmin.
    let pay = null;
    if (ctx.isOwner) {
        const ifsc = text(input.ifsc, 11).toUpperCase();
        const pan = text(input.pan, 10).toUpperCase();
        const bank = String(input.bankAccount ?? "").replace(/\s/g, "");
        if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))
            throw new HrError("Enter a valid IFSC code.");
        if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan))
            throw new HrError("Enter a valid PAN.");
        if (bank && !/^\d{9,18}$/.test(bank))
            throw new HrError("Enter a valid bank account number.");
        pay = [money(input.monthlySalary, "monthly salary"), bank || null, ifsc || null, pan || null];
    }
    const values = [account.email, text(input.employeeCode, 20) || null, text(input.designation, 80) || null, text(input.department, 60) || null,
        phone || null, joinedOn || null, employmentType || null, text(input.reportsTo, 120).toLowerCase() || null, hrStatus, exitOn || null];
    await pool.query(`INSERT INTO hr_profiles (email, employee_code, designation, department, phone, joined_on, employment_type, reports_to, hr_status, exit_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (email) DO UPDATE SET employee_code = $2, designation = $3, department = $4, phone = $5, joined_on = $6,
       employment_type = $7, reports_to = $8, hr_status = $9, exit_on = $10, updated_at = NOW()`, values);
    if (pay)
        await pool.query(`UPDATE hr_profiles SET monthly_salary = $2, bank_account = $3, ifsc = $4, pan = $5 WHERE email = $1`, [account.email, ...pay]);
    return `${account.full_name}'s profile saved.`;
};
// ---------- attendance ----------
export const markOwnAttendance = async (viewer, input) => {
    const ctx = await context(viewer);
    if (!ctx.isEmployee)
        throw new HrError("Attendance is for employees.", 403);
    const action = String(input.action ?? "");
    const day = await todayIst();
    if (action === "in") {
        const mode = String(input.mode ?? "office");
        if (!ATTENDANCE_MODES.includes(mode))
            throw new HrError("Choose office, work from home or field.");
        const { rowCount } = await pool.query(`INSERT INTO hr_attendance (email, day, status, mode, check_in, marked_by) VALUES ($1, $2, 'present', $3, NOW(), $1)
       ON CONFLICT (email, day) DO UPDATE SET check_in = NOW(), mode = $3, status = 'present' WHERE hr_attendance.check_in IS NULL`, [ctx.email, day, mode]);
        if (!rowCount)
            throw new HrError("You have already checked in today.");
        return "Checked in. Have a good day!";
    }
    if (action === "out") {
        const { rowCount } = await pool.query(`UPDATE hr_attendance SET check_out = NOW() WHERE email = $1 AND day = $2 AND check_in IS NOT NULL AND check_out IS NULL`, [ctx.email, day]);
        if (!rowCount)
            throw new HrError("Check in first, or you have already checked out today.");
        return "Checked out. See you tomorrow!";
    }
    throw new HrError("Unknown attendance action.");
};
export const setAttendance = async (viewer, input) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    const account = await employeeAccount(pool, String(input.email ?? ""));
    const day = text(input.day, 10);
    if (!isDate(day))
        throw new HrError("Choose a valid date.");
    if (day > await todayIst())
        throw new HrError("Attendance cannot be marked for a future date.");
    const status = String(input.status ?? "");
    if (status === "clear") {
        await pool.query(`DELETE FROM hr_attendance WHERE email = $1 AND day = $2`, [account.email, day]);
        return "Attendance cleared.";
    }
    if (!["present", "half_day", "absent"].includes(status))
        throw new HrError("Choose present, half day or absent.");
    const mode = ATTENDANCE_MODES.includes(String(input.mode)) ? String(input.mode) : "office";
    await pool.query(`INSERT INTO hr_attendance (email, day, status, mode, marked_by) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email, day) DO UPDATE SET status = $3, mode = $4, marked_by = $5`, [account.email, day, status, mode, ctx.email]);
    const label = status === "present" && mode !== "office" ? (mode === "wfh" ? "working from home" : "on field work") : status.replace("_", " ");
    return `${account.full_name} marked ${label} on ${day}.`;
};
// Monthly register: one code per employee per day (P present, H half day, W work from home, A absent, L leave, O holiday, S Sunday).
export const attendanceRegister = async (viewer, month) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    if (!isMonth(month))
        throw new HrError("Choose a valid month.");
    const { start, end, dim } = monthBounds(month);
    const [employees, marks, leaves, holidays, day] = await Promise.all([
        pool.query(`SELECT LOWER(a.email) AS email, a.full_name AS name, h.department FROM admin_accounts a
      LEFT JOIN hr_profiles h ON h.email = LOWER(a.email) WHERE ${EMPLOYEE_SQL} AND COALESCE(h.hr_status, 'active') <> 'exited' ORDER BY a.full_name`).then((r) => r.rows),
        pool.query(`SELECT LOWER(email) AS email, to_char(day, 'YYYY-MM-DD') AS d, status, mode FROM hr_attendance WHERE day BETWEEN $1 AND $2`, [start, end]).then((r) => r.rows),
        pool.query(`SELECT LOWER(email) AS email, to_char(from_date, 'YYYY-MM-DD') AS f, to_char(to_date, 'YYYY-MM-DD') AS t FROM hr_leaves
      WHERE status = 'approved' AND from_date <= $2 AND to_date >= $1`, [start, end]).then((r) => r.rows),
        holidaySet(pool, start, end),
        todayIst(),
    ]);
    const days = Array.from({ length: dim }, (_, index) => addDays(start, index));
    const rows = employees.map((employee) => {
        const codes = days.map((d) => {
            const mark = marks.find((item) => item.email === employee.email && item.d === d);
            if (mark)
                return mark.status === "absent" ? "A" : mark.status === "half_day" ? "H" : mark.mode === "wfh" ? "W" : "P";
            if (leaves.some((item) => item.email === employee.email && d >= item.f && d <= item.t))
                return "L";
            if (holidays.has(d))
                return "O";
            if (isSunday(d))
                return "S";
            return d <= day ? "-" : "";
        });
        const count = (code) => codes.filter((value) => value === code).length;
        return { ...employee, codes, present: count("P") + count("W") + count("H") * 0.5, leave: count("L"), absent: count("A") + count("-") };
    });
    return { month, days, today: day, rows };
};
// ---------- leave ----------
export const applyLeave = async (viewer, input) => {
    const ctx = await context(viewer);
    const forOther = Boolean(input.email) && String(input.email).toLowerCase() !== ctx.email;
    if (forOther)
        requireAdmin(ctx);
    else if (!ctx.isEmployee)
        throw new HrError("Leave is for employees.", 403);
    const account = await employeeAccount(pool, forOther ? String(input.email) : ctx.email);
    if (forOther)
        assertCanDecide(ctx, account);
    const policy = (await loadPolicy()).find((item) => item.key === input.type);
    if (!policy)
        throw new HrError("Choose a leave type.");
    const from = text(input.from, 10);
    const to = text(input.to, 10) || from;
    if (!isDate(from) || !isDate(to) || to < from)
        throw new HrError("Choose a valid date range.");
    if (from.slice(0, 4) !== to.slice(0, 4))
        throw new HrError("Apply separately for each calendar year.");
    const halfDay = Boolean(input.halfDay) && input.halfDay !== "false";
    if (halfDay && from !== to)
        throw new HrError("A half day must be a single date.");
    const reason = text(input.reason, 500);
    if (!reason)
        throw new HrError("Write a short reason for the leave.");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Lock this employee's leave rows so two applications cannot both pass the balance check.
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('hr-leave:' || $1))`, [account.email]);
        const days = workingDays(from, to, await holidaySet(client, from, to)) * (halfDay ? 0.5 : 1);
        if (!days)
            throw new HrError("These dates fall on Sundays or holidays. No leave is needed.");
        const overlap = await client.query(`SELECT 1 FROM hr_leaves WHERE LOWER(email) = $1 AND status IN ('pending', 'approved') AND from_date <= $3 AND to_date >= $2`, [account.email, from, to]);
        if (overlap.rowCount)
            throw new HrError("There is already a leave on some of these dates.");
        if (policy.paid) {
            const { rows } = await client.query(`SELECT COALESCE(SUM(days), 0)::float AS used FROM hr_leaves
        WHERE LOWER(email) = $1 AND type = $2 AND status IN ('pending', 'approved') AND to_char(from_date, 'YYYY') = $3`, [account.email, policy.key, from.slice(0, 4)]);
            const left = policy.quota - rows[0].used;
            if (days > left)
                throw new HrError(`Only ${Math.max(0, left)} day(s) of ${policy.label.toLowerCase()} left (pending requests included). Choose unpaid leave for the rest.`);
        }
        const status = forOther ? "approved" : "pending";
        await client.query(`INSERT INTO hr_leaves (email, type, from_date, to_date, half_day, days, reason, status, decided_by, decided_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [account.email, policy.key, from, to, halfDay, days, reason, status, forOther ? ctx.email : null, forOther ? new Date() : null, ctx.email]);
        await client.query("COMMIT");
        return forOther ? `${days} day(s) of ${policy.label.toLowerCase()} recorded for ${account.full_name}.` : `Leave request for ${days} day(s) sent for approval.`;
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    }
    finally {
        client.release();
    }
};
const decide = async (viewer, table, id, input) => {
    const ctx = await context(viewer);
    const decision = String(input.decision ?? "");
    if (!["approved", "rejected"].includes(decision))
        throw new HrError("Choose approve or reject.");
    const note = text(input.note, 500);
    if (decision === "rejected" && !note)
        throw new HrError("Write the reason for rejecting.");
    const label = table === "hr_leaves" ? `'leave from ' || to_char(t.from_date, 'DD Mon YYYY')` : `'request "' || t.title || '"'`;
    const { rows } = await pool.query(`SELECT LOWER(t.email) AS email, ${label} AS what, a.role, a.full_name FROM ${table} t
    JOIN admin_accounts a ON LOWER(a.email) = LOWER(t.email) WHERE t.id = $1`, [/^\d+$/.test(id) ? id : null]);
    const row = rows[0];
    if (!row)
        throw new HrError("Not found.", 404);
    assertCanDecide(ctx, { email: row.email, role: row.role });
    const { rowCount } = await pool.query(`UPDATE ${table} SET status = $2, decided_by = $3, decision_note = $4, decided_at = NOW() WHERE id = $1 AND status = 'pending'`, [id, decision, ctx.email, note || null]);
    if (!rowCount)
        throw new HrError("This was already decided or cancelled.");
    mail(row.email, `Your ${table === "hr_leaves" ? "leave" : "request"} was ${decision}`, `Hi ${row.full_name},\n\nYour ${row.what} was ${decision}${note ? `: ${note}` : ""}.`);
    return { message: `${row.full_name}'s ${table === "hr_leaves" ? "leave" : "request"} ${decision}.`, email: row.email };
};
export const decideLeave = (viewer, id, input) => decide(viewer, "hr_leaves", id, input);
export const decideRequest = (viewer, id, input) => decide(viewer, "hr_requests", id, input);
const cancel = async (viewer, table, id) => {
    const ctx = await context(viewer);
    const { rows } = await pool.query(`SELECT LOWER(email) AS email, status FROM ${table} WHERE id = $1`, [/^\d+$/.test(id) ? id : null]);
    const row = rows[0];
    if (!row)
        throw new HrError("Not found.", 404);
    const own = row.email === ctx.email;
    if (!own)
        requireAdmin(ctx);
    // Employees can withdraw a pending item; an approved item can only be cancelled by HR.
    const allowed = own && !ctx.isAdmin ? ["pending"] : ["pending", "approved"];
    if (table === "hr_requests") {
        const settled = await pool.query(`SELECT 1 FROM hr_requests WHERE id = $1 AND settled_month IS NOT NULL`, [id]);
        if (settled.rowCount)
            throw new HrError("This request was already paid in payroll.");
    }
    const { rowCount } = await pool.query(`UPDATE ${table} SET status = 'cancelled' WHERE id = $1 AND status = ANY($2)`, [id, allowed]);
    if (!rowCount)
        throw new HrError(own && !ctx.isAdmin && row.status === "approved" ? "Approved items can only be cancelled by the Superadmin or Admin." : "This can no longer be cancelled.");
    return "Cancelled.";
};
export const cancelLeave = (viewer, id) => cancel(viewer, "hr_leaves", id);
export const cancelRequest = (viewer, id) => cancel(viewer, "hr_requests", id);
// ---------- requests ----------
export const createRequest = async (viewer, input) => {
    const ctx = await context(viewer);
    if (!ctx.isEmployee)
        throw new HrError("Requests are for employees.", 403);
    const kind = String(input.kind ?? "");
    if (!(kind in REQUEST_KINDS))
        throw new HrError("Choose a request type.");
    const title = text(input.title, 120) || REQUEST_KINDS[kind];
    const needsAmount = kind === "reimbursement" || kind === "advance";
    const amount = needsAmount ? money(input.amount, "amount", 1_000_000) : null;
    if (needsAmount && !amount)
        throw new HrError("Enter the amount.");
    const details = text(input.details, 1000);
    if (!details)
        throw new HrError("Add the details so the approver understands the request.");
    await pool.query(`INSERT INTO hr_requests (email, kind, title, amount, details) VALUES ($1, $2, $3, $4, $5)`, [ctx.email, kind, title, amount, details]);
    return "Request sent for approval.";
};
// ---------- payroll ----------
export const getPayroll = async (viewer, month) => {
    const ctx = await context(viewer);
    requireOwner(ctx);
    if (!isMonth(month))
        throw new HrError("Choose a valid month.");
    const { rows } = await pool.query(`SELECT ${PAY_COLS}, h.bank_account AS "bankAccount", h.ifsc, h.designation, h.employee_code AS "employeeCode"
    FROM hr_payroll p JOIN admin_accounts a ON LOWER(a.email) = LOWER(p.email) LEFT JOIN hr_profiles h ON h.email = LOWER(p.email)
    WHERE p.month = $1 ORDER BY a.full_name`, [month]);
    const sum = (key) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
    return {
        month, rows,
        totals: { earned: sum("earned"), lop: sum("lopAmount"), reimbursements: sum("reimbursements"), advances: sum("advances"), bonus: sum("bonus"), deductions: sum("otherDeductions"), net: sum("net") },
        status: rows.length === 0 ? "none" : rows.every((row) => row.status === "paid") ? "paid" : "draft",
    };
};
const computeNet = (row) => Math.max(0, row.earned - row.lopAmount + row.reimbursements - row.advances + row.bonus - row.otherDeductions);
export const generatePayroll = async (viewer, month) => {
    const ctx = await context(viewer);
    requireOwner(ctx);
    if (!isMonth(month))
        throw new HrError("Choose a valid month.");
    const day = await todayIst();
    if (month > day.slice(0, 7))
        throw new HrError("Payroll cannot be run for a future month.");
    const { start, end, dim } = monthBounds(month);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('hr-payroll'))`);
        const employees = (await client.query(`SELECT LOWER(a.email) AS email, h.monthly_salary AS salary, to_char(h.joined_on, 'YYYY-MM-DD') AS joined, to_char(h.exit_on, 'YYYY-MM-DD') AS exit
       FROM admin_accounts a JOIN hr_profiles h ON h.email = LOWER(a.email)
       WHERE ${EMPLOYEE_SQL} AND h.monthly_salary > 0 AND (h.joined_on IS NULL OR h.joined_on <= $2)
         AND (h.hr_status <> 'exited' OR h.exit_on >= $1)`, [start, end])).rows;
        const existing = (await client.query(`SELECT LOWER(email) AS email, status, bonus, other_deductions, note FROM hr_payroll WHERE month = $1`, [month])).rows;
        const holidays = await holidaySet(client, start, end);
        const unpaid = (await client.query(`SELECT LOWER(email) AS email, to_char(GREATEST(from_date, $1::date), 'YYYY-MM-DD') AS f, to_char(LEAST(to_date, $2::date), 'YYYY-MM-DD') AS t, half_day AS half
       FROM hr_leaves l JOIN hr_leave_policy p ON p.key = l.type WHERE NOT p.paid AND l.status = 'approved' AND from_date <= $2 AND to_date >= $1`, [start, end])).rows;
        // Approved reimbursements are paid and approved advances recovered in the first payroll after approval, once.
        const claims = (await client.query(`SELECT id::text, LOWER(email) AS email, kind, amount FROM hr_requests r
       WHERE r.status = 'approved' AND r.kind IN ('reimbursement', 'advance') AND r.settled_month IS NULL AND r.decided_at < ($2::date + 1)
         AND NOT EXISTS (SELECT 1 FROM hr_payroll p WHERE p.month <> $1 AND p.status = 'draft' AND r.id = ANY(p.request_ids))`, [month, end])).rows;
        await client.query(`DELETE FROM hr_payroll WHERE month = $1 AND status = 'draft'`, [month]);
        let made = 0;
        for (const employee of employees) {
            const before = existing.find((row) => row.email === employee.email);
            if (before?.status === "paid")
                continue;
            const from = employee.joined && employee.joined > start ? employee.joined : start;
            const to = employee.exit && employee.exit < end ? employee.exit : end;
            const paidDays = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1);
            const earned = Math.round(employee.salary * paidDays / dim);
            const lopDays = unpaid.filter((leave) => leave.email === employee.email)
                .reduce((total, leave) => total + workingDays(leave.f, leave.t, holidays) * (leave.half ? 0.5 : 1), 0);
            const lopAmount = Math.min(earned, Math.round(employee.salary / dim * lopDays));
            const mine = claims.filter((claim) => claim.email === employee.email);
            const reimbursements = mine.filter((claim) => claim.kind === "reimbursement").reduce((total, claim) => total + claim.amount, 0);
            const advances = mine.filter((claim) => claim.kind === "advance").reduce((total, claim) => total + claim.amount, 0);
            const row = { earned, lopAmount, reimbursements, advances, bonus: before?.bonus ?? 0, otherDeductions: before?.other_deductions ?? 0 };
            await client.query(`INSERT INTO hr_payroll (month, email, salary, days_in_month, paid_days, earned, lop_days, lop_amount, reimbursements, advances, bonus, other_deductions, net, request_ids, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [month, employee.email, employee.salary, dim, paidDays, earned, lopDays, lopAmount, reimbursements, advances, row.bonus, row.otherDeductions,
                computeNet(row), mine.map((claim) => claim.id), before?.note ?? null]);
            made += 1;
        }
        await client.query("COMMIT");
        return made ? `Payroll draft ready for ${made} employee(s). Check it, then mark it paid.` : "No employees with a monthly salary to pay. Set salaries in Employees first.";
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    }
    finally {
        client.release();
    }
};
export const adjustPayroll = async (viewer, month, email, input) => {
    const ctx = await context(viewer);
    requireOwner(ctx);
    const bonus = money(input.bonus, "bonus");
    const otherDeductions = money(input.otherDeductions, "deduction");
    const { rowCount } = await pool.query(`UPDATE hr_payroll SET bonus = $3, other_deductions = $4, note = $5, updated_at = NOW(),
       net = GREATEST(0, earned - lop_amount + reimbursements - advances + $3 - $4)
     WHERE month = $1 AND LOWER(email) = LOWER($2) AND status = 'draft'`, [month, email, bonus, otherDeductions, text(input.note, 200) || null]);
    if (!rowCount)
        throw new HrError("Only draft payroll rows can be changed.");
    return "Payroll row updated.";
};
export const payPayroll = async (viewer, month) => {
    const ctx = await context(viewer);
    requireOwner(ctx);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const day = await todayIst(client);
        const { rows } = await client.query(`UPDATE hr_payroll p SET status = 'paid', paid_on = $2, updated_at = NOW() FROM admin_accounts a
       WHERE p.month = $1 AND p.status = 'draft' AND LOWER(a.email) = LOWER(p.email) RETURNING p.email, p.net, p.request_ids, a.full_name`, [month, day]);
        if (!rows.length)
            throw new HrError("There is no draft payroll to pay for this month.");
        const ids = rows.flatMap((row) => row.request_ids);
        if (ids.length)
            await client.query(`UPDATE hr_requests SET settled_month = $1 WHERE id = ANY($2::bigint[])`, [month, ids]);
        await client.query("COMMIT");
        for (const row of rows)
            mail(row.email, `Your payslip for ${month} is ready`, `Hi ${row.full_name},\n\nYour salary for ${month} (net ₹${row.net.toLocaleString("en-IN")}) is marked paid. Open My HR in the Scorenow admin portal to view the payslip.`);
        return `Payroll for ${month} marked paid for ${rows.length} employee(s). Payslips are now visible to them.`;
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    }
    finally {
        client.release();
    }
};
// ---------- company settings ----------
export const addHoliday = async (viewer, input) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    const day = text(input.day, 10);
    const name = text(input.name, 80);
    if (!isDate(day) || !name)
        throw new HrError("Enter the holiday date and name.");
    await pool.query(`INSERT INTO hr_holidays (day, name) VALUES ($1, $2) ON CONFLICT (day) DO UPDATE SET name = $2`, [day, name]);
    return `${name} added to holidays.`;
};
export const removeHoliday = async (viewer, day) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    const { rowCount } = await pool.query(`DELETE FROM hr_holidays WHERE day = $1`, [isDate(day) ? day : null]);
    if (!rowCount)
        throw new HrError("Holiday not found.", 404);
    return "Holiday removed.";
};
export const updatePolicy = async (viewer, key, input) => {
    const ctx = await context(viewer);
    requireOwner(ctx);
    const quota = Number(input.quota);
    if (!Number.isFinite(quota) || quota < 0 || quota > 365 || quota * 2 !== Math.round(quota * 2))
        throw new HrError("Enter days per year in steps of 0.5.");
    const { rowCount } = await pool.query(`UPDATE hr_leave_policy SET yearly_quota = $2 WHERE key = $1 AND paid`, [key, quota]);
    if (!rowCount)
        throw new HrError("Only paid leave types have a yearly quota.", 404);
    return "Leave policy updated.";
};
export const postAnnouncement = async (viewer, input) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    const title = text(input.title, 120);
    const body = String(input.body ?? "").trim().slice(0, 2000);
    if (!title || !body)
        throw new HrError("Enter a title and message.");
    await pool.query(`INSERT INTO hr_announcements (title, body, created_by) VALUES ($1, $2, $3)`, [title, body, ctx.email]);
    return "Announcement posted to all employees.";
};
export const removeAnnouncement = async (viewer, id) => {
    const ctx = await context(viewer);
    requireAdmin(ctx);
    const { rowCount } = await pool.query(`DELETE FROM hr_announcements WHERE id = $1`, [/^\d+$/.test(id) ? id : null]);
    if (!rowCount)
        throw new HrError("Announcement not found.", 404);
    return "Announcement removed.";
};
