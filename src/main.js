import { CONFIG } from "./config.js";
import {
  loadClusterColorMap,
  loadClusterLabelMap,
  getClusterColorMap,
  getClusterLabelMap,
} from "./dataUtils.js";
import { loadNodeData } from "./nodesLoader.js";
import { createNodes } from "./nodesCreation.js";
import { loadEdgeData } from "./edgesLoader.js";
import { createEdges } from "./edgeCreation.js";
import { createScene } from "./sceneCreation.js";
import {
  raycaster,
  mouse,
  initializeSelectionMesh,
} from "./singleNodeSelection.js";
import { initializeLegend } from "./legend.js";
import { initializeYearSlider } from "./yearSlider.js";
import { startRendering } from "./renderer.js";
import { addEventListeners } from "./eventListeners.js";
import { visibilityManager } from "./visibilityManager.js";
import { instructionsModal } from "./instructionsModal.js";

const canvas = document.querySelector("canvas.webgl");

async function loadMaps() {
  await Promise.all([
    loadClusterColorMap(CONFIG.clusterColorMapUrl),
    loadClusterLabelMap(CONFIG.clusterLabelMapUrl),
  ]);
  return {
    clusterColorMap: getClusterColorMap(),
    clusterLabelMap: getClusterLabelMap(),
  };
}

async function loadAndCreateNodes(parent, clusterLabelMap, clusterColorMap) {
  const { nodesMap, nodesGeometry } = await loadNodeData(
    CONFIG.nodeDataUrl,
    CONFIG.fractionOfNodesToLoad,
    clusterLabelMap,
    clusterColorMap
  );
  if (!nodesMap.size || !nodesGeometry) {
    throw new Error("Node data not loaded properly");
  }
  const { points } = createNodes(nodesGeometry);
  parent.add(points);
  return { nodesMap, points };
}

async function loadAndCreateEdges(parent, clusterColorMap, nodesMap) {
  const { edgesMap, edgesGeometry } = await loadEdgeData(
    CONFIG.edgeDataUrl,
    clusterColorMap
  );
  if (!edgesMap.size || !edgesGeometry) {
    throw new Error("Edge data not loaded properly");
  }
  const edgeObject = createEdges(edgesGeometry, edgesMap, nodesMap);
  if (!edgeObject) {
    throw new Error("Failed to create edges");
  }
  parent.add(edgeObject);
  return edgeObject;
}

async function initializeScene() {
  console.log("Main: Starting initialization");
  const startTime = performance.now();

  instructionsModal.initialize();

  try {
    const { scene, camera, renderer, controls, parent } = createScene(canvas);
    camera.isPerspectiveCamera = true;

    console.log("Starting data loading and visualization process...");

    const { clusterColorMap, clusterLabelMap } = await loadMaps();
    console.log("Label and Color Maps Successfully Loaded");

    const { nodesMap, points } = await loadAndCreateNodes(
      parent,
      clusterLabelMap,
      clusterColorMap
    );
    console.log("Nodes loaded and created successfully");

    const edgeObject = await loadAndCreateEdges(
      parent,
      clusterColorMap,
      nodesMap
    );
    console.log("Edges loaded and created successfully");

    scene.add(parent);

    initializeSelectionMesh(scene);
    await initializeLegend(CONFIG.legendDataUrl);

    const sliderContainer = document.createElement("div");
    sliderContainer.id = "year-slider-container";
    document.body.appendChild(sliderContainer);

    initializeYearSlider(sliderContainer, (minYear, maxYear) => {
      console.log(`Year range changed: ${minYear} - ${maxYear}`);
    });

    visibilityManager.init();

    addEventListeners(
      nodesMap,
      points,
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
    instructionsModal.showError("Error loading data. Please refresh the page.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeScene().catch((error) => {
    console.error("Error initializing scene:", error);
    instructionsModal.showError(
      "Failed to initialize the scene. Please refresh the page."
    );
  });
});
