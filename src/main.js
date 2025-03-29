import { CONFIG } from "./config.js";
import {
  loadClusterColorMap,
  loadClusterLabelMap,
  getClusterColorMap,
  getClusterLabelMap,
} from "./dataUtils.js";
import { loadNodeData } from "./nodesLoader.js";
import { createNodes } from "./nodesCreation.js";
import { loadEdgeData, updateEdgeVisibility } from "./edgesLoader.js";
import { createEdges, showEdgesByYear, setEdgeVisibility } from "./edgeCreation.js";
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
import { creditsModal } from "./creditsModal.js";
import { initializeSearch } from "./searchFunctionality.js";
import { timeTravelController } from "./timeTravel.js";

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
  // Use the new optimized edge loading approach
  const { edgesMap, edgesGeometry, edgeIndices } = await loadEdgeData(
    CONFIG.edgeDataUrl,
    clusterColorMap
  );

  if (!edgesMap.size || !edgesGeometry) {
    throw new Error("Edge data not loaded properly");
  }

  // Create edges with our optimized approach, passing edgeIndices
  const edgeObject = createEdges(edgesGeometry, edgesMap, nodesMap, edgeIndices);

  if (!edgeObject) {
    throw new Error("Failed to create edges");
  }

  parent.add(edgeObject);

  // Return both the edge object and maps for external access
  return { edgeObject, edgesMap, edgesGeometry };
}

async function initializeScene() {
  console.log("Main: Starting initialization");
  const startTime = performance.now();

  instructionsModal.initialize();
  creditsModal.initialize();

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

    const { edgeObject, edgesMap } = await loadAndCreateEdges(
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

    // Updated code for initializeScene()
    initializeYearSlider(sliderContainer, (minYear, maxYear) => {
      // Only update the visual representation in the slider
      // Don't actually change visibility here
      console.log(`Year range display updated: ${minYear} - ${maxYear}`);

      // The actual visibility update will happen when the "yearUpdated" event fires
      // after the debounce delay
    });

    // Initialize search functionality with access to edge control
    initializeSearch(nodesMap, camera, controls, scene, {
      setEdgeVisibility: setEdgeVisibility  // Pass the new edge visibility function
    });
    console.log("Search functionality initialized");

    // Initialize time travel functionality with access to optimized edge controls
    timeTravelController.initialize(camera, controls, scene, {
      edgeVisibility: {
        showEdgesByYear,
        setEdgeVisibility
      }
    });
    console.log("Time travel functionality initialized");

    // Initialize visibility manager with new edge control functions
    visibilityManager.init({
      showEdgesByYear,
      setEdgeVisibility
    });

    // Add listeners with access to the edge control functions
    addEventListeners(
      nodesMap,
      points,
      camera,
      renderer,
      controls,
      raycaster,
      mouse,
      scene,
      canvas,
      {
        edges: {
          object: edgeObject,
          map: edgesMap,
          setVisibility: setEdgeVisibility
        }
      }
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
  // Initialize modals
  instructionsModal.initialize();
  creditsModal.initialize();

  initializeScene().catch((error) => {
    console.error("Error initializing scene:", error);
    instructionsModal.showError(
      "Failed to initialize the scene. Please refresh the page."
    );
  });
});