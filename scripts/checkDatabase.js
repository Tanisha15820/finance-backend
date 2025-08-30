const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check if database exists and is accessible
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('📋 No tables found - database is empty\n');
      console.log('💡 Run: npm run setup-db to create tables');
      return;
    }
    
    // Group by table
    const tables = {};
    tablesResult.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push({
        column: row.column_name,
        type: row.data_type
      });
    });
    
    console.log('📋 Existing tables and columns:\n');
    Object.entries(tables).forEach(([tableName, columns]) => {
      console.log(`📊 Table: ${tableName}`);
      columns.forEach(col => {
        console.log(`   - ${col.column} (${col.type})`);
      });
      console.log('');
    });
    
    // Check if our expected tables exist
    const expectedTables = ['users', 'transactions', 'categories'];
    const existingTableNames = Object.keys(tables);
    
    console.log('🔍 Schema Analysis:');
    expectedTables.forEach(expectedTable => {
      if (existingTableNames.includes(expectedTable)) {
        console.log(`   ✅ ${expectedTable} table exists`);
      } else {
        console.log(`   ❌ ${expectedTable} table missing`);
      }
    });
    
    // Check specific columns in transactions table
    if (tables.transactions) {
      const transactionColumns = tables.transactions.map(col => col.column);
      const requiredColumns = ['id', 'user_id', 'amount', 'description', 'category', 'type', 'transaction_date'];
      
      console.log('\n📊 Transactions table analysis:');
      requiredColumns.forEach(reqCol => {
        if (transactionColumns.includes(reqCol)) {
          console.log(`   ✅ ${reqCol} column exists`);
        } else {
          console.log(`   ❌ ${reqCol} column missing`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (error.code === '3D000') {
      console.log('💡 Database "finance_db" does not exist. Create it first:');
      console.log('   psql -U postgres -c "CREATE DATABASE finance_db;"');
    }
  } finally {
    await pool.end();
  }
}

checkDatabase();
