# Network Visualization Video Recording Guide

This feature allows you to create demonstration videos of the 3D academic network visualization with programmed user interactions and synchronized audio narration. The videos showcase various features of the visualization, providing a great way to explain the interface and functionality to others.

## Features

- High-quality video recording with UI elements
- Synchronized audio narration
- Automatic demo sequence with camera animations
- Multiple recording methods (screen capture or canvas-only)
- Fallback frame capture for unsupported browsers
- MP4/WebM format support
- Configurable recording settings

## Recording a Video

1. **Launch the Visualization**
   Run the application using `npm run dev` and wait for it to fully load.

2. **Start Recording**
   - Click the "Record Demo Video" button in the bottom right corner
   - Or use the keyboard shortcut (if configured)

3. **Recording Process**
   The system will automatically:
   - Check browser compatibility
   - Load audio narration files (if enabled)
   - Show recording status indicators
   - Execute the demo sequence:
     - Network overview
     - Topic hierarchy exploration
     - Legend panel interaction
     - Node selection and details
     - Time travel visualization
     - Search functionality
     - Final overview

4. **Download the Video**
   When recording completes, a download button will appear. The video will be in MP4 format if supported by your browser, otherwise WebM.

## Recording Methods

The system uses multiple recording methods, automatically selecting the best available:

1. **Screen Capture (Primary)**
   - Captures the entire browser window including UI elements
   - Requires HTTPS or localhost
   - Supports system audio capture in Chrome
   - Best quality and performance

2. **Canvas Capture (Fallback)**
   - Records only the visualization canvas
   - Works in all browsers
   - No UI elements in recording
   - Good for basic demonstrations

3. **Frame Capture (Last Resort)**
   - Captures individual frames as images
   - Used when video recording is not supported
   - Requires post-processing to create video

## Configuration

The recording system can be configured in `config.js`:

```javascript
export const CONFIG = {
  development: {
    videoRecording: {
      enabled: true,
      showAllUI: true,
      showButton: true,
      showOverlayText: true,
      defaultDuration: 60000,  // 60 seconds
      defaultFps: 30,
      narration: {
        enabled: true,
        sequences: {
          // Map sequence IDs to audio files
        }
      }
    }
  }
};
```

## Converting Frames to Video

If you receive a zip file of frames, use the included conversion script:

1. **Extract the Zip File**
   Extract the downloaded frames to a folder.

2. **Install Dependencies**
   - Node.js
   - FFmpeg (required for conversion)
     - Windows: Download from FFmpeg website
     - macOS: `brew install ffmpeg`
     - Linux: `apt install ffmpeg`

3. **Run the Conversion Script**
   ```bash
   node convert-frames.js -i ./frames -o ./visualization.mp4
   ```

   Options:
   ```
   --input-dir, -i     Directory containing frame images
   --output-file, -o   Output video file path
   --framerate, -r     Frames per second (default: 30)
   --quality, -q       Quality level (0-51, lower is better)
   ```

## Troubleshooting

### Common Issues

1. **Recording Not Starting**
   - Check browser console for errors
   - Ensure you're using HTTPS or localhost
   - Verify browser permissions for screen capture

2. **Missing UI Elements**
   - Screen capture may not be available
   - Try using Chrome or Edge
   - Check if you're on HTTPS/localhost

3. **Audio Issues**
   - Check if narration is enabled in config
   - Verify audio files exist
   - Use Chrome for best audio capture support

4. **Performance Problems**
   - Close other applications
   - Reduce browser tabs
   - Lower the frame rate in config

### Browser Support

- **Chrome/Edge**: Full support, best experience
- **Firefox**: Good support, some limitations
- **Safari**: Basic support, may use fallback methods

## Technical Details

The video recording implementation uses:
- MediaRecorder API for direct video capture
- Canvas.captureStream() for high-quality frame capture
- Programmatic UI interactions via custom events
- Camera animations for cinematic transitions
- FFmpeg for frame-to-video conversion
- Azure Text-to-Speech for narration (optional)