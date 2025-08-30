const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function fixTransactionSchema() {
  try {
    console.log('🔧 Fixing transaction schema UUID mismatch...\n');
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Check current schema
    const currentSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name IN ('id', 'user_id')
      ORDER BY column_name
    `);
    
    console.log('📊 Current transactions table schema:');
    currentSchema.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    console.log('');
    
    // Check if we need to migrate
    const needsUuidMigration = currentSchema.rows.some(row => 
      (row.column_name === 'id' || row.column_name === 'user_id') && row.data_type === 'integer'
    );
    
    if (!needsUuidMigration) {
      console.log('✅ Schema is already correct - no migration needed!');
      await pool.query('COMMIT');
      return;
    }
    
    console.log('🔄 Migrating to UUID schema...\n');
    
    // Step 1: Create new tables with UUID schema
    console.log('1️⃣ Creating new tables with UUID schema...');
    
    // Create new users table
    await pool.query(`
      CREATE TABLE users_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        google_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create new transactions table
    await pool.query(`
      CREATE TABLE transactions_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
        confidence DECIMAL(3, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('   ✅ New tables created');
    
    // Step 2: Migrate users data
    console.log('2️⃣ Migrating users data...');
    
    const oldUsers = await pool.query('SELECT * FROM users ORDER BY id');
    const userIdMapping = new Map();
    
    for (const user of oldUsers.rows) {
      const newUserId = await pool.query('SELECT gen_random_uuid() as id');
      const newId = newUserId.rows[0].id;
      userIdMapping.set(user.id, newId);
      
      await pool.query(`
        INSERT INTO users_new (id, email, password_hash, name, picture, google_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        newId,
        user.email,
        user.password_hash,
        user.name,
        user.picture || null,
        user.google_id || null,
        user.created_at,
        user.updated_at || user.created_at
      ]);
    }
    
    console.log(`   ✅ Migrated ${oldUsers.rows.length} users`);
    
    // Step 3: Migrate transactions data
    console.log('3️⃣ Migrating transactions data...');
    
    const oldTransactions = await pool.query('SELECT * FROM transactions ORDER BY id');
    
    for (const transaction of oldTransactions.rows) {
      const newUserId = userIdMapping.get(transaction.user_id);
      if (!newUserId) {
        console.error(`   ⚠️  Skipping transaction ${transaction.id} - user not found`);
        continue;
      }
      
      await pool.query(`
        INSERT INTO transactions_new (user_id, amount, description, category, type, transaction_date, confidence, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        newUserId,
        transaction.amount,
        transaction.description,
        transaction.category,
        transaction.type || 'expense',
        transaction.transaction_date || transaction.created_at,
        transaction.confidence || null,
        transaction.created_at,
        transaction.updated_at || transaction.created_at
      ]);
    }
    
    console.log(`   ✅ Migrated ${oldTransactions.rows.length} transactions`);
    
    // Step 4: Replace old tables
    console.log('4️⃣ Replacing old tables...');
    
    await pool.query('DROP TABLE IF EXISTS transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('ALTER TABLE users_new RENAME TO users');
    await pool.query('ALTER TABLE transactions_new RENAME TO transactions');
    
    console.log('   ✅ Old tables replaced');
    
    // Step 5: Create indexes and triggers
    console.log('5️⃣ Creating indexes and triggers...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);
    
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
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('   ✅ Indexes and triggers created');
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('\n🎉 Schema migration completed successfully!');
    console.log('📊 Transaction creation should now work properly');
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error.message);
    console.error('Stack:', error.stack);
    
    try {
      await pool.query('ROLLBACK');
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTransactionSchema();
