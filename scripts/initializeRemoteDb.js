const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// This script can be used to initialize the database on a remote deployment
// Usage: DATABASE_URL=your_remote_db_url node scripts/initializeRemoteDb.js

async function initializeRemoteDb() {
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Please provide DATABASE_URL as argument or environment variable');
    console.log('Usage: node scripts/initializeRemoteDb.js "postgresql://user:pass@host:port/db"');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to remote database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected to database successfully');
    
    // Check if tables already exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name));
    
    if (tablesResult.rows.length > 0) {
      console.log('⚠️  Tables already exist. Skipping schema creation.');
      return;
    }
    
    console.log('🔄 Setting up database schema...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSql);
    console.log('✅ Database schema created successfully');
    
    // Verify tables were created
    const newTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Created tables:');
    newTablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('🎉 Remote database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeRemoteDb();
}

module.exports = { initializeRemoteDb };
