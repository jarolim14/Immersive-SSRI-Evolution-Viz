import * as THREE from "three";
// get configs
import { CONFIG } from "./config";
import {
  initializeBuffers,
  loadClusterColorMap,
  loadClusterLabelMap,
  loadNodeData,
  getNodeData,
} from "./dataLoader.js";
import { createNodes } from "./nodeCreation.js";
import { createScene, handleResize } from "./sceneCreation.js";
import { handleScroll } from "./orbitControls.js";
import { initializeLegend, getLegendSelectedLeafKeys } from "./legend.js";
import {
  raycaster,
  mouse,
  initializeSelectionMesh,
  updateVisualSelection,
  handleMouseDown,
  handleMouseUp,
  handleLongClick,
  updateNodeInfo,
} from "./singleNodeSelection.js";

// Global Variables
const canvas = document.querySelector("canvas.webgl");
let scene, camera, renderer, controls;

// Main Execution
async function initializeScene() {
  try {
    const startTime = performance.now();
    ({ scene, camera, renderer, controls } = createScene(canvas));
    // Make sure the camera is properly set
    camera.isPerspectiveCamera = true;
    initializeBuffers(CONFIG.maxNodes);

    const [clusterColorMap, clusterLabelMap] = await Promise.all([
      loadClusterColorMap(CONFIG.clusterColorMapUrl),
      loadClusterLabelMap(CONFIG.clusterLabelMapUrl),
    ]);

    await loadNodeData(CONFIG.nodeDataUrl, CONFIG.percentageOfDataToLoad);
    const nodeData = getNodeData();
    const { points, nodes, positions, colors, sizes } = createNodes(nodeData);
    if (points) {
      scene.add(points);
    } else {
      console.error("Failed to create nodes");
    }

    initializeSelectionMesh(scene);

    await initializeLegend(CONFIG.legendDataUrl);
    // const legendSelectedLeafKeys = getLegendSelectedLeafKeys();
    //console.log("Initial selected leaf keys:", legendSelectedLeafKeys);

    addEventListeners(
      nodes,
      positions,
      camera,
      renderer,
      controls,
      raycaster,
      mouse,
      scene,
      canvas
    );

    const endTime = performance.now();
    const loadTime = (endTime - startTime) / 1000;
    console.log(`Total load time: ${loadTime.toFixed(2)} seconds`);

    tick();
  } catch (error) {
    console.error("Error in initializeScene:", error);
  }
}

function addEventListeners(
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

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", function () {
  initializeScene().catch((error) => {
    console.error("Error initializing scene:", error);
  });
});
