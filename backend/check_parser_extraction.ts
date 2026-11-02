import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkExtraction() {
  try {
    const result = await pool.query(
      `SELECT id, accounts, normalized_report->>'parserVersion' as version
       FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const { id, accounts, version } = result.rows[0];
    
    console.log('\n📊 Current Extraction Status:');
    console.log('═════════════════════════════════════════');
    console.log(`Report ID: ${id}`);
    console.log(`Parser Version: ${version}`);
    console.log(`Accounts Count: ${accounts?.length ?? 0}`);
    
    if (accounts && accounts.length > 0) {
      console.log('\n📄 First Account:');
      console.log(JSON.stringify(accounts[0], null, 2).slice(0, 800));
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkExtraction();
