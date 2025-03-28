/**
 * @fileoverview VisibilityManager handles the visibility state of nodes and edges in a graph visualization.
 * It manages two types of visibility:
 * 1. Year-based visibility: Shows/hides elements based on their year attribute
 * 2. Cluster-based visibility: Shows/hides elements based on selected clusters
 *
 * The final visibility of each element is determined by combining both visibility states (AND operation).
 */

import { getCurrentYearRange } from "./yearSlider.js";
import { getLegendSelectedLeafKeys } from "./legend.js";
import { points } from "./nodesCreation.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";
import { edgesMap, edgeIndices } from "./edgesLoader.js";

class VisibilityManager {
  constructor() {
    this.nodeYearVisibility = null;
    this.edgeYearVisibility = null;
    this.nodeClusterVisibility = null;
    this.edgeClusterVisibility = null;
    this.initialized = false;

    // New edge control functions
    this.showEdgesByYear = null;
    this.setEdgeVisibility = null;
  }

  init(edgeControlFunctions = {}) {
    // Store edge control functions if provided
    if (edgeControlFunctions) {
      this.showEdgesByYear = edgeControlFunctions.showEdgesByYear;
      this.setEdgeVisibility = edgeControlFunctions.setEdgeVisibility;
    }

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
      console.log("Initializing before year visibility update...");
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

    // Use the optimized year visibility function if available
    if (this.showEdgesByYear) {
      this.showEdgesByYear(fromYear, toYear);
      console.log("Used optimized edge year visibility function");
    } else {
      // Otherwise fallback to the old approach
      let visibleEdgesCount = 0;

      // Get edge data - first try userData, then fall back to direct edgesMap
      const edgeData = lineSegments.userData.edgeData ||
                      (Array.from(edgesMap.values()) || []);

      // Update each edge's visibility
      edgeData.forEach((edge) => {
        const isVisible = edge.year >= fromYear && edge.year <= toYear;

        // The range might be startVertexIndex/endVertexIndex in the new approach
        const startIdx = edge.startIndex || edge.startVertexIndex;
        const endIdx = edge.endIndex || edge.endVertexIndex;

        if (startIdx !== undefined && endIdx !== undefined) {
          for (let j = startIdx; j <= endIdx; j++) {
            this.edgeYearVisibility[j] = isVisible ? 1 : 0;
            if (isVisible) visibleEdgesCount++;
          }
        }
      });

      console.log("Year visibility update complete (legacy method)", {
        visibleNodes: visibleNodesCount,
        totalNodes: nodesMap.size,
        visibleEdges: visibleEdgesCount,
        totalEdges: edgeData.length,
      });

      // Apply the visibility
      this.applyVisibility();
    }
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

    // Update node visibility based on clusters
    let visibleNodesCount = 0;
    nodesMap.forEach((node, index) => {
      const isVisible =
        selectedClusters.size === 0 || selectedClusters.has(node.cluster);
      this.nodeClusterVisibility[index] = isVisible ? 1 : 0;
      if (isVisible) visibleNodesCount++;
    });

    // Get edge data - first try userData, then fall back to direct edgesMap
    const edgeData = lineSegments.userData.edgeData ||
                    (Array.from(edgesMap.entries()).map(([id, edge]) => ({
                      id,
                      sourceCluster: edge.sourceCluster,
                      targetCluster: edge.targetCluster,
                      startIndex: edge.startVertexIndex,
                      endIndex: edge.endVertexIndex
                    })));

    // Process edges for cluster visibility
    let visibleEdgesCount = 0;

    if (edgeData && edgeData.length > 0) {
      // Reset all edges visibility first
      const visibilityArray = lineSegments.geometry.attributes.visible.array;
      if (selectedClusters.size > 0) {
        // If clusters are selected, reset all to invisible first
        visibilityArray.fill(0);
      } else {
        // If no clusters selected, make all visible
        visibilityArray.fill(1);
        visibleEdgesCount = visibilityArray.length;
      }

      if (selectedClusters.size > 0) {
        // Process each edge for selected clusters
        edgeData.forEach((edge) => {
          // Check for edge's clusters in the selection
          const sourceVisible = selectedClusters.has(edge.sourceCluster);
          const targetVisible = selectedClusters.has(edge.targetCluster);
          const isVisible = sourceVisible && targetVisible;

          if (isVisible) {
            // The range might be startVertexIndex/endVertexIndex in the new approach
            const startIdx = edge.startIndex || edge.startVertexIndex;
            const endIdx = edge.endIndex || edge.endVertexIndex;

            if (startIdx !== undefined && endIdx !== undefined) {
              for (let j = startIdx; j <= endIdx; j++) {
                visibilityArray[j] = 1;
                visibleEdgesCount++;
              }
            }
          }
        });
      }

      // Mark buffer for update
      lineSegments.geometry.attributes.visible.needsUpdate = true;
    }

    console.log("Cluster visibility update complete", {
      visibleNodes: visibleNodesCount,
      totalNodes: nodesMap.size,
      visibleEdges: visibleEdgesCount,
      totalEdges: edgeData ? edgeData.length : 0,
    });

    // Apply node visibility
    this.applyNodeVisibility();
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
      const isVisible =
        this.nodeYearVisibility[i] && this.nodeClusterVisibility[i];
      nodeVisArray[i] = isVisible ? 1 : 0;
      if (isVisible) visibleNodes++;
    }

    // Update geometry
    points.geometry.attributes.visible.needsUpdate = true;

    console.log("Node visibility updated", {
      visibleNodes,
      totalNodes: nodeVisArray.length,
      percentNodesVisible:
        ((visibleNodes / nodeVisArray.length) * 100).toFixed(1) + "%",
    });
  }

  applyEdgeVisibility() {
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    let visibleEdges = 0;

    // Apply combined visibility for edges
    for (let i = 0; i < edgeVisArray.length; i++) {
      const isVisible =
        this.edgeYearVisibility[i] && this.edgeClusterVisibility[i];
      edgeVisArray[i] = isVisible ? 1 : 0;
      if (isVisible) visibleEdges++;
    }

    // Update geometry
    lineSegments.geometry.attributes.visible.needsUpdate = true;

    console.log("Edge visibility updated", {
      visibleEdges,
      totalEdges: edgeVisArray.length,
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