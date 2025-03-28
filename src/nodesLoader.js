/**
 * @file nodesLoader.js
 * @description This module handles the loading, parsing, and initialization of node data for a 3D graph visualization using Three.js.
 * It provides functionality for creating node geometries, calculating node properties, and managing node data.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key Functions:
 * - initializeBufferGeometry(nodeCount): Initializes THREE.BufferGeometry for nodes.
 * - normalizeCentrality(data, nodesToLoad): Calculates min and max centrality values.
 * - calculatePosition(node): Computes 3D position for a node.
 * - calculateNodeSize(normalizedCentrality): Determines node size based on centrality.
 * - getNodeColor(node, clusterColorMap): Retrieves color for a node based on its cluster.
 * - updateNodeData(index, position, color, size): Updates node data in the buffer.
 * - parseNodesData(data, percentage, clusterLabelMap, clusterColorMap): Main function for parsing node data.
 * - loadNodeData(url, percentage, clusterLabelMap, clusterColorMap): Loads and parses node data from a URL.
 * - getInitialNodeData(): Returns the initial node data and geometry.
 *
 * Features:
 * - Dynamic node loading based on a configurable percentage of total nodes.
 * - Custom attribute creation for Three.js BufferGeometry (position, color, size, visibility).
 * - Centrality-based node size calculation.
 * - Cluster-based node coloring.
 * - Support for selective loading of specific clusters.
 * - 3D positioning with configurable multipliers and transformations.
 *
 * This module is crucial for initializing and managing node data in a large-scale 3D graph visualization,
 * providing the foundation for rendering and interacting with nodes in a Three.js environment.
 *
 * @requires THREE
 * @requires ./config.js
 * @requires ./dataUtils.js
 *
 * @exports {Function} loadNodeData
 * @exports {Function} getInitialNodeData
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { loadJSONData } from "./dataUtils.js";
import { SpatialPartitioning } from "./spatialPartitioning.js";

let nodesMap = new Map();
let nodesGeometry = null;
let spatialPartitioning = new SpatialPartitioning();

// BufferGeometry initialization
function initializeBufferGeometry(nodeCount) {
  nodesGeometry = new THREE.BufferGeometry();
  
  // Use TypedArrays for better performance
  const positions = new Float32Array(nodeCount * 3); // x, y, z
  const colors = new Float32Array(nodeCount * 3); // r, g, b
  const sizes = new Float32Array(nodeCount); // size
  const visible = new Float32Array(nodeCount).fill(1); // default visible (1)
  const singleNodeSelectionBrightness = new Float32Array(nodeCount).fill(0); // default visible (1)

  // Create buffer attributes with optimized settings
  nodesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
      .setUsage(THREE.DynamicDrawUsage)
  );
  nodesGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colors, 3)
      .setUsage(THREE.DynamicDrawUsage)
  );
  nodesGeometry.setAttribute(
    "size",
    new THREE.BufferAttribute(sizes, 1)
      .setUsage(THREE.DynamicDrawUsage)
  );
  nodesGeometry.setAttribute(
    "visible",
    new THREE.BufferAttribute(visible, 1)
      .setUsage(THREE.DynamicDrawUsage)
  );
  nodesGeometry.setAttribute(
    "singleNodeSelectionBrightness",
    new THREE.BufferAttribute(singleNodeSelectionBrightness, 1)
      .setUsage(THREE.DynamicDrawUsage)
  );
  
  nodesGeometry.name = "nodesGeometry";
}

// Centrality normalization helper
function normalizeCentrality(data, nodesToLoad) {
  let maxCentrality = -Infinity;
  let minCentrality = Infinity;

  for (let i = 0; i < nodesToLoad; i++) {
    const centrality = parseFloat(data[i].centrality);
    maxCentrality = Math.max(maxCentrality, centrality);
    minCentrality = Math.min(minCentrality, centrality);
  }

  return { maxCentrality, minCentrality };
}

// Position calculation helper
function calculatePosition(node) {
  const x = node.x * CONFIG.coordinateMultiplier;
  const y = node.y * CONFIG.coordinateMultiplier;
  const z = (CONFIG.liftUpZ + node.z) * CONFIG.zCoordinateShift;

  return new THREE.Vector3(x, y, z).applyAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2
  );
}

// Node size calculation helper
function calculateNodeSize(normalizedCentrality) {
  const minSize = CONFIG.nodeSize.min;
  const maxSize = CONFIG.nodeSize.max;
  const sizePower = CONFIG.nodeSize.power || 2;

  return (
    minSize + (maxSize - minSize) * Math.pow(normalizedCentrality, sizePower)
  );
}

// Node color retrieval helper
function getNodeColor(node, clusterColorMap) {
  return clusterColorMap[node.cluster];
}

// Buffer update with batch processing
function updateNodeData(index, position, color, size) {
  const i3 = index * 3;
  const positions = nodesGeometry.attributes.position.array;
  const colors = nodesGeometry.attributes.color.array;
  const sizes = nodesGeometry.attributes.size.array;

  positions[i3] = position.x;
  positions[i3 + 1] = position.y;
  positions[i3 + 2] = position.z;

  colors[i3] = color.r;
  colors[i3 + 1] = color.g;
  colors[i3 + 2] = color.b;

  sizes[index] = size;
}

// Batch update visibility using spatial partitioning
export function updateNodesVisibility(yearRange, selectedClusters) {
  const visibleNodes = spatialPartitioning.updateVisibility(yearRange, selectedClusters);
  const visible = nodesGeometry.attributes.visible.array;
  
  // Reset all nodes to invisible
  visible.fill(0);
  
  // Set visible nodes
  for (const node of visibleNodes) {
    visible[node.index] = 1;
  }
  
  nodesGeometry.attributes.visible.needsUpdate = true;
}

// Batch update selection brightness
export function updateNodesSelectionBrightness(selectedIndices, brightness) {
  const selectionBrightness = nodesGeometry.attributes.singleNodeSelectionBrightness.array;
  for (const index of selectedIndices) {
    selectionBrightness[index] = brightness;
  }
  nodesGeometry.attributes.singleNodeSelectionBrightness.needsUpdate = true;
}

// Main data parsing function with optimized batch processing
function parseNodesData(data, percentage, clusterLabelMap, clusterColorMap) {
  const totalNodes = data.length;
  const nodesToLoad = Math.floor(totalNodes * percentage);
  console.log(`Loading ${nodesToLoad} out of ${totalNodes} nodes`);

  initializeBufferGeometry(nodesToLoad);
  console.log("BufferGeometry initialized");

  const { maxCentrality, minCentrality } = normalizeCentrality(data, nodesToLoad);

  // Pre-allocate arrays for batch processing
  const positions = new Float32Array(nodesToLoad * 3);
  const colors = new Float32Array(nodesToLoad * 3);
  const sizes = new Float32Array(nodesToLoad);
  const visible = new Float32Array(nodesToLoad).fill(1);
  const singleNodeSelectionBrightness = new Float32Array(nodesToLoad).fill(0);

  let loadedNodes = 0;
  for (let i = 0; i < nodesToLoad; i++) {
    const node = data[i];
    if (CONFIG.loadClusterSubset && !CONFIG.clustersToLoad.includes(node.cluster)) {
      continue;
    }

    const nodeId = node.node_index;
    const centrality = parseFloat(node.centrality.toFixed(5));
    const normalizedCentrality = (centrality - minCentrality) / (maxCentrality - minCentrality);
    const position = calculatePosition(node);
    const size = calculateNodeSize(normalizedCentrality);
    const color = getNodeColor(node, clusterColorMap);

    // Create node object for spatial partitioning
    const nodeObject = {
      nodeId,
      cluster: node.cluster,
      clusterLabel: clusterLabelMap[node.cluster],
      year: node.year,
      title: node.title,
      doi: node.doi || "",
      centrality,
      color,
      position: position.clone(), // Store position for spatial queries
      index: loadedNodes // Store buffer index for updates
    };

    // Store node metadata
    nodesMap.set(loadedNodes, nodeObject);

    // Add to spatial partitioning
    spatialPartitioning.insert(nodeObject);

    // Batch update arrays
    const i3 = loadedNodes * 3;
    positions[i3] = position.x;
    positions[i3 + 1] = position.y;
    positions[i3 + 2] = position.z;

    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    sizes[loadedNodes] = size;
    loadedNodes++;
  }

  // Batch update geometry attributes
  nodesGeometry.attributes.position.array = positions;
  nodesGeometry.attributes.color.array = colors;
  nodesGeometry.attributes.size.array = sizes;
  nodesGeometry.attributes.visible.array = visible;
  nodesGeometry.attributes.singleNodeSelectionBrightness.array = singleNodeSelectionBrightness;

  // Mark attributes as updated
  nodesGeometry.attributes.position.needsUpdate = true;
  nodesGeometry.attributes.color.needsUpdate = true;
  nodesGeometry.attributes.size.needsUpdate = true;
  nodesGeometry.attributes.visible.needsUpdate = true;
  nodesGeometry.attributes.singleNodeSelectionBrightness.needsUpdate = true;

  if (loadedNodes < nodesToLoad) {
    nodesGeometry.setDrawRange(0, loadedNodes);
  }
}

export async function loadNodeData(
  url,
  percentage,
  clusterLabelMap,
  clusterColorMap
) {
  try {
    const data = await loadJSONData(url);
    parseNodesData(data, percentage, clusterLabelMap, clusterColorMap);
    console.log("nodesLoader Module ran successfully");
    console.log(clusterLabelMap);
    return { nodesMap, nodesGeometry };
  } catch (error) {
    console.error("Error loading node data:", error);
    throw error; // Re-throw the error for the caller to handle
  }
}

export { nodesMap };
export { nodesGeometry };
