// Production configuration file
// Import the development config
import { CONFIG as DEV_CONFIG } from './config.js';

// Create a deep copy of the development config
export const CONFIG = JSON.parse(JSON.stringify(DEV_CONFIG));

// Override development settings for production
CONFIG.development = {
  enabled: false,  // Disable all development features
  videoRecording: {
    enabled: false,
    showButton: false,
    defaultDuration: 30000,  // Match the duration in development config
    defaultFps: 30
  }
};

// Override any other production-specific settings
CONFIG.rendererAntialias = true;  // Enable antialiasing for production for better quality