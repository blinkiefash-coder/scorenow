import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testExtraction() {
  try {
    // Get the raw report
    const result = await pool.query(
      `SELECT id, raw_report
       FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const { id, raw_report } = result.rows[0];
    
    // Simulate the parser's object extraction
    const isObject = (value: unknown): value is Record<string, unknown> => 
      Boolean(value) && typeof value === "object" && !Array.isArray(value);
    
    const get = (value: unknown, path: string): unknown =>
      path.split(".").reduce<unknown>((current, key) => {
        if (Array.isArray(current)) current = current[0];
        return isObject(current) ? current[key] : undefined;
      }, value);

    const objectToArray = (value: unknown): unknown[] => {
      if (Array.isArray(value)) return value;
      if (!isObject(value)) return [];
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([key]) => /^\d+$/.test(key))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, val]) => val);
      return entries;
    };

    // Extract the first tradeline's payment history
    const tradeLinePartition = get(raw_report, "data.data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset.TrueLinkCreditReport.TradeLinePartition");
    const firstTradeline = Array.isArray(tradeLinePartition) ? tradeLinePartition[0] : tradeLinePartition;
    const tradeline = isObject(firstTradeline) ? firstTradeline.Tradeline ?? firstTradeline : null;
    
    if (!tradeline) {
      console.log('❌ Could not find tradeline');
      return;
    }

    const granted = isObject(tradeline.GrantedTrade) ? tradeline.GrantedTrade : {};
    const monthlyPayStatus = get(granted, "PayStatusHistory.MonthlyPayStatus");
    const paymentArray = objectToArray(monthlyPayStatus);

    console.log('\n✅ Payment Extraction Test:');
    console.log('═════════════════════════════════════════');
    console.log(`Report ID: ${id}`);
    console.log(`Monthly Pay Status Type: ${typeof monthlyPayStatus} (${Array.isArray(monthlyPayStatus) ? 'array' : 'object'})`);
    console.log(`Extracted Payment Array Length: ${paymentArray.length}`);
    
    if (paymentArray.length > 0) {
      console.log(`\n✅ SUCCESS! Payment history extracted:`);
      console.log(`First 3 months:`);
      paymentArray.slice(0, 3).forEach((entry, i) => {
        const e = entry as any;
        console.log(`  ${i + 1}. ${e.date} - Status: ${e.status}`);
      });
    } else {
      console.log(`❌ FAILED! No payment history extracted`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

testExtraction();
