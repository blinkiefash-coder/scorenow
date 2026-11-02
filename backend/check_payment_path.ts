import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkPaymentPath() {
  try {
    const result = await pool.query(
      `SELECT raw_report->'data'->'data'->'cibilData'->'GetCustomerAssetsResponse'->'GetCustomerAssetsSuccess'->'Asset'->'TrueLinkCreditReport'->'TradeLinePartition'->0->'Tradeline'->'GrantedTrade'->'PayStatusHistory'->'MonthlyPayStatus' as payment_history
       FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const paymentHistory = result.rows[0].payment_history;
    
    console.log('\n💳 PaymentHistory.MonthlyPayStatus:');
    console.log('═════════════════════════════════════════\n');
    console.log(JSON.stringify(paymentHistory, null, 2).slice(0, 1000));

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkPaymentPath();
