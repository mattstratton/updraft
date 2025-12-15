# Database Implementation Plan

## Overview

Add PostgreSQL database with Prisma ORM to cache recaps, reducing API calls to Bluesky and improving response times. Users can regenerate recaps when needed.

## Database Schema

### `Recap` Table

Store complete recap data as JSON, keyed by handle and year.

```prisma
model Recap {
  id            String   @id @default(cuid())
  handle        String   // Normalized handle (lowercase, no @)
  year          Int      // Year the recap is for (e.g., 2024, 2025)
  data          Json     // Full recap data (matches current RecapData structure)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  expiresAt     DateTime // When cache expires (default: 7 days from creation)
  
  @@unique([handle, year])
  @@index([handle])
  @@index([expiresAt]) // For cleanup queries
}
```

**Fields:**
- `id`: Unique identifier (CUID)
- `handle`: Normalized Bluesky handle (lowercase, no @)
- `year`: Year the recap covers
- `data`: Complete recap JSON (stores entire RecapData structure)
- `createdAt`: When recap was first generated
- `updatedAt`: When recap was last updated/regenerated
- `expiresAt`: Cache expiration timestamp (default: 7 days)

**Indexes:**
- Unique constraint on `[handle, year]` - one recap per handle per year
- Index on `handle` for fast lookups
- Index on `expiresAt` for efficient cleanup of expired recaps

## Caching Strategy

### Cache Lookup Flow

1. **Check Cache First**
   - Query by `handle` and `year` (current year)
   - Check if `expiresAt > now()`
   - If valid cache exists, return it immediately

2. **Generate if Missing/Expired**
   - If no cache or expired, generate new recap
   - Save to database with `expiresAt = now() + 7 days`
   - Return generated recap

3. **Regenerate Endpoint**
   - New `POST /api/recap/regenerate` endpoint
   - Forces regeneration regardless of cache status
   - Updates existing record or creates new one
   - Resets `expiresAt` to 7 days from now

### Cache Expiration

- **Default TTL**: 7 days
- **Rationale**: Year-in-review data doesn't change frequently, but users may want fresh data occasionally
- **Cleanup**: Optional background job to delete expired recaps (can be added later)

### Cache Invalidation

- **Manual**: Via regenerate endpoint
- **Automatic**: After expiration date passes
- **Future consideration**: Could add webhook/event-based invalidation if Bluesky provides it

## Prisma Setup

### Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0"
  }
}
```

### Prisma Schema File

Location: `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Recap {
  id        String   @id @default(cuid())
  handle    String
  year      Int
  data      Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime

  @@unique([handle, year])
  @@index([handle])
  @@index([expiresAt])
  @@map("recaps")
}
```

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
  - Local: `postgresql://user:password@localhost:5432/updraft`
  - Docker: `postgresql://user:password@postgres:5432/updraft`

## Docker Compose Changes

### Add PostgreSQL Service

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: updraft-postgres
    environment:
      POSTGRES_USER: updraft
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-updraft_dev}
      POSTGRES_DB: updraft
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U updraft"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    # ... existing config ...
    environment:
      # ... existing env vars ...
      - DATABASE_URL=postgresql://updraft:${POSTGRES_PASSWORD:-updraft_dev}@postgres:5432/updraft
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### Development Docker Compose

Similar changes to `docker-compose.dev.yml`:
- Add postgres service
- Update backend `DATABASE_URL`
- Add `depends_on` for postgres

## API Changes

### Updated `/api/recap` Endpoint

**Current**: Always generates new recap

**New**: Check cache first, generate if needed

```typescript
blueskyRouter.post('/recap', async (req, res) => {
  try {
    let { handle } = req.body;
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    handle = handle.trim().replace(/^@/, "").toLowerCase();
    const year = new Date().getFullYear();

    // Check cache first
    const cached = await prisma.recap.findUnique({
      where: { handle_year: { handle, year } },
    });

    if (cached && cached.expiresAt > new Date()) {
      // Return cached recap
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.json(cached.data);
    }

    // Generate new recap
    const recap = await generateRecap(handle);

    // Save to cache
    await prisma.recap.upsert({
      where: { handle_year: { handle, year } },
      update: {
        data: recap,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      create: {
        handle,
        year,
        data: recap,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recap);
  } catch (error) {
    // ... error handling
  }
});
```

### New `/api/recap/regenerate` Endpoint

Force regeneration regardless of cache status.

```typescript
blueskyRouter.post('/recap/regenerate', async (req, res) => {
  try {
    let { handle } = req.body;
    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    handle = handle.trim().replace(/^@/, "").toLowerCase();
    const year = new Date().getFullYear();

    // Always generate fresh recap
    const recap = await generateRecap(handle);

    // Update cache (or create if doesn't exist)
    await prisma.recap.upsert({
      where: { handle_year: { handle, year } },
      update: {
        data: recap,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      create: {
        handle,
        year,
        data: recap,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.json(recap);
  } catch (error) {
    // ... error handling
  }
});
```

## Backend Code Structure

### New Files

1. **`backend/prisma/schema.prisma`**
   - Prisma schema definition

2. **`backend/src/lib/prisma.ts`**
   - Prisma client singleton
   ```typescript
   import { PrismaClient } from '@prisma/client';
   
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
   
   export const prisma = globalForPrisma.prisma || new PrismaClient();
   
   if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = prisma;
   }
   ```

3. **`backend/src/services/cache.ts`**
   - Cache service wrapper (optional abstraction)
   - Functions: `getCachedRecap`, `saveRecap`, `regenerateRecap`

### Updated Files

1. **`backend/src/routes/bluesky.ts`**
   - Update `/recap` endpoint to check cache
   - Add `/recap/regenerate` endpoint

2. **`backend/src/index.ts`**
   - Initialize Prisma connection
   - Handle graceful shutdown

3. **`backend/package.json`**
   - Add Prisma dependencies
   - Add scripts: `prisma:generate`, `prisma:migrate`, `prisma:studio`

## Frontend Changes

### Regenerate Button

Add a "Regenerate" button on the Recap page that:
- Calls `/api/recap/regenerate` endpoint
- Shows loading state during regeneration
- Updates the displayed recap when complete

**Location**: `frontend/src/pages/Recap.tsx`

**UI Placement**: 
- Option 1: Next to "Share your Updraft" button
- Option 2: In a small menu/dropdown
- Option 3: Below the recap cards (subtle, small text)

**Implementation**:
```typescript
const handleRegenerate = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`${apiUrl}/api/recap/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: recap.profile.handle }),
    });
    const newRecap = await response.json();
    setRecap(newRecap);
    toast.success("Recap regenerated!");
  } catch (error) {
    toast.error("Failed to regenerate recap");
  } finally {
    setIsLoading(false);
  }
};
```

## Migration Strategy

### Initial Migration

1. **Create Prisma schema**
2. **Run initial migration**: `npx prisma migrate dev --name init`
3. **Generate Prisma client**: `npx prisma generate`
4. **Update backend code** to use Prisma
5. **Test locally** with Docker Compose
6. **Deploy to Railway** (add PostgreSQL service)

### Railway Deployment

1. **Add PostgreSQL service** in Railway
2. **Set `DATABASE_URL`** environment variable in backend service
3. **Run migrations** on deploy (or manually via Railway CLI)
4. **Verify** database connection

### Data Migration

- **No existing data** to migrate (fresh start)
- **Existing recaps** will be generated on first request

## Environment Variables

### Backend `.env.local` (Development)

```env
DATABASE_URL=postgresql://updraft:updraft_dev@localhost:5432/updraft
BLUESKY_IDENTIFIER=your.handle.bsky.social
BLUESKY_APP_PASSWORD=your-app-password
```

### Railway Environment Variables

- `DATABASE_URL`: Auto-set by Railway PostgreSQL service
- Or manually: `postgresql://user:password@host:port/dbname`

## Database Maintenance

### Optional: Cleanup Job

Future enhancement to delete expired recaps:

```typescript
// Run periodically (e.g., daily cron job)
async function cleanupExpiredRecaps() {
  const deleted = await prisma.recap.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  console.log(`Deleted ${deleted.count} expired recaps`);
}
```

### Prisma Studio

Access database GUI:
```bash
npx prisma studio
```

## Testing Plan

### Unit Tests

- Cache lookup logic
- Cache expiration logic
- Regenerate endpoint

### Integration Tests

- Full recap generation with caching
- Cache hit vs cache miss scenarios
- Regenerate functionality

### Manual Testing

1. Generate recap → verify saved to DB
2. Request same recap → verify returned from cache
3. Wait for expiration → verify regenerates
4. Click regenerate → verify forces regeneration
5. Test with Docker Compose locally
6. Test on Railway with production DB

## Performance Considerations

### Benefits

- **Faster responses**: Cached recaps return instantly
- **Reduced API calls**: Less load on Bluesky API
- **Cost savings**: Fewer API requests = lower rate limit risk

### Trade-offs

- **Storage**: JSON data can be large (~50-200KB per recap)
- **Staleness**: Data may be up to 7 days old (mitigated by regenerate option)
- **Database load**: Additional database queries (minimal impact)

### Optimization

- Consider compressing JSON data if storage becomes an issue
- Add database connection pooling (Prisma handles this)
- Monitor query performance and add indexes if needed

## Rollout Plan

### Phase 1: Setup (This Implementation)

1. ✅ Add PostgreSQL to Docker Compose
2. ✅ Set up Prisma schema and migrations
3. ✅ Update backend to use caching
4. ✅ Add regenerate endpoint
5. ✅ Add regenerate button to frontend
6. ✅ Test locally

### Phase 2: Deployment

1. Deploy PostgreSQL to Railway
2. Run migrations
3. Deploy updated backend
4. Monitor for issues

### Phase 3: Future Enhancements

- Add cache statistics/metrics
- Add admin endpoint to view cache status
- Add cache warming for popular handles
- Add cache compression
- Add cleanup job for expired recaps

## Questions/Decisions Needed

1. **Cache TTL**: 7 days default - should this be configurable?
2. **Regenerate UI**: Where should the button be placed?
3. **Error handling**: What if database is unavailable? Fallback to no-cache?
4. **Storage limits**: Should we limit number of cached recaps per handle?
5. **Multi-year support**: Currently only caches current year - should we support historical years?

## Implementation Checklist

- [ ] Add PostgreSQL to docker-compose.yml
- [ ] Add PostgreSQL to docker-compose.dev.yml
- [ ] Install Prisma dependencies
- [ ] Create Prisma schema
- [ ] Run initial migration
- [ ] Create Prisma client singleton
- [ ] Update `/api/recap` endpoint to check cache
- [ ] Add `/api/recap/regenerate` endpoint
- [ ] Add regenerate button to frontend
- [ ] Update backend environment variables
- [ ] Test locally with Docker Compose
- [ ] Update Railway deployment docs
- [ ] Deploy to Railway

