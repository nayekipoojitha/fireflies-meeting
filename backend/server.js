require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const meetingRoutes = require('./routes/meetingRoutes');
const actionRoutes = require('./routes/actionRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, status: 'healthy' }));
app.use('/api/meetings', meetingRoutes);
app.use('/api', actionRoutes);
app.use('/api', aiRoutes);

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fireflies_clone';

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
