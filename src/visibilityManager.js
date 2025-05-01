/**
 * @fileoverview VisibilityManager handles the visibility state of nodes and edges
 * with combined year and cluster filtering.
 */

import { getCurrentYearRange } from "./yearSlider.js";
import { getLegendSelectedLeafKeys } from "./legend.js";
import { points } from "./nodesCreation.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";
import { edgesMap } from "./edgesLoader.js";

class VisibilityManager {
  constructor() {
    this.nodeYearVisibility = null;
    this.edgeYearVisibility = null;
    this.nodeClusterVisibility = null;
    this.edgeClusterVisibility = null;
    this.initialized = false;

    // Event listener for yearUpdated
    window.addEventListener("yearUpdated", () => {
      this.updateYearVisibility();
    });
  }

  init(edgeControlFunctions = {}) {
    // Validate required attributes
    if (!points?.geometry?.attributes?.visible || !lineSegments?.geometry?.attributes?.visible) {
      console.error("Required geometry attributes not found");
      return;
    }

    const nodeCount = points.geometry.attributes.visible.array.length;
    const edgeCount = lineSegments.geometry.attributes.visible.array.length;

    console.log("Initializing VisibilityManager", {
      nodeCount,
      edgeCount,
      nodesMapSize: nodesMap.size,
      edgesMapSize: edgesMap ? edgesMap.size : 0
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
      this.init();
      if (!this.initialized) return;
    }

    const [fromYear, toYear] = getCurrentYearRange();
    console.log(`Updating visibility for years ${fromYear} to ${toYear}`);

    // Update node visibility based on year
    let visibleNodesCount = 0;
    nodesMap.forEach((node, index) => {
      const isVisible = node.year >= fromYear && node.year <= toYear;
      this.nodeYearVisibility[index] = isVisible ? 1 : 0;
      if (isVisible) visibleNodesCount++;
    });

    // Get edge data
    const edgeData = lineSegments.userData.edgeData || [];

    // Update edge year visibility
    this.edgeYearVisibility.fill(0); // Reset all to invisible first
    let visibleEdgesCount = 0;

    edgeData.forEach((edge) => {
      const isVisible = edge.year >= fromYear && edge.year <= toYear;
      const startIdx = edge.startIndex || edge.startVertexIndex;
      const endIdx = edge.endIndex || edge.endVertexIndex;

      if (startIdx !== undefined && endIdx !== undefined) {
        for (let j = startIdx; j <= endIdx; j++) {
          this.edgeYearVisibility[j] = isVisible ? 1 : 0;
          if (isVisible) visibleEdgesCount++;
        }
      }
    });

    console.log("Year visibility updated", {
      visibleNodes: visibleNodesCount,
      totalNodes: nodesMap.size,
      visibleEdges: visibleEdgesCount,
      totalEdges: edgeData.length,
    });

    // Apply the combined visibility
    this.applyVisibility();
  }

  updateClusterVisibility() {
    if (!this.initialized) {
      this.init();
      if (!this.initialized) return;
    }

    const selectedClusters = new Set(getLegendSelectedLeafKeys());
    console.log("Updating cluster visibility", {
      selectedClustersCount: selectedClusters.size,
      selectedClusters: Array.from(selectedClusters),
    });

    // Update node cluster visibility
    let visibleNodesCount = 0;
    nodesMap.forEach((node, index) => {
      const isVisible =
        selectedClusters.size === 0 || selectedClusters.has(node.cluster);
      this.nodeClusterVisibility[index] = isVisible ? 1 : 0;
      if (isVisible) visibleNodesCount++;
    });

    // Get edge data
    const edgeData = lineSegments.userData.edgeData || [];

    // Update edge cluster visibility
    this.edgeClusterVisibility.fill(0); // Reset all to invisible first
    let visibleEdgesCount = 0;

    // If no clusters selected, make all edges visible
    if (selectedClusters.size === 0) {
      this.edgeClusterVisibility.fill(1);
      visibleEdgesCount = this.edgeClusterVisibility.length;
    } else {
      // Process each edge
      edgeData.forEach((edge) => {
        const sourceVisible = selectedClusters.has(edge.sourceCluster);
        const targetVisible = selectedClusters.has(edge.targetCluster);
        const isVisible = sourceVisible && targetVisible;

        if (isVisible) {
          const startIdx = edge.startIndex || edge.startVertexIndex;
          const endIdx = edge.endIndex || edge.endVertexIndex;

          if (startIdx !== undefined && endIdx !== undefined) {
            for (let j = startIdx; j <= endIdx; j++) {
              this.edgeClusterVisibility[j] = 1;
              visibleEdgesCount++;
            }
          }
        }
      });
    }

    console.log("Cluster visibility updated", {
      visibleNodes: visibleNodesCount,
      totalNodes: nodesMap.size,
      visibleEdges: visibleEdgesCount,
      totalEdges: edgeData.length,
    });

    // Apply the combined visibility
    this.applyVisibility();
  }

  applyVisibility() {
    this.applyNodeVisibility();
    this.applyEdgeVisibility();
  }

  applyNodeVisibility() {
    const nodeVisArray = points.geometry.attributes.visible.array;
    let visibleNodes = 0;

    // Apply combined visibility for nodes
    for (let i = 0; i < nodeVisArray.length; i++) {
      const isVisible = this.nodeYearVisibility[i] && this.nodeClusterVisibility[i];
      nodeVisArray[i] = isVisible ? 1 : 0;
      if (isVisible) visibleNodes++;
    }

    // Update geometry
    points.geometry.attributes.visible.needsUpdate = true;
  }

  applyEdgeVisibility() {
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;
    let visibleEdges = 0;

    // Apply combined visibility for edges
    for (let i = 0; i < edgeVisArray.length; i++) {
      const isVisible = this.edgeYearVisibility[i] && this.edgeClusterVisibility[i];
      edgeVisArray[i] = isVisible ? 1 : 0;
      if (isVisible) visibleEdges++;
    }

    // Update geometry
    lineSegments.geometry.attributes.visible.needsUpdate = true;

    // Log combined results
    console.log("Combined visibility applied", {
      visibleEdges,
      totalEdges: edgeVisArray.length,
      percentEdgesVisible: ((visibleEdges / edgeVisArray.length) * 100).toFixed(1) + "%",
    });
  }

  logVisibilityCounts() {
    const nodeVisArray = points.geometry.attributes.visible.array;
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    const visibleNodes = Array.from(nodeVisArray).filter(v => v === 1).length;
    const visibleEdges = Array.from(edgeVisArray).filter(v => v === 1).length;

    console.log("Current visibility state:", {
      visibleNodes,
      totalNodes: nodeVisArray.length,
      visibleEdges,
      totalEdges: edgeVisArray.length,
    });
  }
}

// Create and export singleton instance
export const visibilityManager = new VisibilityManager();

// Add event listener for visibility button
document.addEventListener("DOMContentLoaded", () => {
  const updateVisibilityButton = document.getElementById("updateVisibility");
  if (updateVisibilityButton) {
    updateVisibilityButton.addEventListener("click", () => {
      console.log("Update visibility button clicked");
      visibilityManager.updateClusterVisibility();
      collapseLegend();
    });
  }
});

function collapseLegend() {
  const subtrees = document.querySelectorAll(".legend-subtree");
  const indicators = document.querySelectorAll(".fold-indicator");

  subtrees.forEach(item => (item.style.display = "none"));
  indicators.forEach(indicator => (indicator.textContent = "▶"));
}