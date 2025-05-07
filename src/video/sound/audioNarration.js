import { AUDIO_CONFIG } from './narrationConfig.js';

/**
 * Handles audio narration for video recordings
 */
class AudioNarration {
  constructor() {
    this.audioElements = new Map();
    this.currentAudio = null;
    this.isLoaded = false;
    this.config = AUDIO_CONFIG;
  }

  /**
   * Load all audio files based on configuration
   */
  async loadAudioFiles() {
    if (this.isLoaded || !this.config.enabled) return;

    const sequences = this.config.sequences || {};
    const narrationIds = Object.keys(sequences);

    if (narrationIds.length === 0) {
      console.warn('No narration sequences defined in config');
      return;
    }

    console.log(`Loading ${narrationIds.length} narration audio files...`);

    const loadPromises = [];
    const basePath = this.config.basePath || '';

    for (const id of narrationIds) {
      const audioPath = sequences[id];
      if (!audioPath) continue;

      const fullPath = `${basePath}${audioPath}`;
      console.log(`Loading audio file for ${id}: ${fullPath}`);

      const audio = new Audio(fullPath);
      this.audioElements.set(id, audio);

      const loadPromise = new Promise((resolve) => {
        audio.addEventListener('canplaythrough', () => {
          console.log(`Loaded narration audio: ${id}`);
          resolve();
        }, { once: true });

        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load narration audio: ${id}`, e);
          resolve();
        }, { once: true });

        audio.load();
      });

      loadPromises.push(loadPromise);
    }

    await Promise.all(loadPromises);
    this.isLoaded = true;
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

    return new Promise(resolve => {
      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        console.log(`Narration ended: ${id}`);
        resolve();
      };

      audio.addEventListener('ended', onEnded);
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.warn(`Error playing narration for "${id}":`, err);
        resolve();
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