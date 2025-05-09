/**
 * Configuration for video narration
 * This provides a blueprint for narration texts that can be used to generate audio files
 * Once audio files are generated, they should be placed in public/assets/audio/
 */

// Narration texts for TTS generation
const NARRATION_CONFIG = {
  texts: {
    intro_orbit_script:
      "Welcome to a visual journey through the library of SSRI research papers. Before you lies the comprehensive published literature on the most commonly prescribed class of antidepressants, spanning over 35,000 research papers from 1982 to 2025.\n\nEach dot in the scene represents a scientific publication, whereas the edges represent citations and semantic relationships between them. Colors distinguish different research domains such as 'Pharmacology', 'Indications', and 'Safety'. Notice how subtle variations in shade indicate subdomains within each research area. Colored lines connect papers within the same research cluster, while connections between different clusters appear in gray.\n\nFeel free to explore this knowledge landscape — orbit around the scene with your mouse, zoom in to examine specific clusters and single papers, or pull back to appreciate the broader research patterns.",
    //instructions_scroll_script:
    //  "To better understand the available features, simply scroll through the instructions as demonstrated here.",
    //view_topic_hierarchy_script:
    //  "When you click on 'View Topic Hierarchy', you'll reveal the hierarchical structure of research domains. Here we're selecting 'Safety'. The legend in the top left corner mirrors this same hierarchical organization.",
    //legend_panel_interaction_script:
    //  "In the legend panel, click the arrow next to any research domain to reveal its subdomains. Here we're expanding the Safety cluster to explore more specific research areas. To filter the visualization, simply check the boxes next to topics you're interested in and update the visualization.",
    //single_node_selection_script:
    //  "To examine individual papers, simply click on any node. This displays detailed information about the publication in the side panel, such as the title and cluster label.",
    //year_slider_adjusted_script:
    //  "Use the time slider at the top to filter papers and links by publication year in either direction. Here we're setting it to 2010 to display only the more recent connections and publications.",
    //time_travel_animation_script:
    //  "Click the play button to animate the emergence of papers chronologically. This allows you to witness how research clusters and their interconnections evolved over time. You can pause the animation at any moment by clicking the button again.",
    //typing_in_search_bar_script:
    //  "For a targeted search of a specific paper, use the search bar to quickly locate publications by title or DOI. Here we're searching for studies using the 'rat forced swimming test.' The camera will automatically navigate to highlight your selected study.",
    //reset_button_clicked_script:
    //  "To return to the full dataset view at any time, click the 'Reset' button. This clears all filters and shows the complete research network, ready for you to immerse yourself in the evolution of different fields of study and their interconnections over time.",
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
    intro_orbit_audio: "intro_orbit_audio.mp3",
    //instructions_scroll_audio: "instructions_scroll_audio.mp3",
    //view_topic_hierarchy_audio: "view_topic_hierarchy_audio.mp3",
    //legend_panel_interaction_audio: "legend_panel_interaction_audio.mp3",
    //single_node_selection_audio: "single_node_selection_audio.mp3",
    //year_slider_adjusted_audio: "year_slider_adjusted_audio.mp3",
    //time_travel_animation_audio: "time_travel_animation_audio.mp3",
    //typing_in_search_bar_audio: "typing_in_search_bar_audio.mp3",
    //reset_button_clicked_audio: "reset_button_clicked_audio.mp3",
  },
};

// Support both ES modules and CommonJS
export { NARRATION_CONFIG, AUDIO_CONFIG };
if (typeof module !== "undefined") {
  module.exports = { NARRATION_CONFIG, AUDIO_CONFIG };
}
