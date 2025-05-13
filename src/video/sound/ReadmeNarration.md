# Audio Narration System for Video Recording

This directory contains files for adding narration to the network visualization video recordings.

## Overview

The audio narration system allows pre-generated voice-over narration to be synchronized with the video recording sequence. It uses Microsoft Azure's Text-to-Speech service to provide high-quality narration during video playback. The system is designed to work seamlessly with the video recording sequencer, allowing precise timing of narration with visual elements.

## Files

- `audioNarration.js`: Main class that manages loading and playing audio narration files
- `narrationConfig.js`: Contains the text content and configuration for narration segments
- `generate-narration.js`: Node.js script to generate MP3 files from the narration texts using Azure TTS
- `audio/`: Directory containing the generated audio files (local copy)

## Configuration

### 1. Setup Configuration

Add the narration configuration to your main `config.js` file:

```javascript
// In config.js
export const CONFIG = {
  development: {
    videoRecording: {
      narration: {
        enabled: true,
        sequences: {
          intro_orbit_audio: "intro_orbit_script.mp3",
          instructions_scroll_audio: "instructions_scroll_script.mp3",
          view_topic_hierarchy_audio: "view_topic_hierarchy_script.mp3",
          // etc. - map sequence IDs to audio filenames
        }
      }
    }
  }
};
```

### 2. Narration Configuration

In `narrationConfig.js`, define your narration texts and audio configuration:

```javascript
const NARRATION_CONFIG = {
  texts: {
    intro_orbit_script: "Welcome to a visual journey...",
    instructions_scroll_script: "To better understand...",
    // Add more narration texts
  }
};

const AUDIO_CONFIG = {
  enabled: true,
  basePath: "video/sound/audio_files/",
  outputPaths: {
    public: "public/assets/audio",
    local: "./audio_files"
  },
  sequences: {
    intro_orbit_audio: "intro_orbit_script.mp3",
    // Map narration IDs to audio files
  }
};
```

## Generating Audio Files

1. Install required dependencies:
   ```bash
   cd src/video/sound
   npm install
   ```

2. Create a `.env` file with your Azure credentials:
   ```
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=your_region_here
   AZURE_VOICE_NAME=en-US-JennyNeural  # Optional, defaults to Jenny
   ```

3. Run the generation script:
   ```bash
   node generate-narration.js
   ```

4. The generated MP3 files will be saved to:
   - `public/assets/audio/` (for production)
   - `src/video/sound/audio/` (local copy for development)

## Using Narration in Video Recording

### 1. Basic Narration

Add narration to a single action:

```javascript
sequencer.addNarrationForAction("actionId", "narrationId");
```

### 2. Long Narration

Add narration that spans multiple actions:

```javascript
sequencer.addLongNarration(
  "narrationId",    // Narration ID
  "startActionId",  // Start action
  "endActionId",    // End action
  { volume: 0.8 }   // Optional parameters
);
```

### 3. Narration Options

- `waitForCompletion`: Wait for narration to finish before proceeding
- `volume`: Adjust narration volume (0.0 to 1.0)
- `type`: "single" or "long" narration type

## Audio File Locations

The system saves and looks for audio files in two locations:

1. **Public location**: `public/assets/audio/` - Web-accessible location for static assets
2. **Local location**: `src/video/sound/audio/` - Local copy within the module directory

The system will automatically try multiple paths to find the audio files, ensuring maximum compatibility across different project setups.

## Troubleshooting

### Common Issues

1. **Missing Audio Files**
   - Check if files exist in both public and local directories
   - Verify file names match the configuration
   - Run the generation script to create missing files

2. **Audio Not Playing**
   - Check browser console for loading errors
   - Verify narration is enabled in config
   - Ensure audio files are in the correct format (MP3)

3. **Azure TTS Issues**
   - Verify Azure credentials in `.env` file
   - Check Azure service status
   - Ensure text content is within Azure's limits

### Debugging

Enable debug logging in the browser console:
```javascript
CONFIG.development.videoRecording.debug = true;
```

## Customizing Voices

You can customize the voice by setting the `AZURE_VOICE_NAME` environment variable. Available voices include:

- "en-US-JennyNeural" (Female)
- "en-US-GuyNeural" (Male)
- "en-GB-SoniaNeural" (British Female)

Here, we are using **en-US-OnyxTurboMultilingualNeural**

See Azure documentation for the complete list of available voices.