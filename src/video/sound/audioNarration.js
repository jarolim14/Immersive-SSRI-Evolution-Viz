import { AUDIO_CONFIG } from "./narrationConfig.js";

/**
 * Handles audio narration for video recordings
 */
class AudioNarration {
  constructor() {
    this.audioElements = new Map();
    this.currentAudio = null;
    this.isLoaded = false;
    this.config = AUDIO_CONFIG;
    this.playlistQueue = []; // Queue for handling sequences of audio files
  }

  /**
   * Load all audio files based on configuration
   */
  async loadAudioFiles() {
    if (this.isLoaded || !this.config.enabled) return;

    const sequences = this.config.sequences || {};
    const narrationIds = Object.keys(sequences);

    if (narrationIds.length === 0) {
      console.warn("No narration sequences defined in config");
      return;
    }

    console.log(`Loading ${narrationIds.length} narration audio files...`);

    const loadPromises = [];
    const basePath = this.config.basePath || "";

    for (const id of narrationIds) {
      const audioPath = sequences[id];
      if (!audioPath) continue;

      // Try multiple potential paths to increase chance of finding the file
      const possiblePaths = [
        // Primary path from config, this works!
        `${basePath}${audioPath}`,
        // Absolute path from document root
        `/assets/audio/${audioPath}`,
        // Just the filename in case it's in the same directory
        audioPath,
      ];

      console.log(`Trying to load audio for ${id} from multiple locations...`);

      // Try to load from any of the possible paths
      const audio = await this.tryLoadAudio(id, possiblePaths);

      if (audio) {
        this.audioElements.set(id, audio);
        console.log(`Successfully loaded audio for ${id}`);
      } else {
        console.error(`❌ Failed to load audio for ${id} from any location`);
      }
    }

    this.isLoaded = true;
    console.log(
      `Audio narration loading complete. Loaded ${this.audioElements.size} of ${narrationIds.length} audio files.`
    );
  }

  /**
   * Try loading audio from multiple paths
   * @param {string} id - The narration ID
   * @param {string[]} paths - Array of possible file paths
   * @returns {Promise<HTMLAudioElement|null>} - The loaded audio element or null if all paths failed
   */
  async tryLoadAudio(id, paths) {
    for (const path of paths) {
      try {
        console.log(`Attempting to load audio from: ${path}`);
        const audio = new Audio();

        // Create a promise that resolves when the audio is loaded or errors
        const loadResult = await new Promise((resolve) => {
          const successHandler = () => {
            console.log(`✅ Successfully loaded audio from: ${path}`);
            cleanup();
            resolve({ success: true, audio });
          };

          const errorHandler = (e) => {
            console.warn(`❌ Failed to load audio from: ${path}`, e);
            cleanup();
            resolve({ success: false });
          };

          // Clean up event listeners
          const cleanup = () => {
            audio.removeEventListener("canplaythrough", successHandler);
            audio.removeEventListener("error", errorHandler);
          };

          // Set up event listeners
          audio.addEventListener("canplaythrough", successHandler, {
            once: true,
          });
          audio.addEventListener("error", errorHandler, { once: true });

          // Start loading
          audio.src = path;
          audio.load();
        });

        if (loadResult.success) {
          return audio;
        }
      } catch (err) {
        console.warn(`Error trying to load audio from ${path}:`, err);
      }
    }

    return null;
  }

  /**
   * Play a specific narration clip by ID
   */
  play(id) {
    if (!this.isLoaded || !this.config.enabled) {
      return Promise.resolve();
    }

    this.stop();

    const audio = this.audioElements.get(id);
    if (!audio) {
      console.warn(`Narration audio not found for ID: ${id}`);
      return Promise.resolve();
    }

    console.log(`Playing narration: ${id}`);
    this.currentAudio = audio;

    return new Promise((resolve) => {
      const onEnded = () => {
        audio.removeEventListener("ended", onEnded);
        console.log(`Narration ended: ${id}`);
        resolve();
      };

      audio.addEventListener("ended", onEnded);
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn(`Error playing narration for "${id}":`, err);
        resolve();
      });
    });
  }

  /**
   * Creates a longer narration by chaining multiple audio files
   * @param {string[]} ids - Array of narration IDs to play in sequence
   * @returns {Promise} - Resolves when all narrations complete
   */
  playSequence(ids) {
    if (!this.isLoaded || !this.config.enabled || !ids || ids.length === 0) {
      return Promise.resolve();
    }

    this.stop();

    // Make a copy of the array to avoid modifying the original
    this.playlistQueue = [...ids];

    // Start playing the first narration
    return this._playNextInSequence();
  }

  /**
   * Helper method to play the next narration in the queue
   * @private
   */
  _playNextInSequence() {
    if (this.playlistQueue.length === 0) {
      return Promise.resolve();
    }

    const nextId = this.playlistQueue.shift();
    console.log(
      `Playing sequence narration: ${nextId} (${this.playlistQueue.length} remaining)`
    );

    const audio = this.audioElements.get(nextId);
    if (!audio) {
      console.warn(`Narration audio not found for ID: ${nextId}`);
      return this._playNextInSequence(); // Skip to next
    }

    this.currentAudio = audio;

    return new Promise((resolve) => {
      const onEnded = () => {
        audio.removeEventListener("ended", onEnded);

        if (this.playlistQueue.length > 0) {
          // Continue with next narration
          this._playNextInSequence().then(resolve);
        } else {
          console.log(`Narration sequence completed`);
          resolve();
        }
      };

      audio.addEventListener("ended", onEnded);
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn(`Error playing narration for "${nextId}":`, err);
        // Try to continue with next item
        if (this.playlistQueue.length > 0) {
          this._playNextInSequence().then(resolve);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Stop any currently playing audio
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    // Clear the playlist queue
    this.playlistQueue = [];
  }

  /**
   * Check if a narration ID exists
   */
  hasNarration(id) {
    return this.config.enabled && this.audioElements.has(id);
  }
}

// Create singleton instance
export const audioNarration = new AudioNarration();
