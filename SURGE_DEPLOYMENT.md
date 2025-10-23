# Surge.sh Deployment Guide

This guide explains how to deploy your ThreeJS Academic Network Visualization to Surge.sh, a free static hosting service with no file size limits.

## Why Surge.sh?

- ✅ **Completely FREE** with no file size limits
- ✅ **No file size restrictions** (perfect for your 103MB project)
- ✅ **Simple deployment** with one command
- ✅ **Custom domains** supported
- ✅ **Global CDN** for fast loading
- ✅ **HTTPS** enabled by default

## Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** (v6 or higher)
3. **Surge.sh account** (free signup during deployment)

## Quick Deployment

### Method 1: Using npm scripts (Recommended)

```bash
# Build and deploy in one command
npm run deploy

# Or use the specific Surge command
npm run deploy:surge
```

### Method 2: Manual deployment

```bash
# Build the project
npm run build

# Navigate to dist folder and deploy
cd dist
npx surge
```

## First-time Setup

When you run `npx surge` for the first time:

1. **Enter your email**: `westphal.lukas@gmail.com`
2. **Enter a password**: Choose a secure password
3. **Choose a domain**: Surge will suggest a random domain, or you can enter a custom one
4. **Confirm deployment**: Type `y` to deploy

## Custom Domain (Optional)

To use a custom domain:

1. **Deploy with custom domain**:
   ```bash
   cd dist
   npx surge --domain your-custom-domain.surge.sh
   ```

2. **Add CNAME record** in your DNS settings:
   - Type: `CNAME`
   - Name: `your-subdomain` (or `@` for root domain)
   - Value: `na-west1.surge.sh`

## Updating Your Deployment

To update your deployed app:

```bash
# Method 1: Using npm script
npm run deploy

# Method 2: Manual update
npm run build
cd dist
npx surge
```

## Project Structure After Deployment

```
dist/
├── index.html           # Main HTML file
├── assets/              # Built JS/CSS files
├── data/                # Data files (JSON, images)
├── textures/            # Node and edge textures
└── video/               # Demo videos
```

## Performance Features

- **Global CDN**: Your app is served from multiple locations worldwide
- **Automatic compression**: Files are automatically compressed
- **Caching**: Static assets are cached for optimal performance
- **HTTPS**: Secure connection enabled by default

## Troubleshooting

### Common Issues:

1. **Build errors**:
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Deployment errors**:
   ```bash
   # Check if you're in the dist directory
   cd dist
   npx surge
   ```

3. **Domain already taken**:
   - Choose a different domain name
   - Or use the suggested random domain

### Debugging:

1. **Test locally**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Check build output**:
   - Verify `dist` folder contains all necessary files
   - Check that all data files are present

## File Size Information

Your project includes:
- **Total size**: ~103MB
- **Largest file**: 38MB (compressed edges data)
- **Nodes data**: 12MB
- **Video files**: 47MB
- **Application code**: 6MB

Surge.sh handles all these files without any restrictions!

## Security

- **HTTPS**: Enabled by default
- **No server-side processing**: Static files only
- **No database**: All data is client-side

## Monitoring

- **Surge.sh dashboard**: Check your deployment status
- **Analytics**: Basic traffic information available
- **Uptime**: Surge.sh provides excellent uptime

## Backup Options

If you need alternative hosting:

1. **Firebase Hosting**: 1GB free storage
2. **GitHub Pages**: Free but 100MB repository limit
3. **Vercel**: Free but 100MB deployment limit
4. **Self-hosted VPS**: Full control, paid options

Your ThreeJS Academic Network Visualization is now successfully deployed on Surge.sh! 🚀
