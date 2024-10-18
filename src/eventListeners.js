import { handleResize } from "./sceneCreation";
import { handleScroll } from "./orbitControls";
import { handleMouseDown, handleMouseUp } from "./singleNodeSelection";
import { updateClusterVisibility } from "./updateClusterVisibility.js";

export function addEventListeners(
  nodesMap,
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
    handleMouseUp(event, nodesMap, positions, canvas, camera, scene)
  );

  // Add event listener for the update visibility button
  const updateVisibilityButton = document.getElementById("updateVisibility");
  if (updateVisibilityButton) {
    updateVisibilityButton.addEventListener("click", () => {
      updateClusterVisibility(scene);
    });
  } else {
    console.warn("Update visibility button not found");
  }
  window.addEventListener("clusterVisibilityUpdated", () => {});
}
