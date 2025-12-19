#!/usr/bin/env node

/**
 * Secure static file server wrapper
 * Blocks common vulnerability scan paths and adds security headers
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createReadStream, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = join(__dirname, 'dist');

// List of blocked paths (common vulnerability scan targets)
const BLOCKED_PATHS = [
  // Environment files
  /^\/\.env/,
  /^\/env\//,
  /^\/\.env\./,
  /^\/\.env$/,
  /^\/config\.env$/,
  /^\/\.env\.(prod|production|local|dev|development|staging|stage|bak|backup|old|save|swp|~)$/,
  
  // Git files
  /^\/\.git/,
  /^\/\.git\/config$/,
  
  // Config files in various locations
  /^\/config\//,
  /^\/\.config/,
  /^\/config\.(js|json|yaml|yml)$/,
  
  // Secret/private files
  /^\/\.secret/,
  /^\/\.private/,
  /^\/secrets/,
  /^\/private/,
  
  // Common vulnerability scan paths
  /^\/\.well-known\/security\.txt$/,
  /^\/security\.txt$/,
  /^\/\.htaccess$/,
  /^\/\.htpasswd$/,
  /^\/web\.config$/,
  /^\/phpinfo\.php$/,
  /^\/\.DS_Store$/,
  
  // Payment/API keys (only block config files, not routes)
  /^\/stripe\.(js|json|yml|yaml|config\.js|config\.json)$/,
  /^\/stripe-keys\.(js|json)$/,
  /^\/stripe-secret\.(js|json)$/,
  /^\/stripe-config\.(js|json)$/,
  /^\/payment\.(js|json|config\.js|config\.json)$/,
  /^\/payments\.(js|json|config\.js|config\.json)$/,
  /^\/checkout\.(js|json|config\.js|config\.json)$/,
  /^\/billing\.(js|json|config\.js|config\.json)$/,
  /^\/api\.(js|json)$/,
  
  // Admin/backend paths (only block config/env files)
  /^\/admin\/\.env/,
  /^\/backend\/\.env/,
  /^\/server\/\.env/,
  /^\/api\/\.env/,
  
  // Various config file patterns
  /^\/.*\.config\.(js|json|yaml|yml)$/,
  /^\/.*-config\.(js|json)$/,
  /^\/.*_config\.(js|json)$/,
  /^\/.*-keys\.(js|json)$/,
  /^\/.*-secret\.(js|json)$/,
];

// Health check endpoint (for Railway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Security headers middleware
app.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Check for blocked paths
  const path = req.path.toLowerCase();
  
  for (const pattern of BLOCKED_PATHS) {
    if (pattern.test(path)) {
      // Log blocked request (for monitoring)
      console.warn(`[SECURITY] Blocked request: ${req.method} ${req.path} from ${req.ip}`);
      
      // Return 404 to avoid revealing that the path exists
      return res.status(404).json({ error: 'Not found' });
    }
  }
  
  next();
});

// Serve static files
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  immutable: true,
  etag: true,
  lastModified: true,
}));

// SPA fallback - serve index.html for all non-file requests
app.get('*', (req, res) => {
  // Skip if it looks like a file request (has extension)
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const indexPath = join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html');
    const stream = createReadStream(indexPath);
    stream.on('error', (err) => {
      console.error('Error serving index.html:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    stream.pipe(res);
  } else {
    console.error(`index.html not found at ${indexPath}`);
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    next(err);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Secure server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${DIST_DIR}`);
  console.log(`🛡️  Security filters enabled - blocking vulnerability scans`);
});

