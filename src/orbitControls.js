import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CONFIG } from "./config.js";

export function handleScroll(
  event,
  camera,
  controls,
  raycaster,
  mouse,
  scene,
  canvas
) {
  event.preventDefault();
  const zoomAmount = event.deltaY * CONFIG.zoomSpeed;
  const currentDistance = camera.position.length();
  // Calculate new distance using logarithmic scaling
  let newDistance = currentDistance * Math.pow(1.1, zoomAmount);
  // Clamp the new distance within the defined bounds
  newDistance = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newDistance));
  // Calculate zoom direction vector
  const zoomDirection = camera.position.clone().normalize();
  // Set new camera position
  camera.position.copy(zoomDirection.multiplyScalar(newDistance));
  // Update the orbit controls target if needed
  if (CONFIG.zoomToNode) {
    updateOrbitControlsTarget(
      event,
      camera,
      controls,
      raycaster,
      mouse,
      scene,
      canvas
    );
  }
  // Update the camera
  camera.updateProjectionMatrix();
  controls.update();
}

// Optional: Zoom towards cursor point
function updateOrbitControlsTarget(
  event,
  camera,
  controls,
  raycaster,
  mouse,
  scene,
  canvas
) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    controls.target.copy(intersects[0].point);
  }
}
