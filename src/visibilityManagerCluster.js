/**
 * @file visibilityManager.js
 * @description This module manages the visibility of nodes and edges in a 3D graph visualization.
 * It provides functionality for initializing visibility arrays, updating visibility based on cluster selection,
 * and applying these updates to the Three.js scene.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key Functions:
 * - initClusterVisibility(): Initializes visibility arrays for nodes and edges.
 * - updateClusterVisibility(): Main function to update visibility based on legend selection.
 * - updateNodeVisibility(selectedClusters): Updates and applies node visibility changes.
 * - updateEdgeVisibilityBasedOnSelection(selectedClusters): Updates edge visibility.
 * - collapseLegend(): Collapses the legend UI for improved visualization.
 *
 * Features:
 * - Efficient visibility management using shader-based techniques.
 * - Dynamic updates based on user interaction with the legend.
 * - Separate handling for node and edge visibility.
 * - Integration with Three.js for real-time scene updates.
 * - Error handling and logging for robust operation.
 *
 * This module is crucial for interactive graph visualizations, allowing users to focus on
 * specific clusters by controlling the visibility of nodes and edges in real-time.
 *
 * @requires ./legend.js
 * @requires ./nodesCreation.js
 * @requires ./nodesLoader.js
 * @requires ./edgesLoader.js
 * @requires ./edgeCreation.js
 *
 * @exports {Function} initClusterVisibility
 * @exports {Function} updateClusterVisibility
 * @exports {Function} updateEdgeVisibilityBasedOnSelection
 */

import { getLegendSelectedLeafKeys } from "./legend.js";
import { points } from "./nodesCreation.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";

// Global visibility arrays for nodes and edges
let nodeVisibility, edgeVisibility;

/**
 * Initializes the visibility arrays for nodes and edges.
 * This function should be called once the graph data is loaded.
 */
export function initClusterVisibility() {
  if (points && points.geometry.attributes.visible) {
    // Initialize node visibility from existing attribute
    nodeVisibility = points.geometry.attributes.visible.array;

    // Initialize edge visibility from line segments
    edgeVisibility = lineSegments.geometry.attributes.visible.array;

    console.log("Cluster Visibility Initialized Successfully");
  } else {
    console.error(
      "Points object or visibility attribute not found. Initializing default visibility array - all nodes visible."
    );
    nodeVisibility = new Float32Array(nodesMap.size).fill(1);
  }
}

/**
 * Updates the visibility of nodes and edges based on selected clusters in the legend.
 * This function is the main entry point for visibility updates.
 */
export function updateClusterVisibility() {
  if (!nodesMap) {
    console.warn(
      "nodesMap is not initialized. Please call initClusterVisibility() first."
    );
    return;
  }

  const selectedClusters = new Set(getLegendSelectedLeafKeys());

  // Update node visibility
  const nodeVisibility = updateNodeClusterVisibility(selectedClusters);

  // Update edge visibility
  const edgeVisibility = updateEdgeClusterVisibility(selectedClusters);

  // Collapse legend for better visualization
  collapseLegend();

  return { nodeVisibility, edgeVisibility };
}

/**
 * Updates the visibility of nodes based on selected clusters.
 * @param {Set} selectedClusters - Set of currently selected cluster keys
 */
function updateNodeClusterVisibility(selectedClusters) {
  if (!nodeVisibility || nodeVisibility.length !== nodesMap.size) {
    console.warn(
      "Node visibility array not properly initialized or size mismatch. Reinitializing."
    );
    nodeVisibility = new Float32Array(nodesMap.size).fill(1);
  }

  nodesMap.forEach((node, index) => {
    nodeVisibility[index] =
      selectedClusters.size === 0 || selectedClusters.has(node.cluster) ? 1 : 0;
  });

  return nodeVisibility; // Return updated visibility array
}

/**
 * Updates the visibility of edges based on selected clusters.
 * @param {Set} selectedClusters - Set of currently selected cluster keys
 */
function updateEdgeClusterVisibility(selectedClusters) {
  const edgeGeometry = lineSegments.geometry;
  const visibility = edgeGeometry.attributes.visible;
  const edgeData = lineSegments.userData.edgeData;

  edgeData.forEach((edge) => {
    const isVisible =
      selectedClusters.size === 0 ||
      (selectedClusters.has(edge.sourceCluster) &&
        selectedClusters.has(edge.targetCluster));

    for (let j = edge.startIndex; j < edge.endIndex; j++) {
      edgeVisibility[j] = isVisible ? 1.0 : 0.0;
    }
  });

  return edgeVisibility; // Return updated visibility array
}

/**
 * Collapses all subtrees in the legend for improved visualization.
 */
function collapseLegend() {
  document
    .querySelectorAll(".legend-subtree")
    .forEach((item) => (item.style.display = "none"));
  document
    .querySelectorAll(".fold-indicator")
    .forEach((indicator) => (indicator.textContent = "▶"));
  console.log("Legend collapsed");
}
