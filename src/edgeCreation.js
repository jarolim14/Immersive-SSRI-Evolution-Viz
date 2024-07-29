import * as THREE from "three";
import { CONFIG } from "./config.js";

export function createEdges(edgeAttributes, nodes, clusterColorMap) {
  if (
    !edgeAttributes ||
    !edgeAttributes.positions ||
    !edgeAttributes.source ||
    !edgeAttributes.target ||
    !edgeAttributes.edgeStartIndices
  ) {
    console.error("Invalid edgeAttributes:", edgeAttributes);
    return null;
  }
  const totalEdges = edgeAttributes.source.length;
  console.log("Total edges:", totalEdges);
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const defaultColor = new THREE.Color(CONFIG.edgeDefaultColor);
  let missingClusterCount = 0;

  for (let i = 0; i < totalEdges; i++) {
    const startIndex = edgeAttributes.edgeStartIndices[i];
    const endIndex = edgeAttributes.edgeStartIndices[i + 1];
    let color;
    if (edgeAttributes.colorBool[i]) {
      const sourceNode = nodes.get(edgeAttributes.source[i]);
      const clusterColor = sourceNode
        ? clusterColorMap[sourceNode.cluster]
        : null;
      if (clusterColor) {
        color = new THREE.Color(clusterColor);
      } else {
        missingClusterCount++;
        color = defaultColor;
      }
    } else {
      color = defaultColor;
    }
    // Smooth the edge path
    const edgePoints = [];
    for (let j = startIndex * 3; j < endIndex * 3; j += 3) {
      edgePoints.push(
        new THREE.Vector3(
          edgeAttributes.positions[j],
          edgeAttributes.positions[j + 1],
          edgeAttributes.positions[j + 2]
        )
      );
    }

    const curve = new THREE.CatmullRomCurve3(edgePoints);
    const smoothPoints = curve.getPoints(); // Adjust the number of points as needed

    // Add smoothed points for this edge
    for (const point of smoothPoints) {
      positions.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
    }
    // If this isn't the last edge, add a disconnector (NaN)
    if (i < totalEdges - 1) {
      positions.push(NaN, NaN, NaN);
      colors.push(NaN, NaN, NaN);
    }
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = createEdgeMaterial();
  const mesh = new THREE.Line(geometry, material);
  if (missingClusterCount > 0) {
    console.warn(`Missing cluster colors for ${missingClusterCount} edges`);
  }
  return mesh;
}
function createEdgeMaterial() {
  return new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: CONFIG.edgeOpacity,
    linewidth: CONFIG.edgeWidth,
  });
}
