const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'circulink',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 25,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Test connection on boot
pool.getConnection()
  .then((conn) => {
    console.log('⚡ MySQL 8 Connection Pool initialized successfully (host: ' + (process.env.DB_HOST || '127.0.0.1') + ')');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL Connection Pool Error:', err.message);
  });

module.exports = pool;
