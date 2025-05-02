import { CONFIG } from '../config.js';
import { visibilityManager } from '../visibilityManager.js';
import { timeTravelController } from '../timeTravel.js';
import { getCurrentYearRange } from '../yearSlider.js';

class VideoRecorder {
  constructor(canvas, scene, camera, controls) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.recorder = null;
    this.sequencer = new InteractionSequencer(scene, camera, controls);
    this.fps = 30;
    this.isRecording = false;
    this.frames = [];
    this.frameInterval = null;
    this.recordingStartTime = null;

    // Check browser compatibility
    this.hasMediaRecorderSupport = typeof MediaRecorder !== 'undefined';
    this.supportedMimeTypes = this.hasMediaRecorderSupport ? this.getSupportedMimeTypes() : [];

    // Add development tools if enabled
    if (CONFIG.development && CONFIG.development.showDevTools) {
      this.createDevTools();
    }
  }

  /**
   * Check supported MIME types for MediaRecorder
   * @returns {Array} - List of supported MIME types
   */
  getSupportedMimeTypes() {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Setup and initialize the video recorder
   * @param {number} duration - Total duration in milliseconds
   * @param {number} fps - Frames per second (default: 30)
   * @returns {MediaRecorder} - The configured MediaRecorder instance
   */
  async setupRecorder(duration = 60000, fps = 30) {
    this.fps = fps;

    // Clear previous recording data
    this.frames = [];

    // Store a reference to any screen capture stream
    this.screenCaptureStream = null;

    // Check if MediaRecorder is supported
    if (!this.hasMediaRecorderSupport) {
      console.warn('MediaRecorder API is not supported in this browser. Using fallback method.');
      return this.setupFallbackRecorder(duration, fps);
    }

    // Check if we have any supported MIME types
    if (this.supportedMimeTypes.length === 0) {
      console.warn('No supported video MIME types found. Using fallback method.');
      return this.setupFallbackRecorder(duration, fps);
    }

    try {
      let stream;
      let usedScreenCapture = false;

      // Debug: Check for getDisplayMedia support
      console.log('Checking for screen capture support...');
      console.log('navigator.mediaDevices exists:', !!navigator.mediaDevices);
      console.log('Current protocol:', window.location.protocol);
      console.log('Is secure context:', window.isSecureContext);
      console.log('User agent:', navigator.userAgent);

      // Create debug element to track capture type
      this.createCaptureTypeIndicator('Initializing...');

      // Check if we're running on localhost/127.0.0.1, which counts as secure
      const isLocalhost = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('.local');

      const hasSecureContext = window.isSecureContext || isLocalhost;

      // Verify if getDisplayMedia is available
      const hasDisplayMedia = !!(navigator.mediaDevices &&
                                typeof navigator.mediaDevices.getDisplayMedia === 'function');

      console.log('Screen capture available:', hasDisplayMedia && hasSecureContext);

      if (!hasSecureContext) {
        console.warn('Screen Capture API requires a secure context (HTTPS or localhost)');
        this.updateCaptureTypeIndicator('Not in secure context, using canvas only');
        this.showRecordingErrorMessage("Screen capture requires HTTPS. Using canvas-only recording.");
      }

      // Try to use screen capture first (will capture modals and UI elements)
      if (hasDisplayMedia && hasSecureContext) {
        try {
          console.log('Attempting to use screen capture for recording...');
          this.updateCaptureTypeIndicator('Waiting for screen selection...');

          // Create a message to guide user through screen selection
          this.showScreenSelectionGuide();

          // Prompt user to select screen/window to capture
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              // Browser-specific options for best results
              ...(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? {
                displaySurface: "window", // In Safari, focus on window selection
              } : {
                displaySurface: "browser", // Prefer browser tab in Chrome/Firefox/Edge
                logicalSurface: true,      // Capture the logical surface
              }),
              frameRate: { ideal: fps },
              cursor: "always",
              width: { ideal: window.innerWidth },
              height: { ideal: window.innerHeight }
            },
            audio: false,
            // These are experimental options for Chrome
            ...(navigator.userAgent.includes('Chrome') ? {
              preferCurrentTab: true,
              selfBrowserSurface: "include"
            } : {})
          });

          // Store the stream for cleanup later
          this.screenCaptureStream = displayStream;

          // Hide the guide once selection is complete
          this.hideScreenSelectionGuide();

          // Check what was captured
          const videoTrack = displayStream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('Screen capture video track info:', videoTrack.label);
            const settings = videoTrack.getSettings();
            console.log('Video track settings:', settings);

            // Determine if we're capturing the correct content
            const isLikelyBrowserContent =
              videoTrack.label.includes('tab') ||
              videoTrack.label.includes('Tab') ||
              videoTrack.label.includes('browser') ||
              videoTrack.label.includes('Browser') ||
              videoTrack.label.includes('Chrome') ||
              videoTrack.label.includes('Safari') ||
              videoTrack.label.includes('Firefox') ||
              (settings && settings.displaySurface === 'browser');

            // Use screen capture if it's likely capturing browser content
            if (isLikelyBrowserContent) {
              console.log('Using screen capture for recording - this should include UI elements');
              stream = displayStream;
              usedScreenCapture = true;
              this.updateCaptureTypeIndicator('Recording with screen capture (includes UI)');
            } else {
              console.log('Screen capture is capturing a different surface, not the browser tab');
              console.log('Selected surface appears to be: ', videoTrack.label);
              console.log('Falling back to canvas capture');

              // Stop the screen capture stream since we're not using it
              displayStream.getTracks().forEach(track => track.stop());
              this.screenCaptureStream = null;

              // Use canvas capture as fallback
              stream = this.canvas.captureStream(fps);
              this.updateCaptureTypeIndicator('Using canvas capture (no UI elements)');
            }
          } else {
            console.warn('No video track found in screen capture stream');
            stream = this.canvas.captureStream(fps);
            this.updateCaptureTypeIndicator('No video track - using canvas only');
          }
        } catch (error) {
          console.warn('Screen capture failed:', error.message);
          console.log('Falling back to canvas capture method');
          this.updateCaptureTypeIndicator('Screen capture failed - using canvas only');
          // If the user denied permission or there was an error, use canvas capture
          stream = this.canvas.captureStream(fps);
        }
      } else {
        // Screen capture not supported, use canvas capture
        console.log('Screen capture not available, using canvas capture method');
        this.updateCaptureTypeIndicator('Screen capture not available - using canvas only');
        stream = this.canvas.captureStream(fps);
      }

      // Set up recorder with the selected stream
      const mimeType = this.supportedMimeTypes[0];
      console.log(`Using MIME type: ${mimeType}`);

      // Create recorder
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps for good quality
      });

      // Set up data handling
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      // Set up completion handling
      recorder.onstop = () => {
        console.log('Recording stopped. Processing chunks...');
        const blob = new Blob(chunks, { type: mimeType });
        console.log(`Recording finished. Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

        // Remove indicator
        this.removeCaptureTypeIndicator();

        // Download video
        this.downloadVideo(blob);

        // Clean up screen capture stream if it was used
        if (this.screenCaptureStream) {
          console.log('Cleaning up screen capture stream');
          this.screenCaptureStream.getTracks().forEach(track => track.stop());
          this.screenCaptureStream = null;
        }
      };

      this.recorder = recorder;
      return recorder;
    } catch (error) {
      console.error('Error setting up recorder:', error);
      this.showRecordingErrorMessage(`Failed to setup recorder: ${error.message}`);
      return this.setupFallbackRecorder(duration, fps);
    }
  }

  /**
   * Creates a visual indicator for the type of capture being used
   * @param {string} initialText - Initial text to display
   */
  createCaptureTypeIndicator(initialText) {
    // Remove any existing indicator
    this.removeCaptureTypeIndicator();

    const indicator = document.createElement('div');
    indicator.id = 'capture-type-indicator';
    indicator.textContent = initialText;
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.left = '10px';
    indicator.style.background = 'rgba(0, 0, 0, 0.8)';
    indicator.style.color = 'white';
    indicator.style.padding = '5px 10px';
    indicator.style.borderRadius = '4px';
    indicator.style.fontFamily = 'monospace';
    indicator.style.fontSize = '12px';
    indicator.style.zIndex = '10000';
    indicator.style.pointerEvents = 'none'; // Don't interfere with user interaction

    document.body.appendChild(indicator);
  }

  /**
   * Updates the capture type indicator text
   * @param {string} text - New text to display
   */
  updateCaptureTypeIndicator(text) {
    const indicator = document.getElementById('capture-type-indicator');
    if (indicator) {
      indicator.textContent = text;

      // Set color based on capture type
      if (text.includes('screen capture')) {
        indicator.style.backgroundColor = 'rgba(37, 218, 165, 0.8)';
      } else if (text.includes('canvas capture')) {
        indicator.style.backgroundColor = 'rgba(255, 61, 90, 0.8)';
      } else if (text.includes('Error')) {
        indicator.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      }
    } else {
      this.createCaptureTypeIndicator(text);
    }
  }

  /**
   * Removes the capture type indicator
   */
  removeCaptureTypeIndicator() {
    const indicator = document.getElementById('capture-type-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Show warning message
   * @param {string} message - The warning message
   */
  showRecordingWarningMessage(message) {
    const warningNotice = document.createElement('div');
    warningNotice.id = 'recording-warning-message';
    warningNotice.style.position = 'fixed';
    warningNotice.style.top = '20px';
    warningNotice.style.left = '50%';
    warningNotice.style.transform = 'translateX(-50%)';
    warningNotice.style.background = 'rgba(255, 165, 0, 0.9)';
    warningNotice.style.color = 'white';
    warningNotice.style.padding = '10px 20px';
    warningNotice.style.borderRadius = '4px';
    warningNotice.style.zIndex = '10000';
    warningNotice.style.fontFamily = 'Arial, sans-serif';
    warningNotice.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    warningNotice.style.animation = 'fadeIn 0.3s';

    warningNotice.textContent = message;

    document.body.appendChild(warningNotice);

    setTimeout(() => {
      if (warningNotice.parentNode) {
        warningNotice.style.opacity = '0';
        warningNotice.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          if (warningNotice.parentNode) {
            warningNotice.remove();
          }
        }, 500);
      }
    }, 6000);
  }

  /**
   * Shows a guide to help the user select the correct screen for capture
   */
  showScreenSelectionGuide() {
    // Remove any existing guide
    this.hideScreenSelectionGuide();

    // Create a new guide
    const guide = document.createElement('div');
    guide.id = 'screen-selection-guide';
    guide.style.position = 'fixed';
    guide.style.top = '50%';
    guide.style.left = '50%';
    guide.style.transform = 'translate(-50%, -50%)';
    guide.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    guide.style.color = 'white';
    guide.style.padding = '20px';
    guide.style.borderRadius = '10px';
    guide.style.maxWidth = '500px';
    guide.style.textAlign = 'center';
    guide.style.zIndex = '999999';
    guide.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    guide.style.fontFamily = 'Arial, sans-serif';

    guide.innerHTML = `
      <h3 style="margin-top: 0; color: #ff3d5a;">Screen Selection Instructions</h3>
      <p style="margin-top: 15px; font-size: 16px;">
        <strong>To capture UI elements like modals, please select "This Tab" in the dialog that appears.</strong>
      </p>
      <div style="margin: 15px 0; text-align: center;">
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0zIDEzQzMgMTAuNzkwOSA0Ljc5MDg2IDkgNyA5SDEyVjZMMyA2QzEuMzQzMTUgNiAwIDcuMzQzMTUgMCA5VjE1QzAgMTYuNjU2OSAxLjM0MzE1IDE4IDMgMThIMTJWMTVIN0M0Ljc5MDg2IDE1IDMgMTMuMjA5MSAzIDEzWiIgZmlsbD0iI2ZmM2Q1YSIvPjxwYXRoIGQ9Ik0yMSAxMUMyMSAxMy4yMDkxIDE5LjIwOTEgMTUgMTcgMTVIMTJWMThIMjFDMjIuNjU2OSAxOCAyNCAxNi42NTY5IDI0IDE1VjlDMjQgNy4zNDMxNSAyMi42NTY5IDYgMjEgNkgxMlY5SDE3QzE5LjIwOTEgOSAyMSAxMC43OTA5IDIxIDExWiIgZmlsbD0iI2ZmM2Q1YSIvPjwvc3ZnPg=="
             alt="Tab Icon"
             style="width: 50px; height: 50px;">
      </div>
      <div style="margin: 15px 0;">
        <div style="display: inline-block; border: 2px solid #ff3d5a; border-radius: 5px; padding: 10px;">
          <strong style="font-size: 14px;">Select "This Tab" or "[Your Browser Name] Tab"</strong>
        </div>
      </div>
      <p style="font-size: 12px; margin-bottom: 0; color: #aaaaaa;">
        Note: If you select your entire screen or a different window,<br>UI elements like modals won't be captured.
      </p>
    `;

    document.body.appendChild(guide);
  }

  /**
   * Hide the screen selection guide
   */
  hideScreenSelectionGuide() {
    const guide = document.getElementById('screen-selection-guide');
    if (guide) {
      guide.remove();
    }
  }

  /**
   * Setup fallback recorder that captures frames as images
   * @param {number} duration - Total duration in milliseconds
   * @param {number} fps - Frames per second
   */
  setupFallbackRecorder(duration, fps) {
    console.log('Using fallback frame-by-frame recording method');

    // Calculate frame interval in milliseconds
    const frameIntervalMs = 1000 / fps;

    // Create a mock recorder object with basic functionality
    this.recorder = {
      state: 'inactive',
      start: () => {
        this.recorder.state = 'recording';
        this.recordingStartTime = performance.now();

        // Capture frames at regular intervals
        this.frameInterval = setInterval(() => {
          // Check if we've exceeded the duration
          if (performance.now() - this.recordingStartTime >= duration) {
            this.recorder.stop();
            return;
          }

          // Capture frame
          this.captureFrame();
        }, frameIntervalMs);
      },
      stop: () => {
        this.recorder.state = 'inactive';

        // Stop capturing frames
        clearInterval(this.frameInterval);

        // Process and download frames
        this.processFallbackFrames();
      }
    };

    return this.recorder;
  }

  /**
   * Capture a single frame from the canvas
   */
  captureFrame() {
    // Create a copy of the canvas data
    this.canvas.toBlob(blob => {
      if (blob) {
        this.frames.push(blob);
      }
    }, 'image/jpeg', 0.95);
  }

  /**
   * Process fallback frames and offer download
   */
  processFallbackFrames() {
    if (this.frames.length === 0) {
      console.error('No frames captured');
      return;
    }

    console.log(`Captured ${this.frames.length} frames`);

    // Create a zip file containing all frames
    import('https://unpkg.com/jszip@3.10.1/dist/jszip.min.js')
      .then(module => {
        const JSZip = window.JSZip;
        const zip = new JSZip();

        // Add frames to zip
        this.frames.forEach((blob, index) => {
          const fileName = `frame_${index.toString().padStart(5, '0')}.jpg`;
          zip.file(fileName, blob);
        });

        // Add instructions file
        zip.file('README.txt',
          'These frames can be converted to a video using FFmpeg with the command:\n' +
          'ffmpeg -framerate ' + this.fps + ' -i frame_%05d.jpg -c:v libx264 -pix_fmt yuv420p visualization_demo.mp4\n\n' +
          'If you have ImageMagick installed, you can also use:\n' +
          'convert -delay ' + (100/this.fps) + ' -quality 95 frame_*.jpg visualization_demo.mp4'
        );

        // Generate zip file
        zip.generateAsync({ type: 'blob' })
          .then(content => {
            // Create download link
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'network-visualization-frames.zip';
            a.textContent = 'Download Video Frames (ZIP)';
            a.style.position = 'fixed';
            a.style.top = '20px';
            a.style.left = '20px';
            a.style.zIndex = '1000';
            a.style.background = '#25daa5';
            a.style.color = 'white';
            a.style.padding = '10px 15px';
            a.style.borderRadius = '4px';
            a.style.textDecoration = 'none';
            document.body.appendChild(a);

            console.log('Frame capture complete! Click the download button to save.');
          });
      })
      .catch(error => {
        console.error('Error creating zip file:', error);

        // Fallback to downloading individual frames
        this.downloadIndividualFrames();
      });
  }

  /**
   * Fallback method to download individual frames
   */
  downloadIndividualFrames() {
    // Create a container for download links
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.left = '20px';
    container.style.zIndex = '1000';
    container.style.background = 'rgba(0, 0, 0, 0.8)';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.maxHeight = '80vh';
    container.style.overflowY = 'auto';

    // Add heading
    const heading = document.createElement('h3');
    heading.textContent = 'Download Video Frames';
    heading.style.color = 'white';
    heading.style.marginTop = '0';
    container.appendChild(heading);

    // Add instruction
    const instruction = document.createElement('p');
    instruction.textContent = 'Download these frames and convert them to video using FFmpeg or similar tools.';
    instruction.style.color = 'white';
    container.appendChild(instruction);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = '#ff3d5a';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.borderRadius = '4px';
    closeButton.style.padding = '5px 10px';
    closeButton.addEventListener('click', () => container.remove());
    container.appendChild(closeButton);

    // Add download links for first 10 frames with a "Download All" option
    for (let i = 0; i < Math.min(10, this.frames.length); i++) {
      const url = URL.createObjectURL(this.frames[i]);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame_${i.toString().padStart(5, '0')}.jpg`;
      a.textContent = `Frame ${i}`;
      a.style.display = 'block';
      a.style.color = '#25daa5';
      a.style.marginBottom = '5px';
      container.appendChild(a);
    }

    if (this.frames.length > 10) {
      const moreText = document.createElement('p');
      moreText.textContent = `+ ${this.frames.length - 10} more frames`;
      moreText.style.color = 'white';
      container.appendChild(moreText);
    }

    document.body.appendChild(container);
  }

  /**
   * Download video blob
   * @param {Blob} blob - Video blob
   */
  downloadVideo(blob) {
    const url = URL.createObjectURL(blob);

    // Try to find the download button in the UI
    const downloadButton = document.querySelector('#video-control-buttons button:nth-child(2)');

    if (downloadButton) {
      // Use the existing button
      console.log('Using existing download button');

      // Make it visible
      downloadButton.style.display = 'flex';

      // Set the download attributes
      downloadButton.onclick = () => {
        // Create a temporary link to trigger the download
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.download = 'network-visualization-demo.' + (blob.type.includes('mp4') ? 'mp4' : 'webm');
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        // Change button appearance after download
        downloadButton.style.background = '#666';

        // Preserve the download icon but update text
        const downloadIcon = downloadButton.querySelector('span');
        if (downloadIcon) {
          downloadButton.textContent = 'Video Downloaded';
          downloadButton.prepend(downloadIcon);
        } else {
          downloadButton.textContent = 'Video Downloaded';
        }

        // Clean up URL after download
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      };

      console.log('Download button ready');
    } else {
      // Fallback: Create download link as before
      console.log('Creating new download link (fallback)');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'network-visualization-demo.' + (blob.type.includes('mp4') ? 'mp4' : 'webm');
      a.textContent = 'Download Video';
      a.style.position = 'fixed';
      a.style.bottom = '20px';
      a.style.left = '200px'; // Position next to record button
      a.style.zIndex = '1000';
      a.style.background = '#25daa5';
      a.style.color = 'white';
      a.style.padding = '10px 15px';
      a.style.borderRadius = '4px';
      a.style.textDecoration = 'none';
      a.style.fontFamily = 'Arial, sans-serif';
      a.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
      document.body.appendChild(a);

      // Clean up URL after download
      a.addEventListener('click', () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          // Keep the button visible but change its appearance
          a.style.background = '#666';
          a.textContent = 'Video Downloaded';
        }, 1000);
      });
    }

    console.log('Video recording complete! Click the download button to save.');
  }

  /**
   * Create a demo interaction sequence
   * @returns {InteractionSequencer} - The configured sequencer
   */
  createDemoSequence() {
    const sequencer = this.sequencer;

    // Clear any previous actions
    sequencer.actions = [];

    // Helper to perform click with animation first
    const performAnimatedClick = async (element, description) => {
      if (!element) {
        console.error(`Element for "${description}" not found`);
        return;
      }

      // First show the animation
      this.addClickEffect(element);

      // Wait a moment for the animation to be visible
      await new Promise(resolve => setTimeout(resolve, 150));

      // Then perform the actual click
      element.click();

      console.log(`Performed animated click: ${description}`);
    };

    // 1. Start with ensuring instructions modal is closed
    sequencer.addAction(async () => {
      console.log('Action: Ensuring clean starting state');

      // First make sure all modals are closed
      const modals = document.querySelectorAll('.modal, #instructionsModal, #topicTreeModal');
      for (const modal of modals) {
        if (modal && (modal.style.display === 'block' || modal.style.display === 'flex')) {
          console.log(`Closing modal: ${modal.id || 'unnamed modal'}`);

          // Try to find and click the close button
          const closeBtn = modal.querySelector('.close-btn, .close, [id$="CloseBtn"]');
          if (closeBtn) {
            await performAnimatedClick(closeBtn, `Close ${modal.id || 'modal'}`);
          } else {
            // Manually hide if button not found
            modal.style.display = 'none';
            if (modal.classList.contains('show')) {
              modal.classList.remove('show');
            }
          }

          // Brief pause to let animation complete
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Ensure we start with a clean view
      this.controls.reset();

      // Brief pause before starting the sequence
      await new Promise(resolve => setTimeout(resolve, 300));
    }, 300);

    // NEW: Initial camera movement - slow zoom out for overview
    sequencer.addAction(async () => {
      console.log('Action: Initial camera movement - overview zoom out');
      this.showOverlay('Academic Network Visualization');

      // Get current camera position and target
      const currentPosition = {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      };
      const currentTarget = this.controls.target.clone();

      // Zoom out to show the full network
      await this.animateCamera(
        {
          x: currentPosition.x * 1.5,
          y: currentPosition.y * 1.5,
          z: currentPosition.z * 1.5
        },
        {
          x: currentTarget.x,
          y: currentTarget.y,
          z: currentTarget.z
        },
        4000 // Slower movement for dramatic effect
      );
    }, 1000);

    // 2. Open the instructions modal
    sequencer.addAction(async () => {
      console.log('Action: Opening instructions modal');
      this.showOverlay('Opening Instructions');

      // Find and open the instructions modal
      const helpButton = document.getElementById('helpButton');
      await performAnimatedClick(helpButton, 'Open instructions');

      // Wait for modal to animate in
      await new Promise(resolve => setTimeout(resolve, 400));
    }, 600);

    // 3. Start with showing the beginning of instructions
    sequencer.addAction(async () => {
      console.log('Action: Reset scroll position to top');
      this.showOverlay('Reading Instructions');

      const instructionsContainer = document.querySelector('.instructions-container');
      if (instructionsContainer) {
        // Make sure we start at the top of the instructions
        instructionsContainer.scrollTop = 0;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }, 400);

    // 4. Scroll down in the instructions modal to show all content
    sequencer.addAction(async () => {
      console.log('Action: Scrolling in instructions modal');

      const instructionsContainer = document.querySelector('.instructions-container');
      if (instructionsContainer) {
        // Scroll to the bottom of the instructions more quickly
        const scrollHeight = instructionsContainer.scrollHeight;
        const duration = 1500; // 1.5 seconds for faster scrolling
        const startTime = performance.now();

        return new Promise(resolve => {
          const scrollStep = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easing for natural scroll
            const eased = this.easeInOutCubic(progress);
            const scrollPosition = scrollHeight * eased;

            instructionsContainer.scrollTop = scrollPosition;

            if (progress < 1) {
              requestAnimationFrame(scrollStep);
            } else {
              resolve();
            }
          };

          requestAnimationFrame(scrollStep);
        });
      }
    }, 1000);

    // 5. Click on the "View Topic Hierarchy" button
    sequencer.addAction(async () => {
      console.log('Action: Clicking View Topic Hierarchy button');
      this.showOverlay('Opening Topic Hierarchy');

      const viewHierarchyBtn = document.getElementById('viewTopicHierarchyBtn');
      await performAnimatedClick(viewHierarchyBtn, 'Open topic hierarchy');

      // Wait for the topic tree modal to open
      await new Promise(resolve => setTimeout(resolve, 400));
    }, 800);

    // 6. Change dropdown from "Overview" to "Safety"
    sequencer.addAction(async () => {
      console.log('Action: Changing topic selection from Overview to Safety');
      this.showOverlay('Selecting Safety Topic');

      const datasetSelect = document.getElementById('datasetSelect');
      if (datasetSelect) {
        // Add visual effect to the dropdown
        this.addClickEffect(datasetSelect);

        // Brief pause before showing the dropdown
        await new Promise(resolve => setTimeout(resolve, 150));

        // Create a custom visual representation of the dropdown
        await this.createVisualDropdown(datasetSelect, 'safety');

        // After visual representation, actually change the value
        datasetSelect.value = 'safety';

        // Trigger change event to update the visualization
        const changeEvent = new Event('change', { bubbles: true });
        datasetSelect.dispatchEvent(changeEvent);

        // Wait for the visualization to update
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        console.error('Dataset select dropdown not found');
      }
    }, 800);

    // New action: Scroll in the topic hierarchy visualization
    sequencer.addAction(async () => {
      console.log('Action: Scrolling in topic hierarchy visualization');
      this.showOverlay('Exploring Topic Hierarchy');

      const topicTreeSvg = document.getElementById('topicTreeSvg');
      if (topicTreeSvg) {
        // Find the container that might be scrollable
        let scrollableContainer = topicTreeSvg.parentElement;

        // Try to find a scrollable container
        while (scrollableContainer &&
               (scrollableContainer.scrollHeight <= scrollableContainer.clientHeight) &&
               scrollableContainer !== document.body) {
          scrollableContainer = scrollableContainer.parentElement;
        }

        if (scrollableContainer && scrollableContainer.scrollHeight > scrollableContainer.clientHeight) {
          console.log('Found scrollable container for topic hierarchy');

          // Scroll down gradually to show all content - faster now
          const scrollHeight = scrollableContainer.scrollHeight;
          const duration = 1000; // 1 second for scrolling (even faster)
          const startTime = performance.now();

          return new Promise(resolve => {
            const scrollStep = (timestamp) => {
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // Use easing for natural scroll
              const eased = this.easeInOutCubic(progress);
              const scrollPosition = scrollHeight * eased;

              scrollableContainer.scrollTop = scrollPosition;

              if (progress < 1) {
                requestAnimationFrame(scrollStep);
              } else {
                resolve();
              }
            };

            requestAnimationFrame(scrollStep);
          });
        } else {
          console.log('No scrollable container found for topic hierarchy or no scroll needed');
        }
      } else {
        console.error('Topic tree SVG not found');
      }
    }, 600);

    // 7. Press close button to exit the topic hierarchy modal
    sequencer.addAction(async () => {
      console.log('Action: Closing topic hierarchy modal');
      this.showOverlay('Closing Topic Hierarchy');

      const closeBtn = document.getElementById('topicTreeCloseBtn');
      await performAnimatedClick(closeBtn, 'Close topic hierarchy');

      // Wait for the modal to close
      await new Promise(resolve => setTimeout(resolve, 500));
    }, 1000);

    // NEW: Camera movement - zoom in to specific area of the network
    sequencer.addAction(async () => {
      console.log('Action: Camera movement - zoom in to network center');
      this.showOverlay('Exploring Network Structure');

      // First, try to find center of visible nodes
      const positions = this.scene.getObjectByName('points');
      if (positions && positions.geometry && positions.geometry.attributes.position) {
        let centerX = 0, centerY = 0, centerZ = 0;
        let count = 0;

        // Sample visible nodes to find a center point
        for (let i = 0; i < positions.geometry.attributes.position.count; i += 100) {
          if (!positions.geometry.attributes.visibility || positions.geometry.attributes.visibility.getX(i) > 0.5) {
            centerX += positions.geometry.attributes.position.getX(i);
            centerY += positions.geometry.attributes.position.getY(i);
            centerZ += positions.geometry.attributes.position.getZ(i);
            count++;
          }
        }

        if (count > 0) {
          centerX /= count;
          centerY /= count;
          centerZ /= count;

          // Zoom in to the center
          await this.animateCamera(
            {
              x: centerX + 1000, // Closer than before
              y: centerY + 1000,
              z: centerZ + 1000
            },
            { x: centerX, y: centerY, z: centerZ },
            3000
          );
        }
      }
    }, 1500);

    // NEW: Camera movement - orbit around to show dimensionality
    sequencer.addAction(async () => {
      console.log('Action: Camera movement - orbit around network');
      this.showOverlay('Exploring Network Connections');

      // Get current camera position and target
      const currentPosition = {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      };
      const currentTarget = this.controls.target.clone();

      // First part of orbit
      await this.animateCamera(
        {
          x: currentPosition.z,
          y: currentPosition.y,
          z: -currentPosition.x
        },
        {
          x: currentTarget.x,
          y: currentTarget.y,
          z: currentTarget.z
        },
        3000
      );

      // Second part of orbit
      await this.animateCamera(
        {
          x: -currentPosition.x,
          y: currentPosition.y,
          z: -currentPosition.z
        },
        {
          x: currentTarget.x,
          y: currentTarget.y,
          z: currentTarget.z
        },
        3000
      );
    }, 1000);

    // NEW: Camera movement - zoom out for final overview
    sequencer.addAction(async () => {
      console.log('Action: Camera movement - zoom out for final overview');
      this.showOverlay('Full Network Visualization');

      // Use exact coordinates for final position instead of multipliers
      // These can be easily updated after using logCameraPosition()
      await this.animateCamera(
        {
          x: 5000,  // Example values - replace with your preferred coordinates
          y: 8000,  // Higher up for a better overview
          z: 5000
        },
        {
          x: 0,     // Example target - replace with your preferred coordinates
          y: 0,
          z: 0
        },
        3000
      );
    }, 2000);

    // 8. End with an overview shot without rapid movement
    sequencer.addAction(async () => {
      console.log('Action: Ending with overview');
      this.showOverlay('Network Visualization Complete');

      // No camera movement here to avoid rapid changes at the end
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 1000);

    return sequencer;
  }

  /**
   * Creates a simple visual click effect on an element
   * @param {HTMLElement} element - The element to add the click effect to
   */
  addClickEffect(element) {
    if (!element) return;

    // Simple flash highlight effect that fits the design better
    const originalBg = element.style.backgroundColor;
    const originalBoxShadow = element.style.boxShadow;

    // Add a more visible highlight effect
    element.style.boxShadow = '0 0 12px 4px rgba(255, 61, 90, 0.8)';

    // Create a more visible click indicator
    const highlight = document.createElement('div');
    highlight.style.position = 'fixed';

    // Position at the center of the element
    const rect = element.getBoundingClientRect();
    highlight.style.top = (rect.top + rect.height/2) + 'px';
    highlight.style.left = (rect.left + rect.width/2) + 'px';

    // Style
    highlight.style.width = '32px';  // Larger size
    highlight.style.height = '32px';
    highlight.style.borderRadius = '50%';
    highlight.style.backgroundColor = 'rgba(255, 61, 90, 0.2)';
    highlight.style.border = '3px solid rgba(255, 61, 90, 0.8)';
    highlight.style.zIndex = '10000';
    highlight.style.transform = 'translate(-50%, -50%)';
    highlight.style.pointerEvents = 'none';
    highlight.style.opacity = '1';

    // Add a quick fade-out animation
    highlight.style.animation = 'click-fade 0.4s forwards';

    // Add animation style if not already present
    if (!document.getElementById('click-effect-style')) {
      const style = document.createElement('style');
      style.id = 'click-effect-style';
      style.textContent = `
        @keyframes click-fade {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          60% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Add to document
    document.body.appendChild(highlight);

    // Clean up quickly
    setTimeout(() => {
      highlight.remove();
      element.style.boxShadow = originalBoxShadow;
    }, 400);
  }

  /**
   * Start recording video
   * @param {number} duration - Recording duration in milliseconds
   */
  async startRecording(duration) {
    // Get values from config if not provided
    const recordingDuration = duration || CONFIG.development.videoRecording.defaultDuration || 60000;
    const fps = CONFIG.development.videoRecording.defaultFps || 30;

    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    // Log camera position and target for reference
    console.log('=== Current Camera State ===');
    console.log('Camera position:', {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    });
    console.log('Camera target:', {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z
    });
    console.log('===========================');

    try {
      // Setup UI and recorder
      const recorder = await this.setupRecorder(recordingDuration, fps);
      if (!recorder) {
        throw new Error('Failed to set up recorder');
      }
      this.showRecordingIndicator();

      // Create demo sequence
      const sequencer = this.createDemoSequence();

      // Wait 2 seconds before starting to avoid initial camera jumps
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start recording
      this.isRecording = true;
      this.recorder.start();
      console.log('Recording started...');

      // Wait a bit more for stability before starting the sequence
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start the demo sequence
      await sequencer.start();

      // Wait for a bit before stopping
      if (this.recorder && this.recorder.state === 'recording') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.recorder.stop();
      }
    } catch (error) {
      console.error('Error during recording:', error);
      this.isRecording = false;

      // Clean up
      if (this.recorder && this.recorder.state === 'recording') {
        try {
          this.recorder.stop();
        } catch (stopError) {
          console.error('Error stopping recorder:', stopError);
        }
      }

      // Remove recording indicator if it exists
      const indicator = document.getElementById('recording-indicator');
      if (indicator && indicator.parentNode) {
        indicator.remove();
      }
    }
  }

  /**
   * Animate camera movement
   * @param {Object} position - Target position {x, y, z}
   * @param {Object} lookAt - Target look at point {x, y, z}
   * @param {number} duration - Animation duration in milliseconds
   */
  async animateCamera(position, lookAt, duration = 2000) {
    const startPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };

    const startTime = performance.now();

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Use easing function for smooth movement
        const eased = this.easeInOutCubic(progress);

        // Update camera position
        this.camera.position.x = startPosition.x + (position.x - startPosition.x) * eased;
        this.camera.position.y = startPosition.y + (position.y - startPosition.y) * eased;
        this.camera.position.z = startPosition.z + (position.z - startPosition.z) * eased;

        // Update camera target
        this.controls.target.set(lookAt.x, lookAt.y, lookAt.z);
        this.controls.update();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Ease in-out cubic function for smooth animation
   * @param {number} t - Progress from 0 to 1
   * @returns {number} - Eased value
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Zoom to visible nodes
   */
  async zoomToVisibleNodes() {
    // Find visible nodes
    const positions = this.scene.getObjectByName('points');
    if (!positions) return;

    // Find center of visible nodes
    let centerX = 0, centerY = 0, centerZ = 0;
    let count = 0;

    // Sample visible nodes to find a center point
    for (let i = 0; i < positions.geometry.attributes.position.count; i += 100) {
      if (positions.geometry.attributes.visibility.getX(i) > 0.5) {
        centerX += positions.geometry.attributes.position.getX(i);
        centerY += positions.geometry.attributes.position.getY(i);
        centerZ += positions.geometry.attributes.position.getZ(i);
        count++;
      }
    }

    if (count > 0) {
      centerX /= count;
      centerY /= count;
      centerZ /= count;

      // Zoom to this center
      await this.animateCamera(
        {
          x: centerX + 2000,
          y: centerY + 2000,
          z: centerZ + 2000
        },
        { x: centerX, y: centerY, z: centerZ }
      );
    }
  }

  /**
   * Show a text overlay during the video
   * @param {string} text - Text to display
   */
  showOverlay(text) {
    // Remove any existing overlay
    const existingOverlay = document.getElementById('video-text-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create new overlay
    const overlay = document.createElement('div');
    overlay.id = 'video-text-overlay';
    overlay.textContent = text;
    overlay.style.position = 'absolute';
    overlay.style.top = '20px';
    overlay.style.left = '50%';
    overlay.style.transform = 'translateX(-50%)';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '8px 16px';
    overlay.style.borderRadius = '4px';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.fontSize = '16px';
    overlay.style.zIndex = '1000';

    document.body.appendChild(overlay);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 5000);
  }

  /**
   * Show recording indicator
   */
  showRecordingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'recording-indicator';
    indicator.textContent = 'Recording...';
    indicator.style.position = 'fixed';
    indicator.style.top = '20px';
    indicator.style.right = '20px';
    indicator.style.background = 'rgba(255, 0, 0, 0.7)';
    indicator.style.color = 'white';
    indicator.style.padding = '8px 16px';
    indicator.style.borderRadius = '4px';
    indicator.style.fontFamily = 'Arial, sans-serif';
    indicator.style.zIndex = '1000';

    // Add recording circle
    const circle = document.createElement('span');
    circle.style.display = 'inline-block';
    circle.style.width = '10px';
    circle.style.height = '10px';
    circle.style.background = 'red';
    circle.style.borderRadius = '50%';
    circle.style.marginRight = '8px';
    circle.style.animation = 'pulse 1s infinite';

    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    indicator.prepend(circle);
    document.body.appendChild(indicator);

    // Add a "Log Camera Position" button
    const logPositionBtn = document.createElement('button');
    logPositionBtn.textContent = 'Log Camera Position';
    logPositionBtn.style.position = 'fixed';
    logPositionBtn.style.top = '60px';
    logPositionBtn.style.right = '20px';
    logPositionBtn.style.background = 'rgba(37, 218, 165, 0.9)';
    logPositionBtn.style.color = 'white';
    logPositionBtn.style.border = 'none';
    logPositionBtn.style.padding = '8px 16px';
    logPositionBtn.style.borderRadius = '4px';
    logPositionBtn.style.fontFamily = 'Arial, sans-serif';
    logPositionBtn.style.zIndex = '1000';
    logPositionBtn.style.cursor = 'pointer';

    // Add event listener to log camera position
    logPositionBtn.addEventListener('click', () => {
      this.logCameraPosition();
    });

    document.body.appendChild(logPositionBtn);

    // Store original onstop function
    const originalOnStop = this.recorder.onstop;

    // Override onstop to include indicator removal
    this.recorder.onstop = () => {
      // Call original onstop if it exists
      if (originalOnStop) {
        originalOnStop();
      }

      if (indicator.parentNode) {
        indicator.remove();
      }

      if (style.parentNode) {
        style.remove();
      }

      if (logPositionBtn.parentNode) {
        logPositionBtn.remove();
      }
    };
  }

  /**
   * Show success message
   * @param {string} message - The success message
   */
  showRecordingSuccessMessage(message) {
    const successNotice = document.createElement('div');
    successNotice.id = 'recording-success-message';
    successNotice.style.position = 'fixed';
    successNotice.style.top = '20px';
    successNotice.style.left = '50%';
    successNotice.style.transform = 'translateX(-50%)';
    successNotice.style.background = 'rgba(37, 218, 165, 0.9)';
    successNotice.style.color = 'white';
    successNotice.style.padding = '10px 20px';
    successNotice.style.borderRadius = '4px';
    successNotice.style.zIndex = '10000';
    successNotice.style.fontFamily = 'Arial, sans-serif';
    successNotice.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    successNotice.style.animation = 'fadeIn 0.3s';

    successNotice.textContent = message;

    document.body.appendChild(successNotice);

    setTimeout(() => {
      if (successNotice.parentNode) {
        successNotice.style.opacity = '0';
        successNotice.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          if (successNotice.parentNode) {
            successNotice.remove();
          }
        }, 500);
      }
    }, 4000);
  }

  /**
   * Show error message
   * @param {string} message - The error message
   */
  showRecordingErrorMessage(message) {
    const errorNotice = document.createElement('div');
    errorNotice.id = 'recording-error-message';
    errorNotice.style.position = 'fixed';
    errorNotice.style.top = '20px';
    errorNotice.style.left = '50%';
    errorNotice.style.transform = 'translateX(-50%)';
    errorNotice.style.background = 'rgba(255, 61, 90, 0.9)';
    errorNotice.style.color = 'white';
    errorNotice.style.padding = '10px 20px';
    errorNotice.style.borderRadius = '4px';
    errorNotice.style.zIndex = '10000';
    errorNotice.style.fontFamily = 'Arial, sans-serif';
    errorNotice.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    errorNotice.style.animation = 'fadeIn 0.3s';

    errorNotice.textContent = message;

    document.body.appendChild(errorNotice);

    setTimeout(() => {
      if (errorNotice.parentNode) {
        errorNotice.style.opacity = '0';
        errorNotice.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          if (errorNotice.parentNode) {
            errorNotice.remove();
          }
        }, 500);
      }
    }, 5000);
  }

  /**
   * Helper function to select an option from a dropdown with visual feedback
   * @param {HTMLSelectElement} selectElement - The select element
   * @param {string} value - The value to select
   */
  async selectFromDropdown(selectElement, value) {
    if (!selectElement) return;

    // Create a visual cue where the option would be
    try {
      // Get the dropdown options
      const options = selectElement.options;
      let targetOption = null;
      let targetIndex = -1;

      // Find the target option
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === value) {
          targetOption = options[i];
          targetIndex = i;
          break;
        }
      }

      if (targetOption) {
        // Calculate where the option would appear on screen
        const selectRect = selectElement.getBoundingClientRect();
        const optionHeight = 30; // Approximate height of an option

        // Create a highlight for the option
        const highlight = document.createElement('div');
        highlight.style.position = 'fixed';
        highlight.style.left = selectRect.left + 'px';
        highlight.style.width = selectRect.width + 'px';
        highlight.style.height = optionHeight + 'px';
        highlight.style.top = (selectRect.bottom + targetIndex * optionHeight) + 'px';
        highlight.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        highlight.style.border = '1px solid white';
        highlight.style.zIndex = '10001';
        highlight.style.pointerEvents = 'none'; // Don't interfere with clicks
        highlight.style.animation = 'option-highlight 0.8s ease-in-out';

        // Add styles for the animation
        if (!document.getElementById('dropdown-highlight-style')) {
          const style = document.createElement('style');
          style.id = 'dropdown-highlight-style';
          style.textContent = `
            @keyframes option-highlight {
              0% { opacity: 0; }
              30% { opacity: 0.8; }
              70% { opacity: 0.8; }
              100% { opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }

        document.body.appendChild(highlight);

        // Click the highlighted option
        this.addClickEffect(highlight);

        // Wait a moment for the highlight to be visible
        await new Promise(resolve => setTimeout(resolve, 800));

        // Remove the highlight
        highlight.remove();
      }

      // Actually change the value
      selectElement.value = value;

      // Dispatch the change event to update the visualization
      const changeEvent = new Event('change', { bubbles: true });
      selectElement.dispatchEvent(changeEvent);
    } catch (error) {
      console.error('Error in selectFromDropdown:', error);

      // Fallback to simply changing the value
      selectElement.value = value;
      const changeEvent = new Event('change', { bubbles: true });
      selectElement.dispatchEvent(changeEvent);
    }
  }

  /**
   * Creates a visual representation of a dropdown menu that will appear in the recording
   * @param {HTMLSelectElement} selectElement - The select element
   * @param {string} valueToSelect - The value to select
   */
  async createVisualDropdown(selectElement, valueToSelect) {
    if (!selectElement) return;

    try {
      // Get select element position and size
      const selectRect = selectElement.getBoundingClientRect();

      // Get all options and their values/text
      const options = [];
      for (let i = 0; i < selectElement.options.length; i++) {
        options.push({
          value: selectElement.options[i].value,
          text: selectElement.options[i].text,
          selected: selectElement.options[i].value === selectElement.value
        });
      }

      // Find which option to select
      const selectedIndex = options.findIndex(opt => opt.value === valueToSelect);
      if (selectedIndex === -1) {
        console.error(`Option with value ${valueToSelect} not found`);
        return;
      }

      // Create visual dropdown container
      const dropdown = document.createElement('div');
      dropdown.style.position = 'fixed';
      dropdown.style.left = selectRect.left + 'px';
      dropdown.style.top = selectRect.bottom + 'px';
      dropdown.style.width = Math.max(200, selectRect.width) + 'px'; // Ensure minimum width
      dropdown.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
      dropdown.style.border = '2px solid #ff3d5a';
      dropdown.style.borderRadius = '6px';
      dropdown.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
      dropdown.style.zIndex = '10001';
      dropdown.style.overflow = 'hidden';
      dropdown.style.fontFamily = 'Arial, sans-serif';
      dropdown.style.animation = 'dropdown-appear 0.3s ease-out forwards';

      // Add animation styles
      if (!document.getElementById('custom-dropdown-style')) {
        const style = document.createElement('style');
        style.id = 'custom-dropdown-style';
        style.textContent = `
          @keyframes dropdown-appear {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes option-select {
            0% { background-color: rgba(255, 61, 90, 0.2); }
            50% { background-color: rgba(255, 61, 90, 0.5); }
            100% { background-color: rgba(255, 61, 90, 0.3); }
          }
          @keyframes option-highlight {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }

      // Add a header to clarify that this is a dropdown
      const header = document.createElement('div');
      header.textContent = "Select an Option";
      header.style.padding = '8px 12px';
      header.style.backgroundColor = '#ff3d5a';
      header.style.color = 'white';
      header.style.fontWeight = 'bold';
      header.style.fontSize = '14px';
      header.style.textAlign = 'center';
      dropdown.appendChild(header);

      // Add option elements to visual dropdown
      options.forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.textContent = option.text;
        optionEl.style.padding = '10px 12px';
        optionEl.style.cursor = 'pointer';
        optionEl.style.color = 'white';
        optionEl.style.fontSize = '14px';
        optionEl.style.transition = 'background-color 0.2s';
        optionEl.style.borderBottom = index < options.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none';

        // Highlight the current selection
        if (option.selected) {
          optionEl.style.backgroundColor = 'rgba(60, 60, 60, 0.8)';
          optionEl.style.fontWeight = 'bold';
        }

        dropdown.appendChild(optionEl);
      });

      // Add to document
      document.body.appendChild(dropdown);

      // Let the dropdown be visible for a moment
      await new Promise(resolve => setTimeout(resolve, 800));

      // Now highlight and select the target option
      const optionElements = dropdown.querySelectorAll('div:not(:first-child)'); // Skip header
      if (selectedIndex < optionElements.length) {
        // Clear previous selection
        for (let i = 0; i < optionElements.length; i++) {
          if (i !== selectedIndex) {
            optionElements[i].style.backgroundColor = 'transparent';
            optionElements[i].style.fontWeight = 'normal';
          }
        }

        // Highlight the new selection with the animation first
        const targetOption = optionElements[selectedIndex];

        // First show the click animation
        this.addClickEffect(targetOption);

        // Brief delay before showing the selection effect
        await new Promise(resolve => setTimeout(resolve, 200));

        // Then show the selection effect
        targetOption.style.backgroundColor = 'rgba(255, 61, 90, 0.3)';
        targetOption.style.fontWeight = 'bold';
        targetOption.style.animation = 'option-select 0.8s ease-in-out, option-highlight 0.5s ease-in-out';

        // Wait a moment to show the selection
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Animate dropdown closing
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-10px)';
      dropdown.style.transition = 'opacity 0.3s ease-in, transform 0.3s ease-in';

      // Remove after animation
      setTimeout(() => {
        dropdown.remove();
      }, 300);

    } catch (error) {
      console.error('Error creating visual dropdown', error);
    }
  }

  /**
   * Stop the current recording and clean up resources
   */
  stopRecording() {
    if (this.recorder && this.isRecording) {
      console.log('Stopping recording...');
      this.isRecording = false;
      this.recorder.stop();

      // Clean up any additional resources
      if (this.screenCaptureStream) {
        this.screenCaptureStream.getTracks().forEach(track => track.stop());
        this.screenCaptureStream = null;
      }

      return true;
    }
    return false;
  }

  /**
   * Log the current camera position and target to the console
   * Useful for debugging and finding exact coordinates
   */
  logCameraPosition() {
    console.log('=== Current Camera State ===');
    console.log('Camera position:', {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    });
    console.log('Camera target:', {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z
    });
    console.log('===========================');

    // Create a temporary on-screen notification
    const posInfo = `Position: (${this.camera.position.x.toFixed(0)}, ${this.camera.position.y.toFixed(0)}, ${this.camera.position.z.toFixed(0)})`;
    const targetInfo = `Target: (${this.controls.target.x.toFixed(0)}, ${this.controls.target.y.toFixed(0)}, ${this.controls.target.z.toFixed(0)})`;
    this.showOverlay(`${posInfo}\n${targetInfo}`);

    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      }
    };
  }

  /**
   * Set camera position and target to specific coordinates without animation
   * @param {Object} position - The position to set {x, y, z}
   * @param {Object} target - The target to look at {x, y, z}
   */
  setCameraPosition(position, target) {
    if (position) {
      this.camera.position.set(
        position.x !== undefined ? position.x : this.camera.position.x,
        position.y !== undefined ? position.y : this.camera.position.y,
        position.z !== undefined ? position.z : this.camera.position.z
      );
    }

    if (target) {
      this.controls.target.set(
        target.x !== undefined ? target.x : this.controls.target.x,
        target.y !== undefined ? target.y : this.controls.target.y,
        target.z !== undefined ? target.z : this.controls.target.z
      );
      this.controls.update();
    }

    console.log('Camera position set to:', {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      }
    });
  }

  /**
   * Create development tools for camera control and debugging
   */
  createDevTools() {
    // Create container for development tools
    const devToolsContainer = document.createElement('div');
    devToolsContainer.id = 'camera-dev-tools';
    devToolsContainer.style.position = 'fixed';
    devToolsContainer.style.bottom = '20px';
    devToolsContainer.style.right = '20px';
    devToolsContainer.style.zIndex = '1000';
    devToolsContainer.style.display = 'flex';
    devToolsContainer.style.flexDirection = 'column';
    devToolsContainer.style.gap = '10px';

    // Add Log Position button
    const logPositionBtn = document.createElement('button');
    logPositionBtn.textContent = 'Log Camera Position';
    logPositionBtn.style.background = 'rgba(37, 218, 165, 0.9)';
    logPositionBtn.style.color = 'white';
    logPositionBtn.style.border = 'none';
    logPositionBtn.style.padding = '8px 16px';
    logPositionBtn.style.borderRadius = '4px';
    logPositionBtn.style.fontFamily = 'Arial, sans-serif';
    logPositionBtn.style.cursor = 'pointer';
    logPositionBtn.style.fontSize = '14px';
    logPositionBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    // Add event listener
    logPositionBtn.addEventListener('click', () => {
      const cameraData = this.logCameraPosition();

      // Copy to clipboard functionality
      const positionStr = `position: { x: ${cameraData.position.x.toFixed(2)}, y: ${cameraData.position.y.toFixed(2)}, z: ${cameraData.position.z.toFixed(2)} }`;
      const targetStr = `target: { x: ${cameraData.target.x.toFixed(2)}, y: ${cameraData.target.y.toFixed(2)}, z: ${cameraData.target.z.toFixed(2)} }`;
      const fullStr = `${positionStr}, ${targetStr}`;

      try {
        navigator.clipboard.writeText(fullStr).then(() => {
          // Show confirmation tooltip
          const tooltip = document.createElement('div');
          tooltip.textContent = 'Copied to clipboard!';
          tooltip.style.position = 'fixed';
          tooltip.style.bottom = '80px';
          tooltip.style.right = '20px';
          tooltip.style.background = 'rgba(0,0,0,0.8)';
          tooltip.style.color = 'white';
          tooltip.style.padding = '5px 10px';
          tooltip.style.borderRadius = '4px';
          tooltip.style.fontSize = '12px';
          tooltip.style.zIndex = '1001';
          document.body.appendChild(tooltip);

          // Remove after 2 seconds
          setTimeout(() => tooltip.remove(), 2000);
        });
      } catch (err) {
        console.error('Could not copy to clipboard:', err);
      }
    });

    devToolsContainer.appendChild(logPositionBtn);

    // Add button to save preset positions
    const savePresetBtn = document.createElement('button');
    savePresetBtn.textContent = 'Save as Preset';
    savePresetBtn.style.background = 'rgba(100, 100, 255, 0.9)';
    savePresetBtn.style.color = 'white';
    savePresetBtn.style.border = 'none';
    savePresetBtn.style.padding = '8px 16px';
    savePresetBtn.style.borderRadius = '4px';
    savePresetBtn.style.fontFamily = 'Arial, sans-serif';
    savePresetBtn.style.cursor = 'pointer';
    savePresetBtn.style.fontSize = '14px';
    savePresetBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    savePresetBtn.addEventListener('click', () => {
      // Get current camera data
      const cameraData = {
        position: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z
        },
        target: {
          x: this.controls.target.x,
          y: this.controls.target.y,
          z: this.controls.target.z
        }
      };

      // Get stored presets or initialize
      let presets = localStorage.getItem('cameraPresets');
      presets = presets ? JSON.parse(presets) : [];

      // Create name for preset (position_1, position_2, etc.)
      const presetName = `position_${presets.length + 1}`;

      // Add new preset
      presets.push({
        name: presetName,
        ...cameraData
      });

      // Save to localStorage
      localStorage.setItem('cameraPresets', JSON.stringify(presets));

      // Show confirmation
      this.showOverlay(`Camera preset "${presetName}" saved`);
      console.log(`Camera preset saved as "${presetName}":`, cameraData);

      // Refresh preset list if it exists
      this.updatePresetList(devToolsContainer);
    });

    devToolsContainer.appendChild(savePresetBtn);

    // Add preset list
    this.updatePresetList(devToolsContainer);

    // Add to document
    document.body.appendChild(devToolsContainer);

    // Add keyboard shortcut to toggle dev tools (Alt+C)
    document.addEventListener('keydown', (event) => {
      // Check for Alt+C combination
      if (event.altKey && event.key === 'c') {
        const toolsContainer = document.getElementById('camera-dev-tools');
        if (toolsContainer) {
          if (toolsContainer.style.display === 'none') {
            toolsContainer.style.display = 'flex';
            this.showOverlay('Camera tools shown (Alt+C)');
          } else {
            toolsContainer.style.display = 'none';
            this.showOverlay('Camera tools hidden (Alt+C)');
          }
        }
      }

      // Alt+P shortcut to log camera position without clicking button
      if (event.altKey && event.key === 'p') {
        this.logCameraPosition();
      }
    });

    // Add toggle button that stays visible even when tools are hidden
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-camera-tools';
    toggleBtn.textContent = 'C';
    toggleBtn.title = 'Toggle Camera Tools (Alt+C)';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.bottom = '20px';
    toggleBtn.style.right = '20px';
    toggleBtn.style.width = '30px';
    toggleBtn.style.height = '30px';
    toggleBtn.style.borderRadius = '50%';
    toggleBtn.style.background = 'rgba(0, 0, 0, 0.5)';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = '2px solid rgba(37, 218, 165, 0.7)';
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';
    toggleBtn.style.justifyContent = 'center';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.fontSize = '14px';
    toggleBtn.style.fontWeight = 'bold';
    toggleBtn.style.zIndex = '999';
    toggleBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

    toggleBtn.addEventListener('click', () => {
      const toolsContainer = document.getElementById('camera-dev-tools');
      if (toolsContainer) {
        if (toolsContainer.style.display === 'none') {
          toolsContainer.style.display = 'flex';
          toggleBtn.style.display = 'none'; // Hide toggle button when tools are shown
        } else {
          toolsContainer.style.display = 'none';
          toggleBtn.style.display = 'flex'; // Show toggle button when tools are hidden
        }
      }
    });

    document.body.appendChild(toggleBtn);
    toggleBtn.style.display = 'none'; // Initially hidden because tools are visible
  }

  /**
   * Update the list of camera presets in the dev tools
   * @param {HTMLElement} container - The container for dev tools
   */
  updatePresetList(container) {
    // Remove existing preset list if any
    const existingList = container.querySelector('.preset-list');
    if (existingList) {
      existingList.remove();
    }

    // Get stored presets
    let presets = localStorage.getItem('cameraPresets');
    if (!presets) return;

    presets = JSON.parse(presets);
    if (!presets.length) return;

    // Create preset list container
    const presetList = document.createElement('div');
    presetList.classList.add('preset-list');
    presetList.style.background = 'rgba(30, 30, 30, 0.8)';
    presetList.style.borderRadius = '4px';
    presetList.style.padding = '10px';
    presetList.style.maxHeight = '200px';
    presetList.style.overflowY = 'auto';

    // Add heading
    const heading = document.createElement('div');
    heading.textContent = 'Saved Positions';
    heading.style.color = 'white';
    heading.style.fontWeight = 'bold';
    heading.style.marginBottom = '5px';
    heading.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
    heading.style.paddingBottom = '5px';
    presetList.appendChild(heading);

    // Add each preset as a button
    presets.forEach((preset, index) => {
      const presetBtn = document.createElement('button');
      presetBtn.textContent = preset.name;
      presetBtn.style.background = 'rgba(60, 60, 60, 0.6)';
      presetBtn.style.color = 'white';
      presetBtn.style.border = 'none';
      presetBtn.style.padding = '5px 10px';
      presetBtn.style.borderRadius = '4px';
      presetBtn.style.margin = '5px 0';
      presetBtn.style.width = '100%';
      presetBtn.style.textAlign = 'left';
      presetBtn.style.cursor = 'pointer';
      presetBtn.style.display = 'flex';
      presetBtn.style.justifyContent = 'space-between';
      presetBtn.style.alignItems = 'center';

      // Add go to position functionality
      presetBtn.addEventListener('click', () => {
        this.setCameraPosition(preset.position, preset.target);
        this.showOverlay(`Camera moved to preset "${preset.name}"`);
      });

      // Add delete button
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '×';
      deleteBtn.style.color = 'rgba(255, 100, 100, 0.8)';
      deleteBtn.style.fontWeight = 'bold';
      deleteBtn.style.marginLeft = '5px';

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the parent button

        // Remove preset from array
        presets.splice(index, 1);

        // Save updated presets
        localStorage.setItem('cameraPresets', JSON.stringify(presets));

        // Update the list
        this.updatePresetList(container);

        this.showOverlay(`Preset "${preset.name}" deleted`);
      });

      presetBtn.appendChild(deleteBtn);
      presetList.appendChild(presetBtn);
    });

    container.appendChild(presetList);
  }
}

/**
 * Class to sequence programmatic interactions
 */
class InteractionSequencer {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.actions = [];
    this.currentStep = 0;
    this.isPlaying = false;
  }

  /**
   * Add an action to the sequence
   * @param {Function} callback - Async function to execute
   * @param {number} duration - Duration in milliseconds
   * @returns {InteractionSequencer} - This instance for chaining
   */
  addAction(callback, duration) {
    this.actions.push({ callback, duration });
    return this;
  }

  /**
   * Start the sequence
   * @returns {Promise} - Resolves when sequence completes
   */
  async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;

    // Execute all actions in sequence
    for (let i = 0; i < this.actions.length && this.isPlaying; i++) {
      this.currentStep = i;
      const { callback, duration } = this.actions[i];

      // Execute the action
      await callback();

      // Wait for specified duration
      await new Promise(resolve => setTimeout(resolve, duration));
    }

    this.isPlaying = false;
  }

  /**
   * Stop the sequence
   */
  stop() {
    this.isPlaying = false;
  }
}

export { VideoRecorder };