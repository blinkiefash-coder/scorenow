import { downloadReportPdf, livePdfUrl } from "./bureaus.js";
const MAX_HTML_BYTES = 15 * 1024 * 1024;
const INLINE_HTML_KEYS = ["html", "htmlContent", "html_content", "report_html", "reportHtml"];
const isPublicHttps = (value) => {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:")
            return false;
        return !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname);
    }
    catch {
        return false;
    }
};
const looksLikeHtml = (value) => /<\s*(html|body|div|table)\b/i.test(value);
const withBase = (html, baseUrl) => {
    if (!baseUrl || /<base\s/i.test(html))
        return html;
    const tag = `<base href="${baseUrl.replace(/"/g, "&quot;")}">`;
    return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (match) => `${match}${tag}`) : `${tag}${html}`;
};
// The provider returns either the HTML inline or a short-lived link to it, so capture it while it is still valid.
export const extractBureauHtml = async (raw) => {
    const data = raw?.data?.data;
    if (!data)
        return null;
    for (const key of INLINE_HTML_KEYS) {
        const value = data[key];
        if (typeof value === "string" && looksLikeHtml(value))
            return value;
    }
    const url = typeof data.htmlUrl === "string" ? data.htmlUrl : null;
    if (!url || !isPublicHttps(url))
        return null;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok || Number(response.headers.get("content-length")) > MAX_HTML_BYTES)
            return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_HTML_BYTES)
            return null;
        if (buffer.subarray(0, 5).toString("latin1") === "%PDF-")
            return null;
        const html = buffer.toString("utf8");
        return looksLikeHtml(html) ? withBase(html, url) : null;
    }
    catch (error) {
        console.error("Bureau HTML download failed", error);
        return null;
    }
};
export const htmlToPdf = async (html) => {
    let browser;
    try {
        const puppeteer = (await import("puppeteer-core")).default;
        let executablePath = process.env.CHROME_PATH;
        let args = ["--no-sandbox", "--disable-setuid-sandbox"];
        if (!executablePath) {
            const chromium = (await import("@sparticuz/chromium")).default;
            executablePath = await chromium.executablePath();
            args = chromium.args;
        }
        browser = await puppeteer.launch({ executablePath, args, headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load", timeout: 45000 });
        const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
        return Buffer.from(pdf);
    }
    catch (error) {
        console.error("Report HTML to PDF failed", error);
        return null;
    }
    finally {
        await browser?.close().catch(() => undefined);
    }
};
// Called once, right after a successful bureau hit, so later downloads never depend on the provider again.
export const captureBureauDocument = async (raw) => {
    const html = await extractBureauHtml(raw);
    let pdf = await downloadReportPdf(livePdfUrl(raw));
    if (!pdf && html)
        pdf = await htmlToPdf(html);
    return { pdf, html };
};
