import { CONFIG } from "./config.js";
import * as THREE from "three";

// Add a smoothing factor for zoom transitions
const ZOOM_SMOOTHING = 0.1;

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

  // Normalize scroll speed with improved sensitivity
  let deltaY = event.deltaY;

  // More refined delta handling for different input devices
  if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
    // Trackpad - more granular control
    deltaY *= 0.5;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    // Mouse wheel - smoother scaling
    deltaY *= 0.8;
  }

  const zoomAmount = deltaY * CONFIG.zoomSpeed;
  const currentDistance = camera.position.distanceTo(controls.target);

  // Smoother exponential interpolation for zooming
  const targetDistance = currentDistance * Math.pow(0.99, zoomAmount);

  // Use smoother lerp for distance transition
  const newDistance = THREE.MathUtils.lerp(
    currentDistance,
    targetDistance,
    ZOOM_SMOOTHING
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
    // Smoother target interpolation
    controls.target.lerp(targetPosition, 0.05);
  }
}
