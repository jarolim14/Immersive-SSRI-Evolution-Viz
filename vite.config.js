import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';

  return {
  root: "src/",
  publicDir: "../static/",
  base: "./",
  server: {
    host: true, // Open to local network and display URL
    open: !("SANDBOX_URL" in process.env || "CODESANDBOX_HOST" in process.env), // Open if it's not a CodeSandbox
  },
  build: {
    outDir: "../dist", // Output in the dist/ folder
    emptyOutDir: true, // Empty the folder first
    sourcemap: true, // Add sourcemap
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/index.html'),
  },
      }
    },
    resolve: {
      alias: {
        // Use different config files for development and production
        './config.js': isProduction
          ? resolve(__dirname, 'src/config.production.js')
          : resolve(__dirname, 'src/config.js')
      }
    }
  };
});
