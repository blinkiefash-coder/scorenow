import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRawStructure() {
  try {
    const result = await pool.query(
      `SELECT raw_report->'data' as data FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const data = result.rows[0].data;
    
    // Get all top-level keys in data
    const keys = data ? Object.keys(data) : [];
    
    console.log('\n🔍 CIBIL Raw Response Structure:');
    console.log('═════════════════════════════════════════\n');
    console.log(`Top-level keys in data: ${keys.join(', ')}`);
    
    if (data?.cibilData) {
      const cibilKeys = Object.keys(data.cibilData);
      console.log(`\ncibilData keys: ${cibilKeys.join(', ')}`);
      
      if (data.cibilData.GetCustomerAssetsResponse) {
        const respKeys = Object.keys(data.cibilData.GetCustomerAssetsResponse);
        console.log(`GetCustomerAssetsResponse keys: ${respKeys.join(', ')}`);
        
        if (data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess) {
          const successKeys = Object.keys(data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess);
          console.log(`GetCustomerAssetsSuccess keys: ${successKeys.join(', ')}`);
          
          if (data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset) {
            const assetKeys = Object.keys(data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset);
            console.log(`Asset keys: ${assetKeys.join(', ')}`);
            
            if (data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset.TrueLinkCreditReport) {
              const reportKeys = Object.keys(data.cibilData.GetCustomerAssetsResponse.GetCustomerAssetsSuccess.Asset.TrueLinkCreditReport);
              console.log(`TrueLinkCreditReport keys: ${reportKeys.join(', ')}`);
            }
          }
        }
      }
    }

    if (data?.credit_report) {
      const reportKeys = Object.keys(data.credit_report);
      console.log(`\ncredit_report keys (if exists): ${reportKeys.slice(0, 10).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkRawStructure();
