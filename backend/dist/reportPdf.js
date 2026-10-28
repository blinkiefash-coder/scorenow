import PDFDocument from "pdfkit";
import { bureauNames } from "./bureaus.js";
const colors = {
    navy: "#10254A",
    blue: "#2457A7",
    muted: "#5C6B82",
    line: "#D8E0EB",
    pale: "#F2F6FB",
    red: "#A13C3C",
    green: "#24734B",
};
const toPdfText = (value) => String(value ?? "—")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "*");
const money = (value) => value === null || value === undefined
    ? "Not reported"
    : `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
const date = (value) => {
    if (!value)
        return "Not reported";
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime())
        ? toPdfText(value)
        : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const bureauLabel = (bureau) => bureauNames[bureau];
export const generateReportPdf = ({ report, reportDate }) => new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        size: "A4",
        margins: { top: 52, bottom: 56, left: 48, right: 48 },
        bufferPages: true,
        info: {
            Title: `Score Now ${bureauLabel(report.bureau)} report copy`,
            Author: "Score Now",
            Subject: "Credit report data summary",
        },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const write = (value, options = {}) => doc.text(toPdfText(value), { width, ...options });
    const section = (title) => {
        doc.moveDown(0.7);
        doc.fillColor(colors.blue).font("Helvetica-Bold").fontSize(12).text(toPdfText(title));
        doc.moveDown(0.25);
        doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor(colors.line).lineWidth(0.7).stroke();
        doc.moveDown(0.45);
        doc.fillColor(colors.navy).font("Helvetica").fontSize(9.5);
    };
    const field = (label, value) => {
        doc.font("Helvetica-Bold").fillColor(colors.muted).text(toPdfText(`${label}: `), { continued: true });
        doc.font("Helvetica").fillColor(colors.navy).text(toPdfText(value));
    };
    const ensureSpace = (height) => {
        if (doc.y + height > doc.page.height - doc.page.margins.bottom)
            doc.addPage();
    };
    doc.fillColor(colors.navy).font("Helvetica-Bold").fontSize(21).text("SCORE NOW");
    doc.moveDown(0.2);
    doc.fillColor(colors.blue).fontSize(15).text(`${bureauLabel(report.bureau)} credit report copy`);
    doc.moveDown(0.4);
    doc.fillColor(colors.muted).font("Helvetica").fontSize(9.5);
    write(`Report date: ${date(report.reportDate ?? reportDate ?? null)}    Generated: ${date(new Date().toISOString().slice(0, 10))}`);
    write(`Credit score: ${report.score ?? "Not reported"}    Score band: ${report.score === null ? "Not reported" : report.score >= 750 ? "Excellent" : report.score >= 700 ? "Good" : report.score >= 650 ? "Fair" : "Needs attention"}`);
    doc.moveDown(0.7);
    doc.roundedRect(doc.page.margins.left, doc.y, width, 54, 6).fill(colors.pale);
    doc.fillColor(colors.navy).font("Helvetica-Bold").fontSize(9.5)
        .text("Important: This is a Score Now-generated report copy based on data returned by the named bureau.", doc.page.margins.left + 12, doc.y + 10, { width: width - 24 });
    doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5)
        .text("It is not issued, certified, or endorsed by the bureau and does not replace the original bureau report.", doc.page.margins.left + 12, doc.y + 2, { width: width - 24 });
    doc.y += 68;
    section("Personal details");
    field("Name", report.personal.name);
    field("PAN", report.personal.pan);
    field("Date of birth", date(report.personal.dateOfBirth));
    field("Gender", report.personal.gender);
    section("Credit summary");
    const summaryRows = [
        ["Total accounts", report.summary.totalAccounts],
        ["Active accounts", report.summary.activeAccounts],
        ["Closed accounts", report.summary.closedAccounts],
        ["Overdue accounts", report.summary.overdueAccounts],
        ["Total sanctioned / credit limit", money(report.summary.totalSanctioned)],
        ["Current outstanding balance", money(report.summary.totalBalance)],
        ["Total overdue amount", money(report.summary.totalOverdue)],
        ["Credit enquiries in last 6 months", report.summary.enquiriesLast6Months],
        ["Written-off / settled accounts", report.summary.writtenOffAccounts],
    ];
    summaryRows.forEach(([label, value]) => field(label, value));
    if (report.scoreFactors?.length) {
        section("Score factors reported");
        for (const factor of report.scoreFactors) {
            ensureSpace(45);
            doc.fillColor(factor.impact === "negative" ? colors.red : colors.green).font("Helvetica-Bold").fontSize(9.5)
                .text(toPdfText(`${factor.impact === "negative" ? "Needs attention" : "Positive"}: ${factor.text}`), { width });
            if (factor.tip) {
                doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5).text(toPdfText(factor.tip), { width });
            }
            doc.moveDown(0.35);
        }
    }
    section(`Credit accounts (${report.accounts.length})`);
    if (!report.accounts.length)
        write("No account details were returned.");
    report.accounts.forEach((account, index) => {
        ensureSpace(112);
        doc.fillColor(colors.navy).font("Helvetica-Bold").fontSize(10)
            .text(toPdfText(`${index + 1}. ${account.lender} — ${account.type}`), { width });
        doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5)
            .text(toPdfText(`Status: ${account.status}    Account: ${account.accountNumber ?? "Not reported"}`), { width });
        doc.fillColor(colors.navy).fontSize(8.5)
            .text(toPdfText(`Balance: ${money(account.currentBalance)}    Limit: ${money(account.creditLimit)}    Overdue: ${money(account.overdueAmount)}`), { width });
        doc.fillColor(colors.muted)
            .text(toPdfText(`Opened: ${date(account.openedOn)}    Closed: ${date(account.closedOn)}    Last payment: ${date(account.lastPaymentOn)}`), { width });
        if ((account.writtenOffAmount ?? 0) > 0 || (account.settlementAmount ?? 0) > 0) {
            doc.fillColor(colors.red).text(toPdfText(`Written off: ${money(account.writtenOffAmount)}    Settlement: ${money(account.settlementAmount)}`), { width });
        }
        if (account.paymentHistory.length) {
            const history = account.paymentHistory
                .map((entry) => `${entry.month}: ${entry.daysPastDue === null ? "NR" : `${entry.daysPastDue} DPD`}`)
                .join(" | ");
            doc.fillColor(colors.muted).text(toPdfText(`Payment history: ${history}`), { width });
        }
        doc.moveDown(0.6);
    });
    section(`Credit enquiries (${report.enquiries.length})`);
    if (!report.enquiries.length)
        write("No enquiry details were returned.");
    report.enquiries.forEach((enquiry, index) => {
        ensureSpace(48);
        doc.fillColor(colors.navy).font("Helvetica-Bold").fontSize(9.5)
            .text(toPdfText(`${index + 1}. ${enquiry.lender}`), { width });
        doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5)
            .text(toPdfText(`Purpose: ${enquiry.purpose ?? "Not reported"}    Date: ${date(enquiry.date)}    Amount: ${money(enquiry.amount)}`), { width });
        doc.moveDown(0.25);
    });
    const pages = doc.bufferedPageRange();
    for (let index = 0; index < pages.count; index += 1) {
        doc.switchToPage(pages.start + index);
        const footerY = doc.page.height - 36;
        doc.moveTo(doc.page.margins.left, footerY - 8)
            .lineTo(doc.page.width - doc.page.margins.right, footerY - 8)
            .strokeColor(colors.line).lineWidth(0.6).stroke();
        doc.fillColor(colors.muted).font("Helvetica").fontSize(8)
            .text(`Score Now report copy  |  Page ${index + 1} of ${pages.count}`, doc.page.margins.left, footerY, {
            width,
            align: "center",
            lineBreak: false,
        });
    }
    doc.end();
});
