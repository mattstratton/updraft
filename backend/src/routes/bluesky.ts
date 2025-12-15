import { Router } from 'express';
import { generateRecap } from '../services/bluesky.js';
import { prisma } from '../lib/prisma.js';

export const blueskyRouter = Router();

// Helper function to get cache TTL (7 days in milliseconds)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Cache version - increment this when the recap data structure changes
// This will invalidate all old cached recaps
const CACHE_VERSION = 2; // Incremented for threads, visualizations, and timezone support

blueskyRouter.post('/recap', async (req, res) => {
  try {
    let { handle, timezoneOffset } = req.body;
    
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Normalize handle: remove @, trim, and convert to lowercase
    // Bluesky handles are case-insensitive but should be normalized to lowercase
    handle = handle.trim().replace(/^@/, "").toLowerCase();
    const year = new Date().getFullYear();
    
    // Default to UTC (0) if timezoneOffset not provided (for backwards compatibility)
    const tzOffsetMinutes = timezoneOffset !== undefined ? parseInt(timezoneOffset) : 0;

    // Check cache first
    try {
      const cached = await prisma.recap.findUnique({
        where: { handle_year: { handle, year } },
      });

      // Check if cache is valid: not expired AND matches current cache version
      const cacheValid = cached && 
                        cached.expiresAt > new Date() && 
                        (cached.data as any)?._cacheVersion === CACHE_VERSION;

      if (cacheValid) {
        console.log(`Cache hit for ${handle} (${year})`);
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.json(cached.data as any);
      }

      if (cached) {
        if ((cached.data as any)?._cacheVersion !== CACHE_VERSION) {
          console.log(`Cache version mismatch for ${handle} (${year}), regenerating...`);
        } else {
          console.log(`Cache expired for ${handle} (${year}), regenerating...`);
        }
      }
    } catch (dbError) {
      console.warn('Database error during cache lookup, falling back to generation:', dbError);
      // Fall through to generate if DB is unavailable
    }

    // Generate new recap
    console.log(`Generating new recap for ${handle} (${year}) with timezone offset: ${tzOffsetMinutes} minutes`);
    const recap = await generateRecap(handle, tzOffsetMinutes);
    
    // Add cache version to recap data
    const recapWithVersion = {
      ...recap,
      _cacheVersion: CACHE_VERSION,
    };

    // Save to cache
    try {
      await prisma.recap.upsert({
        where: { handle_year: { handle, year } },
        update: {
          data: recapWithVersion as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
        create: {
          handle,
          year,
          data: recapWithVersion as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
      console.log(`Cached recap for ${handle} (${year}) with version ${CACHE_VERSION}`);
    } catch (dbError) {
      console.warn('Database error during cache save, continuing without cache:', dbError);
      // Continue even if cache save fails
    }

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recapWithVersion);
  } catch (error) {
    console.error("Error in recap endpoint:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

blueskyRouter.post('/recap/regenerate', async (req, res) => {
  try {
    let { handle, timezoneOffset } = req.body;
    
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Normalize handle: remove @, trim, and convert to lowercase
    handle = handle.trim().replace(/^@/, "").toLowerCase();
    const year = new Date().getFullYear();
    
    // Default to UTC (0) if timezoneOffset not provided (for backwards compatibility)
    const tzOffsetMinutes = timezoneOffset !== undefined ? parseInt(timezoneOffset) : 0;

    // Always generate fresh recap
    console.log(`Force regenerating recap for ${handle} (${year}) with timezone offset: ${tzOffsetMinutes} minutes`);
    const recap = await generateRecap(handle, tzOffsetMinutes);
    
    // Add cache version to recap data
    const recapWithVersion = {
      ...recap,
      _cacheVersion: CACHE_VERSION,
    };

    // Update cache (or create if doesn't exist)
    try {
      await prisma.recap.upsert({
        where: { handle_year: { handle, year } },
        update: {
          data: recapWithVersion as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
        create: {
          handle,
          year,
          data: recapWithVersion as any,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        },
      });
      console.log(`Updated cache for ${handle} (${year}) with version ${CACHE_VERSION}`);
    } catch (dbError) {
      console.warn('Database error during cache update, continuing:', dbError);
      // Continue even if cache update fails
    }

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recapWithVersion);
  } catch (error) {
    console.error("Error in regenerate endpoint:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

