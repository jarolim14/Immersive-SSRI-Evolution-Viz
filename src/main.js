// local imports
// get configs
import { CONFIG } from "./config.js";
// data loading functions
import {
  loadClusterColorMap,
  loadClusterLabelMap,
  getClusterColorMap,
  getClusterLabelMap,
} from "./dataUtils.js";
import { loadNodeData, getInitialNodeData } from "./nodesLoader.js";
// node creation functions
import { createNodes } from "./nodeCreation.js";
// edge  functions
import { loadEdgeData } from "./edgesLoader.js";
import { createEdges } from "./edgeCreation.js";
// scene creation functions
import { createScene } from "./sceneCreation.js";
// event handling functions - single node selection
import {
  raycaster,
  mouse,
  initializeSelectionMesh,
} from "./singleNodeSelection.js";
// legend functions
import { initializeLegend } from "./legend.js";
// year slider functions
import { initializeYearSlider } from "./yearSlider.js";
// rendering functions
import { startRendering } from "./renderer.js";
import { addEventListeners } from "./eventListeners.js";
import { initClusterVisibility } from "./updateClusterVisibility.js";

// Global Variables
const canvas = document.querySelector("canvas.webgl");
//let scene, camera, renderer, controls;

// Main Execution
async function initializeScene() {
  try {
    const startTime = performance.now();

    // Create scene first
    const { scene, camera, renderer, controls, dummy, parent } =
      createScene(canvas);

    camera.isPerspectiveCamera = true;

    // Load color and label maps
    let clusterColorMap, clusterLabelMap;
    try {
      await Promise.all([
        loadClusterColorMap(CONFIG.clusterColorMapUrl),
        loadClusterLabelMap(CONFIG.clusterLabelMapUrl),
      ]);
      clusterColorMap = getClusterColorMap();
      clusterLabelMap = getClusterLabelMap();
      console.log("Label and Color Maps Successfully Loaded");
    } catch (error) {
      console.error("Error loading mapped data:", error);
      clusterColorMap = {};
      clusterLabelMap = {};
    }

    // Load node data
    await loadNodeData(
      CONFIG.nodeDataUrl,
      CONFIG.percentageOfNodesToLoad,
      clusterLabelMap,
      clusterColorMap
    );
    const nodeData = getInitialNodeData();

    // Ensure node data is loaded before proceeding
    if (!nodeData || nodeData.length === 0) {
      throw new Error("Node data not loaded properly");
    }
    console.log(nodeData);

    // Create nodes
    const { points, nodes, positions, colors, sizes, brightness, selected } =
      await createNodes(nodeData);
    if (!points || !nodes) {
      throw new Error("Failed to create nodes");
    }
    parent.add(points);

    //// Load edge data
    const edgeAttributes = await loadEdgeData(
      CONFIG.edgeDataUrl,
      clusterColorMap
    );
    if (!edgeAttributes) {
      throw new Error("Failed to load edge data");
    }

    //
    //// Create edges
    const edges = createEdges(edgeAttributes, nodes, clusterColorMap);
    parent.add(edges);
    scene.add(parent);
    console.log(edges);

    //// Initialize other components
    initializeSelectionMesh(scene);

    await initializeLegend(CONFIG.legendDataUrl);
    initClusterVisibility();

    // Add event listeners
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

    initializeYearSlider();

    // Start rendering
    startRendering(scene, camera, controls, renderer);
  } catch (error) {
    console.error("Error in initializeScene:", error);
    // Handle the error appropriately, e.g., display an error message to the user
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initializeScene().catch((error) => {
    console.error("Error initializing scene:", error);
    // Handle the error appropriately, e.g., display an error message to the user
  });
});
