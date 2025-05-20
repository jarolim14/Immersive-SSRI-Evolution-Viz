// Production configuration file
// Import the development config
import { CONFIG as DEV_CONFIG } from "./config.js";

// Create a deep copy of the development config
export const CONFIG = JSON.parse(JSON.stringify(DEV_CONFIG));

// Override development settings for production
CONFIG.development = {
  enabled: false, // Disable all development features
  videoRecording: {
    enabled: false,
    showButton: false,
    defaultDuration: 30000, // Match the duration in development config
    defaultFps: 30,
  },
};

// Configure screenshot functionality for production
CONFIG.screenshot = {
  enabled: true, // Enable screenshots in production
  showButton: true, // Show the screenshot button
  format: "png", // Use PNG format for best quality
  quality: 0.95, // High quality (only affects JPEG)
  filename: "network-screenshot", // Default filename
};

// Override any other production-specific settings
CONFIG.rendererAntialias = true; // Enable antialiasing for production for better quality
