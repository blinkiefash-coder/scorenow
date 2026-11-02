import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkNormalized() {
  try {
    const result = await pool.query(
      `SELECT id, normalized_report
       FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const { id, normalized_report } = result.rows[0];
    
    console.log('\n📊 Normalized Report:');
    console.log('═════════════════════════════════════════');
    console.log(`Report ID: ${id}`);
    console.log(`Parser Version: ${normalized_report.parserVersion}`);
    console.log(`Accounts Count: ${normalized_report.accounts?.length ?? 0}`);
    
    if (normalized_report.accounts && normalized_report.accounts.length > 0) {
      console.log('\n📄 First Account:');
      console.log(JSON.stringify(normalized_report.accounts[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkNormalized();
