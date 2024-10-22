/**
 * @file edgeCreation.js
 * @description This module handles the creation and management of edges in a 3D graph visualization using Three.js.
 * It provides functionality for generating edge geometries, applying shaders, and managing edge data.
 *
 * @author [Your Name or Organization]
 * @version 1.1.0
 * @date 2023-10-21
 *
 * Key Functions:
 * - createEdges(edgesGeometry, edgeMap, nodesMap): Creates edge geometries and materials based on provided data.
 * - shuffleArray(array): Implements the Fisher-Yates shuffle algorithm for randomizing edge creation order.
 * - getEdges(): Returns the created line segments representing edges.
 *
 * Features:
 * - Dynamic edge creation based on a configurable fraction of total edges.
 * - Custom shader material application for edge rendering.
 * - Edge visibility control.
 * - Color differentiation for special edges.
 * - Handling of missing source or target nodes.
 * - Edge data storage for further processing or interaction.
 *
 * This module integrates with Three.js to create a complex edge system in a 3D environment,
 * supporting large-scale graph visualizations with customizable appearance and behavior.
 *
 * @requires THREE
 * @requires ./config.js
 * @requires ./shaders.js
 *
 * @exports {Function} createEdges
 * @exports {Function} getEdges
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { VertexShaderEdge, FragmentShaderEdge } from "./shaders.js";

let lineSegments;

export function createEdges(edgesGeometry, edgeMap, nodesMap) {
  const geometry = edgesGeometry.clone(); // Clone to avoid modifying the original
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const visible = new Float32Array(positions.length / 3);
  const indices = [];
  const edgeData = [];

  const totalEdges = edgeMap.size;
  const edgesToCreate = Math.floor(totalEdges * CONFIG.fractionOfEdgesToLoad);
  const edgeIndices = Array.from(edgeMap.keys());
  shuffleArray(edgeIndices);

  const edgeCount = Math.min(totalEdges, edgesToCreate);
  console.log(`Creating geometry for ${edgeCount} edges`);

  let coloredEdges = 0;
  let missingTargets = 0;
  let missingSources = 0;

  for (let i = 0; i < edgeCount; i++) {
    const edgeId = edgeIndices[i];
    const edge = edgeMap.get(edgeId);
    const {
      source: sourceNodeId,
      target: targetNodeId,
      startIndex,
      endIndex,
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

    // Set visible
    for (let j = startIndex; j < endIndex; j++) {
      visible[j] = 1; // 1 for default visible
    }

    // Create indices for line segments
    for (let j = startIndex; j < endIndex - 1; j++) {
      indices.push(j, j + 1);
    }

    // Store edge data
    edgeData.push({
      sourceCluster: sourceNode ? sourceNode.cluster : null,
      targetCluster: targetNode ? targetNode.cluster : null,
      startIndex: startIndex,
      endIndex: endIndex,
      year: edgeYear,
    });

    // Check if edge is colored (non-default color)
    const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
    const edgeColor = new THREE.Color(
      colors[startIndex * 3],
      colors[startIndex * 3 + 1],
      colors[startIndex * 3 + 2]
    );
    if (edgeColor.getHex() !== defaultColor.getHex()) {
      coloredEdges++;
    }
  }

  console.log(`Colored edges: ${coloredEdges}`);
  console.log(`Missing sources: ${missingSources}`);
  console.log(`Missing targets: ${missingTargets}`);

  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geometry.setAttribute(
    "visible",
    new THREE.Float32BufferAttribute(visible, 1)
  );

  const material = new THREE.ShaderMaterial({
    vertexShader: VertexShaderEdge,
    fragmentShader: FragmentShaderEdge,
    uniforms: {
      opacity: { value: CONFIG.edgeOpacity },
      brightness: { value: CONFIG.edgeBrightness },
    },
    transparent: true,
    vertexColors: true,
  });

  lineSegments = new THREE.LineSegments(geometry, material);
  lineSegments.userData.edgeData = edgeData;
  lineSegments.name = "edges";
  return lineSegments;
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export { lineSegments };
