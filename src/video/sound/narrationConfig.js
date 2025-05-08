/**
 * Configuration for video narration
 * This provides a blueprint for narration texts that can be used to generate audio files
 * Once audio files are generated, they should be placed in public/assets/audio/
 */

// Narration texts for TTS generation
const NARRATION_CONFIG = {
  texts: {
    intro_audio: "Welcome to the test",
    safetyCluster_audio: "this is the safety cluster",
    // perinatalExposure_audio: "Within the Safety research, this subcluster...",
  },
};

// Audio file configuration
const AUDIO_CONFIG = {
  enabled: true,
  // Base path for loading audio files during playback
  basePath: "video/sound/audio_files/",
  // Output paths for generating audio files
  outputPaths: {
    // Path to save public files (relative to project root)
    public: "public/assets/audio",
    // Path to save local files (relative to script directory)
    local: "./audio_files",
  },
  sequences: {
    intro_audio: "intro_audio.mp3",
    safetyCluster_audio: "safety_cluster_audio.mp3",
    // perinatalExposure_audio: "perinatal_exposure_audio.mp3",
  },
};

// Support both ES modules and CommonJS
export { NARRATION_CONFIG, AUDIO_CONFIG };
if (typeof module !== "undefined") {
  module.exports = { NARRATION_CONFIG, AUDIO_CONFIG };
}
