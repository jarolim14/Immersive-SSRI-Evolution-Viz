/**
 * @file yearVisibilityManager.js
 * @description This module manages the visibility of nodes and edges in a 3D graph visualization based on their year attribute.
 * It provides functionality for calculating visibility as the user interacts with a year slider, showing elements up to and including the selected year.
 *
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key Functions:
 * - initYearVisibility(): Initializes year-based visibility arrays for nodes and edges.
 * - updateYearVisibility(): Calculates visibility based on the selected year range.
 * - updateNodeYearVisibility(selectedYearRange): Calculates node visibility based on year range.
 * - updateEdgeYearVisibility(selectedYearRange): Calculates edge visibility based on year range.
 *
 * Features:
 * - Dynamic visibility updates based on user-selected year range.
 * - Efficient visibility management.
 * - Separate handling for node and edge visibility.
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

// Global visibility arrays for nodes and edges
let nodeVisibility, edgeVisibility;

/**
 * Initializes the year-based visibility arrays for nodes and edges.
 * This function should be called once the graph data is loaded.
 */
export function initYearVisibility() {
  if (points && points.geometry.attributes.visible) {
    nodeVisibility = new Float32Array(
      points.geometry.attributes.visible.array.length
    );
    edgeVisibility = new Float32Array(
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
 * Updates the visibility of nodes and edges based on the selected year range.
 * This function is the main entry point for year-based visibility calculations.
 */
export function updateYearVisibility() {
  const selectedYearRange = getCurrentYearRange(); // Returns [fromYear, toYear]
  console.log("Calculating visibility for year range:", selectedYearRange);

  nodeVisibility = updateNodeYearVisibility(selectedYearRange);
  edgeVisibility = updateEdgeYearVisibility(selectedYearRange);

  return { nodeVisibility, edgeVisibility }; // Return calculated visibility arrays
}

/**
 * Calculates the visibility of nodes based on the selected year range.
 * @param {Array} selectedYearRange - The year range selected by the user as [fromYear, toYear]
 */
function updateNodeYearVisibility([fromYear, toYear]) {
  if (!nodeVisibility || nodeVisibility.length !== nodesMap.size) {
    console.warn(
      "Node year visibility array not properly initialized or size mismatch. Reinitializing."
    );
    nodeVisibility = new Float32Array(nodesMap.size).fill(1);
  }

  nodesMap.forEach((node, index) => {
    // Set visibility to 1 if the node's year is within the selected range, 0 otherwise
    nodeVisibility[index] =
      node.year >= fromYear && node.year <= toYear ? 1 : 0;
  });

  return nodeVisibility; // Return calculated node visibility array
}

/**
 * Calculates the visibility of edges based on the selected year range.
 * @param {Array} selectedYearRange - The year range selected by the user as [fromYear, toYear]
 */
function updateEdgeYearVisibility([fromYear, toYear]) {
  const edgeData = lineSegments.userData.edgeData;

  edgeData.forEach((edge, i) => {
    // Set visibility to 1 if the edge's year is within the selected range, 0 otherwise
    const isVisible = edge.year >= fromYear && edge.year <= toYear;

    // Update visibility for all segments of this edge
    for (let j = edge.startIndex; j < edge.endIndex; j++) {
      edgeVisibility[j] = isVisible ? 1.0 : 0.0;
    }
  });

  return edgeVisibility; // Return calculated edge visibility array
}
