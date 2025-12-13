import { Router } from 'express';
import { generateRecap } from '../services/bluesky.js';

export const blueskyRouter = Router();

blueskyRouter.post('/recap', async (req, res) => {
  try {
    let { handle } = req.body;
    
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Normalize handle: remove @, trim, and convert to lowercase
    // Bluesky handles are case-insensitive but should be normalized to lowercase
    handle = handle.trim().replace(/^@/, "").toLowerCase();

    const recap = await generateRecap(handle);

    // Cache the response for 1 hour since year-in-review data doesn't change frequently
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recap);
  } catch (error) {
    console.error("Error in recap endpoint:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

