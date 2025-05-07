import { CONFIG } from '../../config.js';

/**
 * Handles audio narration for video recordings
 * Manages loading, playing, and synchronizing pre-generated narration audio files
 */
class AudioNarration {
  constructor() {
    this.audioElements = new Map();
    this.currentAudio = null;
    this.isLoaded = false;
    this.narrationConfig = CONFIG.development?.videoRecording?.narration || null;
    this.audioBuffers = new Map(); // For storing AudioContext buffers

    // Check if narration is configured
    if (!this.narrationConfig) {
      console.warn('Narration configuration not found in CONFIG.development.videoRecording.narration');
    }

    // Check audio context availability
    this.hasAudioSupport = typeof Audio !== 'undefined';
    if (!this.hasAudioSupport) {
      console.warn('Audio API is not supported in this environment');
    }

    // Create AudioContext if available
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
        console.log('AudioContext created successfully');
      }
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  /**
   * Load all audio files based on configuration
   * @returns {Promise} Resolves when all audio files are loaded
   */
  async loadAudioFiles() {
    if (this.isLoaded) return;

    if (!this.narrationConfig?.enabled) {
      console.log('Narration is disabled in config');
      return;
    }

    const sequences = this.narrationConfig.sequences || {};
    const narrationIds = Object.keys(sequences);

    if (narrationIds.length === 0) {
      console.warn('No narration sequences defined in config');
      return;
    }

    console.log(`Loading ${narrationIds.length} narration audio files...`);

    // Create array of load promises to track loading
    const loadPromises = [];
    let successfulLoads = 0;

    // Get base path from config (if specified)
    const basePath = this.narrationConfig.basePath || '';

    for (const id of narrationIds) {
      const audioPath = sequences[id];
      if (!audioPath) continue;

      // Create the full path by combining basePath and audioPath
      const fullPath = `${basePath}${audioPath}`;

      console.log(`Loading audio file for ${id}: ${fullPath}`);

      // Try to load with AudioContext first (more reliable)
      if (this.audioContext) {
        const success = await this.loadAudioWithContext(id, fullPath);
        if (success) {
          successfulLoads++;
          continue; // Skip the HTML Audio approach if AudioContext worked
        }
      }

      // Fall back to HTML Audio element if AudioContext failed or isn't available
      const audio = new Audio(fullPath);
      this.audioElements.set(id, audio);

      // Create promise for this audio element
      const loadPromise = new Promise((resolve) => {
        // Handle successful loading
        audio.addEventListener('canplaythrough', () => {
          console.log(`Loaded narration audio: ${id} (${fullPath})`);
          successfulLoads++;
          resolve();
        }, { once: true });

        // Handle failure
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load narration audio: ${id} (${fullPath})`, e);
          resolve(); // Resolve anyway to not block other audio
        }, { once: true });

        // Start loading
        audio.load();
      });

      loadPromises.push(loadPromise);
    }

    // Wait for all audio files to load
    await Promise.all(loadPromises);

    this.isLoaded = true;

    if (successfulLoads === 0) {
      console.warn('⚠️ No audio files were successfully loaded.');
      console.warn('Please check that the audio paths in the narration config are correct.');
    } else {
      console.log(`Successfully loaded ${successfulLoads}/${narrationIds.length} narration audio files`);
    }
  }

  /**
   * Play audio using AudioContext
   * @param {string} id - The narration ID
   * @returns {Promise} - Resolves when audio playback ends
   */
  playWithContext(id) {
    if (!this.audioContext || !this.audioBuffers.has(id)) {
      return Promise.resolve();
    }

    // Stop any currently playing audio
    this.stop();

    const audioBuffer = this.audioBuffers.get(id);

    console.log(`Playing narration with AudioContext: ${id}`);

    // Create a source node
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Connect it to the audio context destination (speakers)
    source.connect(this.audioContext.destination);

    // Store reference to current source for stopping
    this.currentSource = source;

    // Create a promise that resolves when audio ends
    return new Promise(resolve => {
      source.onended = () => {
        console.log(`Narration ended: ${id}`);
        this.currentSource = null;
        resolve();
      };

      // Resume the audio context if it's suspended (autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          source.start(0);
        }).catch(err => {
          console.warn(`Error resuming AudioContext: ${err.message}`);
          resolve();
        });
      } else {
        source.start(0);
      }
    });
  }

  /**
   * Play a specific narration clip by ID
   * @param {string} id - The narration ID from config
   * @returns {Promise} - Resolves when audio playback ends
   */
  play(id) {
    if (!this.isLoaded || !this.narrationConfig?.enabled) {
      return Promise.resolve();
    }

    // Stop any currently playing audio
    this.stop();

    // Try AudioContext first if available
    if (this.audioContext && this.audioBuffers.has(id)) {
      return this.playWithContext(id);
    }

    // Fall back to HTML Audio element
    const audio = this.audioElements.get(id);
    if (!audio) {
      console.warn(`Narration audio not found for ID: ${id}`);
      return Promise.resolve();
    }

    console.log(`Playing narration: ${id}`);
    this.currentAudio = audio;

    // Create a promise that resolves when audio ends
    return new Promise(resolve => {
      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        console.log(`Narration ended: ${id}`);
        resolve();
      };

      audio.addEventListener('ended', onEnded);

      // Start playback
      audio.currentTime = 0;
      audio.play().catch(err => {
        // Check for specific error types
        if (err.name === 'NotSupportedError' || err.name === 'NotFoundError') {
          console.warn(`Error playing narration for "${id}": The audio file could not be found or is not in a supported format.`);
          console.warn(`Please check if the file exists at the specified path in the narration config.`);
        } else if (err.name === 'NotAllowedError') {
          console.warn(`Error playing narration: Audio playback was not allowed. This may be due to browser autoplay restrictions.`);
          console.warn(`Try interacting with the page before recording, or disable narration in the config.`);
        } else {
          console.warn(`Error playing narration: ${err.message}`);
        }
        resolve(); // Resolve anyway to not block sequence
      });
    });
  }

  /**
   * Stop any currently playing audio
   */
  stop() {
    // Stop HTML Audio playback
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        console.warn('Error stopping current audio', e);
      }
      this.currentAudio = null;
    }

    // Stop AudioContext playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        console.warn('Error stopping AudioContext source', e);
      }
      this.currentSource = null;
    }
  }

  /**
   * Check if a narration ID exists in the configuration
   * @param {string} id - The narration ID to check
   * @returns {boolean} - Whether the narration ID exists
   */
  hasNarration(id) {
    if (!this.narrationConfig?.enabled) return false;
    return this.audioElements.has(id);
  }

  /**
   * Load audio using AudioContext
   * @param {string} id - The narration ID to load
   * @param {string} filePath - The full audio file path
   * @returns {Promise<boolean>} - Whether loading succeeded
   */
  async loadAudioWithContext(id, filePath) {
    if (!this.audioContext) {
      console.warn('AudioContext not available, cannot load audio this way');
      return false;
    }

    try {
      console.log(`Loading audio via AudioContext: ${filePath}`);

      // Fetch the audio file
      const response = await fetch(filePath);
      if (!response.ok) {
        console.warn(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
        return false;
      }

      // Get the audio data as an ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Decode the audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Store the audio buffer
      this.audioBuffers.set(id, audioBuffer);

      console.log(`Successfully loaded audio for ${id} using AudioContext with path: ${filePath}`);
      return true;
    } catch (error) {
      console.warn(`Error loading audio ${id} from ${filePath} with AudioContext:`, error);
      return false;
    }
  }
}

// Create singleton instance
export const audioNarration = new AudioNarration();