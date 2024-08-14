import * as THREE from "three";
import { CONFIG } from "./config.js";
import { VertexShaderEdge, FragmentShaderEdge } from "./shaders.js";

let lineSegments;

export function createEdges(edgeAttributes, nodes) {
  const totalEdges = edgeAttributes.source.length;
  const positions = edgeAttributes.positions;
  const colors = new Float32Array(positions.length);
  const visibility = new Float32Array(positions.length / 3);
  const indices = [];
  const edgeData = [];
  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);

  const edgesToCreate = Math.floor(
    totalEdges * (CONFIG.percentageOfEdgesToCreate / 100)
  );
  const edgeIndices = new Array(totalEdges).fill().map((_, i) => i);
  shuffleArray(edgeIndices);
  const edgeCount = Math.min(totalEdges, edgesToCreate);

  console.log(`Creating geometry for ${edgeCount} edges`);

  let coloredEdges = 0;
  let missingTargets = 0;
  let missingSources = 0;

  for (let i = 0; i < edgeCount; i++) {
    const edgeIndex = edgeIndices[i];
    const startIndex = edgeAttributes.edgeStartIndices[edgeIndex];
    const endIndex = edgeAttributes.edgeStartIndices[edgeIndex + 1];
    let edgeColor = defaultColor;

    const sourceNodeId = edgeAttributes.source[edgeIndex];
    const targetNodeId = edgeAttributes.target[edgeIndex];
    const sourceNode = nodes.get(sourceNodeId);
    const targetNode = nodes.get(targetNodeId);

    if (edgeAttributes.colorBool[edgeIndex] === 1) {
      let nodeColor;

      if (sourceNode && sourceNode.color) {
        nodeColor = sourceNode.color;
      } else if (targetNode && targetNode.color) {
        nodeColor = targetNode.color;
      }

      if (nodeColor) {
        edgeColor = nodeColor;
        coloredEdges++;
      }
    }

    if (!sourceNode) missingSources++;
    if (!targetNode) missingTargets++;

    // Set edge colors and visibility
    for (let j = startIndex; j < endIndex; j++) {
      colors.set([edgeColor.r, edgeColor.g, edgeColor.b], j * 3);
      visibility[j] = 1; // 1 for default visible
    }

    for (let j = startIndex; j < endIndex - 1; j++) {
      indices.push(j, j + 1);
    }

    // Store edge data
    edgeData.push({
      sourceCluster: sourceNode ? sourceNode.cluster : null,
      targetCluster: targetNode ? targetNode.cluster : null,
      startIndex: startIndex,
      endIndex: endIndex,
    });
  }

  console.log(`Colored edges: ${coloredEdges}`);
  console.log(`Missing sources: ${missingSources}`);
  console.log(`Missing targets: ${missingTargets}`);

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute(
    "visibility",
    new THREE.Float32BufferAttribute(visibility, 1)
  );
  geometry.computeBoundingSphere();

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

// function to get line segments
export function getEdges() {
  return lineSegments;
}
