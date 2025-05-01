export function startRendering(scene, camera, controls, renderer, updateCallback) {
  function tick() {
    controls.update();
    if (updateCallback) {
      updateCallback();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
