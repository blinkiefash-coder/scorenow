import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_SVbYIn3Zmo8c@ep-bitter-breeze-b4hl32ws-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function checkAllReports() {
  try {
    const result = await pool.query(`
      SELECT 
        bureau,
        COUNT(*) as count,
        MAX(created_at) as latest_report,
        STRING_AGG(DISTINCT credit_score::text, ', ') as scores
      FROM credit_reports 
      WHERE user_id = 'd9bdf3f2-ddbc-4f80-844d-bf12cfd6316d'
      GROUP BY bureau
      ORDER BY MAX(created_at) DESC
    `);
    
    console.log('=== ALL REPORTS FOR ANITA ===\n');
    result.rows.forEach(row => {
      console.log(`Bureau: ${row.bureau}`);
      console.log(`  Count: ${row.count}`);
      console.log(`  Latest: ${row.latest_report}`);
      console.log(`  Scores: ${row.scores}`);
      console.log();
    });
    
    // Now get all reports with their column info
    const allReports = await pool.query(`
      SELECT 
        id,
        bureau,
        credit_score,
        created_at,
        report_url,
        (report_pdf IS NOT NULL) as has_pdf,
        (report_html IS NOT NULL) as has_html,
        (raw_report IS NOT NULL) as has_raw_report
      FROM credit_reports 
      WHERE user_id = 'd9bdf3f2-ddbc-4f80-844d-bf12cfd6316d'
      ORDER BY created_at DESC
    `);
    
    console.log('=== DETAILED REPORT LISTING ===\n');
    allReports.rows.forEach((report, idx) => {
      console.log(`${idx + 1}. ${report.bureau.toUpperCase()}`);
      console.log(`   Score: ${report.credit_score}`);
      console.log(`   Date: ${report.created_at}`);
      console.log(`   PDF: ${report.has_pdf ? '✅' : '❌'} | HTML: ${report.has_html ? '✅' : '❌'} | Raw: ${report.has_raw_report ? '✅' : '❌'}`);
      console.log(`   URL: ${report.report_url || 'N/A'}`);
      console.log();
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkAllReports();
