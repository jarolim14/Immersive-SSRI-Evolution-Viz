/**
 * updateNodeVisibility - Updates the visibility of a node based on the selection in the legend.
 * 
 * 

 */

let scene, nodeData;

export function initializeUpdateNodeVisibility(sceneObj, nodeDataObj) {
  scene = sceneObj;
  nodeData = nodeDataObj;
}

export function updateNodeVisibilityBasedOnSelection(selectedLeafKeys) {
  if (!scene || !nodeData) {
    console.error(
      "Scene or nodeData not initialized. Call initializeUpdateNodeVisibility first."
    );
    return;
  }

  const points = scene.children.find((child) => child.type === "Points");
  if (!points) {
    console.error("Points object not found in the scene.");
    return;
  }

  const { geometry } = points;
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  const sizes = geometry.attributes.size.array;

  for (let i = 0; i < nodeData.length; i++) {
    const cluster = nodeData[i].cluster;
    const isSelected = selectedLeafKeys.includes(cluster);

    // Update color (make non-selected nodes more transparent)
    colors[i * 4 + 3] = isSelected ? 1.0 : 0.2; // Alpha channel

    // Update size (make selected nodes larger)
    sizes[i] = isSelected ? 5.0 : 3.0; // Adjust these values as needed

    // You could also adjust the position if you want to separate selected nodes
    // positions[i * 3 + 1] += isSelected ? 10 : 0;  // Move selected nodes up by 10 units
  }

  // Mark attributes as needing update
  geometry.attributes.color.needsUpdate = true;
  geometry.attributes.size.needsUpdate = true;
  // geometry.attributes.position.needsUpdate = true;  // Uncomment if you modify positions

  // Trigger a render update
  if (scene.userData.renderCallback) {
    scene.userData.renderCallback();
  }
}
