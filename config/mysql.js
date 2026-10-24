const mysql = require('mysql2/promise');

const poolConfig = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 4000,
      ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'circulink',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      waitForConnections: true,
      connectionLimit: 20,
      connectTimeout: 4000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

const pool = mysql.createPool(poolConfig);

// Test connection on boot (non-blocking, local/server only)
if (!process.env.VERCEL) {
  pool.getConnection()
    .then((conn) => {
      console.log('⚡ MySQL 8 Connection Pool initialized successfully');
      conn.release();
    })
    .catch((err) => {
      console.error('❌ MySQL Connection Pool Error:', err.message);
    });
}

module.exports = pool;
