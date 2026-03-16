// server.js — Main Express + Socket.IO server (complete version)

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const NotificationService = require('./services/notificationService');
const GamificationService = require('./services/gamificationService');

// ─── Route Imports ───────────────────────────────────────────────────────────
const authRoutes     = require('./api/routes/authRoutes');
const userRoutes     = require('./api/routes/userRoutes');
const postRoutes     = require('./api/routes/postRoutes');
const circularRoutes = require('./api/routes/circularRoutes');
const { analyticsRouter, notifRouter } = require('./api/routes/analyticsAndNotifRoutes');

// ─── App Setup ───────────────────────────────────────────────────────────────
connectDB();
const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
});

// Store io instance globally for use in controllers
app.set('io', io);
const notifService = new NotificationService(io);
app.set('notifService', notifService);

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join', (userId) => {
    if (userId) {
      onlineUsers.set(userId.toString(), socket.id);
      socket.join(`user:${userId}`);
      // Update online status in DB (non-blocking)
      mongoose.connection.db?.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $set: { isOnline: true, lastSeen: new Date() } }
      ).catch(() => {});
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
        mongoose.connection.db?.collection('users').updateOne(
          { _id: new mongoose.Types.ObjectId(userId) },
          { $set: { isOnline: false, lastSeen: new Date() } }
        ).catch(() => {});
        break;
      }
    }
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Export for use in routes
app.set('onlineUsers', onlineUsers);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3001'],
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
  max: 200,
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

// ─── Health & Docs ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 RGUKT Platform API is running',
    timestamp: new Date(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    onlineUsers: onlineUsers.size,
    version: '1.0.0',
  });
});

app.get('/api/docs', (req, res) => {
  const docs = require('./api/docs/api-documentation.json');
  res.json(docs);
});

// Redirect /api to docs
app.get('/api', (req, res) => res.redirect('/api/docs'));

// ─── Error Handlers ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

app.use((err, req, res, next) => {
  console.error(`❌ Error: ${err.message}`);
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists.` });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🎓 RGUKT RK Valley Platform API`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`🚀 Server:    http://localhost:${PORT}`);
  console.log(`📖 API Docs:  http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health:    http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket:    ws://localhost:${PORT}`);
  console.log(`${'─'.repeat(50)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => { mongoose.disconnect(); process.exit(0); });
});

module.exports = app; // for testing
