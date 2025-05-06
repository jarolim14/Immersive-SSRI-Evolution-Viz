/**
 * @file timeTravel.js
 * @description Implements time travel functionality for the visualization,
 * allowing users to see how clusters evolved over time with optimizations
 * for large datasets. Integrates with the existing year slider.
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { nodesMap } from "./nodesLoader.js";
import { lineSegments } from "./edgeCreation.js";
import { points } from "./nodesCreation.js";
import { getLegendSelectedLeafKeys } from "./legend.js";
import { getCurrentYearRange } from "./yearSlider.js";

class TimeTravelController {
  constructor() {
    this.isPlaying = false;
    this.currentYear = CONFIG.timeTravel.startYear;
    this.endYear = CONFIG.timeTravel.endYear;
    this.animationSpeed = CONFIG.timeTravel.animationSpeed;
    this.animationId = null;
    this.selectedClusters = new Set();
    this.abortController = null;
    this.originalYearVisibility = null;
    this.originalEdgeVisibility = null;
    this.ui = {
      playButton: null
    };
    this.nodeYearIndex = null;
    this.edgeYearIndex = null;
    this.camera = null;
    this.controls = null;
    this.scene = null;
    this.yearSliders = {
      fromSlider: null,
      toSlider: null,
      fromValue: null,
      toValue: null
    };
  }

  /**
   * Initialize the time travel controller
   * @param {THREE.PerspectiveCamera} camera - The camera object
   * @param {OrbitControls} controls - The orbit controls
   * @param {THREE.Scene} scene - The scene object
   */
  initialize(camera, controls, scene) {
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;
    this.createUI();
    this.buildYearIndices();

    // Get references to year slider elements
    this.yearSliders.fromSlider = document.getElementById("fromSlider");
    this.yearSliders.toSlider = document.getElementById("toSlider");
    this.yearSliders.fromValue = document.getElementById("fromValue");
    this.yearSliders.toValue = document.getElementById("toValue");
  }

  /**
   * Build indices of nodes and edges by year for efficient access
   * This is crucial for performance with large datasets
   */
  buildYearIndices() {
    console.log("Building year indices for time travel...");
    const startTime = performance.now();

    // Initialize year ranges
    this.nodeYearIndex = {};
    this.edgeYearIndex = {};

    for (let year = CONFIG.timeTravel.startYear; year <= CONFIG.timeTravel.endYear; year++) {
      this.nodeYearIndex[year] = [];
      this.edgeYearIndex[year] = [];
    }

    // Index nodes by year
    nodesMap.forEach((node, index) => {
      const year = node.year;
      if (year >= CONFIG.timeTravel.startYear && year <= CONFIG.timeTravel.endYear) {
        this.nodeYearIndex[year].push({
          index,
          cluster: node.cluster
        });
      }
    });

    // Index edges by year
    if (lineSegments && lineSegments.userData && lineSegments.userData.edgeData) {
      lineSegments.userData.edgeData.forEach((edge) => {
        // Use minYear for edge indexing to determine when the edge first appears
        // This is more efficient than indexing by both min and max since we'll check both during visibility
        const minYear = edge.minYear !== undefined ? edge.minYear : edge.year;

        if (minYear >= CONFIG.timeTravel.startYear && minYear <= CONFIG.timeTravel.endYear) {
          this.edgeYearIndex[minYear].push({
            startIndex: edge.startIndex,
            endIndex: edge.endIndex,
            sourceCluster: edge.sourceCluster,
            targetCluster: edge.targetCluster,
            minYear: minYear,
            maxYear: edge.maxYear !== undefined ? edge.maxYear : edge.year
          });
        }
      });
    }

    const endTime = performance.now();
    console.log(`Year indices built in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

    // Log statistics for each year
    let totalNodes = 0;
    let totalEdges = 0;

    for (let year = CONFIG.timeTravel.startYear; year <= CONFIG.timeTravel.endYear; year++) {
      totalNodes += this.nodeYearIndex[year].length;
      totalEdges += this.edgeYearIndex[year].length;
    }

    console.log(`Total nodes indexed: ${totalNodes}`);
    console.log(`Total edges indexed: ${totalEdges}`);
  }

  /**
   * Start the time travel visualization
   */
  async start() {
    if (this.isPlaying) return;

    // Get selected clusters from legend
    this.selectedClusters = new Set(getLegendSelectedLeafKeys());

    // If no clusters selected, show a message
    if (this.selectedClusters.size === 0) {
      alert("Please select at least one cluster from the legend to begin time travel");
      return;
    }

    // Create a new abort controller
    this.abortController = new AbortController();

    // Save original visibility arrays to restore later
    this.backupOriginalVisibility();

    // Get current year range from slider
    const [fromYear, toYear] = getCurrentYearRange();

    // Reset to starting year (the left slider value)
    this.currentYear = fromYear;
    this.endYear = toYear;

    // Update UI to show we're starting from the left slider
    this.updateYearSlider(this.currentYear);

    // Count how many nodes will be visible for the selected clusters
    let visibleNodesCount = 0;
    nodesMap.forEach((node) => {
      if (this.selectedClusters.has(node.cluster)) {
        visibleNodesCount++;
      }
    });

    // Warn if too many nodes selected
    if (visibleNodesCount > CONFIG.timeTravel.maxVisibleNodesWarning) {
      const proceed = confirm(
        `You've selected ${visibleNodesCount} nodes which may cause performance issues. Proceed anyway?`
      );

      if (!proceed) {
        this.abortController = null;
        return;
      }
    }

    // First, hide all nodes and edges
    this.resetVisibility();

    // Start the animation
    this.isPlaying = true;
    this.updateUI();
    this.animate();
  }

  /**
   * Stop the time travel visualization
   */
  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Signal any ongoing processes to abort
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Don't restore original visibility - keep current state
    // this.restoreOriginalVisibility();

    this.updateUI();
  }

  /**
   * Update the year slider UI to reflect the current year
   * @param {number} year - The current year to display
   */
  updateYearSlider(year) {
    if (!this.yearSliders.toSlider || !this.yearSliders.toValue) return;

    // Update the right slider (to value) to the current year
    this.yearSliders.toSlider.value = year;
    this.yearSliders.toValue.textContent = year;

    // Update the slider fill
    this.updateSliderFill();

    // Trigger the year updated event to update visibility
    this.dispatchYearUpdatedEvent();
  }

  /**
   * Update the slider fill to reflect the current position
   */
  updateSliderFill() {
    const fromSlider = this.yearSliders.fromSlider;
    const toSlider = this.yearSliders.toSlider;
    if (!fromSlider || !toSlider) return;

    const rangeDistance = toSlider.max - toSlider.min;
    const fromPosition = fromSlider.value - toSlider.min;
    const toPosition = toSlider.value - toSlider.min;

    // Use the same styling as in yearSlider.js
    toSlider.style.background = `linear-gradient(
      to right,
      #C6C6C6 0%,
      #C6C6C6 ${(fromPosition / rangeDistance) * 100}%,
      #25daa5 ${(fromPosition / rangeDistance) * 100}%,
      #25daa5 ${(toPosition / rangeDistance) * 100}%,
      #C6C6C6 ${(toPosition / rangeDistance) * 100}%,
      #C6C6C6 100%)`;
  }

  /**
   * Dispatch a yearUpdated event to update visibility
   */
  dispatchYearUpdatedEvent() {
    const event = new Event("yearUpdated");
    window.dispatchEvent(event);
  }

  /**
   * Backup the original visibility arrays to restore after time travel
   */
  backupOriginalVisibility() {
    if (!points || !lineSegments) return;

    const nodeVisArray = points.geometry.attributes.visible.array;
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    this.originalNodeVisibility = new Float32Array(nodeVisArray.length);
    this.originalEdgeVisibility = new Float32Array(edgeVisArray.length);

    // Copy current visibility
    for (let i = 0; i < nodeVisArray.length; i++) {
      this.originalNodeVisibility[i] = nodeVisArray[i];
    }

    for (let i = 0; i < edgeVisArray.length; i++) {
      this.originalEdgeVisibility[i] = edgeVisArray[i];
    }
  }

  /**
   * Restore the original visibility arrays after time travel
   */
  restoreOriginalVisibility() {
    if (!points || !lineSegments) return;
    if (!this.originalNodeVisibility || !this.originalEdgeVisibility) return;

    const nodeVisArray = points.geometry.attributes.visible.array;
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    // Restore original visibility
    for (let i = 0; i < nodeVisArray.length; i++) {
      nodeVisArray[i] = this.originalNodeVisibility[i];
    }

    for (let i = 0; i < edgeVisArray.length; i++) {
      edgeVisArray[i] = this.originalEdgeVisibility[i];
    }

    // Update geometry
    points.geometry.attributes.visible.needsUpdate = true;
    lineSegments.geometry.attributes.visible.needsUpdate = true;
  }

  /**
   * Reset visibility to hide all nodes and edges
   */
  resetVisibility() {
    if (!points || !lineSegments) return;

    const nodeVisArray = points.geometry.attributes.visible.array;
    const edgeVisArray = lineSegments.geometry.attributes.visible.array;

    // Hide all nodes and edges
    for (let i = 0; i < nodeVisArray.length; i++) {
      nodeVisArray[i] = 0;
    }

    for (let i = 0; i < edgeVisArray.length; i++) {
      edgeVisArray[i] = 0;
    }

    // Update geometry
    points.geometry.attributes.visible.needsUpdate = true;
    lineSegments.geometry.attributes.visible.needsUpdate = true;
  }

  /**
   * Animate the time progression
   */
  animate() {
    if (!this.isPlaying) return;

    // Update year slider to show current year
    this.updateYearSlider(this.currentYear);

    // Apply visibility for current year
    this.applyVisibilityForYear(this.currentYear)
      .then(() => {
        // Check if we've reached the end or been aborted
        if (this.currentYear >= this.endYear || !this.isPlaying) {
          this.stop();
          return;
        }

        // Schedule next year update
        setTimeout(() => {
          this.currentYear++;
          this.animationId = requestAnimationFrame(() => this.animate());
        }, this.animationSpeed);
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error("Error during time travel animation:", error);
        }
        this.stop();
      });
  }

  /**
   * Apply visibility for nodes and edges up to a specific year
   * Uses batched processing for better performance with large datasets
   * @param {number} targetYear - The year to show nodes and edges up to
   * @returns {Promise} - Promise that resolves when visibility is applied
   */
  async applyVisibilityForYear(targetYear) {
    if (!points || !lineSegments || !this.abortController) {
      return Promise.reject(new Error("Missing required objects"));
    }

    const signal = this.abortController.signal;

    return new Promise((resolve, reject) => {
      // Early rejection if already aborted
      if (signal.aborted) {
        reject(new Error("AbortError"));
        return;
      }

      const nodeVisArray = points.geometry.attributes.visible.array;
      const edgeVisArray = lineSegments.geometry.attributes.visible.array;

      // Get the year range from sliders
      const fromYear = parseInt(this.yearSliders.fromSlider.value);
      const toYear = parseInt(this.yearSliders.toSlider.value);

      // First, hide all nodes and edges
      for (let i = 0; i < nodeVisArray.length; i++) {
        nodeVisArray[i] = 0;
      }
      for (let i = 0; i < edgeVisArray.length; i++) {
        edgeVisArray[i] = 0;
      }

      let visibleNodesCount = 0;
      let visibleEdgesCount = 0;

      // First, identify all visible nodes by year
      const visibleNodesByCluster = new Map();

      for (let year = fromYear; year <= targetYear; year++) {
        const nodesForYear = this.nodeYearIndex[year] || [];
        for (const node of nodesForYear) {
          if (this.selectedClusters.has(node.cluster)) {
            nodeVisArray[node.index] = 1;
            visibleNodesCount++;

            // Track visible nodes by cluster for edge filtering
            if (!visibleNodesByCluster.has(node.cluster)) {
              visibleNodesByCluster.set(node.cluster, true);
            }
          }
        }
      }

      // Process all edges that have both nodes in the visible range
      for (let year = fromYear; year <= targetYear; year++) {
        const edgesForYear = this.edgeYearIndex[year] || [];

        for (const edge of edgesForYear) {
          // Skip if edge's maxYear is outside our target range
          if (edge.maxYear > targetYear) continue;

          // Check if both clusters are selected
          if (this.selectedClusters.has(edge.sourceCluster) &&
              this.selectedClusters.has(edge.targetCluster)) {

            // Get the actual edge data to access the correct indices
            const edgeData = lineSegments.userData.edgeData.find(e =>
              e.startIndex === edge.startIndex &&
              e.endIndex === edge.endIndex
            );

            if (edgeData) {
              // Set visibility for all points in this edge using the correct indices
              for (let j = edgeData.startIndex; j < edgeData.endIndex; j++) {
                edgeVisArray[j] = 1;
                visibleEdgesCount++;
              }
            }
          }
        }
      }

      // Update geometry
      points.geometry.attributes.visible.needsUpdate = true;
      lineSegments.geometry.attributes.visible.needsUpdate = true;

      console.log(`Year ${targetYear}: ${visibleNodesCount} nodes, ${visibleEdgesCount} edges visible (range: ${fromYear}-${targetYear})`);
      resolve();
    });
  }

  /**
   * Position camera for optimal time-travel viewing
   * @returns {Promise} - Promise that resolves when camera is positioned
   */
  async positionCameraForTimeTravel() {
    // This function is now a no-op - we don't move the camera at all
    // Just resolve immediately with no camera changes
    return Promise.resolve();
  }

  /**
   * Create the minimal time travel UI (just a play button in the legend)
   */
  createUI() {
    // Create a container for the play button
    const container = document.createElement('div');
    container.id = 'time-travel-control';
    container.className = 'time-travel-section';

    // Add section title
    const title = document.createElement('div');
    title.className = 'legend-section-title';
    title.textContent = 'Time Evolution';

    // Create the play button
    this.ui.playButton = document.createElement('button');
    this.ui.playButton.className = 'time-travel-button';
    this.ui.playButton.textContent = 'Play';
    this.ui.playButton.title = 'Play/pause time evolution animation';

    // Add hover effects to play button
    this.ui.playButton.addEventListener('mouseover', () => {
      this.ui.playButton.style.backgroundColor = '#d4b86a';
    });

    this.ui.playButton.addEventListener('mouseout', () => {
      this.ui.playButton.style.backgroundColor = '#e1c874';
    });

    this.ui.playButton.addEventListener('click', () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.start();
      }
    });

    // Add elements to container
    container.appendChild(title);
    container.appendChild(this.ui.playButton);

    // Add to the legend container
    const legendDiv = document.getElementById('legendDiv');
    if (legendDiv) {
      legendDiv.appendChild(container);
    } else {
      console.error("Legend div not found, cannot add time travel UI");
    }
  }

  /**
   * Update UI based on current state
   */
  updateUI() {
    if (!this.ui.playButton) return;

    this.ui.playButton.textContent = this.isPlaying ? 'Stop' : 'Play';
    this.ui.playButton.className = `time-travel-button ${this.isPlaying ? 'playing' : ''}`;
  }
}

export const timeTravelController = new TimeTravelController();