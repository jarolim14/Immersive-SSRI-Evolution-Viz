import { add } from "three/examples/jsm/nodes/Nodes.js";

// Configuration
export const CONFIG = {
  // Scene and Object Configuration
  backgroundColor: 0x050507,
  gridHelperSize: 1000,
  gridHelperDivisions: 10,
  axesHelperSize: 1000,
  addAxesHelper: true,
  // Renderer Configuration
  rendererAntialias: false, // Set to true for production Antialiasing is a technique used to reduce the appearance of jagged edges (aliasing) in digital images. These jagged edges are often referred to as “jaggies” and are especially noticeable on diagonal lines or curves. By smoothing these edges, antialiasing improves the visual quality of the rendered image.
  rendererAutoClearColor: true,
  devicePixelRatio: Math.min(window.devicePixelRatio, 2),
  // Camera Configuration
  cameraFOV: 75, // Field of view in degrees (higher values give a fish-eye effect)
  cameraNearPlane: 0.5, // Near clipping plane (anything closer than this won't be rendered)
  cameraFarPlane: 10000, // Far clipping plane (anything further away from this won't be rendered)
  // Controls Configuration
  controlsMinDistance: 100, // Minimum distance the camera can be from the origin
  controlsMaxDistance: 5000, // Maximum distance the camera can be from the origin
  // Node Configuration
  nodeTextureUrl: "textures/standard_node.png",
  coordinateMultiplier: 20, // Multiplier for the node coordinates
  zCoordinateShift: -100, // multiplier for the centrality which functions as z dimension
  // Interaction Configuration
  clickDurationThreshold: 10, // in milliseconds. long clicks are ignored (bc they drag)
  clickDistanceThreshold: 5, // in pixels
  nodeSelectionAccuracyThreshold: 10, //pixels; how accurate the click
  zoomSpeed: 0.05, // scroll speed
  minZoom: 100,
  maxZoom: 5000,
  // Performance Configuration
  maxNodes: 45000,
  percentageOfDataToLoad: 1.0,
  loadClusterSubset: false,
  clustersToLoad: Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 15)
  ),
  // File Paths and URLs
  nodeDataUrl: "/data/2d_with_color.json",
  clusterColorMapUrl: "data/cluster_color_dict.json",
  clusterLabelMapUrl: "data/cluster_label_dict.json",
  legendDataUrl: "data/legend_tree.json",
  nodeTextureUrl: "textures/nodeTexture.png",
  spotlightTextureUrl: "textures/spotlightTexture.png",
};
