import { CONFIG } from "../config.js";
import { logCameraPosition } from "./cameraUtils.js";

/**
 * Show a text overlay during the video if enabled in settings
 * @param {string} text - Text to display
 * @param {object} CONFIG - Optional CONFIGuration object
 * @param {number} duration - Optional duration in milliseconds (defaults to 5000)
 */
export function showOverlay(text, CONFIG = null, duration = 5000) {
  // Get current CONFIG if not provided
  const currentConfig = CONFIG || window.appConfig?.videoRecording || {};

  // Check if overlay text is enabled in settings
  if (currentConfig.showOverlayText === false) {
    return; // Exit early if overlay is disabled
  }

  // Remove any existing overlay
  const existingOverlay = document.getElementById("video-text-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Create new overlay
  const overlay = document.createElement("div");
  overlay.id = "video-text-overlay";
  overlay.textContent = text;
  overlay.style.position = "absolute";
  overlay.style.top = "20px";
  overlay.style.left = "50%";
  overlay.style.transform = "translateX(-50%)";
  overlay.style.background = "rgba(0, 0, 0, 0.7)";
  overlay.style.color = "white";
  overlay.style.padding = "8px 16px";
  overlay.style.borderRadius = "4px";
  overlay.style.fontFamily = "Arial, sans-serif";
  overlay.style.fontSize = "16px";
  overlay.style.zIndex = "1000";

  document.body.appendChild(overlay);

  // Auto-remove after specified duration
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove();
    }
  }, duration);
}

/**
 * Show recording indicator
 * @param {Object} camera - The camera object
 * @param {Object} controls - The controls object
 * @param {Function} showOverlay - Function to show overlay messages
 * @returns {Object} - The created UI elements that need to be cleaned up
 */
export function showRecordingIndicator(camera, controls, showOverlay) {
  const indicator = document.createElement("div");
  indicator.id = "recording-indicator";
  indicator.textContent = "Recording...";
  indicator.style.position = "fixed";
  indicator.style.top = "20px";
  indicator.style.right = "20px";
  indicator.style.background = "rgba(255, 0, 0, 0.7)";
  indicator.style.color = "white";
  indicator.style.padding = "8px 16px";
  indicator.style.borderRadius = "4px";
  indicator.style.fontFamily = "Arial, sans-serif";
  indicator.style.zIndex = "1000";

  // Add recording circle
  const circle = document.createElement("span");
  circle.style.display = "inline-block";
  circle.style.width = "10px";
  circle.style.height = "10px";
  circle.style.background = "red";
  circle.style.borderRadius = "50%";
  circle.style.marginRight = "8px";
  circle.style.animation = "pulse 1s infinite";

  // Add animation style
  const style = document.createElement("style");
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

  // Add a "Log Camera Position" button only if camera tools are enabled
  let logPositionBtn = null;
  if (CONFIG.development.videoRecording.showCameraTools) {
    logPositionBtn = document.createElement("button");
    logPositionBtn.textContent = "Log Camera Position";
    logPositionBtn.style.background = "rgba(37, 218, 165, 0.9)";
    logPositionBtn.style.color = "white";
    logPositionBtn.style.border = "none";
    logPositionBtn.style.padding = "8px 16px";
    logPositionBtn.style.borderRadius = "4px";
    logPositionBtn.style.fontFamily = "Arial, sans-serif";
    logPositionBtn.style.cursor = "pointer";
    logPositionBtn.style.fontSize = "14px";
    logPositionBtn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

    // Add event listener
    logPositionBtn.addEventListener("click", () => {
      const cameraData = logCameraPosition(camera, controls, showOverlay);

      if (cameraData) {
        // Copy to clipboard functionality
        const positionStr = `position: { x: ${cameraData.position.x.toFixed(
          2
        )}, y: ${cameraData.position.y.toFixed(
          2
        )}, z: ${cameraData.position.z.toFixed(2)} }`;
        const targetStr = `target: { x: ${cameraData.target.x.toFixed(
          2
        )}, y: ${cameraData.target.y.toFixed(
          2
        )}, z: ${cameraData.target.z.toFixed(2)} }`;
        const fullStr = `${positionStr}, ${targetStr}`;

        try {
          navigator.clipboard.writeText(fullStr).then(() => {
            // Show confirmation tooltip
            const tooltip = document.createElement("div");
            tooltip.textContent = "Copied to clipboard!";
            tooltip.style.position = "fixed";
            tooltip.style.bottom = "80px";
            tooltip.style.right = "20px";
            tooltip.style.background = "rgba(0,0,0,0.8)";
            tooltip.style.color = "white";
            tooltip.style.padding = "5px 10px";
            tooltip.style.borderRadius = "4px";
            tooltip.style.fontSize = "12px";
            tooltip.style.zIndex = "1001";
            document.body.appendChild(tooltip);

            // Remove after 2 seconds
            setTimeout(() => tooltip.remove(), 2000);
          });
        } catch (err) {
          console.error("Could not copy to clipboard:", err);
        }
      }
    });

    document.body.appendChild(logPositionBtn);
  }

  // Return elements so they can be cleaned up by the caller
  return {
    indicator,
    style,
    logPositionBtn,
    cleanup: () => {
      if (indicator && indicator.parentNode) indicator.remove();
      if (style && style.parentNode) style.remove();
      if (logPositionBtn && logPositionBtn.parentNode) logPositionBtn.remove();
    },
  };
}

/**
 * Show success message
 * @param {string} message - The success message
 */
export function showRecordingSuccessMessage(message) {
  const successNotice = document.createElement("div");
  successNotice.id = "recording-success-message";
  successNotice.style.position = "fixed";
  successNotice.style.top = "20px";
  successNotice.style.left = "50%";
  successNotice.style.transform = "translateX(-50%)";
  successNotice.style.background = "rgba(37, 218, 165, 0.9)";
  successNotice.style.color = "white";
  successNotice.style.padding = "10px 20px";
  successNotice.style.borderRadius = "4px";
  successNotice.style.zIndex = "10000";
  successNotice.style.fontFamily = "Arial, sans-serif";
  successNotice.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
  successNotice.style.animation = "fadeIn 0.3s";

  successNotice.textContent = message;

  document.body.appendChild(successNotice);

  setTimeout(() => {
    if (successNotice.parentNode) {
      successNotice.style.opacity = "0";
      successNotice.style.transition = "opacity 0.5s";
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
export function showRecordingErrorMessage(message) {
  const errorNotice = document.createElement("div");
  errorNotice.id = "recording-error-message";
  errorNotice.style.position = "fixed";
  errorNotice.style.top = "20px";
  errorNotice.style.left = "50%";
  errorNotice.style.transform = "translateX(-50%)";
  errorNotice.style.background = "rgba(255, 61, 90, 0.9)";
  errorNotice.style.color = "white";
  errorNotice.style.padding = "10px 20px";
  errorNotice.style.borderRadius = "4px";
  errorNotice.style.zIndex = "10000";
  errorNotice.style.fontFamily = "Arial, sans-serif";
  errorNotice.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
  errorNotice.style.animation = "fadeIn 0.3s";

  errorNotice.textContent = message;

  document.body.appendChild(errorNotice);

  setTimeout(() => {
    if (errorNotice.parentNode) {
      errorNotice.style.opacity = "0";
      errorNotice.style.transition = "opacity 0.5s";
      setTimeout(() => {
        if (errorNotice.parentNode) {
          errorNotice.remove();
        }
      }, 500);
    }
  }, 5000);
}

/**
 * Show warning message
 * @param {string} message - The warning message
 */
export function showRecordingWarningMessage(message) {
  const warningNotice = document.createElement("div");
  warningNotice.id = "recording-warning-message";
  warningNotice.style.position = "fixed";
  warningNotice.style.top = "20px";
  warningNotice.style.left = "50%";
  warningNotice.style.transform = "translateX(-50%)";
  warningNotice.style.background = "rgba(255, 165, 0, 0.9)";
  warningNotice.style.color = "white";
  warningNotice.style.padding = "10px 20px";
  warningNotice.style.borderRadius = "4px";
  warningNotice.style.zIndex = "10000";
  warningNotice.style.fontFamily = "Arial, sans-serif";
  warningNotice.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
  warningNotice.style.animation = "fadeIn 0.3s";

  warningNotice.textContent = message;

  document.body.appendChild(warningNotice);

  setTimeout(() => {
    if (warningNotice.parentNode) {
      warningNotice.style.opacity = "0";
      warningNotice.style.transition = "opacity 0.5s";
      setTimeout(() => {
        if (warningNotice.parentNode) {
          warningNotice.remove();
        }
      }, 500);
    }
  }, 6000);
}
