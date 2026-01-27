# Production Login Troubleshooting Guide

## Issue: Cannot Login to Dashboard in Production

### Production URL
- **Main URL**: https://scholar-tracking-drakaniias-projects.vercel.app
- **Git Branch URL**: https://scholar-tracking-git-main-drakaniias-projects.vercel.app

### Default Credentials
```
Username: admin
Password: admin123
```

## Common Issues and Solutions

### 1. Database Not Seeded

**Problem**: The production database doesn't have any users.

**Solution**: Run the seed script in production

```bash
# Option A: Via Vercel CLI
vercel env pull .env.production
npx prisma db seed

# Option B: Create a seed API endpoint (recommended)
# Add this to src/app/api/seed/route.ts
```

**Check if users exist**:
- Go to your Vercel Postgres dashboard
- Run query: `SELECT * FROM "User";`
- If empty, you need to seed

### 2. Environment Variables Missing

**Required Environment Variables in Vercel**:
- `DATABASE_URL` - Your Postgres connection string
- `JWT_SECRET` - A secure random string (at least 32 characters)
- `NODE_ENV=production`

**To check/set**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure all required variables are set
3. Redeploy after adding variables

### 3. Cookie Issues

**Problem**: Cookies not being set due to domain/HTTPS issues

**Symptoms**:
- Login appears successful but redirects back to login
- No `auth-token` cookie in browser DevTools

**Solution**: Check cookie settings in `src/lib/auth.ts`

Current settings:
```typescript
cookieStore.set('auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Must be true in production
  sameSite: 'lax',
  maxAge: 8 * 60 * 60, // 8 hours
  path: '/',
});
```

### 4. CORS/Fetch Issues

**Problem**: API requests failing due to CORS

**Check**:
- Open browser DevTools → Console
- Look for CORS errors
- Check Network tab for failed requests

### 5. Database Connection Issues

**Problem**: Can't connect to database in production

**Check Vercel Logs**:
```bash
vercel logs --follow
```

**Common errors**:
- `P1001: Can't reach database server`
- `P1017: Server has closed the connection`

**Solution**:
- Verify DATABASE_URL is correct
- Check if database is accessible from Vercel's region
- Ensure connection pooling is configured

## Testing Steps

### Step 1: Check if Site is Accessible
1. Open https://scholar-tracking-drakaniias-projects.vercel.app
2. Should see login page with logo
3. Check browser console for errors

### Step 2: Test Login API Directly
Open browser console and run:
```javascript
fetch('https://scholar-tracking-drakaniias-projects.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@scholarship.edu",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "ADMIN"
  }
}
```

### Step 3: Check Cookies
1. Open DevTools → Application/Storage → Cookies
2. Look for `auth-token` cookie
3. Should have:
   - HttpOnly: ✓
   - Secure: ✓ (in production)
   - SameSite: Lax
   - Path: /

### Step 4: Check Vercel Logs
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# View logs
vercel logs --follow
```

Look for:
- Login attempts
- Database connection errors
- JWT errors
- Cookie setting errors

## Quick Fixes

### Fix 1: Seed Database via API

Create `src/app/api/admin/seed/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { seedUsers } from '@/lib/seed-users';

export async function POST(request: Request) {
  try {
    // Add authentication check here
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await seedUsers();
    return NextResponse.json({ success: true, message: 'Database seeded' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
```

Then call it:
```bash
curl -X POST https://scholar-tracking-drakaniias-projects.vercel.app/api/admin/seed \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### Fix 2: Reset User Password

If you can access the database directly:
```sql
-- Generate a new password hash for 'admin123'
-- Use bcrypt with 12 rounds
UPDATE "User" 
SET "passwordHash" = '$2a$12$...' -- Replace with actual hash
WHERE username = 'admin';
```

### Fix 3: Check Database Connection

Create `src/app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    }, { status: 500 });
  }
}
```

Visit: https://scholar-tracking-drakaniias-projects.vercel.app/api/health

## Debug Mode

To enable detailed logging, add to login page temporarily:

```typescript
// In src/app/login/page.tsx
console.log('Login attempt:', { username: data.username });
console.log('API URL:', '/api/auth/login');
console.log('Response status:', response.status);
console.log('Response body:', result);
console.log('Cookies:', document.cookie);
```

## Contact Support

If none of these solutions work:

1. **Check Vercel Status**: https://www.vercel-status.com/
2. **Vercel Support**: https://vercel.com/support
3. **Database Provider Support**: Check your Postgres provider's status

## Recent Changes

### Latest Fixes Applied:
- ✅ Fixed TypeScript error in export route
- ✅ Changed to `window.location.href` for redirect
- ✅ Added `credentials: 'include'` to fetch
- ✅ Removed `unoptimized` from Image component
- ✅ Added cache control headers to login response
- ✅ Changed Image to regular img tag for logo

### Next Steps:
1. Wait for latest deployment to finish (currently BUILDING)
2. Test login with admin/admin123
3. Check browser console for errors
4. Verify cookies are being set
5. Check Vercel logs for server-side errors
