# Audio Narration System for Video Recording

This directory contains files for adding narration to the network visualization video recordings.

## Overview

The audio narration system allows pre-generated voice-over narration to be synchronized with the video recording sequence. It uses pre-generated audio files from Microsoft Azure's Text-to-Speech service (or any other TTS service) to provide high-quality narration during video playback.

## Files

- `audioNarration.js`: Main class that manages loading and playing audio narration files
- `narrationConfig.js`: Contains the text content for each narration segment
- `generate-narration.js`: Node.js script to generate MP3 files from the narration texts using Azure TTS
- `audio/`: Directory containing the generated audio files (local copy)

## How to Use

### 1. Setup Configuration

Add the narration configuration to your main `config.js` file:

```javascript
// In config.js
export const CONFIG = {
  // ... existing config ...
  development: {
    videoRecording: {
      // ... existing video recording settings ...
      narration: {
        enabled: true,
        sequences: {
          intro: "intro",
          safetyCluster: "safety_cluster",
          // etc. - map sequence IDs to audio filenames (without extension)
        }
      }
    }
  }
};
```

### 2. Generate Audio Files

1. Install required dependencies:
   ```
   cd src/video/sound
   npm install
   ```

2. Create a `.env` file in the `src/video/sound` directory with your Azure credentials:
   ```
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=your_region_here
   ```

3. Run the generation script:
   ```
   node generate-narration.js
   ```

4. The generated MP3 files will be saved to:
   - `public/assets/audio/` (for production)
   - `src/video/sound/audio/` (local copy for development)

### 3. Audio File Locations

The system saves and looks for audio files in two locations:

1. **Public location**: `public/assets/audio/` - This is the traditional web-accessible location for static assets
2. **Local location**: `src/video/sound/audio/` - This is a local copy within the module directory

This dual-location approach provides maximum compatibility across different project setups and environments. The system will automatically try multiple paths to find the audio files.

### 4. Use in Video Recording

Audio narration is automatically integrated with the video recorder. The `VideoRecorder` class will:

1. Load audio files when recording starts
2. Play the appropriate narration for each sequence
3. Synchronize audio with the visual sequence

## Adding New Narrations

1. Add the text in `narrationConfig.js`
2. Run the generation script to create the MP3 file
3. Update the `narration.sequences` configuration in `config.js`
4. Add the narration ID as the third parameter when adding an action to the sequencer:

```javascript
// In VideoRecorder.js
sequencer.addAction(async () => {
  // Action code...
}, 1000, 'intro'); // Action, duration, narrationId
```

## Customizing Voices

You can customize the voice by modifying the `speechSynthesisVoiceName` in `generate-narration.js`.

Available voices in Azure include:
- "en-US-JennyNeural" (Female)
- "en-US-GuyNeural" (Male)
- "en-GB-SoniaNeural" (British Female)
- And many more - see Azure documentation for the full list