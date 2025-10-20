// Configuration
export const CONFIG = {
  // Scene and Object Configuration
  backgroundColor: 0x050507,
  gridHelperSize: 1000,
  gridHelperDivisions: 10,
  axesHelperSize: 1000,
  addAxesHelper: false,
  // Development Features Configuration
  // These features are only for development and should be disabled in production
  development: {
    // Enable/disable features used only during development
    enabled: false,
    // Video recording functionality for creating demo videos
    videoRecording: {
      enabled: false, // Master toggle for video recording feature
      showButton: true, // Whether to show the recording button
      defaultDuration: 30000, // Default recording duration in milliseconds (30 seconds)
      defaultFps: 60, // Default frames per second for recording
      preferredFormat: "webm", // Preferred video format: 'webm' or 'mp4'
      showAllUI: true, // Whether to show ALL video recording related UI elements
      showCameraTools: false, // Whether to show camera position logging tools
      showOverlayText: false, // Whether to show overlay text during recording
      // Audio narration settings
      narration: {
        enabled: true, // Master toggle for narration
        waitForNarration: true, // Whether to wait for narration to complete before next action
        // Map sequence IDs to audio filenames (without extension)
        sequences: {
          intro: "intro",
          orbitalView: "orbital_view",
          safetyCluster: "safety_cluster",
          perinatalExposure: "perinatal_exposure",
          yearRangeFilter: "year_range_filter",
          searchFunction: "search_function",
          zoomToCluster: "zoom_to_cluster",
          paperHighlight: "paper_highlight",
          conclusion: "conclusion",
        },
      },
    },
    // Camera position tools for development
    showDevTools: true, // Enable camera position tools in the UI
    savePositionHistory: true, // Save previously used camera positions
  },
  // Screenshot functionality
  screenshot: {
    enabled: false, // Master toggle for screenshot feature
    showButton: false, // Whether to show the screenshot button in the UI
    format: "png", // Format of the screenshot (png or jpeg)
    quality: 0.95, // Image quality (0-1) for jpeg format
    filename: "network-screenshot", // Default filename for the screenshot (without extension)
  },
  // Renderer Configuration
  rendererAntialias: true, // Set to true for production Antialiasing is a technique used to reduce the appearance of jagged edges (aliasing) in digital images. These jagged edges are often referred to as "jaggies" and are especially noticeable on diagonal lines or curves. By smoothing these edges, antialiasing improves the visual quality of the rendered image.
  rendererAutoClearColor: true,
  devicePixelRatio: Math.min(window.devicePixelRatio, 2),
  windowSizes: {
    // Window size settings
    width: window.innerWidth, // Initial window width
    height: window.innerHeight, // Initial window height
  },
  // Camera Configuration
  // initital position
  cameraPosition: {
    x: 6177,
    y: 7310,
    z: 12122,
  },
  cameraTarget: {
    x: 4302,
    y: 3761,
    z: 6118,
  },
  cameraFOV: 75, // Field of view in degrees (higher values give a fish-eye effect)
  cameraNearPlane: 0.5, // Near clipping plane (anything closer than this won't be rendered)
  cameraFarPlane: 50000, // Far clipping plane (anything further away from this won't be rendered)
  // Controls Configuration
  controlsMinDistance: 100, // Minimum distance the camera can be from the origin
  controlsMaxDistance: 100000, // Maximum distance the camera can be from the origin
  zoomToCursor: true, // Zoom to node or only towards 0,0,0
  // fog
  fog: {
    color: { r: 0.6, g: 0.7, b: 0.8 }, // Light blue-gray fog
    near: 5000,
    far: 100000,
  },
  // Node Configuration
  nodeTextureUrl: "textures/standard_node.png",
  coordinateMultiplier: 1, //500, //25 Multiplier for the node coordinates
  zCoordinateShift: -1, //-200, // 5 multiplier for the centrality which functions as z dimension
  nodeSize: {
    min: 50, // 50
    max: 500, // 500
    power: 2, // Adjust this to change how quickly size increases with centrality
  },
  brightness: { default: 1.8, selected: 2.2, unselected: 0.4 },
  singleNodeSelectionBrightness: 0.5,
  // Performance Configuration
  maxNodes: 45000,
  fractionOfNodesToLoad: 1, // //0.5,
  // All Z Coords
  liftUpZ: 0, //0.15, // lift all nodes by 0.15, so none are negative.
  // Edge Configuration
  edgeTextureUrl: "textures/standard_edge.png",
  edgeTextureWidth: 0.01,
  edgeDefaultColor: "#CCCCCC", // white
  edgeWidth: 0.2,
  edgeOpacity: 0.15,
  edgeBrightness: 1,
  fractionOfEdgesToLoad: 1, // 0.5,
  // Interaction Configuration
  clickDurationThreshold: 200, // in milliseconds. long clicks are ignored (bc they drag)
  clickDistanceThreshold: 5, // in pixels
  nodeSelectionAccuracyThreshold: 15, //pixels; how accurate the click
  zoomSpeed: 0.015, // Reduced for smoother zooming with new delta handling
  minZoom: 75,
  maxZoom: 50000,

  // File Paths and URLs
  nodeDataUrl: "data/nodes_2025-05-13-13-44-03scale2.json",
  edgeDataUrl: "data/smaller_edges_2025-05-13-13-44-03scale2.json.gz",
  clusterColorMapUrl: "data/cluster_color_map_2025.json",
  clusterLabelMapUrl: "data/cluster_label_map_2025.json",
  legendDataUrl: "data/legend_2025.json",
  nodeTextureUrl: "textures/nodeTexture.png",
  spotlightTextureUrl: "textures/spotlightTexture.png",
  videoUrl: "video/network-visualization-demo20250630.webm",

  // Search Functionality Configuration
  search: {
    resultsLimit: 10, // Maximum number of search results to display
    debounceTime: 200, // Delay in ms before search is executed while typing
    camera: {
      baseDistance: 1500, // Base distance for camera when viewing a search result
      extraHeight: 500, // Extra height added to camera position
      centralityDistanceMultiplier: 50, // How much to increase distance based on node centrality
      transitionDuration: 2500, // Camera transition duration in ms
      viewOffsetUpward: 0.9, // Upward view offset component (Z in rotated system)
      viewOffsetCenter: 0.5, // Center view offset component
    },
  },

  // Time Travel Configuration
  timeTravel: {
    startYear: 1982,
    endYear: 2025,
    animationSpeed: 750, // Milliseconds between each year step
    maxVisibleNodesWarning: 15000,
    processingDelay: 0, // Delay between batch processing to keep UI responsive
    camera: {
      distance: 4000,
      height: 4000,
      fieldOfView: 40,
    },
  },

  // Shader Effects Configuration
  shaderEffects: {
    nodes: {
      // Color saturation controls how vibrant the node colors appear
      // - Higher values (>1) make colors more vibrant and intense
      // - Lower values (<1) make colors more muted and gray
      // - 1.0 is neutral (no change to original color)
      saturation: 2.2,

      // Controls the sharpness of the specular highlight (white spot) on nodes
      // - Higher values create a more focused, intense highlight
      // - Lower values create a softer, more diffuse highlight
      specularPower: 1.0,

      // Controls how bright the specular highlight appears
      // - Higher values make the highlight more visible
      // - Lower values make it more subtle
      // - 0.0 disables the highlight completely
      specularIntensity: 0.5,

      // Base brightness multiplier for all nodes
      // - Higher values make all nodes brighter
      // - Lower values make them darker
      // - 1.0 is neutral (no change to original brightness)
      brightnessMultiplier: 1.2,

      // Additional brightness applied to selected nodes
      // - Higher values make selected nodes stand out more
      // - Lower values make the selection effect more subtle
      // - 0.0 means no additional brightness for selected nodes
      highlightBrightness: 0.3,
    },
    edges: {
      // Color saturation for edges, similar to node saturation
      // - Higher values make edge colors more vibrant
      // - Lower values make them more muted
      // - 1.0 is neutral
      saturation: 1.5,

      // Controls the intensity of the glow effect around edges
      // - Higher values create a more pronounced glow
      // - Lower values make the glow more subtle
      // - 0.0 disables the glow effect
      glowIntensity: 0.03,

      // Base brightness for all edges
      // - Higher values make edges more visible
      // - Lower values make them more transparent
      // - 1.0 is neutral
      brightness: 1.0,
    },
  },
};
