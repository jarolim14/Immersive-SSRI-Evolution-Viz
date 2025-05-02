# Network Visualization Video Recording Guide

This feature allows you to create demonstration videos of the 3D academic network visualization with programmed user interactions. The videos showcase various features of the visualization, providing a great way to explain the interface and functionality to others.

## Recording a Video

1. **Launch the Visualization**
   Run the application using `npm run dev` and wait for it to fully load.

2. **Click the Record Button**
   Find the "Record Demo Video" button in the bottom right corner of the screen.

3. **Check Browser Compatibility**
   A dialog will appear showing your browser's compatibility with different video recording methods:
   - MediaRecorder API support
   - WebM/VP9 codec support
   - WebM/VP8 codec support
   - MP4 codec support

4. **Start Recording**
   Click the "Start Recording" button. The recording will begin immediately.

5. **Wait for the Demo**
   The application will automatically:
   - Show an overview of the network
   - Demonstrate year range filtering
   - Select and display specific clusters
   - Perform paper search
   - Show time travel visualization
   - Return to a full network overview

6. **Download the Video**
   When recording completes (after about 60 seconds), a download button will appear. Click it to save the video file.

## Fallback Method (Frame Capture)

If your browser doesn't fully support video recording (MediaRecorder API or required codecs), the system will automatically fall back to capturing individual frames:

1. Frames will be captured at regular intervals (30 frames per second).
2. These frames will be packaged as a zip file.
3. A download button will appear when capture is complete.
4. After downloading, you can convert the frames to video using the provided conversion script.

## Converting Frames to Video

If you received a zip file of frames instead of a video, follow these steps:

1. **Extract the Zip File**
   Extract the downloaded frames zip to a folder (e.g., `frames`).

2. **Install Dependencies**
   - Make sure you have [Node.js](https://nodejs.org/) installed
   - Install [FFmpeg](https://ffmpeg.org/download.html) and ensure it's available in your PATH
     - Windows: Download from FFmpeg website
     - macOS: `brew install ffmpeg`
     - Linux: `apt install ffmpeg` or equivalent

3. **Run the Conversion Script**
   Use the included `convert-frames.js` script:

   ```
   node convert-frames.js -i ./frames -o ./visualization.mp4
   ```

   Available options:
   ```
   --input-dir, -i     Directory containing frame images (default: "./frames")
   --output-file, -o   Output video file path (default: "./visualization.mp4")
   --framerate, -r     Frames per second (default: 30)
   --quality, -q       Quality level (0-51, lower is better, default: 23)
   --help, -h          Show help
   ```

## Troubleshooting

- **Browser Support**: For best results, use Chrome, Edge, or Firefox with the latest updates.
- **Performance Issues**: If the recording appears slow or choppy, try closing other applications or tabs to free up system resources.
- **Missing Frames**: If the frame capture seems to be missing frames, try reducing the frame rate using the `-r` option when converting.
- **Large File Size**: If the output video file is too large, increase the quality value (higher number = lower quality, smaller file) using the `-q` option.

## Technical Details

The video recording implementation uses:
- Browser's MediaRecorder API for direct video capture
- Canvas.captureStream() for high-quality frame capture
- Programmatic UI interactions via custom events
- Camera animations for cinematic transitions
- FFmpeg for frame-to-video conversion