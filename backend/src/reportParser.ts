import type { Bureau } from "./bureaus.js";

// Bump when parsing changes so stored raw reports get re-normalized on next view.
export const PARSER_VERSION = 2;

export type ReportAccount = {
  lender: string;
  type: string;
  accountNumber: string | null;
  status: "active" | "closed";
  openedOn: string | null;
  closedOn: string | null;
  sanctionedAmount: number | null;
  creditLimit: number | null;
  currentBalance: number | null;
  overdueAmount: number | null;
  lastPaymentOn: string | null;
  emiAmount?: number | null;
  interestRate?: number | null;
  writtenOffAmount?: number | null;
  settlementAmount?: number | null;
  // Most recent first; each entry is days past due (0 = on time) or null if not reported.
  paymentHistory: { month: string; daysPastDue: number | null }[];
};

export type ScoreFactor = {
  impact: "positive" | "negative";
  text: string;
  tip: string | null;
};

export type ReportEnquiry = {
  lender: string;
  purpose: string | null;
  date: string | null;
  amount: number | null;
};

export type NormalizedReport = {
  parserVersion: number;
  bureau: Bureau;
  score: number | null;
  reportDate: string | null;
  personal: {
    name: string | null;
    pan: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    phones: string[];
    emails: string[];
    addresses: string[];
  };
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    closedAccounts: number;
    overdueAccounts: number;
    totalSanctioned: number;
    totalBalance: number;
    totalOverdue: number;
    enquiriesLast6Months: number;
    writtenOffAccounts: number;
  };
  scoreFactors?: ScoreFactor[];
  accounts: ReportAccount[];
  enquiries: ReportEnquiry[];
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const get = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) => {
    if (Array.isArray(current)) current = current[0];
    return isObject(current) ? current[key] : undefined;
  }, value);

const firstOf = (value: unknown, ...paths: string[]) => {
  for (const path of paths) {
    const found = get(value, path);
    if (found !== undefined && found !== null && found !== "") return found;
  }
  return undefined;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);

const text = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result ? result : null;
};

const amount = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(String(value).replace(/[,₹\s]/g, ""));
  return Number.isFinite(number) ? number : null;
};

const pad = (value: number) => String(value).padStart(2, "0");

// Bureaus use YYYY-MM-DD, YYYYMMDD, DDMMYYYY, DD-MM-YYYY and DD/MM/YYYY; normalize to YYYY-MM-DD.
const isoDate = (value: unknown): string | null => {
  const raw = text(value);
  if (!raw) return null;
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{8}$/.test(raw)) {
    const asYmd = { y: Number(raw.slice(0, 4)), m: Number(raw.slice(4, 6)), d: Number(raw.slice(6, 8)) };
    if (asYmd.y > 1900 && asYmd.m >= 1 && asYmd.m <= 12) return `${asYmd.y}-${pad(asYmd.m)}-${pad(asYmd.d)}`;
    return `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`;
  }
  return null;
};

const maskAccount = (value: unknown) => {
  const raw = text(value);
  if (!raw) return null;
  return raw.length <= 4 ? raw : `••••${raw.slice(-4)}`;
};

const maskPan = (value: unknown) => {
  const raw = text(value)?.toUpperCase();
  return raw && raw.length === 10 ? `${raw.slice(0, 2)}•••••${raw.slice(7)}` : null;
};

const validScore = (value: unknown) => {
  const score = amount(value);
  return score !== null && Number.isInteger(score) && score >= 300 && score <= 900 ? score : null;
};

const accountTypeNames: Record<string, string> = {
  "00": "Other",
  "01": "Auto Loan", "02": "Housing Loan", "03": "Property Loan", "04": "Loan Against Shares",
  "05": "Personal Loan", "06": "Consumer Loan", "07": "Gold Loan", "08": "Education Loan",
  "09": "Loan to Professional", "10": "Credit Card", "11": "Leasing", "12": "Overdraft",
  "13": "Two-Wheeler Loan", "15": "Loan Against Fixed Deposit", "17": "Commercial Vehicle Loan",
  "31": "Secured Credit Card", "32": "Used Car Loan", "33": "Construction Equipment Loan",
  "35": "Corporate Credit Card", "36": "Kisan Credit Card", "51": "Business Loan", "61": "Business Loan (Priority Sector)",
  "69": "Short Term Personal Loan",
};

const accountType = (value: unknown) => {
  const raw = text(value);
  if (!raw) return "Loan";
  const code = raw.padStart(2, "0");
  return accountTypeNames[code] ?? raw;
};

const buildSummary = (accounts: ReportAccount[], enquiries: ReportEnquiry[], reportDate: string | null, overrides: Partial<NormalizedReport["summary"]>) => {
  const reference = reportDate ? new Date(reportDate) : new Date();
  const sixMonthsAgo = new Date(reference);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const active = accounts.filter((account) => account.status === "active");
  const computed = {
    totalAccounts: accounts.length,
    activeAccounts: active.length,
    closedAccounts: accounts.length - active.length,
    overdueAccounts: accounts.filter((account) => (account.overdueAmount ?? 0) > 0).length,
    totalSanctioned: accounts.reduce((sum, account) => sum + (account.sanctionedAmount ?? account.creditLimit ?? 0), 0),
    totalBalance: active.reduce((sum, account) => sum + Math.max(account.currentBalance ?? 0, 0), 0),
    totalOverdue: accounts.reduce((sum, account) => sum + (account.overdueAmount ?? 0), 0),
    enquiriesLast6Months: enquiries.filter((enquiry) => enquiry.date && new Date(enquiry.date) >= sixMonthsAgo).length,
    writtenOffAccounts: accounts.filter((account) => (account.writtenOffAmount ?? 0) > 0 || (account.settlementAmount ?? 0) > 0).length,
  };
  // Bureau-provided totals win when the account list is empty or truncated.
  const merged = { ...computed };
  for (const [key, value] of Object.entries(overrides) as [keyof typeof computed, number | null | undefined][]) {
    if (typeof value === "number" && Number.isFinite(value) && (computed[key] === 0 || value > computed[key])) merged[key] = value;
  }
  return merged;
};

const parseExperian = (raw: unknown): Omit<NormalizedReport, "parserVersion" | "bureau"> => {
  const data = firstOf(raw, "data.data", "data") ?? {};
  const report = get(data, "credit_report") ?? data;
  const applicant = get(report, "Current_Application.Current_Application_Details.Current_Applicant_Details");
  const reportDate = isoDate(get(report, "CreditProfileHeader.ReportDate"));
  const accounts: ReportAccount[] = asArray(get(report, "CAIS_Account.CAIS_Account_DETAILS")).filter(isObject).map((account) => {
    const status = text(account.Account_Status) ?? "";
    const closed = Boolean(text(account.Date_Closed)) || ["13", "14", "15", "16", "17"].includes(status);
    return {
      lender: text(account.Subscriber_Name) ?? "Unknown lender",
      type: accountType(account.Account_Type),
      accountNumber: maskAccount(account.Account_Number),
      status: closed ? "closed" : "active",
      openedOn: isoDate(account.Open_Date),
      closedOn: isoDate(account.Date_Closed),
      sanctionedAmount: amount(account.Highest_Credit_or_Original_Loan_Amount),
      creditLimit: amount(account.Credit_Limit_Amount),
      currentBalance: amount(account.Current_Balance),
      overdueAmount: amount(account.Amount_Past_Due),
      lastPaymentOn: isoDate(account.Date_of_Last_Payment),
      paymentHistory: asArray(account.CAIS_Account_History).filter(isObject).map((entry) => ({
        month: `${text(entry.Year) ?? ""}-${pad(Number(entry.Month) || 0)}`,
        daysPastDue: amount(entry.Days_Past_Due),
      })).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 24),
    };
  });
  const enquiries: ReportEnquiry[] = asArray(get(report, "CAPS.CAPS_Application_Details")).filter(isObject).map((enquiry) => ({
    lender: text(enquiry.Subscriber_Name) ?? "Unknown lender",
    purpose: text(enquiry.Enquiry_Reason) ? accountType(enquiry.Finance_Purpose ?? enquiry.Enquiry_Reason) : null,
    date: isoDate(enquiry.Date_of_Request),
    amount: amount(enquiry.Amount_Financed),
  }));
  const name = [text(get(applicant, "First_Name")), text(get(applicant, "Middle_Name1")), text(get(applicant, "Last_Name"))].filter(Boolean).join(" ");
  const genderCode = text(get(applicant, "Gender_Code"));
  return {
    score: validScore(firstOf(data, "credit_score")) ?? validScore(get(report, "SCORE.BureauScore")),
    reportDate,
    personal: {
      name: name || text(get(data, "name")),
      pan: maskPan(firstOf(applicant, "IncomeTaxPan") ?? get(data, "pan")),
      dateOfBirth: isoDate(get(applicant, "Date_Of_Birth_Applicant")),
      gender: genderCode === "1" ? "Male" : genderCode === "2" ? "Female" : null,
      phones: [text(get(applicant, "MobilePhoneNumber")) ?? text(get(applicant, "Telephone_Number_Applicant_1st")) ?? text(get(data, "mobile"))].filter((value): value is string => Boolean(value)),
      emails: [text(get(applicant, "EMailId"))].filter((value): value is string => Boolean(value)),
      addresses: asArray(get(report, "Current_Application.Current_Application_Details.Current_Applicant_Address_Details")).filter(isObject).map((address) =>
        [address.FlatNoPlotNoHouseNo, address.BldgNoSocietyName, address.RoadNoNameAreaLocality, address.City, address.PINCode].map(text).filter(Boolean).join(", "),
      ).filter(Boolean),
    },
    summary: buildSummary(accounts, enquiries, reportDate, {
      totalAccounts: amount(get(report, "CAIS_Account.CAIS_Summary.Credit_Account.CreditAccountTotal")) ?? undefined,
      activeAccounts: amount(get(report, "CAIS_Account.CAIS_Summary.Credit_Account.CreditAccountActive")) ?? undefined,
      closedAccounts: amount(get(report, "CAIS_Account.CAIS_Summary.Credit_Account.CreditAccountClosed")) ?? undefined,
      totalBalance: amount(get(report, "CAIS_Account.CAIS_Summary.Total_Outstanding_Balance.Outstanding_Balance_All")) ?? undefined,
      enquiriesLast6Months: amount(get(report, "TotalCAPS_Summary.TotalCAPSLast180Days")) ?? undefined,
    }),
    accounts,
    enquiries,
  };
};

const parseEquifax = (raw: unknown): Omit<NormalizedReport, "parserVersion" | "bureau"> => {
  const data = firstOf(raw, "data.data", "data") ?? {};
  const report = get(data, "credit_report") ?? data;
  const cir = firstOf(report, "CCRResponse.CIRReportDataLst.CIRReportData", "CIRReportDataLst.CIRReportData", "CIRReportData") ?? report;
  const personal = get(cir, "IDAndContactInfo");
  const reportDate = isoDate(firstOf(report, "InquiryResponseHeader.Date", "CCRResponse.InquiryResponseHeader.Date"));
  const accounts: ReportAccount[] = asArray(get(cir, "RetailAccountDetails")).filter(isObject).map((account) => {
    const open = text(account.Open)?.toLowerCase();
    const closed = open === "no" || Boolean(text(account.DateClosed)) || /closed/i.test(text(account.AccountStatus) ?? "");
    return {
      lender: text(account.Institution) ?? "Unknown lender",
      type: text(account.AccountType) ?? "Loan",
      accountNumber: maskAccount(account.AccountNumber),
      status: closed ? "closed" : "active",
      openedOn: isoDate(account.DateOpened),
      closedOn: isoDate(account.DateClosed),
      sanctionedAmount: amount(account.SanctionAmount),
      creditLimit: amount(account.CreditLimit),
      currentBalance: amount(account.Balance),
      overdueAmount: amount(account.PastDueAmount),
      lastPaymentOn: isoDate(account.LastPaymentDate),
      paymentHistory: asArray(account.History48Months).filter(isObject).map((entry) => {
        const [month, year] = (text(entry.key) ?? "").split("-");
        const status = text(entry.PaymentStatus) ?? "";
        return {
          month: year && month ? `20${year.slice(-2)}-${month.padStart(2, "0")}` : "",
          daysPastDue: /^\d+$/.test(status) ? Number(status) : status === "*" || status === "" ? null : 0,
        };
      }).filter((entry) => entry.month).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 24),
    };
  });
  const enquiries: ReportEnquiry[] = asArray(get(cir, "Enquiries")).filter(isObject).map((enquiry) => ({
    lender: text(enquiry.Institution) ?? "Unknown lender",
    purpose: text(enquiry.RequestPurpose),
    date: isoDate(enquiry.Date),
    amount: amount(enquiry.Amount),
  }));
  const summary = get(cir, "RetailAccountsSummary");
  return {
    score: validScore(get(data, "credit_score")) ?? validScore(get(cir, "ScoreDetails.Value")),
    reportDate,
    personal: {
      name: text(get(personal, "PersonalInfo.Name.FullName")) ?? text(get(data, "name")),
      pan: maskPan(get(personal, "IdentityInfo.PANId.IdNumber") ?? get(data, "id_number")),
      dateOfBirth: isoDate(get(personal, "PersonalInfo.DateOfBirth")),
      gender: text(get(personal, "PersonalInfo.Gender")),
      phones: asArray(get(personal, "PhoneInfo")).filter(isObject).map((phone) => text(phone.Number)).filter((value): value is string => Boolean(value)),
      emails: asArray(get(personal, "EmailAddressInfo")).filter(isObject).map((email) => text(email.EmailAddress)).filter((value): value is string => Boolean(value)),
      addresses: asArray(get(personal, "AddressInfo")).filter(isObject).map((address) =>
        [address.Address, address.State, address.Postal].map(text).filter(Boolean).join(", "),
      ).filter(Boolean),
    },
    summary: buildSummary(accounts, enquiries, reportDate, {
      totalAccounts: amount(get(summary, "NoOfAccounts")) ?? undefined,
      activeAccounts: amount(get(summary, "NoOfActiveAccounts")) ?? undefined,
      overdueAccounts: amount(get(summary, "NoOfPastDueAccounts")) ?? undefined,
      totalSanctioned: amount(get(summary, "TotalSanctionAmount")) ?? undefined,
      totalBalance: amount(get(summary, "TotalBalanceAmount")) ?? undefined,
      totalOverdue: amount(get(summary, "TotalPastDue")) ?? undefined,
      enquiriesLast6Months: amount(get(cir, "EnquirySummary.Past6Months")) ?? undefined,
    }),
    accounts,
    enquiries,
  };
};

// CIBIL sends -1 for values the lender did not report.
const reported = (value: unknown) => {
  const number = amount(value);
  return number !== null && number >= 0 ? number : null;
};

// Factor text is "<generic intro>. <what happened>. <how to improve>."; split it into the finding and the tip.
const cibilScoreFactors = (borrower: unknown): ScoreFactor[] => {
  const seen = new Set<string>();
  return asArray(get(borrower, "CreditScore.CreditScoreFactor")).filter(isObject).flatMap((factor) => {
    const texts = asArray(factor.FactorText).map(text).filter((value): value is string => Boolean(value));
    const body = (texts.find((value) => value.startsWith("explain:")) ?? texts[0])?.replace(/^\w+:\s*/, "");
    if (!body || seen.has(body)) return [];
    seen.add(body);
    const sentences = (body.match(/[^.]+\.?/g) ?? []).map((sentence) => sentence.trim()).filter(Boolean);
    const tipStart = sentences.findIndex((sentence) => /^(One way|To maintain|To improve)/i.test(sentence));
    const finding = sentences.slice(1, tipStart === -1 ? undefined : tipStart).join(" ") || body;
    return [{
      impact: /negative/i.test(finding) ? "negative" : "positive",
      text: finding,
      tip: tipStart === -1 ? null : sentences.slice(tipStart).join(" "),
    } satisfies ScoreFactor];
  });
};

const parseCibil = (raw: unknown): Omit<NormalizedReport, "parserVersion" | "bureau"> => {
  const data = firstOf(raw, "data.data", "data") ?? {};
  const report = firstOf(
    data,
    "cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset.TrueLinkCreditReport",
    "cibilData.TrueLinkCreditReport",
  );
  const borrower = get(report, "Borrower");
  const reportDate = isoDate(firstOf(report, "SB.reportDate", "reportDate", "Sources.Source.InquiryDate")) ?? new Date().toISOString().slice(0, 10);
  const accounts: ReportAccount[] = asArray(get(report, "TradeLinePartition")).flatMap((partition) => asArray(isObject(partition) ? partition.Tradeline ?? partition : partition))
    .filter(isObject).map((trade) => {
      const granted = isObject(trade.GrantedTrade) ? trade.GrantedTrade : {};
      const openClosed = text(get(trade, "OpenClosed.symbol")) ?? text(trade.OpenClosed);
      return {
        lender: text(trade.creditorName) ?? "Unknown lender",
        type: text(get(trade, "AccountType.description")) ?? accountType(get(granted, "AccountType.symbol") ?? get(trade, "AccountType.symbol") ?? trade.accountTypeSymbol),
        accountNumber: maskAccount(trade.accountNumber),
        status: openClosed === "C" || Boolean(text(trade.dateClosed)) ? "closed" : "active",
        openedOn: isoDate(trade.dateOpened),
        closedOn: isoDate(trade.dateClosed),
        sanctionedAmount: reported(trade.highBalance),
        creditLimit: reported(granted.CreditLimit),
        currentBalance: reported(trade.currentBalance),
        overdueAmount: reported(granted.amountPastDue),
        lastPaymentOn: isoDate(granted.dateLastPayment),
        emiAmount: reported(granted.EMIAmount),
        interestRate: reported(granted.interestRate),
        writtenOffAmount: reported(trade.writtenOffAmtTotal),
        settlementAmount: reported(trade.settlementAmount),
        paymentHistory: asArray(get(granted, "PayStatusHistory.MonthlyPayStatus")).filter(isObject).map((entry) => ({
          month: (isoDate(entry.date) ?? "").slice(0, 7),
          daysPastDue: /^\d+$/.test(text(entry.status) ?? "") ? Number(entry.status) : null,
        })).filter((entry) => entry.month).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 24),
      };
    });
  const enquiries: ReportEnquiry[] = asArray(get(report, "InquiryPartition")).flatMap((partition) => asArray(isObject(partition) ? partition.Inquiry ?? partition : partition))
    .filter(isObject).map((enquiry) => ({
      lender: text(enquiry.subscriberName) ?? "Unknown lender",
      purpose: text(enquiry.inquiryType) ? accountType(enquiry.inquiryType) : text(get(enquiry, "Purpose.description")),
      date: isoDate(enquiry.inquiryDate),
      amount: reported(enquiry.amount),
    }));
  const name = [text(get(borrower, "BorrowerName.Name.Forename")), text(get(borrower, "BorrowerName.Name.Surname"))].filter(Boolean).join(" ");
  return {
    score: validScore(get(borrower, "CreditScore.riskScore")) ?? validScore(get(data, "credit_score")),
    reportDate,
    personal: {
      name: name || null,
      pan: maskPan(firstOf(borrower, "IdentifierPartition.Identifier.ID.Id", "IdentifierPartition.Identifier.ID.id")),
      dateOfBirth: isoDate(get(borrower, "Birth.date")),
      gender: text(get(borrower, "Gender")),
      phones: asArray(get(borrower, "BorrowerTelephone")).filter(isObject).map((phone) => text(get(phone, "PhoneNumber.Number"))).filter((value): value is string => Boolean(value)),
      emails: asArray(get(borrower, "EmailAddress")).filter(isObject).map((email) => text(email.Email)).filter((value): value is string => Boolean(value)),
      addresses: asArray(get(borrower, "BorrowerAddress")).filter(isObject).map((address) =>
        [get(address, "CreditAddress.StreetAddress"), get(address, "CreditAddress.City"), get(address, "CreditAddress.PostalCode")].map(text).filter(Boolean).join(", "),
      ).filter(Boolean),
    },
    summary: buildSummary(accounts, enquiries, reportDate, {}),
    scoreFactors: cibilScoreFactors(borrower),
    accounts,
    enquiries,
  };
};

export const normalizeReport = (bureau: Bureau, raw: unknown): NormalizedReport => {
  const parsed = bureau === "experian" ? parseExperian(raw) : bureau === "equifax" ? parseEquifax(raw) : parseCibil(raw);
  return { parserVersion: PARSER_VERSION, bureau, ...parsed };
};
