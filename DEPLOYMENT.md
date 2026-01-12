# Deployment Guide for Render

This guide will help you deploy your Next.js Smart Parking application to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. MongoDB Atlas account (or another cloud MongoDB service)
3. Google OAuth credentials configured for production
4. Python backend deployed (if applicable)

## Step 1: Prepare MongoDB

1. Create a MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with read/write permissions
3. Whitelist all IP addresses (0.0.0.0/0) for Render access
4. Get your connection string (it should look like: `mongodb+srv://username:password@cluster.mongodb.net/smart-parking`)

## Step 2: Configure Google OAuth

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://your-app-name.onrender.com/api/auth/callback/google`
   - Replace `your-app-name` with your actual Render app name
5. Save the changes

## Step 3: Deploy to Render

### Create a New Web Service

1. Log in to Render Dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub/GitLab repository
4. Configure the service:
   - **Name**: Choose a name (e.g., `smart-parking-app`)
   - **Region**: Select closest to your users
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `next.js-work`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Choose based on your needs (Free tier available)

### Configure Environment Variables

In the Render dashboard, add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-parking?retryWrites=true&w=majority

NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

PYTHON_BACKEND_URL=https://your-python-backend.onrender.com
PYTHON_BACKEND_WS_URL=wss://your-python-backend.onrender.com

PYTHON_BACKEND_URL=https://your-python-backend.onrender.com
PYTHON_BACKEND_WS_URL=wss://your-python-backend.onrender.com
```

**Important Notes:**
- Generate a secure `NEXTAUTH_SECRET` using: `openssl rand -base64 32`
- Replace all placeholder values with your actual credentials
- The `NEXT_PUBLIC_*` variables are exposed to the browser
- Use `wss://` (not `ws://`) for WebSocket connections in production

## Step 4: Deploy Python Backend (if needed)

If you have a Python backend:

1. Create another Web Service on Render
2. Configure it with your Python backend repository
3. Note the URL (e.g., `https://your-python-backend.onrender.com`)
4. Update the environment variables in your Next.js app with this URL

## Step 5: Verify Deployment

1. Wait for the build to complete (check logs in Render dashboard)
2. Visit your app URL: `https://your-app-name.onrender.com`
3. Test the following:
   - Google OAuth login
   - Database connectivity
   - Python backend integration (if applicable)
   - WebSocket connections

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your Render URL exactly
- Check Google OAuth redirect URIs are correct
- Ensure `NEXTAUTH_SECRET` is set

### Database Connection Issues
- Verify MongoDB connection string is correct
- Check MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Ensure database user has proper permissions

### WebSocket Connection Issues
- Use `wss://` protocol (not `ws://`) for production
- Verify Python backend is deployed and accessible
- Check CORS settings on Python backend

## Custom Domain (Optional)

To use a custom domain:

1. Go to your Render service settings
2. Click "Custom Domains"
3. Add your domain and follow DNS configuration instructions
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Google OAuth redirect URIs with your custom domain

## Monitoring

- Check application logs in Render dashboard
- Set up health checks in Render settings
- Monitor performance and errors

## Updates

To deploy updates:
1. Push changes to your connected Git branch
2. Render will automatically rebuild and deploy
3. Or manually trigger a deploy from the Render dashboard

## Security Checklist

- ✅ Use strong `NEXTAUTH_SECRET`
- ✅ Keep OAuth credentials secure
- ✅ Use environment variables (never commit secrets)
- ✅ Enable HTTPS (automatic on Render)
- ✅ Use `wss://` for WebSocket connections
- ✅ Restrict MongoDB access appropriately
- ✅ Keep dependencies updated

## Support

For issues:
- Render Documentation: https://render.com/docs
- Next.js Documentation: https://nextjs.org/docs
- NextAuth Documentation: https://next-auth.js.org
