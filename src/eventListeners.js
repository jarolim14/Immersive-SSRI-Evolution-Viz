import { handleResize } from "./sceneCreation";
import { handleScroll } from "./orbitControls";
import { handleMouseDown, handleMouseUp } from "./singleNodeSelection";
//import { updateClusterVisibility } from "./visibilityManagerCluster.js";
//import { updateYearVisibility } from "./visibilityManagerYear.js";
import { visibilityManager } from "./visibilityManager.js";

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
}
