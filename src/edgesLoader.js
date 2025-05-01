/**
 * @file edgesLoader.js
 * @description Optimized module for loading and rendering edge data using merged BufferGeometry
 * @version 2.0.0
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { loadJSONData } from "./dataUtils.js";

let edgesMap = new Map();
let edgesGeometry = null;
let edgeIndices = []; // Tracks which edges each vertex belongs to (for visibility control)

// Initialize optimized buffer geometry
function initializeBufferGeometry(totalPoints) {
  edgesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(totalPoints * 3); // x, y, z
  const colors = new Float32Array(totalPoints * 3); // r, g, b
  const visible = new Float32Array(totalPoints).fill(1); // default visible (1)
  const years = new Float32Array(totalPoints); // Year for each point
  const indices = []; // Line indices array

  // Create attributes
  edgesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  edgesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  edgesGeometry.setAttribute("visible", new THREE.BufferAttribute(visible, 1));
  edgesGeometry.setAttribute("year", new THREE.BufferAttribute(years, 1));
  edgesGeometry.name = "edgesGeometry";

  // We'll set indices later after processing all points
  return indices;
}

// Point transformation helper
function transformPoint(point) {
  return new THREE.Vector3(
    point.x * CONFIG.coordinateMultiplier,
    point.y * CONFIG.coordinateMultiplier,
    (point.z + CONFIG.liftUpZ) * CONFIG.zCoordinateShift
  ).applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
}

// Valid number checker
function isValidNumber(value) {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

// Edge color helper
function getEdgeColor(color, clusterColorMap, defaultColor) {
  if (color === -1) return defaultColor;

  const clusterColor = clusterColorMap[color];
  if (!clusterColor) {
    console.warn(`No color found for cluster ${color}, using default color`);
    return defaultColor;
  }

  return clusterColor;
}

// Buffer update with improved vertex processing
function updateEdgeBuffer(positionIndex, vector, edgeColor, year, edgeId) {
  const i3 = positionIndex * 3;
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

  visible[positionIndex] = 1;
  years[positionIndex] = year || 0;

  // Store which edge this vertex belongs to (for visibility updates)
  edgeIndices[positionIndex] = edgeId;
}

// Edge metadata storage with improved index tracking
function storeEdgeMetadata(
  id,
  source,
  target,
  weight,
  startVertexIndex,
  endVertexIndex,
  year
) {
  edgesMap.set(id, {
    source,
    target,
    weight,
    startVertexIndex,
    endVertexIndex,
    year,
  });
}

// Main data parsing function with optimized buffer creation
function parseEdgesData(data, clusterColorMap) {
  const totalEdges = data.length;
  let totalPoints = 0;

  // First pass: count total points
  data.forEach((edge) => {
    totalPoints += edge.points.length;
  });

  // Initialize geometry and get indices array
  const indices = initializeBufferGeometry(totalPoints);
  edgeIndices = new Array(totalPoints).fill(0); // Initialize edge indices tracker

  console.log(
    `BufferGeometry initialized for ${totalEdges} edges with ${totalPoints} total points`
  );

  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
  let vertexIndex = 0;

  // Second pass: process each edge
  data.forEach((edge) => {
    const { id, source, target, weight, color, points, year } = edge;
    const startVertexIndex = vertexIndex;
    const edgeColor = getEdgeColor(color, clusterColorMap, defaultColor);
    const validPoints = [];

    // Process all points in this edge
    points.forEach((point) => {
      if (
        isValidNumber(point.x) &&
        isValidNumber(point.y) &&
        isValidNumber(point.z)
      ) {
        const vector = transformPoint(point);
        updateEdgeBuffer(vertexIndex, vector, edgeColor, year, id);
        validPoints.push(vertexIndex);
        vertexIndex++;
      }
    });

    // Create line segments from the points
    for (let i = 0; i < validPoints.length - 1; i++) {
      indices.push(validPoints[i], validPoints[i + 1]);
    }

    // Store edge metadata
    storeEdgeMetadata(id, source, target, weight, startVertexIndex, vertexIndex - 1, year);
  });

  // Set the indices for the line segments
  edgesGeometry.setIndex(indices);

  // Trim buffer attributes if fewer points were loaded
  if (vertexIndex < totalPoints) {
    edgesGeometry.setDrawRange(0, vertexIndex);
  }

  console.log("Edge data processed with optimized buffer approach.");
}

// Load and parse edge data
export async function loadEdgeData(url, clusterColorMap) {
  try {
    const data = await loadJSONData(url);
    parseEdgesData(data, clusterColorMap);
    console.log("Optimized edgesLoader ran successfully");
    return { edgesMap, edgesGeometry, edgeIndices };
  } catch (error) {
    console.error("Error loading edge data:", error);
    throw error;
  }
}

// Function to update visibility of a specific edge
export function updateEdgeVisibility(edgeId, isVisible) {
  if (!edgesMap.has(edgeId) || !edgesGeometry) return;

  const edge = edgesMap.get(edgeId);
  const visibilityValue = isVisible ? 1 : 0;
  const visibilityArray = edgesGeometry.attributes.visible.array;

  // Update visibility for all vertices that belong to this edge
  for (let i = edge.startVertexIndex; i <= edge.endVertexIndex; i++) {
    visibilityArray[i] = visibilityValue;
  }

  // Flag the attribute for update
  edgesGeometry.attributes.visible.needsUpdate = true;
}

// Function to update visibility based on year
export function updateVisibilityByYear(minYear, maxYear) {
  if (!edgesGeometry) return;

  const visibilityArray = edgesGeometry.attributes.visible.array;
  const yearsArray = edgesGeometry.attributes.year.array;

  for (let i = 0; i < visibilityArray.length; i++) {
    const year = yearsArray[i];
    visibilityArray[i] = (year >= minYear && year <= maxYear) ? 1 : 0;
  }

  edgesGeometry.attributes.visible.needsUpdate = true;
}

export { edgesMap, edgesGeometry, edgeIndices };