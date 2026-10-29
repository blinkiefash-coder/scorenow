import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { bureauNames, type Bureau } from "./bureaus.js";
import type { NormalizedReport } from "./reportParser.js";

type ReportPdfInput = {
  report: NormalizedReport;
  reportDate?: string | null;
};

type Column = { label: string; width: number; align?: "left" | "right" };

const colors = {
  ink: "#1F2A37",
  muted: "#5C6B82",
  line: "#D8E0EB",
  pale: "#F4F6F9",
  white: "#FFFFFF",
  red: "#B42318",
  amber: "#DC6803",
  lightGreen: "#4CAF7A",
  green: "#067647",
  grey: "#98A2B3",
};

const bureauThemes: Record<Bureau, { accent: string; subtitle: string }> = {
  cibil: { accent: "#1F3F7A", subtitle: "Credit Information Report" },
  equifax: { accent: "#8A1A2B", subtitle: "Credit Information Report" },
  experian: { accent: "#284A8E", subtitle: "Credit Report" },
  crif: { accent: "#B5202E", subtitle: "High Mark Credit Information Report" },
};

const logoDir = fileURLToPath(new URL("../assets/bureau-logos/", import.meta.url));
const logos: Partial<Record<Bureau, Buffer>> = {};
for (const bureau of Object.keys(bureauThemes) as Bureau[]) {
  const path = `${logoDir}${bureau}.png`;
  if (existsSync(path)) logos[bureau] = readFileSync(path);
}

const toPdfText = (value: string | number | null | undefined) =>
  String(value ?? "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "*");

const money = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "Not reported"
    : `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;

const date = (value: string | null | undefined) => {
  if (!value) return "Not reported";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? toPdfText(value)
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const bureauLabel = (bureau: Bureau) => bureauNames[bureau];

const scoreBand = (score: number | null) =>
  score === null ? "Not reported" : score >= 750 ? "Excellent" : score >= 700 ? "Good" : score >= 650 ? "Fair" : "Needs attention";

const dpdColor = (daysPastDue: number | null) =>
  daysPastDue === null ? colors.grey : daysPastDue === 0 ? colors.green : daysPastDue < 30 ? colors.amber : colors.red;

export const generateReportPdf = ({ report, reportDate }: ReportPdfInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const theme = bureauThemes[report.bureau];
    const bureauName = bureauLabel(report.bureau);
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 62, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: `Score Now ${bureauName} report copy`,
        Author: "Score Now",
        Subject: "Credit report data summary",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const cellPad = 5;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;

    const setText = (bold: boolean, size: number, color: string) =>
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(color);

    // Adds a page with the running header used after the first page. Content is positioned explicitly so
    // nothing is left stranded on a page that only holds a header.
    const newPage = () => {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 6).fill(theme.accent);
      setText(false, 8, colors.muted);
      doc.text(toPdfText(`${bureauName} report copy`), left, 20, { lineBreak: false });
      doc.text(toPdfText(`Consumer: ${report.personal.name ?? "Not reported"}`), left, 20, { width, align: "right", lineBreak: false });
      doc.moveTo(left, 36).lineTo(left + width, 36).strokeColor(colors.line).lineWidth(0.6).stroke();
      doc.y = doc.page.margins.top;
    };

    // Returns true when a page break was needed.
    const ensureSpace = (height: number) => {
      if (doc.y + height > pageBottom()) {
        newPage();
        return true;
      }
      return false;
    };

    const section = (title: string) => {
      ensureSpace(60);
      doc.y += 12;
      setText(true, 10.5, theme.accent);
      doc.text(toPdfText(title.toUpperCase()), left, doc.y, { width, lineBreak: false });
      doc.moveTo(left, doc.y + 4).lineTo(left + width, doc.y + 4).strokeColor(theme.accent).lineWidth(0.8).stroke();
      doc.y += 14;
    };

    const paragraph = (value: string, options: { bold?: boolean; size?: number; color?: string } = {}) => {
      const { bold = false, size = 9, color = colors.muted } = options;
      setText(bold, size, color);
      const text = toPdfText(value);
      ensureSpace(doc.heightOfString(text, { width }) + 4);
      doc.text(text, left, doc.y, { width });
      doc.y += 4;
    };

    // Label/value cells in a bordered grid, used for consumer details and summary figures.
    const kvGrid = (items: [string, string | number | null | undefined][], columns = 3) => {
      const cellWidth = width / columns;
      const inner = cellWidth - cellPad * 2;
      for (let start = 0; start < items.length; start += columns) {
        const row = items.slice(start, start + columns);
        const measured = row.map(([label, value]) => {
          setText(true, 7, colors.muted);
          const labelHeight = doc.heightOfString(toPdfText(label).toUpperCase(), { width: inner });
          setText(false, 9, colors.ink);
          const valueHeight = doc.heightOfString(toPdfText(value), { width: inner });
          return { labelHeight, valueHeight };
        });
        const rowHeight = Math.max(...measured.map((m) => m.labelHeight + 3 + m.valueHeight)) + cellPad * 2;
        ensureSpace(rowHeight);
        const y = doc.y;
        row.forEach(([label, value], col) => {
          const x = left + col * cellWidth;
          doc.rect(x, y, cellWidth, rowHeight).strokeColor(colors.line).lineWidth(0.6).stroke();
          setText(true, 7, colors.muted);
          doc.text(toPdfText(label).toUpperCase(), x + cellPad, y + cellPad, { width: inner });
          setText(false, 9, colors.ink);
          doc.text(toPdfText(value), x + cellPad, y + cellPad + measured[col].labelHeight + 3, { width: inner });
        });
        doc.y = y + rowHeight;
      }
      doc.y += 6;
    };

    const tableHeader = (columns: Column[]) => {
      const height = 20;
      const y = doc.y;
      doc.rect(left, y, width, height).fill(theme.accent);
      setText(true, 7.5, colors.white);
      let x = left;
      for (const column of columns) {
        doc.text(toPdfText(column.label), x + cellPad, y + 6, { width: column.width - cellPad * 2, align: column.align ?? "left", lineBreak: false });
        x += column.width;
      }
      doc.y = y + height;
    };

    const measureCells = (columns: Column[], cells: string[]) => {
      setText(false, 8.5, colors.ink);
      return Math.max(...cells.map((value, i) => doc.heightOfString(toPdfText(value), { width: columns[i].width - cellPad * 2 }))) + cellPad * 2;
    };

    const drawCells = (columns: Column[], cells: string[], height: number, fill: string) => {
      const y = doc.y;
      doc.rect(left, y, width, height).fill(fill);
      let x = left;
      columns.forEach((column, i) => {
        setText(false, 8.5, colors.ink);
        doc.text(toPdfText(cells[i]), x + cellPad, y + cellPad, { width: column.width - cellPad * 2, align: column.align ?? "left" });
        x += column.width;
      });
      doc.moveTo(left, y + height).lineTo(left + width, y + height).strokeColor(colors.line).lineWidth(0.6).stroke();
      doc.y = y + height;
    };

    const scoreBox = (score: number | null) => {
      const height = 84;
      ensureSpace(height + 6);
      const y = doc.y;
      doc.roundedRect(left, y, width, height, 6).fill(colors.pale);
      setText(false, 8.5, colors.muted);
      doc.text("Credit score", left + 16, y + 14, { lineBreak: false });
      setText(true, 30, theme.accent);
      doc.text(score === null ? "N/A" : String(score), left + 16, y + 26, { lineBreak: false });
      setText(true, 9, colors.ink);
      doc.text(toPdfText(`Score band: ${scoreBand(score)}`), left + 16, y + 62, { lineBreak: false });

      const barLeft = left + 200;
      const barWidth = width - 200 - 24;
      const barY = y + 40;
      const toX = (value: number) => barLeft + ((Math.min(900, Math.max(300, value)) - 300) / 600) * barWidth;
      const segments: [number, number, string][] = [
        [300, 600, colors.red],
        [600, 700, colors.amber],
        [700, 750, colors.lightGreen],
        [750, 900, colors.green],
      ];
      for (const [from, to, color] of segments) {
        doc.rect(toX(from), barY, toX(to) - toX(from), 8).fill(color);
      }
      if (score !== null) {
        const markerX = toX(score);
        doc.moveTo(markerX - 5, barY - 8).lineTo(markerX + 5, barY - 8).lineTo(markerX, barY - 1).fill(colors.ink);
      }
      setText(false, 7.5, colors.muted);
      doc.text("300", barLeft, barY + 12, { lineBreak: false });
      doc.text("900", barLeft + barWidth - 20, barY + 12, { width: 20, align: "right", lineBreak: false });
      doc.y = y + height + 6;
    };

    const accountColumns: Column[] = [
      { label: "#", width: 22 },
      { label: "Lender / account type", width: 150 },
      { label: "Account no.", width: 96 },
      { label: "Status", width: 52 },
      { label: "Opened", width: 62 },
      { label: "Balance", width: 66, align: "right" },
      { label: "Overdue", width: 67, align: "right" },
    ];

    const accountDetails = (account: NormalizedReport["accounts"][number]) => {
      const lines: { text: string; color: string }[] = [
        {
          text: `Sanctioned: ${money(account.sanctionedAmount)}    Credit limit: ${money(account.creditLimit)}    EMI: ${money(account.emiAmount ?? null)}    Interest: ${account.interestRate == null ? "Not reported" : `${account.interestRate}%`}`,
          color: colors.muted,
        },
        {
          text: `Opened: ${date(account.openedOn)}    Closed: ${date(account.closedOn)}    Last payment: ${date(account.lastPaymentOn)}`,
          color: colors.muted,
        },
      ];
      if ((account.writtenOffAmount ?? 0) > 0 || (account.settlementAmount ?? 0) > 0) {
        lines.push({ text: `Written off: ${money(account.writtenOffAmount ?? null)}    Settlement: ${money(account.settlementAmount ?? null)}`, color: colors.red });
      }
      return lines;
    };

    const detailHeight = (account: NormalizedReport["accounts"][number]) =>
      cellPad * 2 + accountDetails(account).length * 11 + (account.paymentHistory.length ? 30 : 0);

    const drawDetail = (account: NormalizedReport["accounts"][number], height: number) => {
      const y = doc.y;
      doc.rect(left, y, width, height).fill(colors.pale);
      let lineY = y + cellPad;
      for (const line of accountDetails(account)) {
        setText(false, 7.5, line.color);
        doc.text(toPdfText(line.text), left + cellPad, lineY, { width: width - cellPad * 2, lineBreak: false });
        lineY += 11;
      }
      const history = account.paymentHistory.slice(0, 24);
      if (history.length) {
        setText(true, 7, colors.muted);
        doc.text("Payment history (latest first)", left + cellPad, lineY + 2, { lineBreak: false });
        const boxY = lineY + 13;
        const step = Math.min(30, (width - cellPad * 2) / history.length);
        history.forEach((entry, i) => {
          const x = left + cellPad + i * step;
          doc.rect(x, boxY, step - 3, 13).fill(dpdColor(entry.daysPastDue));
          setText(true, 6.5, colors.white);
          doc.text(entry.daysPastDue === null ? "NR" : String(entry.daysPastDue), x, boxY + 3.5, { width: step - 3, align: "center", lineBreak: false });
        });
      }
      doc.moveTo(left, y + height).lineTo(left + width, y + height).strokeColor(colors.line).lineWidth(0.6).stroke();
      doc.y = y + height;
    };

    const enquiryColumns: Column[] = [
      { label: "#", width: 22 },
      { label: "Lender", width: 180 },
      { label: "Purpose", width: 150 },
      { label: "Date", width: 80 },
      { label: "Amount", width: 83, align: "right" },
    ];

    // Banner on the first page.
    doc.rect(0, 0, doc.page.width, 6).fill(theme.accent);
    const logo = logos[report.bureau];
    if (logo) {
      doc.image(logo, left, 24, { fit: [180, 44] });
    } else {
      setText(true, 20, theme.accent);
      doc.text(toPdfText(bureauName), left, 32, { lineBreak: false });
    }
    setText(true, 12, colors.ink);
    doc.text(toPdfText(`${bureauName} ${theme.subtitle}`), left + 200, 26, { width: width - 200, align: "right", lineBreak: false });
    setText(false, 8.5, colors.muted);
    doc.text(toPdfText(`Report date: ${date(report.reportDate ?? reportDate ?? null)}`), left + 200, 44, { width: width - 200, align: "right", lineBreak: false });
    doc.text(toPdfText(`Generated: ${date(new Date().toISOString().slice(0, 10))}`), left + 200, 56, { width: width - 200, align: "right", lineBreak: false });
    doc.rect(left, 84, width, 1.5).fill(theme.accent);
    doc.y = 98;

    const notice = `This is a Score Now-generated report copy based on data returned by ${bureauName}. It is not issued, certified, or endorsed by the bureau and does not replace the original bureau report.`;
    setText(false, 8, colors.muted);
    const noticeHeight = doc.heightOfString(toPdfText(notice), { width: width - 24 });
    doc.roundedRect(left, doc.y, width, noticeHeight + 14, 4).fill(colors.pale);
    doc.text(toPdfText(notice), left + 12, doc.y + 7, { width: width - 24 });
    doc.y += noticeHeight + 22;

    section("Consumer details");
    kvGrid([
      ["Name", report.personal.name],
      ["PAN", report.personal.pan],
      ["Date of birth", date(report.personal.dateOfBirth)],
      ["Gender", report.personal.gender],
      ["Mobile", report.personal.phones.length ? report.personal.phones.join(", ") : "Not reported"],
      ["Email", report.personal.emails.length ? report.personal.emails.join(", ") : "Not reported"],
      ["Address", report.personal.addresses.length ? report.personal.addresses.join("; ") : "Not reported"],
    ]);

    section("Credit score");
    scoreBox(report.score);

    if (report.scoreFactors?.length) {
      section("Score factors reported");
      for (const factor of report.scoreFactors) {
        paragraph(`${factor.impact === "negative" ? "Needs attention" : "Positive"}: ${factor.text}`, {
          bold: true,
          size: 9,
          color: factor.impact === "negative" ? colors.red : colors.green,
        });
        if (factor.tip) paragraph(factor.tip, { size: 8.5 });
      }
    }

    section("Credit summary");
    kvGrid([
      ["Total accounts", report.summary.totalAccounts],
      ["Active accounts", report.summary.activeAccounts],
      ["Closed accounts", report.summary.closedAccounts],
      ["Overdue accounts", report.summary.overdueAccounts],
      ["Total sanctioned / limit", money(report.summary.totalSanctioned)],
      ["Current outstanding", money(report.summary.totalBalance)],
      ["Total overdue amount", money(report.summary.totalOverdue)],
      ["Enquiries in last 6 months", report.summary.enquiriesLast6Months],
      ["Written-off / settled", report.summary.writtenOffAccounts],
    ]);

    section(`Credit accounts (${report.accounts.length})`);
    if (!report.accounts.length) {
      paragraph("No account details were returned.");
    } else {
      paragraph("Payment history colours: green = on time, amber = 1-29 days past due, red = 30+ days past due, grey = not reported (NR).", { size: 7.5 });
      ensureSpace(20 + 40);
      tableHeader(accountColumns);
      report.accounts.forEach((account, index) => {
        const cells = [
          String(index + 1),
          `${account.lender}\n${account.type}`,
          account.accountNumber ?? "Not reported",
          account.status === "active" ? "Active" : "Closed",
          date(account.openedOn),
          money(account.currentBalance),
          money(account.overdueAmount),
        ];
        const rowHeight = measureCells(accountColumns, cells);
        const total = rowHeight + detailHeight(account);
        if (doc.y + total > pageBottom()) {
          newPage();
          tableHeader(accountColumns);
        }
        drawCells(accountColumns, cells, rowHeight, colors.white);
        drawDetail(account, detailHeight(account));
      });
      doc.y += 6;
    }

    section(`Credit enquiries (${report.enquiries.length})`);
    if (!report.enquiries.length) {
      paragraph("No enquiry details were returned.");
    } else {
      ensureSpace(20 + 30);
      tableHeader(enquiryColumns);
      report.enquiries.forEach((enquiry, index) => {
        const cells = [String(index + 1), enquiry.lender, enquiry.purpose ?? "Not reported", date(enquiry.date), money(enquiry.amount)];
        const rowHeight = measureCells(enquiryColumns, cells);
        if (doc.y + rowHeight > pageBottom()) {
          newPage();
          tableHeader(enquiryColumns);
        }
        drawCells(enquiryColumns, cells, rowHeight, index % 2 ? colors.pale : colors.white);
      });
      doc.y += 6;
    }

    ensureSpace(60);
    doc.y += 8;
    setText(false, 7.5, colors.muted);
    const disclaimer = "Figures are shown as reported by the bureau and may not reflect payments made after the report date. For the official report, request it directly from the bureau.";
    doc.text(toPdfText(disclaimer), left, doc.y, { width });

    // The footer sits inside the bottom margin. Drop that margin while drawing it so PDFKit does not
    // start a new page for each footer.
    const pages = doc.bufferedPageRange();
    for (let index = 0; index < pages.count; index += 1) {
      doc.switchToPage(pages.start + index);
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - 36;
      doc.moveTo(left, footerY - 8).lineTo(left + width, footerY - 8).strokeColor(colors.line).lineWidth(0.6).stroke();
      setText(false, 7.5, colors.muted);
      doc.text(toPdfText(`Score Now report copy. Not issued or endorsed by ${bureauName}.`), left, footerY, { width: width * 0.75, lineBreak: false });
      doc.text(`Page ${index + 1} of ${pages.count}`, left, footerY, { width, align: "right", lineBreak: false });
    }
    doc.end();
  });
