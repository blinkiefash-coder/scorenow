require('dotenv').config();
const { Pool } = require('pg');
const { randomBytes, scryptSync } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setPassword() {
  const mobile = '9769755210';
  const email = 'lipsa@scorenow.local';
  const password = 'ScoreNow@123';

  try {
    // First, find the user by mobile number
    const userResult = await pool.query(
      `SELECT id, full_name FROM users WHERE mobile = $1 AND role = 'customer'`,
      [mobile]
    );

    if (!userResult.rows[0]) {
      console.error('❌ User not found with mobile:', mobile);
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    const fullName = userResult.rows[0].full_name;
    console.log('✅ Found user:', fullName, '(ID:', userId + ')');

    // Now set the password
    const salt = randomBytes(16).toString('hex');
    const passwordHash = scryptSync(password, salt, 64).toString('hex');

    const result = await pool.query(
      `UPDATE users SET email = COALESCE(email, $2), password_salt = $3, password_hash = $4, updated_at = NOW()
       WHERE id = $1 AND role = 'customer' AND status = 'active'
       RETURNING id, email, mobile`,
      [userId, email, salt, passwordHash]
    );

    if (result.rows[0]) {
      console.log('\n✅ Password set successfully!\n');
      console.log('╔═══════════════════════════════════════╗');
      console.log('║        LOGIN CREDENTIALS              ║');
      console.log('╚═══════════════════════════════════════╝');
      console.log(`📧 Email:    ${email}`);
      console.log(`🔐 Password: ${password}`);
      console.log(`📱 Mobile:   ${result.rows[0].mobile}`);
      console.log('═══════════════════════════════════════\n');
    } else {
      console.error('❌ Failed to update password - user may not be active');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setPassword();
