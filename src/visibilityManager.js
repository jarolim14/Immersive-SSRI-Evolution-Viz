// visibilityManager.js
import { getCurrentYearRange } from "./yearSlider.js";
import { getLegendSelectedLeafKeys } from "./legend.js";
import { points } from "./nodesCreation.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";

class VisibilityManager {
  constructor() {
    this.nodeYearVisibility = null;
    this.edgeYearVisibility = null;
    this.nodeClusterVisibility = null;
    this.edgeClusterVisibility = null;
    this.initialized = false;
  }

  init() {
    if (
      !points?.geometry?.attributes?.visible ||
      !lineSegments?.geometry?.attributes?.visible
    ) {
      console.error("Required geometry attributes not found");
      return;
    }

    const nodeCount = points.geometry.attributes.visible.array.length;
    const edgeCount = lineSegments.geometry.attributes.visible.array.length;

    this.nodeYearVisibility = new Float32Array(nodeCount).fill(1);
    this.edgeYearVisibility = new Float32Array(edgeCount).fill(1);
    this.nodeClusterVisibility = new Float32Array(nodeCount).fill(1);
    this.edgeClusterVisibility = new Float32Array(edgeCount).fill(1);

    this.initialized = true;
    console.log("Visibility Manager initialized");
  }

  updateYearVisibility() {
    if (!this.initialized) {
      this.init();
    }

    const [fromYear, toYear] = getCurrentYearRange();

    // Update node visibility based on year
    nodesMap.forEach((node, index) => {
      this.nodeYearVisibility[index] =
        node.year >= fromYear && node.year <= toYear ? 1 : 0;
    });

    // Update edge visibility based on year
    const edgeData = lineSegments.userData.edgeData;
    edgeData.forEach((edge) => {
      const isVisible = edge.year >= fromYear && edge.year <= toYear;
      for (let j = edge.startIndex; j < edge.endIndex; j++) {
        this.edgeYearVisibility[j] = isVisible ? 1 : 0;
      }
    });

    // Apply visibility based on year and current cluster selection
    this.updateClusterVisibility(); // Call cluster visibility update
    this.applyVisibility();
  }

  updateClusterVisibility() {
    if (!this.initialized) {
      this.init();
    }

    const selectedClusters = new Set(getLegendSelectedLeafKeys());

    // Update node visibility based on clusters
    nodesMap.forEach((node, index) => {
      this.nodeClusterVisibility[index] =
        selectedClusters.size === 0 || selectedClusters.has(node.cluster)
          ? 1
          : 0;
    });

    // Update edge visibility based on clusters
    const edgeData = lineSegments.userData.edgeData;
    edgeData.forEach((edge) => {
      const isVisible =
        selectedClusters.size === 0 ||
        (selectedClusters.has(edge.sourceCluster) &&
          selectedClusters.has(edge.targetCluster));

      for (let j = edge.startIndex; j < edge.endIndex; j++) {
        this.edgeClusterVisibility[j] = isVisible ? 1 : 0;
      }
    });

    // Apply visibility after the cluster selection is made (button press)
    this.applyVisibility();
  }

  applyVisibility() {
    // Combine year and cluster visibility for nodes
    const nodeVisArray = points.geometry.attributes.visible.array;
    for (let i = 0; i < nodeVisArray.length; i++) {
      nodeVisArray[i] =
        this.nodeYearVisibility[i] && this.nodeClusterVisibility[i] ? 1 : 0;
    }
    points.geometry.attributes.visible.needsUpdate = true;

    // Combine year and cluster visibility for edges
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;
    for (let i = 0; i < edgeVisArray.length; i++) {
      edgeVisArray[i] =
        this.edgeYearVisibility[i] && this.edgeClusterVisibility[i] ? 1 : 0;
    }
    lineSegments.geometry.attributes.visible.needsUpdate = true;
  }
}

// Create and export a singleton instance
export const visibilityManager = new VisibilityManager();

// Example usage in your main application:
// Initialize when your application starts
visibilityManager.init();

// Add event listeners in your main application
window.addEventListener("yearUpdated", () => {
  visibilityManager.updateYearVisibility(); // This now also calls cluster visibility update
});

const updateVisibilityButton = document.getElementById("updateVisibility");
if (updateVisibilityButton) {
  updateVisibilityButton.addEventListener("click", () => {
    visibilityManager.updateClusterVisibility(); // This will apply visibility based on current year range and selected clusters
  });
} else {
  console.warn("Update visibility button not found");
}
