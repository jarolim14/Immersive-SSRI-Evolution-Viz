import { loadJSONData } from "./dataUtils.js";
import * as THREE from "three";
import { CONFIG } from "./config.js";

function initializeEdgeAttributes(totalEdges, totalPoints) {
  return {
    index: new Float32Array(totalEdges),
    source: new Float32Array(totalEdges),
    target: new Float32Array(totalEdges),
    weight: new Float32Array(totalEdges),
    colorBool: new Float32Array(totalEdges),
    color: new Float32Array(totalEdges * 3),
    positions: new Float32Array(totalPoints * 3),
    edgeStartIndices: new Uint32Array(totalEdges + 1),
  };
}

function parseEdgeData(data) {
  const totalEdges = data.length;
  console.log(`Total edges: ${totalEdges}`);

  // Pre-calculate total points and initialize attributes
  let totalPoints = 0;
  for (let i = 0; i < totalEdges; i++) {
    totalPoints += data[i].points.length;
  }
  const edgeAttributes = initializeEdgeAttributes(totalEdges, totalPoints);

  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
  const rotationAxis = new THREE.Vector3(1, 0, 0);
  const rotationAngle = Math.PI / 2;

  let positionIndex = 0;
  for (let i = 0; i < totalEdges; i++) {
    const { id, source, target, weight, colored, points } = data[i];
    edgeAttributes.index[i] = id;
    edgeAttributes.source[i] = source;
    edgeAttributes.target[i] = target;
    edgeAttributes.weight[i] = weight;
    edgeAttributes.colorBool[i] = colored ? 1 : 0;
    edgeAttributes.color.set(
      [defaultColor.r, defaultColor.g, defaultColor.b],
      i * 3
    );

    edgeAttributes.edgeStartIndices[i] = positionIndex / 3;

    for (const point of points) {
      const vector = new THREE.Vector3(
        point.x * CONFIG.coordinateMultiplier,
        point.y * CONFIG.coordinateMultiplier,
        point.z * CONFIG.zCoordinateShift
      ).applyAxisAngle(rotationAxis, rotationAngle);

      edgeAttributes.positions.set(
        [vector.x, vector.y, vector.z],
        positionIndex
      );
      positionIndex += 3;
    }
  }

  edgeAttributes.edgeStartIndices[totalEdges] = positionIndex / 3;

  return edgeAttributes;
}

export async function loadEdgeData(url) {
  try {
    const data = await loadJSONData(url);
    const edgeAttributes = parseEdgeData(data);
    console.log("Edge Data parsed");
    console.log(
      "Total coordinate points in edges:",
      edgeAttributes.positions.length / 3
    );
    return edgeAttributes;
  } catch (error) {
    console.error("Error loading edge data:", error);
    throw error;
  }
}
