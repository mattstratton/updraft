import express from 'express';
import cors from 'cors';
import { blueskyRouter } from './routes/bluesky.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', blueskyRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

