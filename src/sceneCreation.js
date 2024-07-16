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

  initScene(scene);

  return { scene, camera, renderer, controls };
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CONFIG.cameraFOV,
    CONFIG.windowSizes.width / CONFIG.windowSizes.height,
    CONFIG.cameraNearPlane,
    CONFIG.cameraFarPlane
  );
  camera.position.set(2000, 2000, 2000);
  camera.lookAt(0, 0, 0);
  return camera;
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: CONFIG.rendererAntialias,
  });
  renderer.setSize(CONFIG.windowSizes.width, CONFIG.windowSizes.height);
  renderer.setPixelRatio(CONFIG.devicePixelRatio);
  renderer.autoClearColor = CONFIG.rendererAutoClearColor;
  return renderer;
}

function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = CONFIG.controlsMinDistance;
  controls.maxDistance = CONFIG.controlsMaxDistance;
  controls.maxPolarAngle = Math.PI / 2;
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
  CONFIG.windowSizes.width = window.innerWidth;
  CONFIG.windowSizes.height = window.innerHeight;
  camera.aspect = CONFIG.windowSizes.width / CONFIG.windowSizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(CONFIG.windowSizes.width, CONFIG.windowSizes.height);
}
