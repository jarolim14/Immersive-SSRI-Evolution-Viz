/**
 * Main Application Script for 3D Node Visualization
 *
 * This script initializes and manages a 3D visualization of nodes using Three.js.
 * It handles the setup of the 3D scene, data loading, node creation, user interaction,
 * and rendering.
 *
 * Key components:
 * - Scene initialization: Sets up the Three.js scene, camera, renderer, and controls.
 * - Data loading: Loads cluster color maps, label maps, and node data from external sources.
 * - Node creation: Generates 3D points representing nodes based on loaded data.
 * - User interaction: Handles mouse events for node selection and information display.
 * - Legend: Creates an interactive legend for node categorization.
 * - Rendering: Continuously updates and renders the 3D scene.
 *
 * The script uses modular architecture, importing functionalities from:
 * - config.js: Contains configuration settings.
 * - dataLoader.js: Handles data loading and processing.
 * - nodeCreation.js: Manages the creation of node objects.
 * - createScene.js: Sets up the Three.js environment.
 *
 * Global state is minimized, with most data being passed as parameters to functions.
 * Event listeners are set up to handle user interactions and window resizing.
 *
 * The main execution flow is controlled by the initializeScene function, which
 * is called when the DOM content is loaded.
 *
 * @author Lukas Westphal
 * @version 1.0
 * @date 16.07.24
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CONFIG } from "./config";

export function createScene(canvas) {
  const scene = new THREE.Scene();
  const camera = createCamera();
  const renderer = createRenderer(canvas);
  const controls = createControls(camera, canvas);
  const dummy = new THREE.Object3D();
  const parent = new THREE.Object3D();

  scene.add(parent);

  initScene(scene);

  return { scene, camera, renderer, controls, dummy, parent };
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CONFIG.cameraFOV,
    CONFIG.windowSizes.width / CONFIG.windowSizes.height,
    CONFIG.cameraNearPlane,
    CONFIG.cameraFarPlane
  );
  camera.position.set(
    CONFIG.cameraPosition.x,
    CONFIG.cameraPosition.y,
    CONFIG.cameraPosition.z
  );
  camera.lookAt(
    CONFIG.cameraTarget.x,
    CONFIG.cameraTarget.y,
    CONFIG.cameraTarget.z
  );
  return camera;
}

function createRenderer(canvas) {
  // Get accurate viewport dimensions
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = document.documentElement.clientHeight || window.innerHeight;

  // Update config with accurate dimensions
  CONFIG.windowSizes.width = width;
  CONFIG.windowSizes.height = height;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: CONFIG.rendererAntialias,
    powerPreference: "high-performance",
  });

  renderer.setSize(width, height, false); // false = don't update CSS
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.autoClearColor = CONFIG.rendererAutoClearColor;
  return renderer;
}

function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.15;
  controls.screenSpacePanning = true;
  controls.minDistance = CONFIG.controlsMinDistance;
  controls.maxDistance = CONFIG.controlsMaxDistance;
  controls.maxPolarAngle = Math.PI;
  controls.zoomDampingFactor = 0.15;
  controls.rotateSpeed = 0.8;
  controls.panSpeed = 0.8;
  controls.target.set(0, 0, 0);
  return controls;
}

function initScene(scene) {
  scene.background = new THREE.Color(CONFIG.backgroundColor);
  if (CONFIG.addAxesHelper) addHelpers(scene);
}

function addHelpers(scene) {
  const axesHelper = new THREE.AxesHelper(CONFIG.axesHelperSize);
  scene.add(axesHelper);
  const gridHelper = new THREE.GridHelper(
    CONFIG.gridHelperSize,
    CONFIG.gridHelperDivisions
  );
  scene.add(gridHelper);
}

export function handleResize(camera, renderer) {
  // Get the actual client viewport dimensions
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = document.documentElement.clientHeight || window.innerHeight;

  // Update the config
  CONFIG.windowSizes.width = width;
  CONFIG.windowSizes.height = height;

  // Update camera
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(width, height, false); // false = don't update CSS
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
