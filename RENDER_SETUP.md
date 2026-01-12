# Quick Render Setup Guide

## 🚀 Quick Deploy Steps

### 1. Create Web Service on Render
- Go to https://render.com/dashboard
- Click "New +" → "Web Service"
- Connect your repository
- **Root Directory**: `next.js-work`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 2. Set Environment Variables

Copy these into Render's Environment Variables section:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-parking

# NextAuth (CRITICAL - Update these!)
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Python Backend (Server-side)
PYTHON_BACKEND_URL=https://your-python-backend.onrender.com
PYTHON_BACKEND_WS_URL=wss://your-python-backend.onrender.com

# Python Backend (Client-side - exposed to browser)
PYTHON_BACKEND_URL=https://your-python-backend.onrender.com
PYTHON_BACKEND_WS_URL=wss://your-python-backend.onrender.com
```

### 3. Update Google OAuth

**IMPORTANT**: Add this to Google Cloud Console → OAuth Redirect URIs:
```
https://your-app-name.onrender.com/api/auth/callback/google
```

### 4. Generate NEXTAUTH_SECRET

Run this command locally:
```bash
openssl rand -base64 32
```

Copy the output and use it as your `NEXTAUTH_SECRET`.

## ⚠️ Common Mistakes to Avoid

1. ❌ Using `http://` instead of `https://` for NEXTAUTH_URL
2. ❌ Using `ws://` instead of `wss://` for WebSocket URLs
3. ❌ Forgetting to update Google OAuth redirect URIs
4. ❌ Not setting NEXT_PUBLIC_ variables for client-side access
5. ❌ Using weak NEXTAUTH_SECRET

## ✅ Checklist Before Deploy

- [ ] MongoDB Atlas cluster created and connection string ready
- [ ] Google OAuth redirect URI updated with Render URL
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] Python backend deployed (if applicable)
- [ ] All environment variables set in Render
- [ ] .env.local NOT committed to Git

## 🔍 Testing After Deploy

1. Visit your Render URL
2. Test Google login
3. Check database connectivity
4. Verify WebSocket connections work
5. Test all main features

## 📝 Notes

- Render auto-deploys on Git push
- Free tier apps sleep after inactivity (takes ~30s to wake)
- Check logs in Render dashboard for errors
- Use `wss://` (secure WebSocket) in production

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
