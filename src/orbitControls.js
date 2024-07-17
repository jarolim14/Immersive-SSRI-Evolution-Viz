import { CONFIG } from "./config.js";
import * as THREE from "three";
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
  // Normalize scroll speed
  let deltaY = event.deltaY;
  // Detect if it's a trackpad or mouse wheel
  if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
    deltaY /= 100; // Trackpad
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    deltaY /= 3; // Mouse wheel
  }
  const zoomAmount = deltaY * CONFIG.zoomSpeed;
  const currentDistance = camera.position.distanceTo(controls.target);
  // Use exponential interpolation for smoother zooming
  const targetDistance = currentDistance * Math.pow(0.95, zoomAmount);
  const newDistance = THREE.MathUtils.lerp(
    currentDistance,
    targetDistance,
    0.1
  );
  // Clamp the new distance within the defined bounds
  const clampedDistance = Math.max(
    CONFIG.minZoom,
    Math.min(CONFIG.maxZoom, newDistance)
  );
  // Calculate zoom direction vector relative to controls target
  const zoomDirection = camera.position
    .clone()
    .sub(controls.target)
    .normalize();
  // Set new camera position relative to controls target
  camera.position
    .copy(controls.target)
    .add(zoomDirection.multiplyScalar(clampedDistance));
  // Update the orbit controls target if needed
  if (CONFIG.zoomToCursor) {
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
  // Update the camera and controls
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
    const targetPosition = intersects[0].point;
    // Smoothly interpolate the controls target
    controls.target.lerp(targetPosition, 0.1);
  }
}
