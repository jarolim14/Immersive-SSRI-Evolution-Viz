/**
 * Node Visibility Module
 *
 * This module handles updating the visibility (brightness) of nodes
 * and edges based on the selection in the legend.
 */
import { getLegendSelectedLeafKeys } from "./legend.js";
import { getFullNodeData } from "./nodeCreation.js";
import { getEdges } from "./edgeCreation.js";

import { CONFIG } from "./config.js";

let nodes, brightness, edges;

// Initialize the module with the current node data
export function initClusterVisibility() {
  const data = getFullNodeData(["nodes", "brightness"]);
  nodes = data.nodes;
  brightness = data.brightness;
  edges = getEdges();
}

export function updateClusterVisibility() {
  console.log("Updating node visibility");
  const selectedClusters = getLegendSelectedLeafKeys();
  updateNodeVisibilityBasedOnSelection(selectedClusters);
  updateEdgeVisibilityBasedOnSelection(selectedClusters);
  collapseLegend();
  window.dispatchEvent(new CustomEvent("nodeVisibilityUpdated"));
}

function updateNodeVisibilityBasedOnSelection(selectedClusters) {
  const {
    default: defaultBrightness,
    selected: selectedBrightness,
    unselected: unselectedBrightness,
  } = CONFIG.brightness;

  if (!brightness || brightness.length !== nodes.size) {
    console.warn("Brightness array not initialized or size mismatch");
    brightness = new Float32Array(nodes.size).fill(defaultBrightness);
  }

  nodes.forEach((node) => {
    const isSelected = selectedClusters.includes(node.cluster);
    let newBrightness;
    if (selectedClusters.length === 0) {
      newBrightness = defaultBrightness;
    } else {
      newBrightness = isSelected ? selectedBrightness : unselectedBrightness;
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

export function updateEdgeVisibilityBasedOnSelection(selectedClusters) {
  // make it a set for faster lookup
  selectedClusters = new Set(selectedClusters);
  const geometry = edges.geometry;
  const visibility = geometry.attributes.visibility;
  const edgeData = edges.userData.edgeData;

  for (let i = 0; i < edgeData.length; i++) {
    const edge = edgeData[i];
    const isVisible =
      selectedClusters.size === 0 ||
      (selectedClusters.has(edge.sourceCluster) &&
        selectedClusters.has(edge.targetCluster));

    for (let j = edge.startIndex; j < edge.endIndex; j++) {
      visibility.array[j] = isVisible ? 1.0 : 0.0;
    }
  }

  visibility.needsUpdate = true;
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
