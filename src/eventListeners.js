import { handleResize } from "./sceneCreation";
import { handleScroll } from "./orbitControls";
import { handleMouseDown, handleMouseUp } from "./singleNodeSelection";

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
}
