# Database Implementation - Testing Guide

## What Was Implemented

✅ PostgreSQL database added to Docker Compose (dev and prod)
✅ Prisma ORM setup with schema and migrations
✅ Database caching for recaps (7-day TTL)
✅ Cache lookup before generating new recaps
✅ Regenerate endpoint (`POST /api/recap/regenerate`)
✅ Regenerate button in frontend UI
✅ Graceful fallback if database is unavailable

## Testing Locally

### 1. Start Services

```bash
# Start PostgreSQL first
docker-compose -f docker-compose.dev.yml up -d postgres

# Wait for PostgreSQL to be ready (about 5-10 seconds)
# Then run migrations
cd backend
DATABASE_URL="postgresql://updraft:updraft_dev@localhost:5432/updraft" npx prisma migrate dev

# Start all services
cd ..
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Test Cache Functionality

1. **Generate a recap** (first time):
   - Go to http://localhost:8080/recap
   - Enter a Bluesky handle
   - Wait for recap to generate
   - Check backend logs: Should see "Generating new recap" and "Cached recap"

2. **Request same recap** (cache hit):
   - Refresh the page or request the same handle again
   - Check backend logs: Should see "Cache hit for [handle]"
   - Response should be instant (no Bluesky API calls)

3. **Test regenerate**:
   - Click the "Regenerate" button on the recap page
   - Check backend logs: Should see "Force regenerating recap"
   - Recap should update with fresh data

### 3. Verify Database

```bash
# Connect to PostgreSQL
docker exec -it updraft-postgres-dev psql -U updraft -d updraft

# Check recaps table
SELECT handle, year, "createdAt", "expiresAt" FROM recaps;

# Exit
\q
```

### 4. Test Cache Expiration

The cache expires after 7 days. To test expiration manually:

```sql
-- Connect to database and manually expire a recap
UPDATE recaps SET "expiresAt" = NOW() - INTERVAL '1 day' WHERE handle = 'test.handle';
```

Then request the recap again - it should regenerate.

## Expected Behavior

### Cache Hit (Valid Cache)
- ✅ Instant response
- ✅ No Bluesky API calls
- ✅ Log shows "Cache hit"

### Cache Miss (No Cache or Expired)
- ✅ Generates new recap
- ✅ Saves to database
- ✅ Log shows "Generating new recap" and "Cached recap"

### Regenerate
- ✅ Always generates fresh recap
- ✅ Updates cache with new expiration
- ✅ Log shows "Force regenerating recap"

### Database Unavailable
- ✅ Gracefully falls back to no-cache mode
- ✅ Still generates recaps successfully
- ✅ Logs warnings but doesn't crash

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. **Check PostgreSQL is running**:
   ```bash
   docker-compose -f docker-compose.dev.yml ps postgres
   ```

2. **Check DATABASE_URL**:
   - Should be: `postgresql://updraft:updraft_dev@postgres:5432/updraft` (in Docker)
   - Or: `postgresql://updraft:updraft_dev@localhost:5432/updraft` (local)

3. **Run migrations**:
   ```bash
   cd backend
   DATABASE_URL="postgresql://updraft:updraft_dev@localhost:5432/updraft" npx prisma migrate dev
   ```

### Prisma Client Not Generated

If you see "PrismaClient is not generated" errors:

```bash
cd backend
npx prisma generate
```

### Migration Issues

To reset database (⚠️ deletes all data):

```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
cd backend
DATABASE_URL="postgresql://updraft:updraft_dev@localhost:5432/updraft" npx prisma migrate dev
```

## Next Steps

After local testing:

1. ✅ Verify caching works correctly
2. ✅ Test regenerate functionality
3. ✅ Verify graceful degradation if DB is down
4. ✅ Deploy to Railway (add PostgreSQL service)
5. ✅ Run migrations on Railway
6. ✅ Monitor performance improvements



