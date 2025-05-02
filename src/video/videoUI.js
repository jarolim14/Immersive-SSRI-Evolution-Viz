import { CONFIG } from '../config.js';
import { VideoRecorder } from './videoRecorder.js';

/**
 * Manages the UI elements for video recording functionality
 */
class VideoUI {
  constructor() {
    this.videoRecorder = null;
    this.recordButton = null;
    this.downloadButton = null;
    this.modal = null;
  }

  /**
   * Initialize the video UI and recorder
   * @param {HTMLCanvasElement} canvas - The canvas element to record
   * @param {Object} scene - The Three.js scene
   * @param {Object} camera - The Three.js camera
   * @param {Object} controls - The OrbitControls instance
   */
  initialize(canvas, scene, camera, controls) {
    // Only initialize if development mode and video recording are enabled
    if (!CONFIG.development.enabled || !CONFIG.development.videoRecording.enabled) {
      console.log('Video recording feature is disabled in configuration');
      return;
    }

    try {
      // Initialize video recorder
      console.log('Initializing video recorder...');
      this.videoRecorder = new VideoRecorder(canvas, scene, camera, controls);
      console.log('Video recorder initialized successfully');

      // Initialize UI components
      this.initializeVideoRecordingModal();

      // Create record button if configured
      if (CONFIG.development.videoRecording.showButton) {
        this.createRecordButton();
      }

      // Small delay to ensure modal UI elements are available
      setTimeout(() => {
        const modal = document.getElementById('videoRecordingModal');
        if (modal && modal.style.display === 'block') {
          console.log('Updating compatibility status for visible modal');
          this.updateCompatibilityStatus();
        }
      }, 100);
    } catch (error) {
      console.error('Failed to initialize video UI:', error);
      this.videoRecorder = null;
    }
  }

  /**
   * Create record button
   */
  createRecordButton() {
    // Create a container for our buttons in the lower left
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'video-control-buttons';
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.bottom = '20px';
    buttonContainer.style.left = '20px';
    buttonContainer.style.zIndex = '1000';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '15px'; // Increased spacing between buttons
    buttonContainer.style.padding = '10px';
    buttonContainer.style.borderRadius = '8px';
    buttonContainer.style.background = 'rgba(0, 0, 0, 0.1)'; // Subtle background
    document.body.appendChild(buttonContainer);

    // Add shared styles for buttons
    const buttonStyle = `
      transition: all 0.2s ease;
      transform: translateY(0);
    `;

    const buttonHoverStyle = `
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;

    // Add styles to the document
    const style = document.createElement('style');
    style.textContent = `
      #video-control-buttons button:hover {
        ${buttonHoverStyle}
      }
    `;
    document.head.appendChild(style);

    // Create record button
    this.recordButton = document.createElement('button');
    this.recordButton.textContent = 'Record Demo Video';
    this.recordButton.style.background = '#ff3d5a';
    this.recordButton.style.color = 'white';
    this.recordButton.style.border = 'none';
    this.recordButton.style.borderRadius = '4px';
    this.recordButton.style.padding = '10px 15px';
    this.recordButton.style.cursor = 'pointer';
    this.recordButton.style.fontFamily = 'Arial, sans-serif';
    this.recordButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    this.recordButton.style.display = 'flex';
    this.recordButton.style.alignItems = 'center';
    this.recordButton.style.cssText += buttonStyle;

    // Add recording icon
    const recordIcon = document.createElement('span');
    recordIcon.innerHTML = '●';  // Dot character
    recordIcon.style.color = 'white';
    recordIcon.style.marginRight = '8px';
    recordIcon.style.fontSize = '12px';
    this.recordButton.prepend(recordIcon);

    this.recordButton.addEventListener('click', () => {
      console.log('Record button clicked');

      // Reset download button state if it exists
      if (this.downloadButton) {
        // Reset appearance
        this.downloadButton.style.background = '#25daa5';

        // Remove any click handlers
        this.downloadButton.onclick = null;

        // Hide it again until new recording is ready
        this.downloadButton.style.display = 'none';

        // Reset text and ensure icon is present
        this.downloadButton.textContent = 'Download Video';

        // Recreate download icon if needed
        const downloadIcon = document.createElement('span');
        downloadIcon.innerHTML = '↓';  // Down arrow
        downloadIcon.style.marginRight = '8px';
        downloadIcon.style.fontWeight = 'bold';
        this.downloadButton.prepend(downloadIcon);
      }

      this.showVideoRecordingModal();
    });

    // Create download button (initially hidden)
    this.downloadButton = document.createElement('button');
    this.downloadButton.textContent = 'Download Video';
    this.downloadButton.style.background = '#25daa5';
    this.downloadButton.style.color = 'white';
    this.downloadButton.style.border = 'none';
    this.downloadButton.style.borderRadius = '4px';
    this.downloadButton.style.padding = '10px 15px';
    this.downloadButton.style.cursor = 'pointer';
    this.downloadButton.style.fontFamily = 'Arial, sans-serif';
    this.downloadButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    this.downloadButton.style.display = 'none'; // Initially hidden
    this.downloadButton.style.alignItems = 'center';
    this.downloadButton.style.cssText += buttonStyle;

    // Add download icon
    const downloadIcon = document.createElement('span');
    downloadIcon.innerHTML = '↓';  // Down arrow
    downloadIcon.style.marginRight = '8px';
    downloadIcon.style.fontWeight = 'bold';
    this.downloadButton.prepend(downloadIcon);

    // Add both buttons to the container
    buttonContainer.appendChild(this.recordButton);
    buttonContainer.appendChild(this.downloadButton);
  }

  /**
   * Initialize the video recording modal
   */
  initializeVideoRecordingModal() {
    const modal = document.getElementById('videoRecordingModal');
    if (!modal) {
      console.error('Video recording modal element not found. Cannot initialize.');
      return;
    }

    console.log('Initializing video recording modal');

    const closeBtn = document.getElementById('videoRecordingCloseBtn');
    if (!closeBtn) {
      console.error('Modal close button not found');
      return;
    }

    // Add close button event
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      modal.classList.remove('show');
    });

    // Add start recording button
    const startRecordingBtn = document.createElement('button');
    startRecordingBtn.textContent = 'Start Recording';
    startRecordingBtn.classList.add('start-recording-btn');
    startRecordingBtn.style.background = '#ff3d5a';
    startRecordingBtn.style.color = 'white';
    startRecordingBtn.style.border = 'none';
    startRecordingBtn.style.borderRadius = '4px';
    startRecordingBtn.style.padding = '10px 15px';
    startRecordingBtn.style.marginRight = '10px';

    // Add start recording event
    startRecordingBtn.addEventListener('click', async () => {
      console.log('Start recording button clicked');
      startRecordingBtn.disabled = true;
      startRecordingBtn.textContent = 'Preparing...';

      // Call our new startRecording method which handles all the logic
      await this.startRecording();

      // Reset button state (in case it becomes visible again)
      startRecordingBtn.disabled = false;
      startRecordingBtn.textContent = 'Start Recording';
    });

    // Add button to footer before close button
    const footer = modal.querySelector('.modal-footer');
    if (!footer) {
      console.error('Modal footer not found');
      return;
    }

    footer.insertBefore(startRecordingBtn, closeBtn);
    console.log('Modal initialized successfully');

    // Store reference to the modal
    this.modal = modal;
  }

  /**
   * Show the video recording modal
   */
  showVideoRecordingModal() {
    if (!this.modal) {
      console.error('Video recording modal not found or not initialized');
      return;
    }

    // Make sure the modal is displayed
    this.modal.style.display = 'block';
    this.modal.classList.add('show');

    // Log for debugging
    console.log('Video recording modal should be visible now');

    // Only update compatibility if videoRecorder is initialized
    if (this.videoRecorder) {
      this.updateCompatibilityStatus();
    } else {
      console.log('Skipping compatibility check: videoRecorder not initialized yet');

      // Add fallback message
      const fallbackMessage = document.createElement('div');
      fallbackMessage.className = 'compatibility-warning';
      fallbackMessage.textContent = 'Video recorder not initialized yet. Please try again in a moment.';
      fallbackMessage.style.color = '#ff3d5a';
      fallbackMessage.style.fontWeight = 'bold';
      fallbackMessage.style.margin = '10px 0';

      const compatSection = this.modal.querySelector('.modal-body');
      if (compatSection) {
        compatSection.prepend(fallbackMessage);

        // Remove after 5 seconds if still visible
        setTimeout(() => {
          if (fallbackMessage.parentNode) {
            fallbackMessage.remove();
          }
        }, 5000);
      }
    }
  }

  /**
   * Update compatibility status in the modal
   */
  updateCompatibilityStatus() {
    if (!this.videoRecorder) {
      console.warn('Cannot update compatibility status: videoRecorder is not initialized yet');
      return;
    }

    console.log('Updating compatibility status');

    // Update status display
    const mediaRecorderStatus = document.getElementById('mediaRecorderSupport');
    const webmVp9Status = document.getElementById('webmVp9Support');
    const webmVp8Status = document.getElementById('webmVp8Support');
    const mp4Status = document.getElementById('mp4Support');

    if (!mediaRecorderStatus || !webmVp9Status || !webmVp8Status || !mp4Status) {
      console.error('One or more compatibility status elements not found in DOM');
      return;
    }

    // Check MediaRecorder support
    const hasMediaRecorder = this.videoRecorder.hasMediaRecorderSupport;
    mediaRecorderStatus.textContent = hasMediaRecorder ? '✓ Supported' : '✗ Not Supported';
    mediaRecorderStatus.className = 'status ' + (hasMediaRecorder ? 'supported' : 'not-supported');

    // Check codec support
    const supportedMimeTypes = this.videoRecorder.supportedMimeTypes || [];
    console.log('Supported MIME types:', supportedMimeTypes);

    const hasWebmVp9 = supportedMimeTypes.includes('video/webm;codecs=vp9');
    webmVp9Status.textContent = hasWebmVp9 ? '✓ Supported' : '✗ Not Supported';
    webmVp9Status.className = 'status ' + (hasWebmVp9 ? 'supported' : 'not-supported');

    const hasWebmVp8 = supportedMimeTypes.includes('video/webm;codecs=vp8');
    webmVp8Status.textContent = hasWebmVp8 ? '✓ Supported' : '✗ Not Supported';
    webmVp8Status.className = 'status ' + (hasWebmVp8 ? 'supported' : 'not-supported');

    const hasMp4 = supportedMimeTypes.includes('video/mp4');
    mp4Status.textContent = hasMp4 ? '✓ Supported' : '✗ Not Supported';
    mp4Status.className = 'status ' + (hasMp4 ? 'supported' : 'not-supported');

    console.log('Compatibility status updated successfully');
  }

  /**
   * Shows a notification to inform the user about screen capture
   */
  showScreenCaptureNotice() {
    // Remove any existing notice
    const existingNotice = document.getElementById('screenCaptureNotice');
    if (existingNotice) {
      existingNotice.remove();
    }

    // Create notice element
    const notice = document.createElement('div');
    notice.id = 'screenCaptureNotice';
    notice.style.position = 'fixed';
    notice.style.top = '50%';
    notice.style.left = '50%';
    notice.style.transform = 'translate(-50%, -50%)';
    notice.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    notice.style.color = 'white';
    notice.style.padding = '25px';
    notice.style.width = 'max-content';
    notice.style.maxWidth = '90%';
    notice.style.borderRadius = '10px';
    notice.style.zIndex = '100000';
    notice.style.textAlign = 'center';
    notice.style.boxShadow = '0 0 25px rgba(0, 0, 0, 0.5)';
    notice.style.display = 'flex';
    notice.style.flexDirection = 'column';
    notice.style.alignItems = 'center';
    notice.style.justifyContent = 'center';
    notice.style.fontFamily = 'Arial, sans-serif';

    // Add animation for attention
    notice.style.animation = 'fadeInCaptureNotice 0.3s ease-out';

    // Add animation style if it doesn't exist
    if (!document.getElementById('captureNoticeStyle')) {
      const style = document.createElement('style');
      style.id = 'captureNoticeStyle';
      style.textContent = `
        @keyframes fadeInCaptureNotice {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes pulseButton {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Create spinner element
    const spinner = document.createElement('div');
    spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)';
    spinner.style.borderTop = '4px solid #ff3d5a';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.animation = 'spin 1s linear infinite';
    spinner.style.marginBottom = '15px';

    // Create header element
    const header = document.createElement('h3');
    header.style.margin = '0 0 10px 0';
    header.style.color = '#ff3d5a';
    header.textContent = 'Preparing Screen Capture';

    // Create instructions
    const instructions = document.createElement('p');
    instructions.style.margin = '10px 0';
    instructions.style.fontSize = '16px';
    instructions.innerHTML = `
      <strong>Important:</strong> When prompted, please select
      <span style="color: #ff3d5a; font-weight: bold;">This Tab</span>
      to capture UI elements.
    `;

    // Add all elements to notice
    notice.appendChild(spinner);
    notice.appendChild(header);
    notice.appendChild(instructions);

    document.body.appendChild(notice);

    // Remove the notice automatically after a reasonable time
    setTimeout(() => {
      const notice = document.getElementById('screenCaptureNotice');
      if (notice) {
        notice.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (notice.parentNode) {
            notice.parentNode.removeChild(notice);
          }
        }, 300);
      }
    }, 5000);
  }

  /**
   * Start the recording process
   */
  async startRecording() {
    try {
      // Close the video recording modal first
      const modal = document.getElementById('videoRecordingModal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
      }

      // Check if we need to close the instructions modal
      const instructionsModal = document.getElementById('instructionsModal');
      if (instructionsModal && instructionsModal.style.display === 'flex') {
        // Close instructions modal before starting recording to avoid UI issues
        const closeButton = instructionsModal.querySelector('.close-btn');
        if (closeButton) {
          closeButton.click();
        } else {
          instructionsModal.style.display = 'none';
        }

        // Add a small delay to allow modal to close
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Now show screen capture notice
      this.showScreenCaptureNotice();

      // Add a small delay before starting the actual recording
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start the recording
      if (this.videoRecorder) {
        await this.videoRecorder.startRecording(CONFIG.development.videoRecording.defaultDuration);
        console.log('Recording started successfully');
      } else {
        console.error('Video recorder not initialized');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);

      // Show error notification
      const errorNotice = document.createElement('div');
      errorNotice.style.position = 'fixed';
      errorNotice.style.top = '20px';
      errorNotice.style.left = '50%';
      errorNotice.style.transform = 'translateX(-50%)';
      errorNotice.style.backgroundColor = 'rgba(255, 60, 60, 0.9)';
      errorNotice.style.color = 'white';
      errorNotice.style.padding = '15px 25px';
      errorNotice.style.borderRadius = '5px';
      errorNotice.style.zIndex = '10000';
      errorNotice.style.fontFamily = 'Arial, sans-serif';
      errorNotice.textContent = `Recording error: ${error.message || 'Unknown error'}`;

      document.body.appendChild(errorNotice);

      // Remove error after a few seconds
      setTimeout(() => {
        if (errorNotice.parentNode) {
          errorNotice.parentNode.removeChild(errorNotice);
        }
      }, 5000);
    }
  }
}

// Create and export a singleton instance
export const videoUI = new VideoUI();