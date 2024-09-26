import { loadJSONData } from "./dataUtils.js";
import * as THREE from "three";
import { CONFIG } from "./config.js";

const rotationAxis = new THREE.Vector3(1, 0, 0);
const rotationAngle = Math.PI / 2;
const rotationMatrix = new THREE.Matrix4().makeRotationAxis(
  rotationAxis,
  rotationAngle
);

// Object pool for Vector3
const vector3Pool = [];
function getVector3(x, y, z) {
  let v = vector3Pool.pop() || new THREE.Vector3();
  return v.set(x, y, z);
}
function releaseVector3(v) {
  vector3Pool.push(v);
}

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

function transformPoint(x, y, z) {
  x *= CONFIG.coordinateMultiplier;
  y *= CONFIG.coordinateMultiplier;
  z = (z + CONFIG.liftUpZ) * CONFIG.zCoordinateShift;

  const vector = getVector3(x, y, z);
  vector.applyMatrix4(rotationMatrix);
  return vector;
}

function isValidNumber(value) {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function parseEdgeData(data, clusterColorMap) {
  const totalEdges = data.length;
  let totalPoints = data.reduce((sum, edge) => sum + edge.points.length, 0);

  const edgeAttributes = initializeEdgeAttributes(totalEdges, totalPoints);
  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
  let positionIndex = 0;

  for (let i = 0; i < totalEdges; i++) {
    const { id, source, target, weight, color, points } = data[i];
    edgeAttributes.index[i] = id;
    edgeAttributes.source[i] = source;
    edgeAttributes.target[i] = target;
    edgeAttributes.weight[i] = weight;

    let edgeColor;
    if (color === -1) {
      edgeColor = defaultColor;
    } else {
      edgeColor = clusterColorMap[color] || defaultColor;
    }
    try {
      edgeAttributes.color.set([edgeColor.r, edgeColor.g, edgeColor.b], i * 3);
    } catch (error) {
      //console.error("Error setting edge color:", error);
      console.log(edgeColor, color);
      edgeAttributes.color.set(
        [defaultColor.r, defaultColor.g, defaultColor.b],
        i * 3
      );
    }
    edgeAttributes.edgeStartIndices[i] = positionIndex / 3;

    for (let j = 0; j < points.length; j++) {
      const point = points[j];
      if (
        isValidNumber(point.x) &&
        isValidNumber(point.y) &&
        isValidNumber(point.z)
      ) {
        const vector = transformPoint(point.x, point.y, point.z);
        edgeAttributes.positions.set(
          [vector.x, vector.y, vector.z],
          positionIndex
        );
        positionIndex += 3;
        releaseVector3(vector);
      }
    }
  }
  edgeAttributes.edgeStartIndices[totalEdges] = positionIndex / 3;
  // if color

  console.log(edgeAttributes.color);

  return edgeAttributes;
}

export async function loadEdgeData(url, clusterColorMap) {
  try {
    const data = await loadJSONData(url);
    return parseEdgeData(data, clusterColorMap);
  } catch (error) {
    console.error("Error loading edge data:", error);
    throw error;
  }
}
