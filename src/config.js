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
  windowSizes: {
    // Window size settings
    width: window.innerWidth, // Initial window width
    height: window.innerHeight, // Initial window height
  },
  // Camera Configuration
  cameraFOV: 75, // Field of view in degrees (higher values give a fish-eye effect)
  cameraNearPlane: 0.5, // Near clipping plane (anything closer than this won't be rendered)
  cameraFarPlane: 20000, // Far clipping plane (anything further away from this won't be rendered)
  // Controls Configuration
  controlsMinDistance: 100, // Minimum distance the camera can be from the origin
  controlsMaxDistance: 10000, // Maximum distance the camera can be from the origin
  zoomToCursor: true, // Zoom to node or only towards 0,0,0
  // fog
  fog: {
    color: { r: 0.6, g: 0.7, b: 0.8 }, // Light blue-gray fog
    near: 3000,
    far: 50000,
  },
  // Node Configuration
  nodeTextureUrl: "textures/standard_node.png",
  coordinateMultiplier: 1.5, //500, //25 Multiplier for the node coordinates
  zCoordinateShift: -1, //-200, // 5 multiplier for the centrality which functions as z dimension
  nodeSize: {
    min: 50, // 50
    max: 500, // 500
    power: 2, // Adjust this to change how quickly size increases with centrality
  },
  brightness: { default: 1.5, selected: 2.0, unselected: 0.2 },
  singleNodeSelectionBrightness: 0.5, // 50% more brightness for single node selection
  // Performance Configuration
  maxNodes: 45000,
  fractionOfNodesToLoad: 1, // //0.5,
  // All Z Coords
  liftUpZ: 0, //0.15, // lift all nodes by 0.15, so none are negative.
  // Edge Configuration
  edgeTextureUrl: "textures/standard_edge.png",
  edgeTextureWidth: 0.1,
  edgeDefaultColor: "#CCCCCC", // white
  edgeWidth: 0.01,
  edgeOpacity: 0.2, //0.1,
  edgeBrightness: 0.5,
  fractionOfEdgesToLoad: 1,
  // Interaction Configuration
  clickDurationThreshold: 200, // in milliseconds. long clicks are ignored (bc they drag)
  clickDistanceThreshold: 5, // in pixels
  nodeSelectionAccuracyThreshold: 15, //pixels; how accurate the click
  zoomSpeed: 0.05, // scroll speed
  minZoom: 75,
  maxZoom: 5000,
  yearUpdateDelayTime: 1000, // Time in milliseconds before dispatching the event

  // File Paths and URLs
  nodeDataUrl: "/data/smallchecksample10clusters_nodes.json",
  edgeDataUrl: "/data/smallchecksample10clusters_edges.json",
  clusterColorMapUrl: "data/cluster_color_dict.json",
  clusterLabelMapUrl: "data/cluster_label_dict.json",
  legendDataUrl: "data/legend_tree_mut_excl.json",
  nodeTextureUrl: "textures/nodeTexture.png",
  spotlightTextureUrl: "textures/spotlightTexture.png",
};
