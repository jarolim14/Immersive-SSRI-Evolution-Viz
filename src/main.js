// local imports
// get configs
import { CONFIG } from "./config.js";
// data loading functions
import {
  initializeBuffers,
  loadClusterColorMap,
  loadClusterLabelMap,
  loadNodeData,
  getNodeData,
} from "./dataLoader.js";
// node creation functions
import { createNodes } from "./nodeCreation.js";
// scene creation functions
import { createScene } from "./sceneCreation.js";
// event handling functions - single node selection
import {
  raycaster,
  mouse,
  initializeSelectionMesh,
} from "./singleNodeSelection.js";
// legend functions
import { initializeLegend, getLegendSelectedLeafKeys } from "./legend.js";
// rendering functions
import { startRendering } from "./renderer.js";
import { addEventListeners } from "./eventListeners.js";
import {
  initializeUpdateNodeVisibility,
  updateNodeVisibilityBasedOnSelection,
} from "./updateNodeVisibility.js";

// Global Variables
const canvas = document.querySelector("canvas.webgl");
let scene, camera, renderer, controls;

// Main Execution
async function initializeScene() {
  try {
    const startTime = performance.now();
    ({ scene, camera, renderer, controls = {} } = createScene(canvas));
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
    const legendSelectedLeafKeys = getLegendSelectedLeafKeys();
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

    startRendering(scene, camera, controls, renderer);
  } catch (error) {
    console.error("Error in initializeScene:", error);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initializeScene().catch((error) => {
    console.error("Error initializing scene:", error);
  });
});
