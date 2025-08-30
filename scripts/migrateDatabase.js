const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function migrateDatabase() {
  try {
    console.log('🔄 Migrating existing database to new schema...\n');
    
    // Start transaction
    await pool.query('BEGIN');
    
    // 1. Update users table for Firebase (change to UUID and add google_id)
    console.log('👤 Updating users table...');
    
    // Add new columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS picture TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    
    // Update existing timestamps to include timezone
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE
    `);
    
    console.log('   ✅ Users table updated');
    
    // 2. Update transactions table
    console.log('📊 Updating transactions table...');
    
    // Add missing columns
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense',
      ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS confidence DECIMAL(3, 2),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
    
    // Update existing created_at to include timezone
    await pool.query(`
      ALTER TABLE transactions 
      ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE
    `);
    
    // Set transaction_date to created_at for existing records
    await pool.query(`
      UPDATE transactions 
      SET transaction_date = created_at 
      WHERE transaction_date IS NULL
    `);
    
    // Make transaction_date NOT NULL
    await pool.query(`
      ALTER TABLE transactions 
      ALTER COLUMN transaction_date SET NOT NULL
    `);
    
    // Add check constraint for type
    await pool.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_type_check,
      ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense'))
    `);
    
    console.log('   ✅ Transactions table updated');
    
    // 3. Create categories table
    console.log('🏷️  Creating categories table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default categories
    await pool.query(`
      INSERT INTO categories (name, color) VALUES
      ('Food & Dining', '#EF4444'),
      ('Transportation', '#F97316'),
      ('Shopping', '#EAB308'),
      ('Entertainment', '#8B5CF6'),
      ('Bills & Utilities', '#3B82F6'),
      ('Healthcare', '#EC4899'),
      ('Income', '#10B981'),
      ('Groceries', '#06B6D4'),
      ('Travel', '#84CC16'),
      ('Other', '#6B7280')
      ON CONFLICT (name) DO NOTHING
    `);
    
    console.log('   ✅ Categories table created and populated');
    
    // 4. Create indexes
    console.log('🚀 Creating performance indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);
    
    console.log('   ✅ Indexes created');
    
    // 5. Create update triggers
    console.log('⚙️  Creating update triggers...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
      CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('   ✅ Triggers created');
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('📋 Updated schema:');
    console.log('   - Users table: Added google_id, picture, updated_at');
    console.log('   - Transactions table: Added type, transaction_date, confidence, updated_at');
    console.log('   - Categories table: Created with default categories');
    console.log('   - Indexes: Added for better performance');
    console.log('   - Triggers: Added for automatic timestamp updates');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    await pool.query('ROLLBACK');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateDatabase();
