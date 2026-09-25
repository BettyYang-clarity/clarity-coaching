const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));

// Make db available to all routes via middleware
app.use(async (req, res, next) => {
  try {
    req.db = await getDb();
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ success: false, error: 'Database initialization failed' });
  }
});

// Routes
app.use('/api/clients', require('./routes/clients'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/actions', require('./routes/actions'));
app.use('/api/captures', require('./routes/quick-capture'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Clarity Coaching System is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server after database is ready
async function start() {
  try {
    await getDb(); // Initialize database first
    app.listen(port, () => {
      console.log('');
      console.log('  ╔══════════════════════════════════════════════╗');
      console.log('  ║   Clarity Coaching System — Backend Server   ║');
      console.log(`  ║   http://localhost:${port}                      ║`);
      console.log('  ║   Database: server/data/clarity.db           ║');
      console.log('  ╚══════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
