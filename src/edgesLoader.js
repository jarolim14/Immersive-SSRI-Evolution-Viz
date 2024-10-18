/**
 * @file edgesLoader.js
 * @description This module handles the loading, parsing, and initialization of edge data for a 3D graph visualization using Three.js.
 * It provides functionality for creating edge geometries, processing edge data, and managing edge metadata.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key Functions:
 * - initializeBufferGeometry(totalPoints): Initializes THREE.BufferGeometry for edges.
 * - isValidNumber(value): Checks if a value is a valid number.
 * - transformPoint(point): Transforms a point's coordinates based on configuration settings.
 * - getEdgeColor(color, clusterColorMap, defaultColor): Determines the color for an edge.
 * - updateEdgeBuffer(positionIndex, vector, edgeColor, year): Updates edge data in the buffer.
 * - storeEdgeMetadata(id, source, target, weight, startIndex, endIndex, year): Stores metadata for each edge.
 * - parseEdgesData(data, clusterColorMap): Main function for parsing edge data.
 * - loadEdgeData(url, clusterColorMap): Loads and parses edge data from a URL.
 * - getInitialEdgeData(): Returns the initial edge data and geometry.
 *
 * Features:
 * - Dynamic edge loading and processing.
 * - Custom attribute creation for Three.js BufferGeometry (position, color, visibility, year).
 * - Efficient storage and retrieval of edge metadata.
 * - Support for color mapping based on clusters.
 * - 3D positioning with configurable transformations.
 * - Handling of invalid or incomplete edge data.
 *
 * This module is crucial for initializing and managing edge data in a large-scale 3D graph visualization,
 * providing the foundation for rendering connections between nodes in a Three.js environment.
 *
 * @requires THREE
 * @requires ./config.js
 * @requires ./dataUtils.js
 *
 * @exports {Function} loadEdgeData
 * @exports {Function} getInitialEdgeData
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { loadJSONData } from "./dataUtils.js";

let edgesMap = new Map();
let edgesGeometry = null;

// BufferGeometry initialization
function initializeBufferGeometry(totalPoints) {
  edgesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(totalPoints * 3); // x, y, z
  const colors = new Float32Array(totalPoints * 3); // r, g, b
  const visible = new Float32Array(totalPoints).fill(1); // default visible (1)
  const years = new Float32Array(totalPoints); // Year for each point

  edgesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  edgesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  edgesGeometry.setAttribute("visible", new THREE.BufferAttribute(visible, 1));
  edgesGeometry.setAttribute("year", new THREE.BufferAttribute(years, 1));
  edgesGeometry.name = "edgesGeometry";
}

// Valid number checker
function isValidNumber(value) {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

// Point transformation helper
function transformPoint(point) {
  return new THREE.Vector3(
    point.x * CONFIG.coordinateMultiplier,
    point.y * CONFIG.coordinateMultiplier,
    (point.z + CONFIG.liftUpZ) * CONFIG.zCoordinateShift
  ).applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
}

// Edge color helper
function getEdgeColor(color, clusterColorMap, defaultColor) {
  return color === -1
    ? defaultColor
    : new THREE.Color(clusterColorMap[color] || defaultColor);
}

// Buffer update
function updateEdgeBuffer(positionIndex, vector, edgeColor, year) {
  const i3 = positionIndex;
  const positions = edgesGeometry.attributes.position.array;
  const colors = edgesGeometry.attributes.color.array;
  const visible = edgesGeometry.attributes.visible.array;
  const years = edgesGeometry.attributes.year.array;

  positions[i3] = vector.x;
  positions[i3 + 1] = vector.y;
  positions[i3 + 2] = vector.z;

  colors[i3] = edgeColor.r;
  colors[i3 + 1] = edgeColor.g;
  colors[i3 + 2] = edgeColor.b;

  visible[positionIndex / 3] = 1;
  years[positionIndex / 3] = year || 0;
}

// Edge metadata storage
function storeEdgeMetadata(
  id,
  source,
  target,
  weight,
  startIndex,
  endIndex,
  year
) {
  edgesMap.set(id, {
    source,
    target,
    weight,
    startIndex,
    endIndex,
    year,
  });
}

// Main data parsing function
function parseEdgesData(data, clusterColorMap) {
  const totalEdges = data.length;
  let totalPoints = 0;

  // First pass: count total points
  data.forEach((edge) => {
    totalPoints += edge.points.length;
  });

  initializeBufferGeometry(totalPoints);
  console.log(
    `BufferGeometry initialized for ${totalEdges} edges with ${totalPoints} total points`
  );

  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
  let positionIndex = 0;

  data.forEach((edge) => {
    const { id, source, target, weight, color, points, year } = edge;
    const startIndex = positionIndex / 3;
    const edgeColor = getEdgeColor(color, clusterColorMap, defaultColor);

    points.forEach((point) => {
      if (
        isValidNumber(point.x) &&
        isValidNumber(point.y) &&
        isValidNumber(point.z)
      ) {
        const vector = transformPoint(point);
        updateEdgeBuffer(positionIndex, vector, edgeColor, year);
        positionIndex += 3;
      }
    });

    const endIndex = positionIndex / 3;
    storeEdgeMetadata(id, source, target, weight, startIndex, endIndex, year);
  });

  // Trim buffer attributes if fewer points were loaded
  if (positionIndex < totalPoints * 3) {
    edgesGeometry.setDrawRange(0, positionIndex / 3);
  }
  console.log("Edge data processed.");
}

// Load and parse edge data
export async function loadEdgeData(url, clusterColorMap) {
  try {
    const data = await loadJSONData(url);
    parseEdgesData(data, clusterColorMap);
    console.log("edgesLoader Module ran successfully");
    return { edgesMap, edgesGeometry };
  } catch (error) {
    console.error("Error loading edge data:", error);
  }
}

export { edgesMap };
export { edgesGeometry };
