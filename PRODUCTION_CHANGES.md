# Production Changes Summary

## Files Modified for Production Deployment

### Environment Configuration

**Created:**
- `.env.example` - Template for production environment variables
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `RENDER_SETUP.md` - Quick setup reference
- `PRODUCTION_CHANGES.md` - This file

### Code Changes (Localhost → Environment Variables)

All hardcoded `localhost` references have been replaced with environment variables:

#### 1. **src/app/api/settings/route.ts**
- Changed: `httpUrl: process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'`
- To: `httpUrl: process.env.PYTHON_BACKEND_URL || process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'`

#### 2. **src/app/camera/page.tsx**
- Changed: `useState('ws://localhost:8000')`
- To: `useState(process.env.PYTHON_BACKEND_WS_URL || 'ws://localhost:8000')`

#### 3. **src/app/test-backend/page.tsx**
- Changed: `useState('http://localhost:8000')` and `useState('ws://localhost:8000')`
- To: Uses `process.env.PYTHON_BACKEND_URL` and `PYTHON_BACKEND_WS_URL`

#### 4. **src/app/(authenticated)/parking-lots/[id]/live/page.tsx**
- Changed: `useState('ws://localhost:8000')`
- To: `useState(process.env.PYTHON_BACKEND_WS_URL || 'ws://localhost:8000')`

#### 5. **src/components/SettingsForm.tsx**
- Changed: Hardcoded `'http://localhost:8000'` and `'ws://localhost:8000'`
- To: Uses environment variables with fallbacks

#### 6. **src/components/ParkingLotForm.tsx**
- Changed: `fetch('http://localhost:8000/api/detect-parking-slots')`
- To: `fetch(\`\${backendUrl}/api/detect-parking-slots\`)` using env variable

#### 7. **src/lib/python-backend-client.ts**
- Changed: `process.env.PYTHON_BACKEND_URL || 'ws://localhost:8000'`
- To: `process.env.PYTHON_BACKEND_WS_URL || process.env.PYTHON_BACKEND_WS_URL || 'ws://localhost:8000'`

#### 8. **src/models/Settings.ts**
- Changed: Hardcoded defaults `'http://localhost:8000'` and `'ws://localhost:8000'`
- To: Uses environment variables with fallbacks

## Environment Variables Required

### Server-side (Not exposed to browser)
```
MONGODB_URI
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
PYTHON_BACKEND_URL
PYTHON_BACKEND_WS_URL
```

### Client-side (Exposed to browser - NEXT_PUBLIC_*)
```
PYTHON_BACKEND_URL
PYTHON_BACKEND_WS_URL
```

## Key Changes for Production

1. **Protocol Changes:**
   - `http://` → `https://` for all HTTP connections
   - `ws://` → `wss://` for all WebSocket connections

2. **NextAuth Configuration:**
   - `NEXTAUTH_URL` must match your Render domain
   - `NEXTAUTH_SECRET` must be a strong, unique secret
   - Google OAuth redirect URIs must include production URL

3. **Database:**
   - MongoDB connection string must point to cloud database (MongoDB Atlas)
   - No longer using `mongodb://127.0.0.1:27017`

4. **Python Backend:**
   - Must be deployed separately on Render
   - URLs must use HTTPS/WSS protocols

## Testing Locally with Production-like Setup

To test with production-like environment variables locally:

1. Copy `.env.example` to `.env.local`
2. Update values with your local or staging URLs
3. Keep using `http://localhost` for local development
4. Test with production URLs before deploying

## Backward Compatibility

All changes maintain backward compatibility:
- Localhost fallbacks are preserved
- Development workflow unchanged
- Environment variables are optional for local development

## Next Steps

1. Follow `RENDER_SETUP.md` for quick deployment
2. See `DEPLOYMENT.md` for detailed instructions
3. Update `.env.local` with your production values (don't commit!)
4. Deploy to Render
5. Test all features in production
