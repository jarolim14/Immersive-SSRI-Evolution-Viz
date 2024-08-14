/**
 * Data Loading and Processing Module
 *
 * This module handles the loading and processing of node data for a 3D visualization.
 * It includes functions for:
 * - Initializing buffer arrays for node positions, colors, and sizes
 * - Loading JSON data from URLs
 * - Loading and processing cluster color and label maps
 * - Parsing and processing node data, including position calculations and rotations
 * - Updating node data in the buffer arrays
 * - Providing access to the processed node data
 *
 * The module uses Three.js for 3D calculations and relies on a CONFIG object for settings.
 *
 * @author Lukas Westphal
 * @version 1.0
 * @date 16.07.24
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";

// Declare these at the top of your module

let nodes = new Map();
let positions, colors, sizes;

function initializeDefaultNodeAttributes(numberOfNodes) {
  //console.log(`Initializing buffers for ${numberOfNodes} nodes`);
  positions = new Float32Array(numberOfNodes * 3);
  colors = new Float32Array(numberOfNodes * 3);
  sizes = new Float32Array(numberOfNodes);
}

export async function loadJSONData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

function parseNodesData(data, percentage, clusterLabelMap, clusterColorMap) {
  const totalNodes = data.length;
  const nodesToLoad = Math.floor(totalNodes * percentage);
  console.log(`Loading ${nodesToLoad} out of ${totalNodes} nodes`);
  initializeDefaultNodeAttributes(nodesToLoad);
  console.log("Default Node Attributes initialized");

  // Find max and min centrality for normalization
  let maxCentrality = -Infinity;
  let minCentrality = Infinity;
  for (let i = 0; i < nodesToLoad; i++) {
    const centrality = parseFloat(data[i].centrality);
    maxCentrality = Math.max(maxCentrality, centrality);
    minCentrality = Math.min(minCentrality, centrality);
  }

  let loadedNodes = 0;
  for (let i = 0; i < nodesToLoad; i++) {
    const node = data[i];
    if (
      CONFIG.loadClusterSubset &&
      !CONFIG.clustersToLoad.includes(node.cluster)
    ) {
      continue;
    }
    const nodeId = node.node_id;
    const centrality = parseFloat(node.centrality.toFixed(5));
    // Normalize centrality
    const normalizedCentrality =
      (centrality - minCentrality) / (maxCentrality - minCentrality);

    let x = node.x * CONFIG.coordinateMultiplier;
    let y = node.y * CONFIG.coordinateMultiplier;

    let z = (CONFIG.liftUpZ + node.z) * CONFIG.zCoordinateShift; // * CONFIG.coordinateMultiplier; // centrality; // // from old
    // Apply rotation
    const rotatedPosition = new THREE.Vector3(x, y, z).applyAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );

    // Calculate size using a power function
    const minSize = CONFIG.nodeSize.min;
    const maxSize = CONFIG.nodeSize.max;
    const sizePower = CONFIG.nodeSize.power || 2; // Default to square if not specified
    const size =
      minSize + (maxSize - minSize) * Math.pow(normalizedCentrality, sizePower);

    const color = clusterColorMap[node.cluster];
    nodes.set(nodeId, {
      index: loadedNodes,
      cluster: node.cluster,
      clusterLabel: clusterLabelMap[node.cluster],
      year: node.year,
      title: node.title,
      centrality: centrality,
      color: color,
    });
    updateNodeData(
      loadedNodes,
      rotatedPosition.x,
      rotatedPosition.y,
      rotatedPosition.z,
      color.r,
      color.g,
      color.b,
      size,
      CONFIG.brightness.default // Add default brightness
    );
    loadedNodes++;
  }
  // console.log(`Number of nodes loaded: ${nodes.size}`);

  // Trim arrays to actual size if fewer nodes were loaded
  if (loadedNodes < nodesToLoad) {
    positions = positions.slice(0, loadedNodes * 3);
    colors = colors.slice(0, loadedNodes * 3);
    sizes = sizes.slice(0, loadedNodes);
  }
}

function updateNodeData(index, x, y, z, r, g, b, size) {
  const i3 = index * 3;
  positions[i3] = x;
  positions[i3 + 1] = y;
  positions[i3 + 2] = z;
  colors[i3] = r;
  colors[i3 + 1] = g;
  colors[i3 + 2] = b;
  sizes[index] = size;
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
  } catch (error) {
    console.error("Error loading node data:", error);
  }
}

export function getInitialNodeData() {
  return {
    nodes,
    positions,
    colors,
    sizes,
  };
}
