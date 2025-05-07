/**
 * Configuration for video narration
 * This provides a blueprint for narration texts that can be used to generate audio files
 * Once audio files are generated, they should be placed in public/assets/audio/
 */

// Define the configurations
export const NARRATION_CONFIG = {
  // Map each sequence ID to its narration text
  // These texts can be used to generate audio files using Azure or other TTS services
  texts: {
    // Overview and introduction
    intro: "Welcome to this interactive visualization of SSRI research papers. This network connects thousands of publications through their citation relationships.",

    // Feature demonstrations
    //safetyCluster: "Here we're focusing on the Safety research cluster. This group of papers explores potential side effects and contraindications of SSRI medications.",
    //perinatalExposure: "Within the Safety research, this subcluster examines perinatal exposure studies, focusing on the effects of SSRIs during pregnancy and early development.",
    //yearRangeFilter: "By adjusting the year range, we can see how research evolved over time. Notice how the network expands dramatically after 2010.",
    //searchFunction: "The search functionality allows us to locate specific papers within this complex network.",
//
    //// Camera movements
    //orbitalView: "This orbital perspective provides a comprehensive view of the network topology, highlighting the interconnected nature of academic research.",
    //zoomToCluster: "Zooming into specific clusters reveals the detailed structure and relationships between individual papers.",
//
    //// For specific paper selections
    //paperHighlight: "This highlighted paper represents a key study in the field, with multiple citations connecting it to other research.",
//
    //// Conclusion
    //conclusion: "This visualization demonstrates the power of network analysis in understanding the evolution and structure of scientific research."
  }
};

/**
 * For development/testing purposes only
 * This example shows how to structure the narration configuration in the main config.js file
 */
export const CONFIG_EXAMPLE = {
  development: {
    videoRecording: {
      narration: {
        enabled: true,
        // Map sequence IDs to audio file paths (including extension)
        // Format: "directory/filename.extension"
        sequences: {
          intro: "audio/intro.mp3",
          safetyCluster: "audio/safety_cluster.mp3",
          perinatalExposure: "audio/perinatal_exposure.mp3",
          yearRangeFilter: "audio/year_range_filter.mp3",
          searchFunction: "audio/search_function.mp3",
          orbitalView: "audio/orbital_view.mp3",
          zoomToCluster: "audio/zoom_to_cluster.mp3",
          paperHighlight: "audio/paper_highlight.mp3",
          conclusion: "audio/conclusion.mp3"
        },
        // Optional base path that will be prepended to all audio paths
        // Leave empty to use paths as-is
        basePath: ""
      }
    }
  }
};