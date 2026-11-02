import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkAllAccounts() {
  try {
    const result = await pool.query(
      `SELECT 
        c.normalized_report->'accounts' as accounts,
        c.normalized_report->'enquiries' as enquiries,
        c.raw_report->'data'->'cibilData'->'GetCustomerAssetsResponse'->'GetCustomerAssetsSuccess'->'Asset'->'TrueLinkCreditReport'->'TradeLinePartition' as raw_tradelines
       FROM credit_reports c
       WHERE c.bureau = 'cibil'
       ORDER BY c.report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const data = result.rows[0];
    
    console.log('\n📊 ALL ACCOUNTS (from normalized_report):');
    console.log('═════════════════════════════════════════\n');
    
    const accounts = data.accounts || [];
    console.log(`Total Accounts: ${accounts.length}\n`);
    
    accounts.forEach((acc, idx) => {
      console.log(`Account ${idx + 1}:`);
      console.log(`  Lender: ${acc.lender}`);
      console.log(`  Type: ${acc.type}`);
      console.log(`  Status: ${acc.status}`);
      console.log(`  Balance: ${acc.currentBalance}`);
      console.log(`  Overdue: ${acc.overdueAmount}`);
      console.log(`  Payment History Items: ${acc.paymentHistory?.length || 0}`);
      console.log('');
    });

    console.log('\n📊 ALL ENQUIRIES (from normalized_report):');
    console.log('═════════════════════════════════════════\n');
    
    const enquiries = data.enquiries || [];
    console.log(`Total Enquiries: ${enquiries.length}\n`);
    
    enquiries.forEach((enq, idx) => {
      console.log(`Enquiry ${idx + 1}:`);
      console.log(`  Lender: ${enq.lender}`);
      console.log(`  Purpose: ${enq.purpose}`);
      console.log(`  Date: ${enq.date}`);
      console.log(`  Amount: ${enq.amount}`);
      console.log('');
    });

    console.log('\n🔍 RAW TRADELINES (from raw_report):');
    console.log('═════════════════════════════════════════\n');
    if (data.raw_tradelines) {
      console.log(`Raw TradeLinePartition has ${data.raw_tradelines.length} items`);
      if (data.raw_tradelines.length > 0) {
        console.log(`First raw tradeline keys: ${Object.keys(data.raw_tradelines[0] || {}).join(', ')}`);
      }
    } else {
      console.log('❌ No raw TradeLinePartition found in raw_report');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkAllAccounts();
