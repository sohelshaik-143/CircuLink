// server.js — Main Express + Socket.IO server (MySQL 8 High-Performance Edition)

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const pool = require('./config/mysql');
const autoMigrate = require('./database/autoMigrate');
const MySQLService = require('./services/mysqlService');

autoMigrate().catch((err) => console.error('Migration error:', err.message));

// ─── Route Imports ───────────────────────────────────────────────────────────
const authRoutes     = require('./api/routes/authRoutes');
const userRoutes     = require('./api/routes/userRoutes');
const postRoutes     = require('./api/routes/postRoutes');
const circularRoutes = require('./api/routes/circularRoutes');
const { analyticsRouter, notifRouter } = require('./api/routes/analyticsAndNotifRoutes');
const messageRoutes = require('./api/routes/messageRoutes');

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Store io instance globally
app.set('io', io);

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      onlineUsers.set(userId.toString(), socket.id);
      socket.join(`user:${userId}`);
      // Update online status in MySQL (non-blocking)
      pool.query('UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ?', [userId]).catch(() => {});
      pool.query('INSERT INTO online_users (user_id, session_id, last_heartbeat) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_heartbeat = NOW()', [userId, socket.id]).catch(() => {});
    }
  });

  socket.on('join_branch', (branch) => {
    if (branch) socket.join(`branch:${branch}`);
  });

  socket.on('join_campus', (campus) => {
    if (campus) socket.join(`campus:${campus}`);
  });

  socket.on('typing', ({ roomId, userName }) => {
    socket.to(roomId).emit('user_typing', { userName });
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        pool.query('UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ?', [userId]).catch(() => {});
        pool.query('DELETE FROM online_users WHERE user_id = ?', [userId]).catch(() => {});
        break;
      }
    }
  });
});

app.set('onlineUsers', onlineUsers);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=86400'); },
}));

// Global rate limiter
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  message: { success: false, message: 'Rate limit exceeded. Try again in 15 minutes.' },
}));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/circulars',     circularRoutes);
app.use('/api/analytics',     analyticsRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/messages',      messageRoutes);

// ─── Global Search ───────────────────────────────────────────────────────────
app.get('/api/search', require('./middleware/auth').protect, async (req, res) => {
  try {
    const { q } = req.query;
    const results = await MySQLService.search(q);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Health & Docs ───────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({
      success: true,
      message: '🚀 RGUKT CircuLink Platform API is running',
      timestamp: new Date(),
      dbStatus: rows.length ? 'connected (MySQL 8)' : 'disconnected',
      onlineUsers: onlineUsers.size,
      version: '2.0.0',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB connection error: ' + err.message });
  }
});

app.get('/api/docs', (req, res) => {
  try {
    const docs = require('./api/docs/api-documentation.json');
    res.json(docs);
  } catch (_) {
    res.json({ success: true, message: 'CircuLink RGUKT Platform API' });
  }
});

app.get('/api', (req, res) => res.redirect('/api/docs'));

// ─── Frontend Production Serving ─────────────────────────────────────────────
const frontendDist = path.join(__dirname, 'frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads') || req.url.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ─── Error Handlers ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

app.use((err, req, res, next) => {
  console.error(`❌ Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🎓 RGUKT RK Valley Platform API (MySQL 8)`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`🚀 Server:    http://localhost:${PORT}`);
    console.log(`📖 API Docs:  http://localhost:${PORT}/api/docs`);
    console.log(`🏥 Health:    http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket:    ws://localhost:${PORT}`);
    console.log(`${'─'.repeat(50)}\n`);
  });
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => { pool.end(); process.exit(0); });
});

module.exports = app;
