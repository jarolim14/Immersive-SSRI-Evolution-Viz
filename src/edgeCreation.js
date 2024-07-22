import * as THREE from "three";
import { CONFIG } from "./config.js";

function hexToThreeColor(hex) {
  return new THREE.Color(hex);
}

export function createEdges(edgeAttributes, nodes, clusterColorMap) {
  if (
    !edgeAttributes ||
    !edgeAttributes.positions ||
    !edgeAttributes.source ||
    !edgeAttributes.target
  ) {
    console.error("Invalid edgeAttributes:", edgeAttributes);
    return null;
  }

  const totalPoints = edgeAttributes.positions.length / 3;
  console.log("Total points:", totalPoints);

  const geometry = createEdgeGeometry(edgeAttributes);
  const material = createEdgeMaterial();
  const mesh = createEdgeMesh(geometry, material);

  const colors = geometry.attributes.color.array;
  let colorIndex = 0;

  let missingNodeCount = 0;
  let missingClusterCount = 0;
  let successfulEdgeCount = 0;

  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);

  // Convert clusterColorMap hex strings to THREE.Color objects
  const threeColorMap = {};
  for (const [cluster, hexColor] of Object.entries(clusterColorMap)) {
    threeColorMap[cluster] = hexToThreeColor(hexColor);
  }

  console.log("Cluster Color Map:", clusterColorMap);
  console.log("Cluster Color Map:", threeColorMap);
  console.log("Default Edge Color:", defaultColor);

  for (let i = 0; i < totalPoints; i++) {
    if (i % 10000 === 0) console.log(`Processing point ${i} of ${totalPoints}`);

    if (
      edgeAttributes.source[i] === undefined ||
      edgeAttributes.target[i] === undefined
    ) {
      console.error(`Invalid edge data at index ${i}:`, {
        source: edgeAttributes.source[i],
        target: edgeAttributes.target[i],
      });
      colors[colorIndex++] = defaultColor.r;
      colors[colorIndex++] = defaultColor.g;
      colors[colorIndex++] = defaultColor.b;
      continue;
    }

    const sourceId = "n" + edgeAttributes.source[i];
    const targetId = "n" + edgeAttributes.target[i];
    const sourceNode = nodes.get(sourceId);
    const targetNode = nodes.get(targetId);

    if (!sourceNode || !targetNode) {
      missingNodeCount++;
      if (missingNodeCount <= 5) {
        console.warn(
          `Edge ${i}: Unable to find source node ${sourceId} or target node ${targetId}`
        );
      }
      colors[colorIndex++] = defaultColor.r;
      colors[colorIndex++] = defaultColor.g;
      colors[colorIndex++] = defaultColor.b;
      continue;
    }

    if (
      typeof sourceNode.cluster === "undefined" ||
      typeof targetNode.cluster === "undefined"
    ) {
      missingClusterCount++;
      if (missingClusterCount <= 5) {
        console.warn(
          `Edge ${i}: Cluster information missing for nodes ${sourceId} or ${targetId}`
        );
      }
      colors[colorIndex++] = defaultColor.r;
      colors[colorIndex++] = defaultColor.g;
      colors[colorIndex++] = defaultColor.b;
      continue;
    }

    successfulEdgeCount++;
    let color;
    if (
      sourceNode.cluster === targetNode.cluster &&
      threeColorMap[sourceNode.cluster]
    ) {
      color = threeColorMap[sourceNode.cluster];
    } else {
      color = defaultColor;
    }

    colors[colorIndex++] = color.r;
    colors[colorIndex++] = color.g;
    colors[colorIndex++] = color.b;
  }

  geometry.attributes.color.needsUpdate = true;

  console.log(`Edge Creation Summary:`);
  console.log(`Total points processed: ${totalPoints}`);
  console.log(`Successful edges: ${successfulEdgeCount}`);
  console.log(`Edges with missing nodes: ${missingNodeCount}`);
  console.log(`Edges with missing cluster information: ${missingClusterCount}`);

  return mesh;
}

function createEdgeMaterial() {
  return new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: CONFIG.edgeOpacity,
  });
}

function createEdgeGeometry(edgeAttributes) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(edgeAttributes.positions, 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(
      new Float32Array(edgeAttributes.positions.length),
      3
    )
  );
  return geometry;
}

function createEdgeMesh(geometry, material) {
  return new THREE.LineSegments(geometry, material);
}
