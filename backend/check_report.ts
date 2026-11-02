import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkLatestReport() {
  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.bureau,
        c.report_date,
        c.raw_report IS NOT NULL as has_raw_report,
        c.normalized_report IS NOT NULL as has_normalized_report,
        jsonb_array_length(c.normalized_report->'accounts') as accounts_count,
        jsonb_array_length(c.normalized_report->'enquiries') as enquiries_count,
        c.normalized_report->'parserVersion' as parser_version
       FROM credit_reports c
       WHERE c.bureau = 'cibil'
       ORDER BY c.report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const report = result.rows[0];
    console.log('\n📊 Latest CIBIL Report in Database:');
    console.log('─────────────────────────────────');
    console.log(`Report Date:       ${report.report_date}`);
    console.log(`Raw Report:        ${report.has_raw_report ? '✅ Stored' : '❌ Missing'}`);
    console.log(`Normalized Report: ${report.has_normalized_report ? '✅ Stored' : '❌ Missing'}`);
    console.log(`Parser Version:    ${report.parser_version}`);
    console.log(`Accounts Count:    ${report.accounts_count || 0}`);
    console.log(`Enquiries Count:   ${report.enquiries_count || 0}`);
    console.log('─────────────────────────────────\n');

    // Get more details about the accounts
    if (report.accounts_count > 0) {
      const accountResult = await pool.query(
        `SELECT 
          (c.normalized_report->'accounts'->0) as first_account
         FROM credit_reports c
         WHERE c.id = $1`,
        [report.id]
      );
      
      const account = accountResult.rows[0]?.first_account;
      if (account) {
        console.log('📋 First Account Details:');
        console.log('─────────────────────────────────');
        console.log(JSON.stringify(account, null, 2));
        console.log('─────────────────────────────────\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkLatestReport();
