/**
 * Configuration for video narration
 * This provides a blueprint for narration texts that can be used to generate audio files
 * Once audio files are generated, they should be placed in public/assets/audio/
 */

// Narration texts for TTS generation
const NARRATION_CONFIG = {
  texts: {
    intro: "Welcome to the test",
    // Uncomment and add more narration texts as needed
    // safetyCluster: "Here we're focusing on the Safety research cluster...",
    // perinatalExposure: "Within the Safety research, this subcluster...",
  }
};

// Audio file configuration
const AUDIO_CONFIG = {
  enabled: true,
  basePath: "video/sound/audio/",
  sequences: {
    intro: "intro.mp3",
    // Uncomment and add more sequences as needed
    // safetyCluster: "safety_cluster.mp3",
    // perinatalExposure: "perinatal_exposure.mp3",
  }
};

// Support both ES modules and CommonJS
export { NARRATION_CONFIG, AUDIO_CONFIG };
if (typeof module !== 'undefined') {
  module.exports = { NARRATION_CONFIG, AUDIO_CONFIG };
}