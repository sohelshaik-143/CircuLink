// api/index.js — Vercel Serverless Function entry point
let app;
let initError = null;

try {
  app = require('../server');
} catch (err) {
  initError = err;
  console.error('Failed to load server.js in Vercel function:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      message: 'Serverless initialization error: ' + initError.message,
      stack: initError.stack,
    });
  }
  return app(req, res);
};
