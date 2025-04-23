/**
 * @file edgeCreation.js
 * @description Optimized module for creating and rendering edges using merged BufferGeometry
 * @version 2.0.0
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";

// Custom shaders that respect the visibility attribute
const VertexShaderEdge = `
  attribute float visible;
  varying vec3 vColor;
  varying float vVisible;

  void main() {
    vColor = color; // Use the existing color attribute that THREE.js provides
    vVisible = visible;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FragmentShaderEdge = `
  uniform float opacity;
  uniform float brightness;
  varying vec3 vColor;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard; // Skip invisible segments
    gl_FragColor = vec4(vColor * brightness, opacity);
  }
`;

let lineSegments;

export function createEdges(edgesGeometry, edgesMap, nodesMap, edgeIndices) {
  console.log(`Creating optimized edge rendering with ${edgesMap.size} edges`);

  // We're now working with a pre-built geometry with indices already set
  // We just need to create the material and LineSegments object

  const material = new THREE.ShaderMaterial({
    vertexShader: VertexShaderEdge,
    fragmentShader: FragmentShaderEdge,
    uniforms: {
      opacity: { value: CONFIG.edgeOpacity },
      brightness: { value: CONFIG.edgeBrightness },
      saturation: { value: CONFIG.shaderEffects.edges.saturation },
      glowIntensity: { value: CONFIG.shaderEffects.edges.glowIntensity },
    },
    transparent: true,
    vertexColors: true,
  });

  // Create the LineSegments with our existing geometry
  lineSegments = new THREE.LineSegments(edgesGeometry, material);
  lineSegments.name = "edges";

  // Store edge metadata for later use
  const edgeData = [];

  // If we want to limit the number of edges shown initially
  if (CONFIG.fractionOfEdgesToLoad < 1.0) {
    // Get a subset of edges to show initially
    const totalEdges = edgesMap.size;
    const edgesToShow = Math.floor(totalEdges * CONFIG.fractionOfEdgesToLoad);
    const edgeKeys = Array.from(edgesMap.keys());
    shuffleArray(edgeKeys);

    // Set all edges to invisible first
    const visibilityArray = edgesGeometry.attributes.visible.array;
    visibilityArray.fill(0);

    // Then show only the selected edges
    let coloredEdges = 0;
    let missingTargets = 0;
    let missingSources = 0;

    for (let i = 0; i < edgesToShow && i < edgeKeys.length; i++) {
      const edgeId = edgeKeys[i];
      const edge = edgesMap.get(edgeId);
      const {
        source: sourceNodeId,
        target: targetNodeId,
        startVertexIndex,
        endVertexIndex,
        year,
      } = edge;

      const sourceNode = nodesMap.get(sourceNodeId);
      const targetNode = nodesMap.get(targetNodeId);

      if (!sourceNode) missingSources++;
      if (!targetNode) missingTargets++;

      const edgeYear =
        year ||
        (sourceNode && targetNode
          ? Math.max(sourceNode.year, targetNode.year)
          : 0);

      // Make this edge visible
      for (let j = startVertexIndex; j <= endVertexIndex; j++) {
        visibilityArray[j] = 1;
      }

      // Store edge data for reference
      edgeData.push({
        id: edgeId,
        sourceCluster: sourceNode ? sourceNode.cluster : null,
        targetCluster: targetNode ? targetNode.cluster : null,
        startIndex: startVertexIndex,
        endIndex: endVertexIndex,
        year: edgeYear,
      });

      // Check if edge is colored (non-default color)
      const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
      const colors = edgesGeometry.attributes.color.array;
      const edgeColor = new THREE.Color(
        colors[startVertexIndex * 3],
        colors[startVertexIndex * 3 + 1],
        colors[startVertexIndex * 3 + 2]
      );

      if (edgeColor.getHex() !== defaultColor.getHex()) {
        coloredEdges++;
      }
    }

    console.log(`Showing ${edgesToShow} of ${totalEdges} edges`);
    console.log(`Colored edges: ${coloredEdges}`);
    console.log(`Missing sources: ${missingSources}`);
    console.log(`Missing targets: ${missingTargets}`);

    // Mark buffer for update
    edgesGeometry.attributes.visible.needsUpdate = true;
  } else {
    // Show all edges - convert edgesMap to edgeData for reference
    for (const [edgeId, edge] of edgesMap.entries()) {
      const {
        source: sourceNodeId,
        target: targetNodeId,
        startVertexIndex,
        endVertexIndex,
        year,
      } = edge;

      const sourceNode = nodesMap.get(sourceNodeId);
      const targetNode = nodesMap.get(targetNodeId);

      edgeData.push({
        id: edgeId,
        sourceCluster: sourceNode ? sourceNode.cluster : null,
        targetCluster: targetNode ? targetNode.cluster : null,
        startIndex: startVertexIndex,
        endIndex: endVertexIndex,
        year: year || (sourceNode && targetNode ? Math.max(sourceNode.year, targetNode.year) : 0),
      });
    }
  }

  // Store edge data in userData for reference
  lineSegments.userData.edgeData = edgeData;

  return lineSegments;
}

// Functions for controlling edge visibility
export function showEdgesByYear(minYear, maxYear) {
  if (!lineSegments) return;

  const visibilityArray = lineSegments.geometry.attributes.visible.array;
  const yearArray = lineSegments.geometry.attributes.year.array;

  for (let i = 0; i < visibilityArray.length; i++) {
    const year = yearArray[i];
    visibilityArray[i] = (year >= minYear && year <= maxYear) ? 1 : 0;
  }

  lineSegments.geometry.attributes.visible.needsUpdate = true;
}

export function showEdgesByCluster(clusterIds) {
  if (!lineSegments || !lineSegments.userData.edgeData) return;

  const visibilityArray = lineSegments.geometry.attributes.visible.array;
  visibilityArray.fill(0); // Start by hiding all

  const edgeData = lineSegments.userData.edgeData;
  const clusterSet = new Set(clusterIds);

  edgeData.forEach(edge => {
    const { sourceCluster, targetCluster, startIndex, endIndex } = edge;
    const showEdge = clusterSet.has(sourceCluster) || clusterSet.has(targetCluster);

    if (showEdge) {
      for (let i = startIndex; i <= endIndex; i++) {
        visibilityArray[i] = 1;
      }
    }
  });

  lineSegments.geometry.attributes.visible.needsUpdate = true;
}

export function setEdgeVisibility(edgeId, isVisible) {
  if (!lineSegments) return;

  const edgeData = lineSegments.userData.edgeData.find(edge => edge.id === edgeId);
  if (!edgeData) return;

  const visibilityArray = lineSegments.geometry.attributes.visible.array;
  const visibilityValue = isVisible ? 1 : 0;

  for (let i = edgeData.startIndex; i <= edgeData.endIndex; i++) {
    visibilityArray[i] = visibilityValue;
  }

  lineSegments.geometry.attributes.visible.needsUpdate = true;
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export { lineSegments };