# Cloudflare Pages Deployment Guide

This guide will help you deploy your ThreeJS Academic Network Visualization to Cloudflare Pages.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) if you don't have one
2. **Node.js**: Ensure you have Node.js v14+ installed
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Methods

### Method 1: Direct Upload (Recommended for first deployment)

1. **Build your project**:
   ```bash
   npm run build
   ```

2. **Go to Cloudflare Pages**:
   - Log in to your Cloudflare dashboard
   - Navigate to "Pages" in the sidebar
   - Click "Create a project"
   - Select "Upload assets"

3. **Upload your dist folder**:
   - Drag and drop your `dist` folder contents
   - Or zip the `dist` folder and upload the zip file

4. **Configure your project**:
   - Project name: `immersive-ssri-evolution-viz` (or your preferred name)
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`

### Method 2: Git Integration (Recommended for ongoing development)

1. **Connect your Git repository**:
   - In Cloudflare Pages, click "Create a project"
   - Select "Connect to Git"
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Select your repository

2. **Configure build settings**:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (leave empty)

3. **Environment variables** (if needed):
   - Add any environment variables in the Pages settings
   - For this project, no additional environment variables are required

### Method 3: Wrangler CLI (Advanced)

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Deploy**:
   ```bash
   npm run deploy:cf
   ```

## Configuration Files

The following files have been created/configured for Cloudflare Pages:

### `_headers` (in dist folder)
- Configures caching headers for optimal performance
- Sets security headers
- Handles gzipped JSON files properly

### `_redirects` (in dist folder)
- Handles client-side routing
- Redirects 404s to index.html for SPA behavior

### `wrangler.toml`
- Cloudflare Pages configuration
- Build settings and environment configuration

### Updated `vite.config.js`
- Optimized for production builds
- Disables sourcemaps in production
- Enables code splitting for better caching
- Removes console.log statements in production

## Post-Deployment Steps

1. **Test your deployment**:
   - Visit your Cloudflare Pages URL
   - Test all functionality (search, year slider, cluster selection)
   - Verify that all assets load correctly

2. **Custom Domain** (optional):
   - In Cloudflare Pages settings, go to "Custom domains"
   - Add your custom domain
   - Follow the DNS configuration instructions

3. **Performance Optimization**:
   - Enable Cloudflare's CDN features
   - Configure caching rules if needed
   - Monitor performance in Cloudflare Analytics

## Troubleshooting

### Common Issues:

1. **Assets not loading**:
   - Check that all files in `dist` folder are uploaded
   - Verify file paths in your code use relative paths
   - Check browser console for 404 errors

2. **Build failures**:
   - Ensure all dependencies are in `package.json`
   - Check that Node.js version is compatible
   - Review build logs in Cloudflare Pages

3. **Performance issues**:
   - Large data files may take time to load
   - Consider implementing progressive loading
   - Check network tab for slow-loading resources

### Debugging:

1. **Local testing**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Check build output**:
   - Verify `dist` folder contains all necessary files
   - Check that `_headers` and `_redirects` are in the root of `dist`

## File Structure After Deployment

```
dist/
├── _headers          # Cloudflare Pages headers
├── _redirects        # Cloudflare Pages redirects
├── index.html        # Main HTML file
├── assets/           # Built JS/CSS files
├── data/             # Data files (JSON, images)
├── textures/         # Node and edge textures
└── video/            # Demo videos
```

## Performance Considerations

- **Large Data Files**: Your project includes large JSON files (~35k nodes, 100k edges)
- **CDN Benefits**: Cloudflare's global CDN will help with loading times
- **Caching**: Static assets are cached for 1 year for optimal performance
- **Compression**: Gzipped files are properly handled

## Security

- Security headers are configured in `_headers`
- Source maps are disabled in production
- Console logs are removed in production builds

## Monitoring

- Use Cloudflare Analytics to monitor traffic
- Check Cloudflare Pages logs for any issues
- Monitor Core Web Vitals for performance

## Updates

To update your deployment:

1. **Git Integration**: Push changes to your main branch
2. **Direct Upload**: Rebuild and upload new `dist` folder
3. **Wrangler CLI**: Run `npm run deploy:cf`

Your ThreeJS Academic Network Visualization should now be successfully deployed on Cloudflare Pages!
