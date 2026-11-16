const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_SVbYIn3Zmo8c@ep-bitter-breeze-b4hl32ws-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function queryAnita() {
  try {
    // First, find users with name containing "anita"
    const usersResult = await pool.query(`
      SELECT id, full_name, mobile, email, created_at FROM users 
      WHERE LOWER(full_name) LIKE LOWER('%anita%') OR LOWER(email) LIKE LOWER('%anita%')
      LIMIT 10
    `);
    
    console.log('=== Users matching "Anita" ===');
    console.log(JSON.stringify(usersResult.rows, null, 2));
    
    if (usersResult.rows.length > 0) {
      const userId = usersResult.rows[0].id;
      console.log(`\n=== Credit Reports for user ${userId} ===`);
      
      // Get credit reports for this user
      const reportsResult = await pool.query(`
        SELECT id, bureau, credit_score, status, created_at, raw_report 
        FROM credit_reports 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId]);
      
      console.log(JSON.stringify(reportsResult.rows, null, 2));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

queryAnita();
