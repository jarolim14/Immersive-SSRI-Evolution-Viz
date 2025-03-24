import { handleResize } from "./sceneCreation";
import { handleScroll } from "./orbitControls";
import { handleMouseDown, handleMouseUp } from "./singleNodeSelection";
import { visibilityManager } from "./visibilityManager.js";
import { instructionsModal } from "./instructionsModal.js";

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

  window.addEventListener("yearUpdated", () => {
    visibilityManager.updateYearVisibility();
  });

  window.addEventListener("clusterVisibilityUpdated", () => {
    visibilityManager.updateClusterVisibility();
  });

  // Add keyboard shortcut for instructions
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "h") {
      instructionsModal.show();
    }
  });
}
