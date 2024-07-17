import { handleResize } from "./sceneCreation";
import { handleScroll } from "./orbitControls";
import { handleMouseDown, handleMouseUp } from "./singleNodeSelection";
import {
  updateNodeVisibility,
  getUpdatedBrightness,
  updateNodeBrightnessInScene,
} from "./updateNodeVisibility.js";

export function addEventListeners(
  nodes,
  positions,
  camera,
  renderer,
  controls,
  raycaster,
  mouse,
  scene,
  canvas
) {
  window.addEventListener("resize", () => handleResize(camera, renderer));
  canvas.addEventListener(
    "wheel",
    (event) =>
      handleScroll(event, camera, controls, raycaster, mouse, scene, canvas),
    { passive: false }
  );
  canvas.addEventListener("mousedown", (event) =>
    handleMouseDown(event, canvas)
  );
  canvas.addEventListener("mouseup", (event) =>
    handleMouseUp(event, nodes, positions, canvas, camera, scene)
  );
  // Add event listener for the update visibility button
  const updateVisibilityButton = document.getElementById("updateVisibility");
  if (updateVisibilityButton) {
    updateVisibilityButton.addEventListener("click", updateNodeVisibility);
  } else {
    console.warn("Update visibility button not found");
  }

  // Add event listener for node visibility updates
  window.addEventListener("nodeVisibilityUpdated", () => {
    const updatedBrightness = getUpdatedBrightness();
    updateNodeBrightnessInScene(updatedBrightness, scene);
  });
}
