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
const htmlUrlOf = (raw) => {
    const value = raw?.data?.data?.htmlUrl;
    return typeof value === "string" ? value : null;
};
// The provider's htmlUrl can be opened only once, so it is read exactly once and whatever it returns is kept.
const extractBureauLinkDocument = async (raw) => {
    const data = raw?.data?.data;
    if (!data)
        return { pdf: null, html: null };
    for (const key of INLINE_HTML_KEYS) {
        const value = data[key];
        if (typeof value === "string" && looksLikeHtml(value))
            return { pdf: null, html: value };
    }
    const url = htmlUrlOf(raw);
    if (!url || !isPublicHttps(url))
        return { pdf: null, html: null };
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!response.ok) {
            console.error(`Bureau HTML link returned ${response.status}; it may already have been opened.`);
            return { pdf: null, html: null };
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_HTML_BYTES) {
            console.error(`Bureau HTML document too large (${buffer.length} bytes).`);
            return { pdf: null, html: null };
        }
        if (buffer.subarray(0, 5).toString("latin1") === "%PDF-")
            return { pdf: buffer, html: null };
        const html = buffer.toString("utf8");
        return { pdf: null, html: looksLikeHtml(html) ? withBase(html, url) : null };
    }
    catch (error) {
        console.error("Bureau HTML download failed", error);
        return { pdf: null, html: null };
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
export const captureBureauDocument = async (raw, bureau, saveHtml) => {
    // The bureau PDF link's signing credentials can expire within hours, so it is fetched right away too.
    const pdfUrl = livePdfUrl(raw);
    const [linked, bureauPdf] = await Promise.all([
        extractBureauLinkDocument(raw),
        pdfUrl && pdfUrl !== htmlUrlOf(raw) ? downloadReportPdf(pdfUrl) : Promise.resolve(null),
    ]);
    const html = linked.html;
    // Persist before the slow PDF render so a render failure cannot lose the only copy.
    if (html && saveHtml)
        await saveHtml(html).catch((error) => console.error("Bureau HTML save failed", error));
    const pdf = bureauPdf ?? linked.pdf ?? (html ? await htmlToPdf(html) : null);
    if (!pdf)
        console.warn(`No original PDF captured for ${bureau ?? "bureau"} report`);
    return { pdf, html };
};
