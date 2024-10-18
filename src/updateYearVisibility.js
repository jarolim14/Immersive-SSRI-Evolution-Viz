/**
 * @file yearVisibilityManager.js
 * @description This module manages the visibility of nodes and edges in a 3D graph visualization based on their year attribute.
 * It provides functionality for updating visibility as the user interacts with a year slider, showing elements up to and including the selected year.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key Functions:
 * - initYearVisibility(): Initializes year-based visibility arrays for nodes and edges.
 * - updateYearVisibility(selectedYear): Updates visibility based on the selected year.
 * - updateNodeYearVisibility(selectedYear): Updates and applies node visibility changes based on year.
 * - updateEdgeYearVisibility(selectedYear): Updates edge visibility based on year.
 *
 * Features:
 * - Dynamic visibility updates based on user-selected year.
 * - Efficient visibility management using shader-based techniques.
 * - Separate handling for node and edge visibility.
 * - Integration with Three.js for real-time scene updates.
 * - Compatibility with existing cluster-based visibility system.
 *
 * This module enhances interactive graph visualizations by allowing users to explore data chronologically,
 * showing the state of the graph up to a specific year.
 *
 * @requires ./nodesCreation.js
 * @requires ./nodesLoader.js
 * @requires ./edgeCreation.js
 * @requires ./yearSlider.js
 *
 * @exports {Function} initYearVisibility
 * @exports {Function} updateYearVisibility
 */

import { points } from "./nodesCreation.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";
import { getCurrentYearRange } from "./yearSlider.js";

let nodeYearVisibility, edgeYearVisibility;

/**
 * Initializes the year-based visibility arrays for nodes and edges.
 * This function should be called once the graph data is loaded.
 */
export function initYearVisibility() {
  if (points && points.geometry.attributes.visible) {
    nodeYearVisibility = new Float32Array(
      points.geometry.attributes.visible.array.length
    );
    edgeYearVisibility = new Float32Array(
      lineSegments.geometry.attributes.visible.array.length
    );
    console.log("Year-based Visibility Arrays Initialized");
  } else {
    console.error(
      "Points object or visibility attribute not found. Unable to initialize year-based visibility."
    );
  }
}

/**
 * Updates the visibility of nodes and edges based on the selected year.
 * This function is the main entry point for year-based visibility updates.
 */
export function updateYearVisibility() {
  const selectedYear = getCurrentYearRange();
  console.log("Updating visibility for year:", selectedYear);

  updateNodeYearVisibility(selectedYear);
  updateEdgeYearVisibility(selectedYear);
}

/**
 * Updates the visibility of nodes based on the selected year and applies changes to the scene.
 * @param {number} selectedYear - The year selected by the user
 */
function updateNodeYearVisibility(selectedYear) {
  if (!nodeYearVisibility || nodeYearVisibility.length !== nodesMap.size) {
    console.warn(
      "Node year visibility array not properly initialized or size mismatch. Reinitializing."
    );
    nodeYearVisibility = new Float32Array(nodesMap.size).fill(1);
  }

  nodesMap.forEach((node, index) => {
    nodeYearVisibility[index] = node.year <= selectedYear ? 1 : 0;
  });

  if (points && points.geometry.attributes.visible) {
    // Combine year visibility with existing visibility (e.g., from cluster selection)
    const combinedVisibility = points.geometry.attributes.visible.array.map(
      (value, index) => value * nodeYearVisibility[index]
    );

    points.geometry.attributes.visible.array.set(combinedVisibility);
    points.geometry.attributes.visible.needsUpdate = true;
    console.log("Node year visibility updated in scene");
  } else {
    console.warn(
      "Unable to update node year visibility in scene. Points object or visibility attribute not found."
    );
  }
}

/**
 * Updates the visibility of edges based on the selected year.
 * @param {number} selectedYear - The year selected by the user
 */
function updateEdgeYearVisibility(selectedYear) {
  const edgeGeometry = lineSegments.geometry;
  const visibility = edgeGeometry.attributes.visible;
  const edgeData = lineSegments.userData.edgeData;

  edgeData.forEach((edge, i) => {
    const isVisible = edge.year <= selectedYear;

    for (let j = edge.startIndex; j < edge.endIndex; j++) {
      edgeYearVisibility[j] = isVisible ? 1.0 : 0.0;
    }
  });

  // Combine year visibility with existing visibility (e.g., from cluster selection)
  const combinedVisibility = visibility.array.map(
    (value, index) => value * edgeYearVisibility[index]
  );

  visibility.array.set(combinedVisibility);
  visibility.needsUpdate = true;
  console.log("Edge year visibility updated");
}

// Event listener for year slider updates
window.addEventListener("yearUpdated", () => {
  console.log("Year update event received");
  updateYearVisibility();
});
