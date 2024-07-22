import { loadJSONData } from "./dataUtils.js";

function calculateTotalPoints(data, edgesToLoad) {
  return data
    .slice(0, edgesToLoad)
    .reduce((total, edge) => total + edge.points.length, 0);
}

function initializeEdgeAttributes(totalPoints) {
  return {
    index: new Float32Array(totalPoints),
    source: new Float32Array(totalPoints),
    target: new Float32Array(totalPoints),
    weight: new Float32Array(totalPoints),
    color: new Float32Array(totalPoints),
    positions: new Float32Array(totalPoints * 3),
  };
}

function parseEdgeData(data, percentage) {
  const totalEdges = data.length;
  console.log(`Total edges: ${totalEdges}`);

  const totalPoints = calculateTotalPoints(data, edgesToLoad);
  const edgeAttributes = initializeEdgeAttributes(totalPoints);

  let currentIndex = 0;
  for (let i = 0; i < edgesToLoad; i++) {
    const { id, source, target, weight, colored, points } = data[i];
    const colorValue = colored ? 1 : 0;

    for (const point of points) {
      edgeAttributes.index[currentIndex] = id;
      edgeAttributes.source[currentIndex] = source;
      edgeAttributes.target[currentIndex] = target;
      edgeAttributes.weight[currentIndex] = weight;
      edgeAttributes.color[currentIndex] = colorValue;

      const posIndex = currentIndex * 3;
      edgeAttributes.positions[posIndex] = point.x;
      edgeAttributes.positions[posIndex + 1] = point.y;
      edgeAttributes.positions[posIndex + 2] = point.z;

      currentIndex++;
    }
  }

  return edgeAttributes;
}

export async function loadEdgeData(url, percentage = 1.0) {
  try {
    const data = await loadJSONData(url);
    console.log("Edge Data loaded. Now parsing...");
    console.log("Number of edges: ", data.length);
    const edgeAttributes = parseEdgeData(data, percentage);
    console.log("Edge Data parsed");
    console.log("Total points:", edgeAttributes.positions.length / 3);
    return edgeAttributes;
  } catch (error) {
    console.error("Error loading edge data:", error);
    throw error;
  }
}
