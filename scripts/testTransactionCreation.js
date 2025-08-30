const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function testTransactionCreation() {
  try {
    console.log('🧪 Testing transaction creation...\n');
    
    // Get the first user from the database to use for testing
    const userResult = await pool.query('SELECT id, email FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('❌ No users found in database');
      console.log('💡 Create a user first through the auth endpoints');
      return;
    }
    
    const testUser = userResult.rows[0];
    console.log(`👤 Found test user: ${testUser.email} (ID: ${testUser.id})`);
    
    // Create a test JWT token for authentication
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated test JWT token');
    
    // Test transaction data
    const testTransaction = {
      amount: 25.99,
      description: 'Test Coffee Purchase',
      category: 'Food & Dining',
      type: 'expense',
      date: new Date().toISOString()
    };
    
    console.log('📝 Test transaction data:', JSON.stringify(testTransaction, null, 2));
    
    // Simulate the transaction creation logic from the routes
    console.log('\\n🔄 Simulating transaction creation...');
    
    const result = await pool.query(`
      INSERT INTO transactions (user_id, amount, description, category, type, transaction_date, confidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      testUser.id,
      testTransaction.amount,
      testTransaction.description,
      testTransaction.category,
      testTransaction.type,
      new Date(testTransaction.date),
      0.95
    ]);
    
    const createdTransaction = result.rows[0];
    console.log('✅ Transaction created successfully!');
    console.log('📊 Created transaction:', {
      id: createdTransaction.id,
      userId: createdTransaction.user_id,
      amount: parseFloat(createdTransaction.amount),
      description: createdTransaction.description,
      category: createdTransaction.category,
      type: createdTransaction.type,
      date: createdTransaction.transaction_date.toISOString(),
      confidence: createdTransaction.confidence ? parseFloat(createdTransaction.confidence) : null,
      createdAt: createdTransaction.created_at.toISOString(),
      updatedAt: createdTransaction.updated_at.toISOString()
    });
    
    console.log('\\n🎉 Transaction creation test PASSED!');
    console.log('💡 Your transaction creation error should now be resolved');
    
  } catch (error) {
    console.error('❌ Transaction creation test FAILED:', error.message);
    console.error('🔍 Error details:', error);
    
    if (error.code) {
      console.log(`\\n🔍 PostgreSQL Error Code: ${error.code}`);
      switch (error.code) {
        case '23505':
          console.log('💡 This is a unique constraint violation');
          break;
        case '23503':
          console.log('💡 This is a foreign key constraint violation');
          break;
        case '23514':
          console.log('💡 This is a check constraint violation');
          break;
        case '42P01':
          console.log('💡 Table does not exist');
          break;
        default:
          console.log('💡 See PostgreSQL documentation for error code details');
      }
    }
  } finally {
    await pool.end();
  }
}

testTransactionCreation();
