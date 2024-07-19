/**
 * Node Visibility Module
 *
 * This module handles updating the visibility (brightness) of nodes
 * based on the selection in the legend.
 */

import { getLegendSelectedLeafKeys } from "./legend.js";
import { getFullNodeData } from "./nodeCreation.js";
import { CONFIG } from "./config.js";
let nodes, brightness;

// Initialize the module with the current node data
export function initNodeVisibility() {
  const data = getFullNodeData(["nodes", "brightness"]);
  nodes = data.nodes;
  brightness = data.brightness;
}

export function updateNodeVisibility() {
  console.log("Updating node visibility");
  const selectedClusters = getLegendSelectedLeafKeys();
  updateNodeVisibilityBasedOnSelection(selectedClusters);
  collapseLegend(); // Add this line
  // Trigger an update in your main file or wherever you handle Three.js updates
  window.dispatchEvent(new CustomEvent("nodeVisibilityUpdated"));
}

function updateNodeVisibilityBasedOnSelection(selectedClusters) {
  const {
    default: defaultBrightness,
    selected: selectedBrightness,
    unselected: unselectedBrightness,
  } = CONFIG.brightness;
  // Check if brightness array exists and initialize it if not
  if (!brightness || brightness.length !== nodes.size) {
    console.warn("Brightness array not initialized or size mismatch");
    brightness = new Float32Array(nodes.size).fill(defaultBrightness);
  }
  nodes.forEach((node) => {
    const isSelected = selectedClusters.includes(node.cluster);
    let newBrightness;

    if (selectedClusters.length === 0) {
      // If no clusters are selected, use the default brightness
      newBrightness = defaultBrightness;
    } else {
      // Otherwise, use selected or unselected brightness based on the node's cluster
      newBrightness = isSelected ? selectedBrightness : unselectedBrightness; // Ternary operator like if else
    }

    brightness[node.index] = newBrightness;
  });
}

export function getUpdatedBrightness() {
  return brightness;
}

export function updateNodeBrightnessInScene(brightness, scene) {
  const points = scene.getObjectByName("points");
  if (points && points.geometry.attributes.brightness) {
    const brightnessAttribute = points.geometry.attributes.brightness;
    brightnessAttribute.array.set(brightness);
    brightnessAttribute.needsUpdate = true;
  } else {
    console.warn("Points object or brightness attribute not found");
  }
}

function collapseLegend() {
  const legendItems = document.querySelectorAll(".legend-subtree");
  legendItems.forEach((item) => {
    item.style.display = "none";
  });

  const foldIndicators = document.querySelectorAll(".fold-indicator");
  foldIndicators.forEach((indicator) => {
    indicator.textContent = "▶";
  });
}
