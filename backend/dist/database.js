import { Pool } from "pg";
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export const initializeDatabase = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be configured before the API can start.");
    }
    await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_submissions (
      id BIGSERIAL PRIMARY KEY,
      assessment_type TEXT NOT NULL CHECK (assessment_type IN ('individual', 'business')),
      form_data JSONB NOT NULL,
      report_content BYTEA,
      report_filename TEXT,
      report_mime_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS website_inquiries (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      concern TEXT NOT NULL,
      score_range TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};
export const saveAssessment = async ({ assessmentType, fields, report, }) => {
    await pool.query(`INSERT INTO assessment_submissions
      (assessment_type, form_data, report_content, report_filename, report_mime_type)
     VALUES ($1, $2, $3, $4, $5)`, [
        assessmentType,
        JSON.stringify(fields),
        report?.buffer ?? null,
        report?.originalname ?? null,
        report?.mimetype ?? null,
    ]);
};
export const saveWebsiteInquiry = async ({ fullName, mobile, concern, scoreRange, }) => {
    await pool.query(`INSERT INTO website_inquiries (full_name, mobile, concern, score_range)
     VALUES ($1, $2, $3, $4)`, [fullName, mobile, concern, scoreRange]);
};
