import { Router } from 'express';
import { generateRecap } from '../services/bluesky.js';
import { prisma } from '../lib/prisma.js';

export const blueskyRouter = Router();

// Helper function to get cache TTL (7 days in milliseconds)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

blueskyRouter.post('/recap', async (req, res) => {
  try {
    let { handle } = req.body;
    
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Normalize handle: remove @, trim, and convert to lowercase
    // Bluesky handles are case-insensitive but should be normalized to lowercase
    handle = handle.trim().replace(/^@/, "").toLowerCase();
    const year = new Date().getFullYear();

    // Check cache first
    try {
      const cached = await prisma.recap.findUnique({
        where: { handle_year: { handle, year } },
      });

      if (cached && cached.expiresAt > new Date()) {
        console.log(`Cache hit for ${handle} (${year})`);
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.json(cached.data as any);
      }

      if (cached) {
        console.log(`Cache expired for ${handle} (${year}), regenerating...`);
      }
    } catch (dbError) {
      console.warn('Database error during cache lookup, falling back to generation:', dbError);
      // Fall through to generate if DB is unavailable
    }

    // Generate new recap
    console.log(`Generating new recap for ${handle} (${year})`);
    const recap = await generateRecap(handle);

    // Save to cache
    try {
      await prisma.recap.upsert({
        where: { handle_year: { handle, year } },
        update: {
          data: recap as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
        create: {
          handle,
          year,
          data: recap as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
      console.log(`Cached recap for ${handle} (${year})`);
    } catch (dbError) {
      console.warn('Database error during cache save, continuing without cache:', dbError);
      // Continue even if cache save fails
    }

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recap);
  } catch (error) {
    console.error("Error in recap endpoint:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

blueskyRouter.post('/recap/regenerate', async (req, res) => {
  try {
    let { handle } = req.body;
    
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Normalize handle: remove @, trim, and convert to lowercase
    handle = handle.trim().replace(/^@/, "").toLowerCase();
    const year = new Date().getFullYear();

    // Always generate fresh recap
    console.log(`Force regenerating recap for ${handle} (${year})`);
    const recap = await generateRecap(handle);

    // Update cache (or create if doesn't exist)
    try {
      await prisma.recap.upsert({
        where: { handle_year: { handle, year } },
        update: {
          data: recap as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
        create: {
          handle,
          year,
          data: recap as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
      console.log(`Updated cache for ${handle} (${year})`);
    } catch (dbError) {
      console.warn('Database error during cache update, continuing:', dbError);
      // Continue even if cache update fails
    }

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recap);
  } catch (error) {
    console.error("Error in regenerate endpoint:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

