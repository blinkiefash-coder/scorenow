import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_SVbYIn3Zmo8c@ep-bitter-breeze-b4hl32ws-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function getCIBILPDF() {
  try {
    // Get CIBIL report for Anita
    const result = await pool.query(`
      SELECT 
        id,
        bureau,
        credit_score,
        created_at,
        report_pdf,
        report_html,
        report_url,
        raw_report
      FROM credit_reports 
      WHERE user_id = 'd9bdf3f2-ddbc-4f80-844d-bf12cfd6316d'
      AND bureau = 'cibil'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('=== CIBIL REPORTS FOR ANITA ===\n');
    console.log(`Total CIBIL Reports: ${result.rows.length}\n`);
    
    result.rows.forEach((report, idx) => {
      console.log(`--- Report ${idx + 1} ---`);
      console.log(`ID: ${report.id}`);
      console.log(`Bureau: ${report.bureau}`);
      console.log(`Score: ${report.credit_score}`);
      console.log(`Created: ${report.created_at}`);
      console.log(`Report URL: ${report.report_url || 'Not available'}`);
      console.log(`Has PDF: ${report.report_pdf ? 'YES (' + (report.report_pdf.length / 1024).toFixed(2) + ' KB)' : 'NO'}`);
      console.log(`Has HTML: ${report.report_html ? 'YES' : 'NO'}`);
      console.log(`Has Raw Report: ${report.raw_report ? 'YES' : 'NO'}`);
      console.log();
    });
    
    // If we have a CIBIL report, show detailed info
    if (result.rows.length > 0) {
      const report = result.rows[0];
      console.log('\n=== LATEST CIBIL REPORT DETAILS ===');
      console.log(`Report ID: ${report.id}`);
      
      if (report.report_url) {
        console.log(`\n📄 Report URL:\n${report.report_url}`);
      }
      
      if (report.raw_report) {
        console.log('\n📊 Raw Report Data (First 2000 chars):');
        console.log(JSON.stringify(report.raw_report, null, 2).substring(0, 2000));
      }
      
      if (report.report_html) {
        console.log('\n🌐 HTML Report Available (First 1000 chars):');
        console.log(report.report_html.substring(0, 1000));
      }
      
      if (report.report_pdf) {
        console.log('\n📋 PDF Report Available');
        console.log(`Size: ${(report.report_pdf.length / 1024).toFixed(2)} KB`);
        console.log('Saving PDF to file...');
        
        // Save PDF to file
        const fs = await import('fs');
        const pdfPath = '/tmp/anita_cibil_report.pdf';
        fs.writeFileSync(pdfPath, report.report_pdf);
        console.log(`✅ PDF saved to: ${pdfPath}`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

getCIBILPDF();
