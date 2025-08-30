const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function migrateToLocalAuth() {
  try {
    console.log('🔄 Starting migration to local authentication...');
    
    // Drop existing users table if it exists
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Dropped existing users table');
    
    // Create new users table with local auth fields
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created new users table with local auth fields');
    
    // Recreate the update trigger for users
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await pool.query(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ Created update trigger for users table');
    
    console.log('🎉 Migration completed successfully!');
    console.log('💡 You can now register users using email/password authentication');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToLocalAuth()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToLocalAuth };
