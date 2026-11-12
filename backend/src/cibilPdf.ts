import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The script sits next to dist/ (and src/) in backend, and beside dist/ on cPanel.
const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = () => process.env.CIBIL_PDF_SCRIPT || resolve(here, "../credit_report_pdf.py");

export const generateCibilPdf = async (raw: unknown): Promise<Buffer> => {
  const dir = await mkdtemp(join(tmpdir(), "cibil-pdf-"));
  try {
    const input = join(dir, "response.json");
    const output = join(dir, "report.pdf");
    await writeFile(input, JSON.stringify(raw));
    await new Promise<void>((done, fail) => {
      execFile(process.env.CIBIL_PYTHON || "python3", [scriptPath(), input, output], { timeout: 60000 }, (error, _stdout, stderr) => {
        if (error) fail(new Error(`credit_report_pdf.py failed: ${stderr || error.message}`));
        else done();
      });
    });
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

// Returns null instead of throwing so callers can fall back to the bureau's own PDF.
export const tryGenerateCibilPdf = (raw: unknown): Promise<Buffer | null> =>
  generateCibilPdf(raw).catch((error) => {
    console.error("CIBIL PDF generation failed", error);
    return null;
  });
