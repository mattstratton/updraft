import express from 'express';
import cors from 'cors';
import { blueskyRouter } from './routes/bluesky.js';
import { prisma } from './lib/prisma.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
// CORS - allow all origins (you can restrict this to your frontend domain in production)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', blueskyRouter);

// Initialize Prisma and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.warn('⚠️  Database connection failed, continuing without cache:', error);
    // Continue without database - caching will gracefully degrade
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

