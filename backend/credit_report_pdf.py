#!/usr/bin/env python3
"""
Credit report PDF generator (3-page layout: score + personal/contact/employment,
accounts + enquiries, disclaimer) driven by your bureau API JSON.

Usage:
    python credit_report_pdf.py response.json report.pdf
    python credit_report_pdf.py --demo demo.pdf          # dummy data only

Accepts either the full API response ({"data": {"data": {"cibilData": ...}}})
or just the TrueLinkCreditReport object.

Requires: pip install reportlab
"""
import json
import math
import sys
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, KeepTogether,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)

# --------------------------------------------------------------------------
# BRANDING
# --------------------------------------------------------------------------
BRAND = {
    "name": "SCORENOW",               # drawn as the logo text
    "tagline": "Credit Information Report",
    "title": "CREDIT REPORT",
    "primary": colors.HexColor("#0A8FC1"),
    "dark": colors.HexColor("#1B6E96"),
    "accent": colors.HexColor("#FFD800"),   # account header bar
    "website": "www.scorenow.in",
    "dispute_url": "www.scorenow.in",
    "footer_banner": "Stay Credit-Ready On The Go With Our Mobile App.",
    "disclaimer": (
        "Disclaimer: The information in this report has been compiled from data submitted "
        "by member institutions and is provided as received. While reasonable efforts are made "
        "to keep it accurate and complete, {name} is not responsible for errors that originate "
        "in the data supplied by members. Use of this report is subject to the applicable "
        "operating rules. If you find a discrepancy in your personal or account information, "
        "please contact the concerned lender and raise a dispute with us."
    ),
}

# --------------------------------------------------------------------------
# CODE TABLES  -- extend / correct to match your bureau's code lists
# --------------------------------------------------------------------------
ACCOUNT_TYPES = {
    "01": "AUTO LOAN", "02": "HOUSING LOAN", "03": "PROPERTY LOAN",
    "04": "LOAN AGAINST SHARES/SECURITIES", "05": "PERSONAL LOAN", "06": "CONSUMER LOAN",
    "07": "GOLD LOAN", "08": "EDUCATION LOAN", "09": "LOAN TO PROFESSIONAL",
    "10": "CREDIT CARD", "11": "LEASING", "12": "OVERDRAFT", "13": "TWO-WHEELER LOAN",
    "14": "NON-FUNDED CREDIT FACILITY", "15": "LOAN AGAINST BANK DEPOSITS",
    "16": "FLEET CARD", "17": "COMMERCIAL VEHICLE LOAN", "31": "SECURED CREDIT CARD",
    "32": "USED CAR LOAN", "35": "CORPORATE CREDIT CARD", "36": "KISAN CREDIT CARD",
    "37": "LOAN ON CREDIT CARD", "39": "MUDRA LOAN", "51": "BUSINESS LOAN - GENERAL",
    "59": "BUSINESS LOAN AGAINST BANK DEPOSITS", "61": "BUSINESS LOAN - UNSECURED",
}
OWNERSHIP = {"1": "INDIVIDUAL", "2": "JOINT", "3": "AUTHORISED USER", "4": "GUARANTOR"}
FREQUENCY = {"01": "WEEKLY", "02": "FORTNIGHTLY", "03": "MONTHLY", "04": "QUARTERLY"}
ADDRESS_CATEGORY = {"01": "PERMANENT ADDRESS", "02": "RESIDENCE ADDRESS",
                    "03": "OFFICE ADDRESS", "04": "NOT CATEGORIZED"}
RESIDENCE_STATUS = {"01": "OWNED", "02": "RENTED"}
PHONE_TYPE = {"01": "MOBILE PHONE", "02": "HOME PHONE", "03": "OFFICE PHONE"}
ID_LABELS = {"TaxId": "INCOME TAX ID NUMBER (PAN)", "VoterId": "VOTER ID NUMBER",
             "CkycId": "CKYC", "PassportId": "PASSPORT NUMBER",
             "DriverLicenseId": "DRIVING LICENCE", "UniversalId": "AADHAAR (MASKED)",
             "RationCardId": "RATION CARD"}
# "SocialId" is an internal key in the sample payload -> intentionally not shown
ID_ORDER = ["TaxId", "VoterId", "PassportId", "DriverLicenseId", "UniversalId",
            "RationCardId", "CkycId"]
OCCUPATION = {"01": "SALARIED", "02": "SELF EMPLOYED PROFESSIONAL",
              "03": "SELF EMPLOYED", "04": "OTHERS"}
ENQUIRY_PURPOSE = {
    "01": "AUTO LOAN", "02": "HOUSING LOAN", "03": "PROPERTY LOAN",
    "04": "LOAN AGAINST SHARES", "05": "PERSONAL LOAN", "06": "CONSUMER LOAN",
    "07": "GOLD LOAN", "08": "EDUCATION LOAN", "09": "LOAN TO PROFESSIONAL",
    "10": "CREDIT CARD", "11": "LEASING", "12": "OVERDRAFT", "13": "TWO-WHEELER LOAN",
    "51": "BUSINESS LOAN - GENERAL", "99": "OTHER",
}

PAGE_W, PAGE_H = A4
MARGIN = 14 * mm
CONTENT_W = PAGE_W - 2 * MARGIN
MONTHS = ["DEC", "NOV", "OCT", "SEP", "AUG", "JUL", "JUN", "MAY", "APR", "MAR", "FEB", "JAN"]


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def as_list(x):
    if x is None or x == "":
        return []
    return x if isinstance(x, list) else [x]


def sym(node):
    """CIBIL-style code object {'symbol': '01', 'description': ''} -> ('01', 'desc')."""
    if isinstance(node, dict):
        return str(node.get("symbol", "") or ""), str(node.get("description", "") or "")
    return (str(node or ""), "")


def fmt_date(s):
    """'2019-10-26+05:30' -> '26-10-2019'."""
    if not s:
        return "-"
    s = str(s)[:10]
    try:
        y, m, d = s.split("-")
        return f"{d}-{m}-{y}"
    except ValueError:
        return "-"


def fmt_amt(v, dash_negative=True):
    if v in (None, "", "-"):
        return "-"
    try:
        n = float(v)
    except ValueError:
        return str(v)
    if dash_negative and n < 0:          # -1 is the bureau's "not available" marker
        return "-"
    return f"{int(n):,}" if n == int(n) else f"{n:,.2f}"


def fmt_rate(v):
    try:
        n = float(v)
        return "-" if n < 0 else f"{n:.2f}"
    except (TypeError, ValueError):
        return "-"


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def find_report(doc):
    """Locate the TrueLinkCreditReport node in whatever wrapper was passed."""
    if "TrueLinkCreditReport" in doc:
        return doc["TrueLinkCreditReport"]
    if "Borrower" in doc:
        return doc

    def walk(o):
        if isinstance(o, dict):
            if "TrueLinkCreditReport" in o:
                return o["TrueLinkCreditReport"]
            for v in o.values():
                r = walk(v)
                if r:
                    return r
        elif isinstance(o, list):
            for v in o:
                r = walk(v)
                if r:
                    return r
        return None

    r = walk(doc)
    if not r:
        raise ValueError("Could not find TrueLinkCreditReport in the JSON")
    return r


# --------------------------------------------------------------------------
# JSON -> flat model
# --------------------------------------------------------------------------
def build_model(rep):
    b = rep.get("Borrower", {})
    m = {}

    m["control_no"] = rep.get("ReferenceKey", "-")
    src = (b.get("CreditScore") or {}).get("Source") or {}
    m["report_date"] = fmt_date(src.get("InquiryDate")) if src.get("InquiryDate") else date.today().strftime("%d-%m-%Y")

    cs = b.get("CreditScore") or {}
    try:
        m["score"] = int(cs.get("riskScore"))
    except (TypeError, ValueError):
        m["score"] = None
    m["score_name"] = cs.get("scoreName", "")

    # name
    nm = (b.get("BorrowerName") or {})
    nm = as_list(nm)[0].get("Name", {}) if as_list(nm) else {}
    m["name"] = " ".join(p for p in [nm.get("Forename"), nm.get("Middlename"), nm.get("Surname")] if p) or "-"

    bd = (b.get("Birth") or {}).get("BirthDate") or {}
    if bd.get("day"):
        m["dob"] = f"{int(bd['day']):02d}-{int(bd['month']):02d}-{bd['year']}"
    else:
        m["dob"] = fmt_date((b.get("Birth") or {}).get("date"))
    m["gender"] = str(b.get("Gender", "-")).upper() or "-"

    # identifiers
    ids = {}
    for it in as_list((b.get("IdentifierPartition") or {}).get("Identifier")):
        idn = (it.get("ID") or {})
        ids.setdefault(idn.get("IdentifierName"), idn.get("Id"))
    m["ids"] = [(ID_LABELS[k], ids[k]) for k in ID_ORDER if ids.get(k)]

    # addresses
    addrs = []
    for a in as_list(b.get("BorrowerAddress")):
        ca = a.get("CreditAddress") or {}
        text = ", ".join(p for p in [ca.get("StreetAddress"), ca.get("City"), ca.get("PostalCode")] if p)
        cat, _ = sym(a.get("Dwelling"))
        own, _ = sym(a.get("Ownership"))
        addrs.append({
            "text": text or "-",
            "category": ADDRESS_CATEGORY.get(cat, "NOT CATEGORIZED"),
            "status": RESIDENCE_STATUS.get(own, "-"),
            "reported": fmt_date(a.get("dateReported")),
        })
    m["addresses"] = addrs

    # phones
    phones = []
    for p in as_list(b.get("BorrowerTelephone")):
        num = (p.get("PhoneNumber") or {}).get("Number")
        if num:
            t, _ = sym(p.get("PhoneType"))
            phones.append((PHONE_TYPE.get(t, "TELEPHONE"), num))
    m["phones"] = phones

    # employment
    emps = []
    for e in as_list(b.get("Employer")):
        acc, _ = sym(e.get("account")) if isinstance(e.get("account"), dict) else (str(e.get("account", "")), "")
        occ_sym, occ_desc = sym(e.get("OccupationCode"))
        emps.append({
            "account_type": ACCOUNT_TYPES.get(acc, "-"),
            "reported": fmt_date(e.get("dateReported")),
            "occupation": (occ_desc or OCCUPATION.get(occ_sym, "-")).upper(),
            "income": fmt_amt(e.get("income")) if e.get("income") else "-",
            "frequency": e.get("IncomeFreqIndicator") or "-",
            "indicator": e.get("NetGrossIndicator") or "-",
        })
    m["employment"] = emps

    # accounts
    accounts = []
    tp = rep.get("TradeLinePartition")
    for part in as_list(tp):
        for t in as_list(part.get("Tradeline")):
            gt = t.get("GrantedTrade") or {}
            acc_sym = part.get("accountTypeSymbol") or sym(gt.get("AccountType"))[0]
            d_sym = sym(t.get("AccountDesignator"))[0]

            hist = {}
            pay = gt.get("PayStatusHistory") or {}
            for mp in as_list(pay.get("MonthlyPayStatus")):
                d = str(mp.get("date", ""))[:7]
                if len(d) == 7:
                    hist[(int(d[:4]), int(d[5:7]))] = str(mp.get("status", ""))

            accounts.append({
                "member": t.get("creditorName", "-"),
                "type": ACCOUNT_TYPES.get(acc_sym, part.get("accountTypeDescription") or "-"),
                "number": t.get("accountNumber", "-"),
                "ownership": OWNERSHIP.get(d_sym, "-"),
                "credit_limit": fmt_amt(gt.get("CreditLimit")),
                "sanctioned": fmt_amt(t.get("highBalance")),
                "balance": fmt_amt(t.get("currentBalance"), dash_negative=False),
                "cash_limit": fmt_amt(gt.get("CashLimit")),
                "overdue": fmt_amt(gt.get("amountPastDue"), dash_negative=False),
                "rate": fmt_rate(gt.get("interestRate")),
                "tenure": fmt_amt(gt.get("termMonths")),
                "emi": fmt_amt(gt.get("EMIAmount")),
                "frequency": FREQUENCY.get(sym(gt.get("PaymentFrequency"))[0], "-"),
                "actual_pay": fmt_amt(gt.get("actualPaymentAmount")),
                "opened": fmt_date(t.get("dateOpened")),
                "closed": fmt_date(t.get("dateClosed")),
                "last_payment": fmt_date(gt.get("dateLastPayment")),
                "reported": fmt_date(t.get("dateReported")),
                "hist": hist,
                "collateral_value": fmt_amt(gt.get("collateral")),
                "collateral_type": sym(gt.get("CollateralType"))[1] or "-",
                "written_off_total": fmt_amt(t.get("writtenOffAmtTotal")),
                "written_off_principal": fmt_amt(t.get("writtenOffPrincipal")),
                "settlement": fmt_amt(t.get("settlementAmount")),
                "disputed": bool(sym(t.get("DisputeFlag"))[0]),
            })
    m["accounts"] = accounts

    # enquiries
    enqs = []
    for it in as_list(rep.get("InquiryPartition")):
        q = it.get("Inquiry") or {}
        enqs.append({
            "member": q.get("subscriberName", "-"),
            "date": fmt_date(q.get("inquiryDate")),
            "raw_date": str(q.get("inquiryDate", ""))[:10],
            "purpose": ENQUIRY_PURPOSE.get(str(q.get("inquiryType", "")),
                                           f"CODE {q.get('inquiryType', '-')}"),
        })
    enqs.sort(key=lambda e: e["raw_date"], reverse=True)
    m["enquiries"] = enqs
    return m


# --------------------------------------------------------------------------
# drawing pieces
# --------------------------------------------------------------------------
S = {
    "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                            textColor=BRAND["primary"]),
    "val": ParagraphStyle("val", fontName="Helvetica", fontSize=9, leading=11.5),
    "valc": ParagraphStyle("valc", fontName="Helvetica", fontSize=9, leading=11.5, alignment=1),
    "labelc": ParagraphStyle("labelc", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                             textColor=BRAND["primary"], alignment=1),
    "small": ParagraphStyle("small", fontName="Helvetica-Oblique", fontSize=8, leading=11.5),
    "acct_head": ParagraphStyle("acct_head", fontName="Helvetica-Bold", fontSize=9, leading=11),
    "acct_sub": ParagraphStyle("acct_sub", fontName="Helvetica", fontSize=7.5, leading=9,
                               textColor=colors.HexColor("#8a7f2a")),
}


def P(txt, st="val"):
    return Paragraph(esc(txt), S[st])


def section(title):
    t = Table([[Paragraph(f'<font color="white"><b>{esc(title)}</b></font>',
                          ParagraphStyle("sec", fontName="Helvetica-Bold", fontSize=11.5, leading=14))]],
              colWidths=[CONTENT_W], rowHeights=[8 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND["primary"]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def hline_style(rows):
    return [("LINEBELOW", (0, r), (-1, r), 0.6, BRAND["primary"]) for r in rows]


class ScoreGauge(Flowable):
    """Semicircle gauge 300-900 with coloured bands and a needle."""
    BANDS = [(300, 650, "#E8262D"), (650, 700, "#F7941D"), (700, 750, "#C4D62E"),
             (750, 800, "#7DC242"), (800, 900, "#12A650")]

    def __init__(self, score, width=CONTENT_W, height=52 * mm):
        super().__init__()
        self.score, self.width, self.height = score, width, height

    def wrap(self, aw, ah):
        return self.width, self.height

    @staticmethod
    def ang(score):               # 300 -> 180deg, 900 -> 0deg
        return 180 - (min(max(score, 300), 900) - 300) / 600 * 180

    def draw(self):
        c = self.canv
        cx, cy, R, r = 62 * mm, 6 * mm, 36 * mm, 26 * mm
        for lo, hi, col in self.BANDS:
            a_hi, a_lo = self.ang(lo), self.ang(hi)
            c.setFillColor(colors.HexColor(col))
            c.setStrokeColor(colors.white)
            c.setLineWidth(1.2)
            c.wedge(cx - R, cy - R, cx + R, cy + R, a_lo, a_hi - a_lo, stroke=1, fill=1)
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.white)
        c.circle(cx, cy, r, stroke=0, fill=1)
        c.setStrokeColor(colors.HexColor("#BBBBBB"))
        c.setFillColor(colors.HexColor("#F3F3F3"))
        c.setLineWidth(0.8)
        c.wedge(cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3, 0, 180, stroke=1, fill=1)

        # scale labels
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 8)
        for v in (300, 400, 500, 600, 700, 800, 900):
            a = math.radians(self.ang(v))
            lx, ly = cx + (R + 5 * mm) * math.cos(a), cy + (R + 5 * mm) * math.sin(a)
            c.drawCentredString(lx, ly - 2, str(v))

        if self.score is not None:
            a = math.radians(self.ang(self.score))
            c.setStrokeColor(colors.HexColor("#1478BE"))
            c.setLineWidth(1.6)
            c.line(cx, cy, cx + (r - 2 * mm) * math.cos(a), cy + (r - 2 * mm) * math.sin(a))
            c.setFillColor(colors.HexColor("#1478BE"))
            c.circle(cx, cy, 9 * mm, stroke=0, fill=1)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 17)
            c.drawCentredString(cx, cy - 2, str(self.score))
        # legend
        c.setFillColor(colors.HexColor("#1478BE"))
        c.circle(cx + R + 22 * mm, cy + 22 * mm, 2.2 * mm, stroke=0, fill=1)
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 9)
        c.drawString(cx + R + 27 * mm, cy + 21 * mm - 1, "Your Score")


def kv_grid(rows, col_w):
    """rows: list of tuples of (label, value, label, value) -> 4-column table."""
    data = [[P(a, "label"), P(b), P(c, "label"), P(d)] for a, b, c, d in rows]
    t = Table(data, colWidths=col_w)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                           ("LEFTPADDING", (0, 0), (-1, -1), 4)]))
    return t


def three_col(headers, rows, widths, center=False):
    ls, vs = ("labelc", "valc") if center else ("label", "val")
    data = [[P(h, ls) for h in headers]] + [[P(v, vs) for v in r] for r in rows]
    t = Table(data, colWidths=widths)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8),
             ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    t.setStyle(TableStyle(style))
    return t


def history_grid(hist):
    years = sorted({y for y, _ in hist}, reverse=True)
    data = [[""] + MONTHS]
    for y in years:
        row = [str(y)]
        for i, _ in enumerate(MONTHS):
            mon = 12 - i
            s = hist.get((y, mon), "")
            if s.isdigit():
                s = f"{int(s):03d}"
            row.append(s)
        data.append(row)
    cw = [14 * mm] + [(CONTENT_W - 14 * mm - 8 * mm) / 12] * 12
    t = Table(data, colWidths=cw, rowHeights=[6 * mm] * len(data))
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8), ("FONT", (0, 1), (0, -1), "Helvetica-Bold", 8),
        ("FONT", (1, 1), (-1, -1), "Helvetica", 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def account_block(a):
    W = CONTENT_W
    head = Table([[P(a["member"], "acct_head"), P(a["type"], "acct_head"),
                   P(a["number"], "acct_head"), P(a["ownership"], "acct_head")],
                  [P("(MEMBER NAME)", "acct_sub"), P("(ACCOUNT TYPE)", "acct_sub"),
                   P("(ACCOUNT NUMBER)", "acct_sub"), P("(OWNERSHIP)", "acct_sub")]],
                 colWidths=[W * .22, W * .26, W * .30, W * .22])
    head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), BRAND["accent"]),
                              ("TOPPADDING", (0, 0), (-1, 0), 6), ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                              ("LEFTPADDING", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "TOP")]))

    def sub(txt):
        return Paragraph(f'<b><font color="#{BRAND["primary"].hexval()[2:]}">{txt}</font></b>',
                         ParagraphStyle("s", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                                        spaceBefore=4, leftIndent=4))

    cw = [44 * mm, 34 * mm, 54 * mm, CONTENT_W - 132 * mm]
    details = kv_grid([
        ("CREDIT LIMIT", a["credit_limit"], "RATE OF INTEREST", a["rate"]),
        ("SANCTIONED AMOUNT", a["sanctioned"], "REPAYMENT TENURE", a["tenure"]),
        ("CURRENT BALANCE", a["balance"], "EMI AMOUNT", a["emi"]),
        ("CASH LIMIT", a["cash_limit"], "PAYMENT FREQUENCY", a["frequency"]),
        ("AMOUNT OVERDUE", a["overdue"], "ACTUAL PAYMENT AMOUNT", a["actual_pay"]),
    ], cw)
    dates = kv_grid([
        ("DATE OPENED/DISBURSED", a["opened"], "DATE OF LAST PAYMENT", a["last_payment"]),
        ("DATE CLOSED", a["closed"], "DATE REPORTED AND CERTIFIED", a["reported"]),
    ], cw)
    cw2 = [40 * mm, 34 * mm, 58 * mm, CONTENT_W - 132 * mm]
    coll = kv_grid([
        ("VALUE OF COLLATERAL", a["collateral_value"], "SUIT FILED/WILFUL DEFAULT", "-"),
        ("TYPE OF COLLATERAL", a["collateral_type"], "CREDIT FACILITY STATUS", "-"),
        ("", "", "WRITTEN-OFF AMOUNT (TOTAL)", a["written_off_total"]),
        ("", "", "WRITTEN-OFF AMOUNT (PRINCIPAL)", a["written_off_principal"]),
        ("", "", "SETTLEMENT AMOUNT", a["settlement"]),
    ], cw2)

    months = sorted(a["hist"])
    if months:
        ps, pe = months[0], months[-1]
        range_tbl = kv_grid([("PAYMENT START DATE", f"01-{ps[1]:02d}-{ps[0]}",
                              "PAYMENT END DATE", f"01-{pe[1]:02d}-{pe[0]}")], cw)
    else:
        range_tbl = Spacer(1, 1)

    parts = [head, sub("ACCOUNT DETAILS"), details, hline(), sub("DATES"), dates, hline(),
             sub("PAYMENT HISTORY (UP TO 36 MONTHS)"), range_tbl,
             sub("DAYS PAST DUE (No. of Days) or ASSET CLASSIFICATION (STD, SMA, SUB, DBT, LSS)"),
             history_grid(a["hist"]) if months else P("No payment history reported."), hline(),
             sub("COLLATERAL / DEFAULT STATUS"), coll, Spacer(1, 6 * mm)]
    return parts


def hline():
    t = Table([[""]], colWidths=[CONTENT_W], rowHeights=[2])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, BRAND["primary"])]))
    return t


# --------------------------------------------------------------------------
# page chrome
# --------------------------------------------------------------------------
def make_page_decorator(model):
    def deco(c, doc):
        c.saveState()
        # logo placeholder
        c.setFillColor(BRAND["primary"])
        c.setFont("Helvetica-Bold", 30)
        c.drawString(MARGIN + 4 * mm, PAGE_H - 22 * mm, BRAND["name"])
        c.setFillColor(colors.HexColor("#777777"))
        c.setFont("Helvetica", 8.5)
        c.drawString(MARGIN + 4 * mm, PAGE_H - 27 * mm, BRAND["tagline"])
        # title block
        c.setFillColor(BRAND["primary"])
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 18 * mm, BRAND["title"])
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 28 * mm, f"CONTROL NUMBER: {model['control_no']}")
        from reportlab.pdfbase.pdfmetrics import stringWidth
        txt = "INDICATES SECTION IS UNDER DISPUTE"
        tw = stringWidth(txt, "Helvetica-Bold", 8)
        c.setFillColor(colors.red)
        c.rect(PAGE_W - MARGIN - tw - 4 * mm, PAGE_H - 33 * mm, 3 * mm, 3 * mm, stroke=0, fill=1)
        c.setFillColor(BRAND["primary"])
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 32 * mm, txt)
        c.drawString(MARGIN + 4 * mm, PAGE_H - 36 * mm, f"DATE: {model['report_date']}")
        c.setStrokeColor(BRAND["accent"])
        c.setLineWidth(1)
        c.line(MARGIN, PAGE_H - 39 * mm, PAGE_W - MARGIN, PAGE_H - 39 * mm)

        # footer
        c.setFillColor(BRAND["primary"])
        c.rect(MARGIN, 20 * mm, CONTENT_W, 9 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W / 2, 23 * mm, BRAND["footer_banner"])
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(PAGE_W / 2, 14 * mm,
                            f"\u00a9 {date.today().year} {BRAND['name']}. ALL RIGHTS RESERVED.")
        c.drawCentredString(PAGE_W / 2, 11 * mm,
                            f"For more information visit {BRAND['website']}. To log a dispute, visit {BRAND['dispute_url']}")
        c.drawCentredString(PAGE_W / 2, 7 * mm, f"Page {doc.page}")
        c.restoreState()
    return deco


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------
def build_pdf(model, out_path):
    doc = BaseDocTemplate(out_path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=42 * mm, bottomMargin=32 * mm,
                          title=f"{BRAND['title']} - {model['name']}", author=BRAND["name"])
    frame = Frame(MARGIN, 32 * mm, CONTENT_W, PAGE_H - 74 * mm, id="f", leftPadding=0,
                  rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=make_page_decorator(model))])

    st = []
    # ---- page 1
    st += [section(f"{BRAND['name']} SCORE"), Spacer(1, 2 * mm), ScoreGauge(model["score"]), Spacer(1, 3 * mm)]

    st += [section("PERSONAL INFORMATION"), Spacer(1, 2 * mm)]
    pi = three_col(["NAME", "DATE OF BIRTH", "GENDER"], [[model["name"], model["dob"], model["gender"]]],
                   [CONTENT_W * .45, CONTENT_W * .30, CONTENT_W * .25], center=True)
    st += [pi, hline()]
    if model["ids"]:
        id_rows = [[l, n, "-", "-"] for l, n in model["ids"]]
        data = [[P("IDENTIFICATION TYPE", "label"), P("NUMBER", "labelc"),
                 P("ISSUE DATE", "labelc"), P("EXPIRATION DATE", "labelc")]]
        data += [[P(a), P(b, "valc"), P(c, "valc"), P(d, "valc")] for a, b, c, d in id_rows]
        t = Table(data, colWidths=[CONTENT_W * .38, CONTENT_W * .26, CONTENT_W * .16, CONTENT_W * .20])
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 2),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
        st.append(t)
    st.append(Spacer(1, 3 * mm))

    st += [section("CONTACT INFORMATION"), Spacer(1, 2 * mm)]
    for i, a in enumerate(model["addresses"][:4], 1):
        t = Table([[P(f"ADDRESS{i}", "label"), P("CATEGORY", "label"), P("STATUS", "label"),
                    P("DATE REPORTED", "label")],
                   [P(a["text"]), P(a["category"]), P(a["status"]), P(a["reported"])]],
                  colWidths=[CONTENT_W * .46, CONTENT_W * .20, CONTENT_W * .14, CONTENT_W * .20])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
        st += [t, hline()]
    if model["phones"]:
        data = [[P("TELEPHONE NUMBERS", "label"), "", ""],
                [P("TYPE", "label"), P("TELEPHONE NUMBER", "label"), P("EXTENSION", "label")]]
        data += [[P(a), P(b), P("-")] for a, b in model["phones"]]
        t = Table(data, colWidths=[CONTENT_W * .38, CONTENT_W * .38, CONTENT_W * .24])
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 1),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
        st.append(t)
    st.append(Spacer(1, 3 * mm))

    st += [section("EMPLOYMENT INFORMATION"), Spacer(1, 2 * mm)]
    for e in (model["employment"] or [{"account_type": "-", "reported": "-", "occupation": "-",
                                        "income": "-", "frequency": "-", "indicator": "-"}]):
        st += [three_col(["ACCOUNT TYPE", "DATE REPORTED", "OCCUPATION"],
                         [[e["account_type"], e["reported"], e["occupation"]]],
                         [CONTENT_W * .36, CONTENT_W * .30, CONTENT_W * .34]), hline(),
               three_col(["INCOME", "FREQUENCY", "INCOME INDICATOR"],
                         [[e["income"], e["frequency"], e["indicator"]]],
                         [CONTENT_W * .36, CONTENT_W * .30, CONTENT_W * .34])]
    st.append(PageBreak())

    # ---- page 2+: accounts
    st += [section("ACCOUNT INFORMATION"), Spacer(1, 3 * mm)]
    if not model["accounts"]:
        st.append(P("No account information reported."))
    for a in model["accounts"]:
        st.append(KeepTogether(account_block(a)))

    st += [section("ENQUIRY INFORMATION"), Spacer(1, 2 * mm)]
    if model["enquiries"]:
        data = [[P("MEMBER NAME", "label"), P("DATE OF ENQUIRY", "label"), P("ENQUIRY PURPOSE", "label")]]
        data += [[P(e["member"]), P(e["date"]), P(e["purpose"])] for e in model["enquiries"]]
        t = Table(data, colWidths=[CONTENT_W * .38, CONTENT_W * .26, CONTENT_W * .36], repeatRows=1)
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 2),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
        st.append(t)
    else:
        st.append(P("No enquiries reported."))
    st.append(PageBreak())

    # ---- last page: disclaimer
    st += [Paragraph(f'<font color="#{BRAND["primary"].hexval()[2:]}"><b>END OF CREDIT INFORMATION '
                     f'REPORT FOR {esc(model["name"].upper())}</b></font>',
                     ParagraphStyle("end", fontName="Helvetica-Bold", fontSize=9.5, leading=13)),
           hline(), Spacer(1, 3 * mm),
           Paragraph(esc(BRAND["disclaimer"].format(name=BRAND["name"])), S["small"])]
    doc.build(st)


# --------------------------------------------------------------------------
# demo data (all fictional)
# --------------------------------------------------------------------------
def demo_report():
    code = lambda s: {"symbol": s, "description": "", "rank": "100000", "abbreviation": ""}
    months = []
    y, mo = 2026, 8
    for _ in range(24):
        months.append({"date": f"{y}-{mo:02d}-01+05:30", "status": "0"})
        mo -= 1
        if mo == 0:
            y, mo = y - 1, 12
    return {"TrueLinkCreditReport": {
        "ReferenceKey": "10000000001",
        "Borrower": {
            "Birth": {"BirthDate": {"day": "15", "month": "3", "year": "1990"}},
            "Gender": "Female",
            "BorrowerName": {"Name": {"Forename": "SAMPLE CUSTOMER"}},
            "CreditScore": {"riskScore": "735", "scoreName": "SampleScore",
                            "Source": {"InquiryDate": "2026-10-19+05:30"}},
            "BorrowerAddress": [
                {"Dwelling": code("02"), "Ownership": code(""), "dateReported": "2024-08-31+05:30",
                 "CreditAddress": {"StreetAddress": "12, SAMPLE NAGAR, TESTVILLE", "PostalCode": "000000"}},
                {"Dwelling": code("04"), "Ownership": code("01"), "dateReported": "2023-06-24+05:30",
                 "CreditAddress": {"StreetAddress": "TESTVILLE", "PostalCode": "000000"}}],
            "BorrowerTelephone": {"PhoneNumber": {"Number": "9000000000"}, "PhoneType": code("01")},
            "Employer": {"account": "61", "dateReported": "2026-07-31+05:30",
                         "OccupationCode": {"symbol": "04", "description": "Others"}},
            "IdentifierPartition": {"Identifier": [
                {"ID": {"Id": "ABCDE1234F", "IdentifierName": "TaxId"}},
                {"ID": {"Id": "10000000000001", "IdentifierName": "CkycId"}}]},
        },
        "TradeLinePartition": {"accountTypeSymbol": "61", "Tradeline": {
            "creditorName": "SAMPLE FINANCE LTD", "accountNumber": "0000000000001",
            "AccountDesignator": code("1"), "highBalance": "65000", "currentBalance": "0",
            "dateOpened": "2024-08-30+05:30", "dateClosed": "2026-05-22+05:30",
            "dateReported": "2026-08-15+05:30", "writtenOffAmtTotal": "-1",
            "settlementAmount": "-1", "writtenOffPrincipal": "-1",
            "GrantedTrade": {"interestRate": "-1.00", "PaymentFrequency": code("03"),
                             "PayStatusHistory": {"MonthlyPayStatus": months},
                             "EMIAmount": "-1", "CashLimit": "-1", "CreditLimit": "-1",
                             "dateLastPayment": "2026-05-22+05:30", "amountPastDue": "0",
                             "collateral": "-1", "actualPaymentAmount": "-1", "termMonths": "-1"}}},
        "InquiryPartition": [
            {"Inquiry": {"subscriberName": "SAMPLE BANK", "inquiryDate": "2026-09-03+05:30", "inquiryType": "99"}},
            {"Inquiry": {"subscriberName": "SAMPLE BANK", "inquiryDate": "2025-09-06+05:30", "inquiryType": "51"}}],
    }}


def main(argv):
    if len(argv) == 3 and argv[1] == "--demo":
        rep = find_report(demo_report())
        out = argv[2]
    elif len(argv) == 3:
        with open(argv[1], encoding="utf-8") as f:
            rep = find_report(json.load(f))
        out = argv[2]
    else:
        print(__doc__)
        return 1
    build_pdf(build_model(rep), out)
    print("written", out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
