import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const logoPath = fileURLToPath(new URL("../assets/bureau-logos/equifax.png", import.meta.url));
const logoSrc = existsSync(logoPath) ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}` : null;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rs = (value) => value === null || value === undefined ? "" : `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}`;
const dmy = (value) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
};
const age = (dob) => {
    const match = dob?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match)
        return "";
    const now = new Date();
    let months = (now.getFullYear() - Number(match[1])) * 12 + now.getMonth() + 1 - Number(match[2]);
    if (now.getDate() < Number(match[3]))
        months -= 1;
    return `${Math.floor(months / 12)} Years ${months % 12} Months`;
};
const field = (label, value) => `<div class="f"><i>${esc(label)}</i> <b>${esc(value)}</b></div>`;
const glossaryHistory = [
    ["000", "Current account"], ["CLSD", "Paid or closed account/zero balance"], ["NEW", "New Account"], ["LNSB", "Loan Submitted"],
    ["LAND", "Loan Approved - Not yet disbursed"], ["INAC", "Account is Inactive"], ["CON", "Contact Member for Status"], ["DEC", "Loan Declined"],
    ["01+", "1-30 days past due"], ["31+", "31-60 days past due"], ["61+", "61-90 days past due"], ["91+", "91-120 days past due"],
    ["121+", "121 - 179 days past due"], ["181+", "180 or more days past due"], ["STD", "Standard"], ["SUB", "Sub-standard"],
    ["DBT", "Doubtful"], ["LOS", "Loss"], ["SMA", "Special Mention Accounts"], ["NPA", "Non Performing Assets"],
    ["OPN", "Open"], ["SET", "Settled & Closed"], ["WOF", "Written Off"], ["PWOS", "Post Write Off Settled"],
    ["RES", "Restructured Loan"], ["*", "Data Not Reported"], ["DPD", "Days Past Due"],
];
const historyTable = (account) => {
    if (!account.paymentHistory.length)
        return "";
    const rows = [];
    for (let i = 0; i < account.paymentHistory.length; i += 16) {
        const chunk = account.paymentHistory.slice(i, i + 16);
        const code = (dpd, last) => (last && chunk.length < 16 && i + 16 >= account.paymentHistory.length && dpd === null ? "NEW" : dpd === null ? "*" : String(dpd).padStart(3, "0"));
        rows.push(`<table class="h"><tr>${chunk.map((e, k) => `<td>${code(e.daysPastDue, k === chunk.length - 1)}</td>`).join("")}</tr>
      <tr>${chunk.map(() => "<td>*</td>").join("")}</tr><tr>${chunk.map(() => "<td>*</td>").join("")}</tr><tr>${chunk.map(() => "<td>*</td>").join("")}</tr>
      <tr class="m">${chunk.map((e) => `<td>${esc(`${e.month.slice(5, 7)}-${e.month.slice(2, 4)}`)}</td>`).join("")}</tr></table>`);
    }
    return `<div class="hist"><u>History</u><div class="hl"><div><i>Account Status:</i></div><div><i>Asset Classification:</i></div><div><i>Suit Filed Status:</i></div><div><i>Days Past Due:</i></div></div>${rows.join("")}</div>`;
};
const accountBlock = (a, index) => `
<div class="acct ${index % 2 ? "alt" : ""}">
  <div class="g4">
    <div><div class="f"><i>Acct # :</i> ${esc(a.accountNumber)}</div><div class="f"><i>Institution :</i> ${esc(a.lender)}</div><div class="f"><i>Type:</i> ${esc(a.type)}</div><div class="f"><i>Ownership Type:</i> Individual</div></div>
    <div><div class="f"><i>Balance:</i> ${esc(rs(a.currentBalance))}</div><div class="f"><i>Past Due Amount:</i> ${esc(a.overdueAmount ?? "")}</div><div class="f"><i>Last Payment:</i></div><div class="f"><i>Write-off Amount:</i> ${esc(rs(a.writtenOffAmount))}</div></div>
    <div><div class="f"><i>Open:</i> ${a.status === "active" ? "Yes" : "No"}</div><div class="f"><i>Interest Rate:</i> ${esc(a.interestRate ?? "")}</div><div class="f"><i>Last Payment Date:</i> ${esc(dmy(a.lastPaymentOn))}</div><div class="f"><i>Sanction Amount :</i> ${esc(rs(a.sanctionedAmount))}</div></div>
    <div><div class="f"><i>Date Reported:</i></div><div class="f"><i>Date Opened:</i> ${esc(dmy(a.openedOn))}</div><div class="f"><i>Date Closed:</i> ${esc(dmy(a.closedOn))}</div><div class="f"><i>Reason:</i> ${a.status === "closed" ? "Closed Account" : ""}</div></div>
  </div>
  <div class="g4 sep"><div><div class="f"><i>Repayment Tenure:</i></div><div class="f"><i>Dispute Code:</i></div></div><div><div class="f"><i>Monthly Payment Amount:</i> ${esc(rs(a.emiAmount))}</div><div class="f"><i>Term Frequency:</i></div></div><div><div class="f"><i>Credit Limit:</i> ${esc(rs(a.creditLimit))}</div></div><div><div class="f"><i>Collateral Value:</i></div><div class="f"><i>Collateral Type:</i></div></div></div>
  <div class="sep"><div class="f"><i>Account Status:</i> ${a.status === "active" ? "Current Account" : "Closed Account"}</div><div class="f"><i>Asset Classification:</i></div><div class="f"><i>Suit Filed Status:</i></div></div>
  <div class="sep">${historyTable(a)}</div>
</div>`;
export const buildEquifaxHtml = (report, reportDate) => {
    const p = report.personal;
    const now = new Date();
    const printDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const printTime = now.toTimeString().slice(0, 8);
    const orderNo = `${now.getFullYear()}${String(now.getTime()).slice(-6)}`;
    const s = report.summary;
    const lastEnquiry = report.enquiries.map((e) => e.date).filter(Boolean).sort().pop() ?? null;
    const nowMs = Date.now();
    const within = (days) => report.enquiries.filter((e) => e.date && nowMs - new Date(e.date).getTime() <= days * 86400000).length;
    const openAccounts = report.accounts.filter((a) => a.status === "active");
    const recent = [...report.accounts].sort((a, b) => (b.openedOn ?? "").localeCompare(a.openedOn ?? ""))[0];
    const highestSanction = Math.max(0, ...report.accounts.map((a) => a.sanctionedAmount ?? 0));
    const highestBalance = Math.max(0, ...report.accounts.map((a) => a.currentBalance ?? 0));
    const oldest = report.accounts.filter((a) => a.openedOn).sort((a, b) => a.openedOn.localeCompare(b.openedOn))[0];
    const monthly = report.accounts.reduce((sum, a) => sum + (a.emiAmount ?? 0), 0);
    const avgOpen = openAccounts.length ? openAccounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0) / openAccounts.length : 0;
    const head = `<div class="top">${logoSrc ? `<img src="${logoSrc}" class="logo">` : "<b>EQUIFAX</b>"}<h1>Equifax Credit Report with Score</h1></div>
    <div class="meta"><b>Report Order No:</b> ${esc(orderNo)}<span><b>Date :</b> ${printDate}<br><b>Time :</b> ${printTime}</span></div><hr>`;
    return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0 }
* { box-sizing: border-box }
body { font-family: Helvetica, Arial, sans-serif; font-size: 8.5px; color: #222; margin: 0; padding: 14mm 12mm 16mm }
.top { display: flex; align-items: center; justify-content: center; position: relative; height: 40px }
.logo { position: absolute; left: 0; height: 34px }
h1 { color: #8c1c2c; font-size: 17px; margin: 0 }
.meta { display: flex; justify-content: space-between; color: #8c1c2c; margin: 6px 0 2px; font-size: 8px }
.meta span { text-align: left }
hr { border: 0; border-top: 1px solid #999; margin: 4px 0 14px }
h2 { font-size: 15px; font-weight: 500; color: #333; margin: 18px 0 8px }
table { width: 100%; border-collapse: collapse }
th { background: #8c1c2c; color: #fff; font-weight: 500; font-size: 7.5px; padding: 3px 4px; text-align: left }
th.c, td.c { text-align: center }
td { padding: 4px; font-size: 8px; vertical-align: top }
tr.z td { background: #eee }
table.box { border: 1px solid #ccc }
.cols { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #ccc; border-top: 0 }
.cols > div { padding: 3px 6px }
.colh { display: grid; grid-template-columns: repeat(3, 1fr); background: #8c1c2c; color: #fff; font-size: 7.5px }
.colh > div { padding: 3px 6px }
.f { margin: 3px 0 } .f i { color: #666 } .f b { font-weight: 600 }
.sum { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #ccc; border-top: 0; padding: 4px }
.sum div.f { padding: 3px 6px }
.acct { border: 1px solid #ccc; border-top: 2px solid #8c1c2c; margin: 12px 0 0; page-break-inside: avoid }
.acct.alt { background: #efefef }
.g4 { display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr; padding: 6px 8px }
.sep { border-top: 1px solid #ccc; padding: 4px 8px }
.g4.sep { padding: 4px 8px }
.hist { position: relative; padding-left: 0 } .hist u { color: #666; font-style: italic; display: block; margin-bottom: 2px }
.hl { float: left; width: 100px; line-height: 14px; font-style: italic; color: #666 }
table.h { width: auto; margin: 0 0 8px 100px; border: 1px solid #bbb; table-layout: fixed }
table.h td { border: 1px solid #ccc; text-align: center; font-size: 6.5px; padding: 1.5px 0; width: 29px; height: 12px; background: #fff }
table.h tr.m td { padding: 3px 0 }
.hist::after { content: ""; display: block; clear: both }
.legend td:first-child { text-align: center; width: 90px }
.legend td { border-bottom: 1px solid #fff }
.legend tr:nth-child(even) td { background: #eee }
.pb { page-break-before: always }
.note { font-style: italic; color: #444; line-height: 1.6; font-size: 8.5px; margin-top: 14px }
</style></head><body>
${head}
<h2>Consumer Name: ${esc(p.name)}</h2>
<div class="colh"><div>Personal Information</div><div>Identification</div><div>Contact Details</div></div>
<div class="cols">
 <div>${field("Previous Name:", "")}${field("Alias Name:", "")}${field("DOB:", dmy(p.dateOfBirth))}${field("Age:", age(p.dateOfBirth))}${field("Gender:", p.gender)}${field("Total Income:", "")}${field("Occupation:", "")}</div>
 <div>${field("PAN:", p.pan)}${field("Voter ID:", "")}${field("Passport :", "")}${field("UID:", "XXXXXXXXXXXX")}${field("Driver's License:", "")}${field("Ration Card:", "")}${field("Photo Credit Card:", "")}</div>
 <div>${field("Mobile :", p.phones[0])}${field("Alt. Mobile :", p.phones[1])}${field("Email:", p.emails[0])}</div>
</div>

<h2>Consumer Address:</h2>
<table class="box"><tr><th>Type</th><th>Address</th><th>State</th><th>Postal code</th><th>Last Reported Date</th></tr>
${p.addresses.map((a, i) => {
        const pin = a.match(/\b\d{6}\b/)?.[0] ?? "";
        return `<tr class="${i % 2 ? "z" : ""}"><td>${i === 0 ? "Primary" : "Other"}</td><td>${esc(a)}</td><td></td><td>${pin}</td><td></td></tr>`;
    }).join("") || `<tr><td colspan="5">No address reported</td></tr>`}</table>

<h2>Equifax Score(s):</h2>
<table class="box"><tr><th>Score Name</th><th>Score</th><th>Scoring Elements</th></tr>
<tr><td>Equifax Risk Score 4.0</td><td><b>${report.score ?? ""}</b></td><td>${(report.scoreFactors ?? []).map((f, i) => `${i + 1}. ${esc(f.text)}`).join("<br>")}</td></tr></table>

<h2>Recent Activity:</h2>
<table class="box"><tr><th colspan="4" class="c">Recent Activity (last 90 days)</th></tr>
<tr><td><i>Total Inquiries : </i>${within(90)}</td><td><i>Accounts Opened : </i>${report.accounts.filter((a) => a.openedOn && nowMs - new Date(a.openedOn).getTime() <= 90 * 86400000).length}</td><td><i>Accounts Updated : </i></td><td><i>Accounts Delinquent : </i>${s.overdueAccounts}</td></tr></table>

<h2>Summary :</h2>
<table class="box"><tr><th colspan="3" class="c">Credit Report Summary</th></tr>
<tr><td><i>Number of Accounts : </i>${s.totalAccounts}</td><td><i>Total Balance Amount : </i>${esc(rs(s.totalBalance))}</td><td><i>Recent Account : </i>${esc(recent ? `${recent.type} on ${dmy(recent.openedOn)}` : "")}</td></tr>
<tr><td><i>Number of Open Accounts : </i>${s.activeAccounts}</td><td><i>Total Past Due Amount : </i>${esc(s.totalOverdue)}</td><td><i>Oldest Account : </i>${esc(oldest ? `${oldest.type} on ${dmy(oldest.openedOn)}` : "")}</td></tr>
<tr><td><i>Number of Past Due Accounts : </i>${s.overdueAccounts}</td><td><i>Total Sanction Amount : </i>${esc(rs(s.totalSanctioned))}</td><td></td></tr>
<tr><td><i>Number of Write-off Accounts : </i>${s.writtenOffAccounts}</td><td><i>Total Monthly Payment Amount : </i>${esc(rs(monthly))}</td><td><i>Single Highest Sanction Amount : </i>${esc(rs(highestSanction))}</td></tr>
<tr><td></td><td><i>Average Open Balance : </i>${esc(rs(avgOpen))}</td><td><i>Single Highest Balance : </i>${esc(rs(highestBalance))}</td></tr></table>
<p><i>*As per data reported at a tradeline level in the account details section</i></p>

<h2 class="pb">Account Details :</h2>
<table><tr><th class="c">Accounts</th></tr></table>
${report.accounts.map(accountBlock).join("") || "<p>No account details were returned.</p>"}

<h2 class="pb">Enquiry Summary:</h2>
<table class="box"><tr><th class="c">Purpose</th><th class="c">Total</th><th class="c">Past 30 Days</th><th class="c">Past 12 Months</th><th class="c">Past 24 Months</th><th class="c">Recent</th></tr>
<tr><td class="c">ALL</td><td class="c">${report.enquiries.length}</td><td class="c">${within(30)}</td><td class="c">${within(365)}</td><td class="c">${within(730)}</td><td class="c">${esc(dmy(lastEnquiry))}</td></tr></table>

<h2>Enquiries:</h2>
<table class="box"><tr><th class="c">Institution</th><th class="c">Date</th><th class="c">Purpose</th><th class="c">Amount</th></tr>
${report.enquiries.map((e, i) => `<tr class="${i % 2 ? "z" : ""}"><td class="c">${esc(e.lender)}</td><td class="c">${esc(dmy(e.date))}</td><td class="c">${esc(e.purpose)}</td><td class="c">${esc(rs(e.amount))}</td></tr>`).join("")}</table>

<h2 class="pb">Glossary, Terms and Explanations:</h2>
<h2 style="margin-top:0">History:</h2>
<table class="legend"><tr><th class="c">Code</th><th>Description</th></tr>
${glossaryHistory.map(([c, d]) => `<tr><td>${esc(c)}</td><td>${esc(d)}</td></tr>`).join("")}</table>
<p class="note">This report is to be used subject to and in compliance with the Terms of Use which you have accepted while registering for availing this Equifax Services on our Website - www.equifax.co.in ("Site") entered between You and Equifax Credit Information Services Private Limited ("ECIS"). The information contained in this report is derived from various Members / sources which are not controlled by ECIS. ECIS provides this report on a best effort basis and does not guarantee the timeliness, correctness or completeness of the information contained therein and no warranty, either express or implied, including but not limited to those of merchantability or fitness for a particular purpose, is made.</p>
<p class="note" style="text-align:center;font-style:normal">Report data as of ${esc(dmy(reportDate ?? report.reportDate))}</p>
</body></html>`;
};
