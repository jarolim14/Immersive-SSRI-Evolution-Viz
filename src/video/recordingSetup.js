import { CONFIG } from "../config.js";
import {
  showRecordingWarningMessage,
  showRecordingErrorMessage,
} from "./messagesUtils.js";

/**
 * Check supported MIME types for MediaRecorder
 * @returns {Array} - List of supported MIME types
 */
export function getSupportedMimeTypes() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  return types.filter((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Get the preferred MIME type based on config settings and browser support
 * @param {Array} supportedMimeTypes - List of supported MIME types
 * @returns {string} - The preferred MIME type
 */
export function getPreferredMimeType(supportedMimeTypes) {
  // Get user preference from config
  const preferredFormat =
    CONFIG.development.videoRecording.preferredFormat || "webm";

  // Filter supported types by preferred format
  const formatTypes = supportedMimeTypes.filter((type) =>
    preferredFormat === "webm" ? type.includes("webm") : type.includes("mp4")
  );

  // Return the first matching type, or fall back to any supported type
  return formatTypes.length > 0 ? formatTypes[0] : supportedMimeTypes[0];
}

/**
 * Setup and initialize the video recorder
 * @param {HTMLCanvasElement} canvas - The canvas element to record
 * @param {number} duration - Total duration in milliseconds
 * @param {number} fps - Frames per second (default: 30)
 * @returns {Promise<MediaRecorder>} - The configured MediaRecorder instance
 */
export async function setupRecorder(canvas, duration = 60000, fps = 30) {
  // Clear previous recording data
  const frames = [];

  // Store a reference to any screen capture stream
  let screenCaptureStream = null;

  // Check if MediaRecorder is supported
  const hasMediaRecorderSupport = typeof MediaRecorder !== "undefined";
  const supportedMimeTypes = hasMediaRecorderSupport
    ? getSupportedMimeTypes()
    : [];

  if (!hasMediaRecorderSupport) {
    console.warn(
      "MediaRecorder API is not supported in this browser. Using fallback method."
    );
    return setupFallbackRecorder(canvas, duration, fps);
  }

  // Check if we have any supported MIME types
  if (supportedMimeTypes.length === 0) {
    console.warn("No supported video MIME types found. Using fallback method.");
    return setupFallbackRecorder(canvas, duration, fps);
  }

  try {
    let stream;
    let usedScreenCapture = false;

    // Debug: Check for getDisplayMedia support
    console.log("Checking for screen capture support...");
    console.log("navigator.mediaDevices exists:", !!navigator.mediaDevices);
    console.log("Current protocol:", window.location.protocol);
    console.log("Is secure context:", window.isSecureContext);
    console.log("User agent:", navigator.userAgent);

    // Create debug element to track capture type
    let captureTypeIndicator = null;
    if (CONFIG.development.videoRecording.showAllUI) {
      captureTypeIndicator = createCaptureTypeIndicator("Initializing...");
    }

    // Check if we're running on localhost/127.0.0.1, which counts as secure
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes(".local");

    const hasSecureContext = window.isSecureContext || isLocalhost;

    // Verify if getDisplayMedia is available
    const hasDisplayMedia = !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function"
    );

    console.log(
      "Screen capture available:",
      hasDisplayMedia && hasSecureContext
    );

    if (!hasSecureContext) {
      console.warn(
        "Screen Capture API requires a secure context (HTTPS or localhost)"
      );
      if (CONFIG.development.videoRecording.showAllUI) {
        updateCaptureTypeIndicator(
          captureTypeIndicator,
          "Not in secure context, using canvas only"
        );
        showRecordingErrorMessage(
          "Screen capture requires HTTPS. Using canvas-only recording."
        );
      }
    }

    // Try to get system audio stream first
    let audioStream = null;
    try {
      console.log("Attempting to capture system audio...");
      // Try to request audio capture - this works in Chrome with proper permissions
      if (hasSecureContext && navigator.mediaDevices) {
        const constraints = {
          audio: {
            // Try to get system audio (what the user hears)
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        };

        audioStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Audio capture successful!");
      }
    } catch (audioError) {
      console.warn("Could not capture system audio:", audioError.message);
      console.log("Continuing without audio capture");
    }

    // Try to use screen capture first (will capture modals and UI elements)
    if (hasDisplayMedia && hasSecureContext) {
      try {
        console.log("Attempting to use screen capture for recording...");
        if (CONFIG.development.videoRecording.showAllUI) {
          updateCaptureTypeIndicator(
            captureTypeIndicator,
            "Waiting for screen selection..."
          );

          // Create a message to guide user through screen selection
          const screenSelectionGuide = showScreenSelectionGuide();
        }

        // Prompt user to select screen/window to capture
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // Browser-specific options for best results
            ...(navigator.userAgent.includes("Safari") &&
            !navigator.userAgent.includes("Chrome")
              ? {
                  displaySurface: "window", // In Safari, focus on window selection
                }
              : {
                  displaySurface: "browser", // Prefer browser tab in Chrome/Firefox/Edge
                  logicalSurface: true, // Capture the logical surface
                }),
            frameRate: { ideal: fps },
            cursor: "always",
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight },
          },
          // In Chrome, we can capture audio with the screen
          audio: true,
          // These are experimental options for Chrome
          ...(navigator.userAgent.includes("Chrome")
            ? {
                preferCurrentTab: true,
                selfBrowserSurface: "include",
              }
            : {}),
        });

        // Store the stream for cleanup later
        screenCaptureStream = displayStream;

        // Hide the guide once selection is complete
        if (CONFIG.development.videoRecording.showAllUI) {
          hideScreenSelectionGuide();
        }

        // Check what was captured
        const videoTrack = displayStream.getVideoTracks()[0];
        if (videoTrack) {
          console.log("Screen capture video track info:", videoTrack.label);
          const settings = videoTrack.getSettings();
          console.log("Video track settings:", settings);

          // Check if we got audio from the screen capture
          const screenAudioTracks = displayStream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            console.log(
              "Screen capture includes audio tracks:",
              screenAudioTracks.length
            );
            // We'll use the screen audio instead of the separate audio stream
            if (audioStream) {
              // Stop the separate audio stream as we'll use the screen audio
              audioStream.getAudioTracks().forEach((track) => track.stop());
              audioStream = null;
            }
          }

          // Determine if we're capturing the correct content
          const isLikelyBrowserContent =
            videoTrack.label.includes("tab") ||
            videoTrack.label.includes("Tab") ||
            videoTrack.label.includes("browser") ||
            videoTrack.label.includes("Browser") ||
            videoTrack.label.includes("Chrome") ||
            videoTrack.label.includes("Safari") ||
            videoTrack.label.includes("Firefox") ||
            (settings && settings.displaySurface === "browser");

          // Use screen capture if it's likely capturing browser content
          if (isLikelyBrowserContent) {
            console.log(
              "Using screen capture for recording - this should include UI elements"
            );
            stream = displayStream;
            usedScreenCapture = true;
            if (CONFIG.development.videoRecording.showAllUI) {
              updateCaptureTypeIndicator(
                captureTypeIndicator,
                "Recording with screen capture"
              );
            }
          } else {
            console.log(
              "Screen capture is capturing a different surface, not the browser tab"
            );
            console.log("Selected surface appears to be: ", videoTrack.label);
            console.log("Falling back to canvas capture");

            // Stop the screen capture stream since we're not using it
            displayStream.getTracks().forEach((track) => track.stop());
            screenCaptureStream = null;

            // Use canvas capture as fallback
            stream = canvas.captureStream(fps);
            if (CONFIG.development.videoRecording.showAllUI) {
              updateCaptureTypeIndicator(
                captureTypeIndicator,
                "Using canvas capture (no UI elements)"
              );
            }
          }
        } else {
          console.warn("No video track found in screen capture stream");
          stream = canvas.captureStream(fps);
          if (CONFIG.development.videoRecording.showAllUI) {
            updateCaptureTypeIndicator(
              captureTypeIndicator,
              "No video track - using canvas only"
            );
          }
        }
      } catch (error) {
        console.warn("Screen capture failed:", error.message);
        console.log("Falling back to canvas capture method");
        if (CONFIG.development.videoRecording.showAllUI) {
          updateCaptureTypeIndicator(
            captureTypeIndicator,
            "Screen capture failed - using canvas only"
          );
        }
        // If the user denied permission or there was an error, use canvas capture
        stream = canvas.captureStream(fps);
      }
    } else {
      // Screen capture not supported, use canvas capture
      console.log("Screen capture not available, using canvas capture method");
      stream = canvas.captureStream(fps);
      if (CONFIG.development.videoRecording.showAllUI) {
        updateCaptureTypeIndicator(
          captureTypeIndicator,
          "Using canvas capture only"
        );
      }
    }

    // If we have a separate audio stream and are using canvas capture, combine them
    if (audioStream && !usedScreenCapture) {
      console.log("Combining canvas video with audio stream");
      // Create a new MediaStream with both video and audio tracks
      const combinedStream = new MediaStream();

      // Add all video tracks from the canvas stream
      stream.getVideoTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });

      // Add all audio tracks from the audio stream
      audioStream.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });

      // Use the combined stream
      stream = combinedStream;
    }

    // Get the preferred MIME type
    const mimeType = getPreferredMimeType(supportedMimeTypes);
    console.log(`Using MIME type: ${mimeType}`);

    // Setup recorder
    const options = {
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps
      audioBitsPerSecond: 128000, // 128 kbps
    };

    const recorder = new MediaRecorder(stream, options);

    // Set up data handling
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Set up completion handling
    recorder.onstop = () => {
      console.log("Recording stopped. Processing chunks...");
      const blob = new Blob(chunks, { type: mimeType });
      console.log(
        `Recording finished. Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`
      );

      // Remove indicator
      if (CONFIG.development.videoRecording.showAllUI) {
        removeCaptureTypeIndicator(captureTypeIndicator);
      }

      // Download video
      downloadVideo(blob, CONFIG.development.videoRecording.showAllUI);

      // Clean up screen capture stream if it was used
      if (screenCaptureStream) {
        console.log("Cleaning up screen capture stream");
        screenCaptureStream.getTracks().forEach((track) => track.stop());
        screenCaptureStream = null;
      }
    };

    return recorder;
  } catch (error) {
    console.error("Error setting up recorder:", error);
    if (CONFIG.development.videoRecording.showAllUI) {
      showRecordingErrorMessage(`Failed to setup recorder: ${error.message}`);
    }
    return setupFallbackRecorder(canvas, duration, fps);
  }
}

/**
 * Setup fallback recorder that captures frames as images
 * @param {HTMLCanvasElement} canvas - The canvas element to record
 * @param {number} duration - Total duration in milliseconds
 * @param {number} fps - Frames per second
 * @returns {Object} - A mock recorder object
 */
function setupFallbackRecorder(canvas, duration, fps) {
  console.log("Using fallback frame-by-frame recording method");
  const frames = [];

  // Calculate frame interval in milliseconds
  const frameIntervalMs = 1000 / fps;

  // Create a mock recorder object with basic functionality
  const recorder = {
    state: "inactive",
    start: () => {
      recorder.state = "recording";
      const recordingStartTime = performance.now();
      let frameInterval = null;

      // Capture frames at regular intervals
      frameInterval = setInterval(() => {
        // Check if we've exceeded the duration
        if (performance.now() - recordingStartTime >= duration) {
          recorder.stop();
          return;
        }

        // Capture frame
        captureFrame(canvas, frames);
      }, frameIntervalMs);
    },
    stop: () => {
      recorder.state = "inactive";

      // Stop capturing frames
      if (frameInterval) {
        clearInterval(frameInterval);
      }

      // Process and download frames
      processFallbackFrames(frames, fps);
    },
  };

  return recorder;
}

/**
 * Capture a single frame from the canvas
 * @param {HTMLCanvasElement} canvas - The canvas to capture from
 * @param {Array} frames - Array to store the captured frames
 */
function captureFrame(canvas, frames) {
  // Create a copy of the canvas data
  canvas.toBlob(
    (blob) => {
      if (blob) {
        frames.push(blob);
      }
    },
    "image/jpeg",
    0.95
  );
}

/**
 * Process fallback frames and offer download
 * @param {Array} frames - Array of captured frame blobs
 * @param {number} fps - Frames per second
 */
function processFallbackFrames(frames, fps) {
  if (frames.length === 0) {
    console.error("No frames captured");
    return;
  }

  console.log(`Captured ${frames.length} frames`);

  // Create a zip file containing all frames
  import("https://unpkg.com/jszip@3.10.1/dist/jszip.min.js")
    .then((module) => {
      const JSZip = window.JSZip;
      const zip = new JSZip();

      // Add frames to zip
      frames.forEach((blob, index) => {
        const fileName = `frame_${index.toString().padStart(5, "0")}.jpg`;
        zip.file(fileName, blob);
      });

      // Add instructions file
      zip.file(
        "README.txt",
        "These frames can be converted to a video using FFmpeg with the command:\n" +
          "ffmpeg -framerate " +
          fps +
          " -i frame_%05d.jpg -c:v libx264 -pix_fmt yuv420p visualization_demo.mp4\n\n" +
          "If you have ImageMagick installed, you can also use:\n" +
          "convert -delay " +
          100 / fps +
          " -quality 95 frame_*.jpg visualization_demo.mp4"
      );

      // Generate zip file
      zip.generateAsync({ type: "blob" }).then((content) => {
        // Create download link
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "network-visualization-frames.zip";
        a.textContent = "Download Video Frames (ZIP)";
        a.style.position = "fixed";
        a.style.top = "20px";
        a.style.left = "20px";
        a.style.zIndex = "1000";
        a.style.background = "#25daa5";
        a.style.color = "white";
        a.style.padding = "10px 15px";
        a.style.borderRadius = "4px";
        a.style.textDecoration = "none";
        document.body.appendChild(a);

        console.log(
          "Frame capture complete! Click the download button to save."
        );
      });
    })
    .catch((error) => {
      console.error("Error creating zip file:", error);

      // Fallback to downloading individual frames
      downloadIndividualFrames(frames);
    });
}

/**
 * Fallback method to download individual frames
 * @param {Array} frames - Array of captured frame blobs
 */
function downloadIndividualFrames(frames) {
  // Create a container for download links
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.left = "20px";
  container.style.zIndex = "1000";
  container.style.background = "rgba(0, 0, 0, 0.8)";
  container.style.padding = "15px";
  container.style.borderRadius = "8px";
  container.style.maxHeight = "80vh";
  container.style.overflowY = "auto";

  // Add heading
  const heading = document.createElement("h3");
  heading.textContent = "Download Video Frames";
  heading.style.color = "white";
  heading.style.marginTop = "0";
  container.appendChild(heading);

  // Add instruction
  const instruction = document.createElement("p");
  instruction.textContent =
    "Download these frames and convert them to video using FFmpeg or similar tools.";
  instruction.style.color = "white";
  container.appendChild(instruction);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.position = "absolute";
  closeButton.style.top = "10px";
  closeButton.style.right = "10px";
  closeButton.style.background = "#ff3d5a";
  closeButton.style.border = "none";
  closeButton.style.color = "white";
  closeButton.style.borderRadius = "4px";
  closeButton.style.padding = "5px 10px";
  closeButton.addEventListener("click", () => container.remove());
  container.appendChild(closeButton);

  // Add download links for first 10 frames with a "Download All" option
  for (let i = 0; i < Math.min(10, frames.length); i++) {
    const url = URL.createObjectURL(frames[i]);
    const a = document.createElement("a");
    a.href = url;
    a.download = `frame_${i.toString().padStart(5, "0")}.jpg`;
    a.textContent = `Frame ${i}`;
    a.style.display = "block";
    a.style.color = "#25daa5";
    a.style.marginBottom = "5px";
    container.appendChild(a);
  }

  if (frames.length > 10) {
    const moreText = document.createElement("p");
    moreText.textContent = `+ ${frames.length - 10} more frames`;
    moreText.style.color = "white";
    container.appendChild(moreText);
  }

  document.body.appendChild(container);
}

/**
 * Creates a visual indicator for the type of capture being used
 * @param {string} initialText - Initial text to display
 * @returns {HTMLElement} - The created indicator element
 */
function createCaptureTypeIndicator(initialText) {
  // Remove any existing indicator
  removeCaptureTypeIndicator();

  const indicator = document.createElement("div");
  indicator.id = "capture-type-indicator";
  indicator.textContent = initialText;
  indicator.style.position = "fixed";
  indicator.style.bottom = "10px";
  indicator.style.left = "10px";
  indicator.style.background = "rgba(0, 0, 0, 0.8)";
  indicator.style.color = "white";
  indicator.style.padding = "5px 10px";
  indicator.style.borderRadius = "4px";
  indicator.style.fontFamily = "monospace";
  indicator.style.fontSize = "12px";
  indicator.style.zIndex = "10000";
  indicator.style.pointerEvents = "none"; // Don't interfere with user interaction

  document.body.appendChild(indicator);

  return indicator;
}

/**
 * Updates the capture type indicator text
 * @param {HTMLElement} indicator - The indicator element
 * @param {string} text - New text to display
 */
function updateCaptureTypeIndicator(indicator, text) {
  if (indicator) {
    indicator.textContent = text;

    // Set color based on capture type
    if (text.includes("screen capture")) {
      indicator.style.backgroundColor = "rgba(37, 218, 165, 0.8)";
    } else if (text.includes("canvas capture")) {
      indicator.style.backgroundColor = "rgba(255, 61, 90, 0.8)";
    } else if (text.includes("Error")) {
      indicator.style.backgroundColor = "rgba(255, 0, 0, 0.8)";
    }
  } else {
    return createCaptureTypeIndicator(text);
  }
}

/**
 * Removes the capture type indicator
 * @param {HTMLElement} indicator - The indicator element to remove
 */
function removeCaptureTypeIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.remove();
  } else {
    const existingIndicator = document.getElementById("capture-type-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }
}

/**
 * Shows a guide to help the user select the correct screen for capture
 * @returns {HTMLElement} - The created guide element
 */
function showScreenSelectionGuide() {
  // Remove any existing guide
  hideScreenSelectionGuide();

  // Create a new guide
  const guide = document.createElement("div");
  guide.id = "screen-selection-guide";
  guide.style.position = "fixed";
  guide.style.top = "50%";
  guide.style.left = "50%";
  guide.style.transform = "translate(-50%, -50%)";
  guide.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
  guide.style.color = "white";
  guide.style.padding = "20px";
  guide.style.borderRadius = "10px";
  guide.style.maxWidth = "500px";
  guide.style.textAlign = "center";
  guide.style.zIndex = "999999";
  guide.style.boxShadow = "0 0 20px rgba(0, 0, 0, 0.5)";
  guide.style.fontFamily = "Arial, sans-serif";

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

  return guide;
}

/**
 * Hide the screen selection guide
 */
function hideScreenSelectionGuide() {
  const guide = document.getElementById("screen-selection-guide");
  if (guide) {
    guide.remove();
  }
}

/**
 * Download video blob
 * @param {Blob} blob - Video blob
 * @param {boolean} showUI - Whether to show UI elements
 */
export function downloadVideo(blob, showUI) {
  const url = URL.createObjectURL(blob);
  const preferredFormat =
    CONFIG.development.videoRecording.preferredFormat || "webm";
  const shouldConvert = preferredFormat === "mp4" && !blob.type.includes("mp4");

  console.log(`Video recorded in format: ${blob.type}`);
  console.log(`Preferred format in config: ${preferredFormat}`);
  console.log(`Should attempt conversion: ${shouldConvert}`);

  // Only perform conversion if specifically requested in config AND needed
  const processBlob = shouldConvert
    ? ensureMp4Format(blob)
    : Promise.resolve(blob);

  processBlob
    .then((finalBlob) => {
      const finalUrl =
        finalBlob === blob ? url : URL.createObjectURL(finalBlob);
      const format = finalBlob.type.includes("mp4") ? "mp4" : "webm";

      console.log(`Downloading video as ${format} format`);

      // Try to find the download button in the UI
      const downloadButton = document.querySelector(
        "#video-control-buttons button:nth-child(2)"
      );

      if (downloadButton) {
        // Use the existing button
        console.log("Using existing download button");

        // Make it visible
        downloadButton.style.display = "flex";

        // Set the download attributes
        downloadButton.onclick = () => {
          // Create a temporary link to trigger the download
          const tempLink = document.createElement("a");
          tempLink.href = finalUrl;
          tempLink.download = `network-visualization-demo.${format}`;
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);

          // Change button appearance after download
          downloadButton.style.background = "#666";

          // Preserve the download icon but update text
          const downloadIcon = downloadButton.querySelector("span");
          if (downloadIcon) {
            downloadButton.textContent = "Video Downloaded";
            downloadButton.prepend(downloadIcon);
          } else {
            downloadButton.textContent = "Video Downloaded";
          }

          // Clean up URL after download
          setTimeout(() => {
            URL.revokeObjectURL(finalUrl);
            if (finalUrl !== url) {
              URL.revokeObjectURL(url);
            }
          }, 1000);
        };

        console.log("Download button ready");
      } else if (CONFIG.development.videoRecording.showAllUI) {
        // Fallback: Create download link as before - only if UI is enabled
        console.log("Creating new download link (fallback)");
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `network-visualization-demo.${format}`;
        a.textContent = `Download Video (${format.toUpperCase()})`;
        a.style.position = "fixed";
        a.style.bottom = "20px";
        a.style.left = "200px"; // Position next to record button
        a.style.zIndex = "1000";
        a.style.background = "#25daa5";
        a.style.color = "white";
        a.style.padding = "10px 15px";
        a.style.borderRadius = "4px";
        a.style.textDecoration = "none";
        a.style.fontFamily = "Arial, sans-serif";
        a.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        document.body.appendChild(a);

        // Clean up URL after download
        a.addEventListener("click", () => {
          setTimeout(() => {
            URL.revokeObjectURL(finalUrl);
            if (finalUrl !== url) {
              URL.revokeObjectURL(url);
            }
            // Keep the button visible but change its appearance
            a.style.background = "#666";
            a.textContent = "Video Downloaded";
          }, 1000);
        });
      } else {
        // If UI is disabled, still provide a download through the browser
        console.log(
          "UI disabled - using direct download without visual elements"
        );
        // Create a temporary link to trigger the download without showing UI
        const tempLink = document.createElement("a");
        tempLink.href = finalUrl;
        tempLink.download = `network-visualization-demo.${format}`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        // Clean up URL
        setTimeout(() => {
          URL.revokeObjectURL(finalUrl);
          if (finalUrl !== url) {
            URL.revokeObjectURL(url);
          }
        }, 1000);
      }

      console.log(
        "Video recording complete! Download ready in selected format."
      );
    })
    .catch((error) => {
      console.error("Error processing video:", error);
      // Fall back to original blob if processing fails
      fallbackDownload(blob, url);
    });
}

/**
 * Fall back to original blob download if conversion fails
 * @param {Blob} blob - Original video blob
 * @param {string} url - Object URL for the blob
 */
function fallbackDownload(blob, url) {
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "network-visualization-demo." +
    (blob.type.includes("mp4") ? "mp4" : "webm");
  a.textContent = "Download Video (Original Format)";
  a.style.position = "fixed";
  a.style.bottom = "20px";
  a.style.left = "200px";
  a.style.zIndex = "1000";
  a.style.background = "#ff3d5a";
  a.style.color = "white";
  a.style.padding = "10px 15px";
  a.style.borderRadius = "4px";
  a.style.textDecoration = "none";
  document.body.appendChild(a);
  console.log("Created fallback download link due to conversion failure");
}

/**
 * Ensure the video is in MP4 format, converting if necessary and supported
 * @param {Blob} blob - Original video blob
 * @returns {Promise<Blob>} - Promise resolving to MP4 blob or original if conversion not possible
 */
async function ensureMp4Format(blob) {
  // If already MP4, return as is
  if (blob.type.includes("mp4")) {
    console.log("Video is already in MP4 format");
    return blob;
  }

  console.log("Original video format:", blob.type);
  console.log("Checking if MP4 conversion is possible...");

  // Check if MediaRecorder supports MP4
  if (!MediaRecorder.isTypeSupported("video/mp4")) {
    console.warn("MP4 format not supported by MediaRecorder in this browser");
    showRecordingWarningMessage(
      "MP4 not supported by your browser. Using WebM instead."
    );
    return blob;
  }

  try {
    // Try to use the browser's built-in conversion capability if available
    console.log("Attempting MP4 conversion...");

    // Create a temporary video element to use for conversion
    const video = document.createElement("video");
    video.style.display = "none";
    document.body.appendChild(video);

    // Load the WebM video
    video.src = URL.createObjectURL(blob);

    // Wait for metadata to load
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });

    // Get video duration and dimensions
    const duration = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;

    console.log(`Video metadata: ${width}x${height}, ${duration.toFixed(2)}s`);

    // Only proceed if we can get the video metadata
    if (!width || !height || !duration) {
      throw new Error("Could not get video metadata");
    }

    // Create a canvas and get its context for frame capture
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Create a MediaRecorder for the MP4 output
    const fps = CONFIG.development.videoRecording.defaultFps || 30;
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/mp4",
      videoBitsPerSecond: 8000000, // 8 Mbps for high quality
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // Create a promise that resolves when recording is complete
    const recordingPromise = new Promise((resolve) => {
      recorder.onstop = () => {
        const mp4Blob = new Blob(chunks, { type: "video/mp4" });
        resolve(mp4Blob);

        // Clean up
        URL.revokeObjectURL(video.src);
        document.body.removeChild(video);
        document.body.removeChild(canvas);
      };
    });

    // Start recording
    recorder.start();

    // Process video frames at the specified FPS
    let currentTime = 0;
    const frameInterval = 1000 / fps;

    // Notify user
    showRecordingWarningMessage(
      "Converting WebM to MP4. This may take a moment..."
    );

    // Process video frame by frame
    while (currentTime < duration * 1000) {
      video.currentTime = currentTime / 1000;
      await new Promise(requestAnimationFrame);
      ctx.drawImage(video, 0, 0, width, height);
      currentTime += frameInterval;
    }

    // Stop recording and get the resulting MP4 blob
    recorder.stop();
    return await recordingPromise;
  } catch (error) {
    console.error("MP4 conversion failed:", error);
    showRecordingWarningMessage(
      "MP4 conversion failed. Using WebM format instead."
    );
    return blob; // Fall back to original format
  }
}
