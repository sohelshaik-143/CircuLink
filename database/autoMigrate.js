// database/autoMigrate.js
// Automatically initializes tables and default seed data on cloud boot

const pool = require('../config/mysql');
const fs = require('fs');
const path = require('path');

async function autoMigrate() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
    if (tables.length > 0) {
      console.log('✅ Database schema already initialized.');
      return;
    }

    console.log('⚙️ Initializing database schema from schema.sql & seed.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');

    if (fs.existsSync(schemaPath)) {
      let schemaSql = fs.readFileSync(schemaPath, 'utf8');
      // Remove hardcoded database creation and use statements for cloud compatibility
      schemaSql = schemaSql.replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/gi, '');
      schemaSql = schemaSql.replace(/USE\s+[^;]+;/gi, '');

      // Execute statement by statement
      const statements = schemaSql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (err) {
          // Ignore harmless drop or foreign key check warnings
          if (!err.message.includes('Unknown table') && !err.message.includes('already exists')) {
            console.warn('Migration warning:', err.message);
          }
        }
      }
      console.log('✅ Database schema tables created successfully.');
    }

    if (fs.existsSync(seedPath)) {
      let seedSql = fs.readFileSync(seedPath, 'utf8');
      seedSql = seedSql.replace(/USE\s+[^;]+;/gi, '');

      const statements = seedSql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (err) {
          console.warn('Seed warning:', err.message);
        }
      }
      console.log('✅ Seed personas populated successfully.');
    }
  } catch (err) {
    console.error('❌ Auto-migration error:', err.message);
  }
}

module.exports = autoMigrate;
