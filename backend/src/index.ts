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

// Image proxy endpoint for html2canvas (to avoid CORS issues)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Only allow Bluesky CDN URLs for security
    if (!imageUrl.includes('cdn.bsky.app')) {
      return res.status(403).json({ error: 'Only Bluesky CDN URLs are allowed' });
    }

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Set CORS headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    });

    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Initialize Prisma and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Note: Migrations are run via `prisma migrate deploy` in the Docker CMD
    // This ensures migrations run before the server starts
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

