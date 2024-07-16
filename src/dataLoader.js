import * as THREE from "three";
import { CONFIG } from "./config.js";

// Declare these at the top of your module
let clusterColorMap = {};
let clusterLabelMap = {};
let nodes = new Map();
let positions, colors, sizes;

export function initializeBuffers(maxNodes) {
  positions = new Float32Array(maxNodes * 3);
  colors = new Float32Array(maxNodes * 3);
  sizes = new Float32Array(maxNodes);
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

export async function loadClusterColorMap(url) {
  try {
    const data = await loadJSONData(url);
    for (const [key, value] of Object.entries(data)) {
      clusterColorMap[key] = new THREE.Color(value);
    }
  } catch (error) {
    console.error("Error loading cluster color map:", error);
  }
}

export async function loadClusterLabelMap(url) {
  try {
    const data = await loadJSONData(url);
    Object.assign(clusterLabelMap, data);
  } catch (error) {
    console.error("Error loading cluster label map:", error);
  }
}

function parseJSONData(data, percentage) {
  const totalNodes = data.length;
  const nodesToLoad = Math.floor(totalNodes * percentage);
  console.log(`Loading ${nodesToLoad} out of ${totalNodes} nodes`);
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
    let x = node.x * CONFIG.coordinateMultiplier;
    let y = node.y * CONFIG.coordinateMultiplier;
    let z = centrality * CONFIG.zCoordinateShift;
    // Apply rotation
    const rotatedPosition = new THREE.Vector3(x, y, z).applyAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );
    const size = Math.max(50, 200 * Math.log(centrality + 1));
    const color = clusterColorMap[node.cluster];
    nodes.set(nodeId, {
      index: i,
      cluster: node.cluster,
      clusterLabel: clusterLabelMap[node.cluster],
      year: node.year,
      title: node.title,
      centrality: centrality,
    });
    updateNodeData(
      i,
      rotatedPosition.x,
      rotatedPosition.y,
      rotatedPosition.z,
      color.r,
      color.g,
      color.b,
      size
    );
  }
  // console.log(`Number of nodes loaded: ${nodes.size}`);
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

export async function loadNodeData(url, percentage = 1) {
  try {
    const data = await loadJSONData(url);
    parseJSONData(data, percentage);
  } catch (error) {
    console.error("Error loading node data:", error);
  }
}

export function getNodeData() {
  return {
    nodes,
    positions,
    colors,
    sizes,
  };
}
