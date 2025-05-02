import { CONFIG } from "./config.js";
import * as THREE from "three";

// Reduced smoothing factor for faster response when zooming
const ZOOM_SMOOTHING = 0.2;

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

  const currentDistance = camera.position.distanceTo(controls.target);

  // Increase base speed for faster overall zooming
  const baseSpeed = CONFIG.zoomSpeed * 1.5;

  // Enhanced progressive factor with stronger scaling at distance
  // Using higher multiplier to create more aggressive zoom at distance
  const distanceFactor = Math.log10(1 + currentDistance / 500) * 2;

  // Combine the base speed with the distance factor
  // First scroll will use lower base speed, preventing the initial jump
  const adaptiveSpeed = baseSpeed * (1 + distanceFactor);

  // Get the zoom direction from the wheel event
  // Ensure consistent direction: positive deltaY = zoom out, negative = zoom in
  const zoomFactor = 1 + (deltaY > 0 ? adaptiveSpeed : -adaptiveSpeed);

  // Calculate new distance based on current distance and zoom factor
  const targetDistance = currentDistance * zoomFactor;

  // Use smoother lerp for distance transition
  // Higher value gives faster response
  const newDistance = THREE.MathUtils.lerp(
    currentDistance,
    targetDistance,
    ZOOM_SMOOTHING
  );

  // Check if zooming out beyond the current maxZoom limit
  // If so, temporarily allow it to go beyond the CONFIG.maxZoom
  // This effectively allows zooming out further than the default limit
  let effectiveMaxZoom = CONFIG.maxZoom;
  let effectiveMinZoom = CONFIG.minZoom;

  // When actively zooming out (positive deltaY), allow exceeding the normal limit
  if (deltaY > 0 && currentDistance > CONFIG.maxZoom * 0.8) {
    // Allow zooming out to 3x the normal limit
    effectiveMaxZoom = CONFIG.maxZoom * 3;
  }

  // When actively zooming in (negative deltaY), allow going below the normal min limit
  // This enables zooming in closer than the default limit
  if (deltaY < 0 && currentDistance < CONFIG.minZoom * 1.2) {
    // Allow zooming in to 1/3 of the normal limit
    effectiveMinZoom = CONFIG.minZoom / 3;
  }

  // Clamp the new distance within the defined bounds, using the adjusted limits
  const clampedDistance = Math.max(
    effectiveMinZoom,
    Math.min(effectiveMaxZoom, newDistance)
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
