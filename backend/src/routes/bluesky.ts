import { Router } from 'express';
import { generateRecap } from '../services/bluesky.js';
import { prisma } from '../lib/prisma.js';

export const blueskyRouter = Router();

// Helper function to get cache TTL (7 days in milliseconds)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Cache version - automatically generated from build time or git commit
// This ensures cache invalidation when code changes are deployed
// Railway sets RAILWAY_GIT_COMMIT_SHA, or we fall back to build timestamp
const CACHE_VERSION = process.env.RAILWAY_GIT_COMMIT_SHA || 
                       process.env.RAILWAY_DEPLOYMENT_ID || 
                       `build-${Date.now()}`;

// Log cache version on startup for debugging
console.log(`📦 Cache version: ${CACHE_VERSION}`);
console.log(`📦 Railway env vars: GIT_COMMIT_SHA=${process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 8) || 'not set'}, DEPLOYMENT_ID=${process.env.RAILWAY_DEPLOYMENT_ID || 'not set'}`);

// Required fields that must exist in cached recap data for it to be valid
// If any of these are missing, the cache is considered invalid
const REQUIRED_CACHE_FIELDS = [
  'profile',
  'stats',
  'patterns',
  'topFans',
  'topics',
  'threads',      // New field - will invalidate old caches
  'visualizations', // New field - will invalidate old caches
];

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

      // Check if cache is valid: not expired AND has required fields
      const cacheData = cached?.data as any;
      const isExpired = !cached || cached.expiresAt <= new Date();
      const hasRequiredFields = cacheData && REQUIRED_CACHE_FIELDS.every(field => 
        cacheData[field] !== undefined && cacheData[field] !== null
      );
      const versionMatches = cacheData?._cacheVersion === CACHE_VERSION;
      
      const cacheValid = !isExpired && hasRequiredFields && versionMatches;

      if (cacheValid) {
        console.log(`Cache hit for ${handle} (${year})`);
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.json(cacheData);
      }

      if (cached) {
        if (isExpired) {
          console.log(`Cache expired for ${handle} (${year}), regenerating...`);
        } else if (!hasRequiredFields) {
          console.log(`Cache missing required fields for ${handle} (${year}), regenerating...`);
        } else if (!versionMatches) {
          console.log(`Cache version mismatch for ${handle} (${year}) (cached: ${cacheData?._cacheVersion}, current: ${CACHE_VERSION}), regenerating...`);
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

// Debug endpoint to check cache version and status
blueskyRouter.get('/recap/debug', async (req, res) => {
  try {
    const { handle } = req.query;
    const year = new Date().getFullYear();
    
    if (handle) {
      const normalizedHandle = String(handle).trim().replace(/^@/, "").toLowerCase();
      const cached = await prisma.recap.findUnique({
        where: { handle_year: { handle: normalizedHandle, year } },
      });
      
      const cacheData = cached?.data as any;
      const hasRequiredFields = cacheData ? REQUIRED_CACHE_FIELDS.map(field => ({
        field,
        exists: cacheData[field] !== undefined && cacheData[field] !== null
      })) : [];
      
      return res.json({
        currentCacheVersion: CACHE_VERSION,
        cachedVersion: cacheData?._cacheVersion || 'none',
        versionMatches: cacheData?._cacheVersion === CACHE_VERSION,
        hasRequiredFields,
        allFieldsPresent: hasRequiredFields.every(f => f.exists),
        isExpired: cached ? cached.expiresAt <= new Date() : null,
        expiresAt: cached?.expiresAt || null,
        createdAt: cached?.createdAt || null,
      });
    }
    
    res.json({
      currentCacheVersion: CACHE_VERSION,
      railwayGitCommit: process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 8) || 'not set',
      railwayDeploymentId: process.env.RAILWAY_DEPLOYMENT_ID || 'not set',
      requiredFields: REQUIRED_CACHE_FIELDS,
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ error: "Debug endpoint error" });
  }
});

