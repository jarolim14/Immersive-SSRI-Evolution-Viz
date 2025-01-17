/**
 * @fileoverview VisibilityManager handles the visibility state of nodes and edges in a graph visualization.
 * It manages two types of visibility:
 * 1. Year-based visibility: Shows/hides elements based on their year attribute
 * 2. Cluster-based visibility: Shows/hides elements based on selected clusters
 *
 * The final visibility of each element is determined by combining both visibility states (AND operation).
 *
 * Key features:
 * - Maintains separate visibility arrays for year and cluster states
 * - Updates visibility based on year range selection
 * - Updates visibility based on cluster selection
 * - Provides detailed logging of visibility states
 * - Handles both nodes and edges visibility simultaneously
 *
 * @requires yearSlider - Provides current year range selection
 * @requires legend - Provides selected cluster information
 * @requires nodesCreation - Provides points geometry
 * @requires nodesLoader - Provides nodes data map
 * @requires edgeCreation - Provides line segments geometry
 */

import { getCurrentYearRange } from "./yearSlider.js";
import { getLegendSelectedLeafKeys } from "./legend.js";
import { points } from "./nodesCreation.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";

/**
 * Data structure assumptions:
 * - points: THREE.Points object with visible attribute in geometry
 * - lineSegments: THREE.LineSegments object with visible attribute in geometry
 * - nodesMap: Map containing node data with sequential numeric keys
 * - lineSegments.userData.edgeData: Array of edge data with startIndex and endIndex
 */

class VisibilityManager {
  constructor() {
    this.nodeYearVisibility = null;
    this.edgeYearVisibility = null;
    this.nodeClusterVisibility = null;
    this.edgeClusterVisibility = null;
    this.initialized = false;
  }

  init() {
    // Validate required attributes
    if (
      !points?.geometry?.attributes?.visible ||
      !lineSegments?.geometry?.attributes?.visible
    ) {
      console.error("Required geometry attributes not found");
      return;
    }

    // Validate data structures
    if (!nodesMap || !lineSegments.userData.edgeData) {
      console.error("Required data structures not found", {
        hasNodesMap: !!nodesMap,
        hasEdgeData: !!lineSegments.userData.edgeData,
      });
      return;
    }

    const nodeCount = points.geometry.attributes.visible.array.length;
    const edgeCount = lineSegments.geometry.attributes.visible.array.length;

    console.log("Initializing VisibilityManager", {
      nodeCount,
      edgeCount,
      nodesMapSize: nodesMap.size,
    });

    // Initialize visibility arrays
    this.nodeYearVisibility = new Float32Array(nodeCount).fill(1);
    this.edgeYearVisibility = new Float32Array(edgeCount).fill(1);
    this.nodeClusterVisibility = new Float32Array(nodeCount).fill(1);
    this.edgeClusterVisibility = new Float32Array(edgeCount).fill(1);

    this.initialized = true;
    this.logVisibilityCounts();
  }

  updateYearVisibility() {
    if (!this.initialized) {
      console.log("Initializing before year visibility update...");
      this.init();
      if (!this.initialized) return;
    }

    const [fromYear, toYear] = getCurrentYearRange();
    console.log(`Updating visibility for years ${fromYear} to ${toYear}`);

    let visibleNodesCount = 0;
    // Update node visibility based on year
    nodesMap.forEach((node, index) => {
      const isVisible = node.year >= fromYear && node.year <= toYear;
      this.nodeYearVisibility[index] = isVisible ? 1 : 0;
      if (isVisible) visibleNodesCount++;
    });

    let visibleEdgesCount = 0;
    // Update edge visibility based on year
    const edgeData = lineSegments.userData.edgeData;
    edgeData.forEach((edge) => {
      const isVisible = edge.year >= fromYear && edge.year <= toYear;
      for (let j = edge.startIndex; j < edge.endIndex; j++) {
        this.edgeYearVisibility[j] = isVisible ? 1 : 0;
        if (isVisible) visibleEdgesCount++;
      }
    });

    console.log("Year visibility update complete", {
      visibleNodes: visibleNodesCount,
      totalNodes: nodesMap.size,
      visibleEdges: visibleEdgesCount,
      totalEdges: edgeData.length,
    });

    this.applyVisibility();
  }

  updateClusterVisibility() {
    if (!this.initialized) {
      console.log("Initializing before cluster visibility update...");
      this.init();
      if (!this.initialized) return;
    }

    const selectedClusters = new Set(getLegendSelectedLeafKeys());
    console.log("Updating cluster visibility", {
      selectedClustersCount: selectedClusters.size,
      selectedClusters: Array.from(selectedClusters),
    });

    let visibleNodesCount = 0;
    // Update node visibility based on clusters
    nodesMap.forEach((node, index) => {
      const isVisible =
        selectedClusters.size === 0 || selectedClusters.has(node.cluster);
      this.nodeClusterVisibility[index] = isVisible ? 1 : 0;
      if (isVisible) visibleNodesCount++;
    });

    let visibleEdgesCount = 0;
    // Update edge visibility based on clusters
    const edgeData = lineSegments.userData.edgeData;
    edgeData.forEach((edge) => {
      const isVisible =
        selectedClusters.size === 0 ||
        (selectedClusters.has(edge.sourceCluster) &&
          selectedClusters.has(edge.targetCluster));

      for (let j = edge.startIndex; j < edge.endIndex; j++) {
        this.edgeClusterVisibility[j] = isVisible ? 1 : 0;
        if (isVisible) visibleEdgesCount++;
      }
    });

    console.log("Cluster visibility update complete", {
      visibleNodes: visibleNodesCount,
      totalNodes: nodesMap.size,
      visibleEdges: visibleEdgesCount,
      totalEdges: edgeData.length,
    });

    this.applyVisibility();
  }

  applyVisibility() {
    const nodeVisArray = points.geometry.attributes.visible.array;
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    let visibleNodes = 0;
    let visibleEdges = 0;

    // Apply combined visibility for nodes
    for (let i = 0; i < nodeVisArray.length; i++) {
      const isVisible =
        this.nodeYearVisibility[i] && this.nodeClusterVisibility[i];
      nodeVisArray[i] = isVisible ? 1 : 0;
      if (isVisible) visibleNodes++;
    }

    // Apply combined visibility for edges
    for (let i = 0; i < edgeVisArray.length; i++) {
      const isVisible =
        this.edgeYearVisibility[i] && this.edgeClusterVisibility[i];
      edgeVisArray[i] = isVisible ? 1 : 0;
      if (isVisible) visibleEdges++;
    }

    // Update geometry
    points.geometry.attributes.visible.needsUpdate = true;
    lineSegments.geometry.attributes.visible.needsUpdate = true;

    console.log("Final visibility state", {
      visibleNodes,
      totalNodes: nodeVisArray.length,
      visibleEdges,
      totalEdges: edgeVisArray.length,
      percentNodesVisible:
        ((visibleNodes / nodeVisArray.length) * 100).toFixed(1) + "%",
      percentEdgesVisible:
        ((visibleEdges / edgeVisArray.length) * 100).toFixed(1) + "%",
    });
  }

  logVisibilityCounts() {
    const nodeVisArray = points.geometry.attributes.visible.array;
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    const visibleNodes = Array.from(nodeVisArray).filter((v) => v === 1).length;
    const visibleEdges = Array.from(edgeVisArray).filter((v) => v === 1).length;

    console.log("Current visibility state:", {
      visibleNodes,
      totalNodes: nodeVisArray.length,
      visibleEdges,
      totalEdges: edgeVisArray.length,
      nodeVisibilityArrayLength: this.nodeYearVisibility?.length,
      edgeVisibilityArrayLength: this.edgeYearVisibility?.length,
    });
  }
}

// Create and export singleton instance
export const visibilityManager = new VisibilityManager();

// Add event listener only after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const updateVisibilityButton = document.getElementById("updateVisibility");
  if (updateVisibilityButton) {
    updateVisibilityButton.addEventListener("click", () => {
      console.log("Update visibility button clicked");
      visibilityManager.updateClusterVisibility();
      collapseLegend();
    });
  } else {
    console.warn("Update visibility button not found");
  }
});

function collapseLegend() {
  const subtrees = document.querySelectorAll(".legend-subtree");
  const indicators = document.querySelectorAll(".fold-indicator");

  subtrees.forEach((item) => (item.style.display = "none"));
  indicators.forEach((indicator) => (indicator.textContent = "▶"));

  console.log("Legend collapsed", {
    subtreesCollapsed: subtrees.length,
    indicatorsUpdated: indicators.length,
  });
}
