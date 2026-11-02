import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDeepStructure() {
  try {
    const result = await pool.query(
      `SELECT raw_report FROM credit_reports
       WHERE bureau = 'cibil'
       ORDER BY report_date DESC
       LIMIT 1`
    );

    if (!result.rows[0]) {
      console.log('❌ No CIBIL report found');
      return;
    }

    const raw = result.rows[0].raw_report;
    
    // Recursively find all keys with "account", "tradeline", "enquiry"
    function findKeys(obj, prefix = '') {
      const results = [];
      if (obj === null || typeof obj !== 'object') return results;
      
      Object.keys(obj).forEach(key => {
        const lower = key.toLowerCase();
        if (lower.includes('account') || lower.includes('tradeline') || lower.includes('enquiry') || 
            lower.includes('inquiry') || lower.includes('credit') || lower.includes('loan')) {
          results.push(`${prefix}.${key}`);
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          results.push(...findKeys(obj[key], `${prefix}.${key}`));
        }
      });
      return results;
    }
    
    const relevantKeys = findKeys(raw);
    
    console.log('\n🔍 Relevant Keys in Raw Response:');
    console.log('═════════════════════════════════════════\n');
    
    relevantKeys.forEach(key => {
      console.log(`  ${key}`);
    });

    console.log('\n\n📊 Full Raw Response Structure (first 2 levels):');
    console.log('═════════════════════════════════════════\n');
    
    // Print structure more clearly
    function printStructure(obj, depth = 0, maxDepth = 3) {
      if (depth > maxDepth || typeof obj !== 'object' || obj === null) return;
      
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        const indent = '  '.repeat(depth);
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          console.log(`${indent}${key}: {`);
          printStructure(val, depth + 1, maxDepth);
          console.log(`${indent}}`);
        } else if (Array.isArray(val)) {
          console.log(`${indent}${key}: [${val.length} items]`);
        } else {
          console.log(`${indent}${key}: ${typeof val}`);
        }
      });
    }
    
    printStructure(raw, 0, 2);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

checkDeepStructure();
