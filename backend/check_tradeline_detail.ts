import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTradeline() {
  try {
    const result = await pool.query(
      `SELECT raw_report->'data'->'data'->'cibilData'->'GetCustomerAssetsResponse'->'GetCustomerAssetsSuccess'->'Asset'->'TrueLinkCreditReport'->'TradeLinePartition'->0 as first_tradeline
       FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const tradeline = result.rows[0].first_tradeline;
    
    console.log('\n📋 First TradeLinePartition Item:');
    console.log('═════════════════════════════════════════\n');
    console.log(JSON.stringify(tradeline, null, 2));

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkTradeline();
