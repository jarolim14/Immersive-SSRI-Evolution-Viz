/**
 * @file singleNodeSelection.js
 * @description This module handles the selection and highlighting of individual nodes within a Three.js scene.
 * It provides functionality for initializing selection meshes, handling mouse events for node selection,
 * and displaying information about the selected node.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key components:
 *
 * Global Variables:
 * - selectionMesh: A mesh used to visually highlight selected nodes.
 * - selectionMaterial: The material applied to the selection mesh, using custom shaders.
 * - mouseDownTime and mouseDownPosition: Track the time and position of mouse down events.
 * - raycaster and mouse: Three.js objects used for detecting intersections between the mouse and scene objects.
 * - intersects: An array to store intersection results from the raycaster.
 * - nodeInfoDiv: A DOM element to display information about the selected node.
 * - lastSelectedNodeIndex: Tracks the index of the last selected node.
 *
 * Main Functions:
 * - initializeSelectionMesh(scene): Sets up the selection mesh and loads the spotlight texture.
 * - determineCoordinatesAndScaleSpotlight(positionAttribute, intersectionIndex, height, width, scaleFactor):
 *   Calculates the position and scale of the spotlight based on the selected node.
 * - hideVisualSelection(): Hides the selection mesh when no node is selected.
 * - handleMouseDown(event, canvas): Records the mouse down event position and time.
 * - handleMouseUp(event, nodesMap, positions, canvas, camera, scene): Detects a click event and
 *   checks for a valid selection.
 * - handleLongClick(event, nodesMap, positions, canvas, camera, scene): Processes the intersection
 *   of the raycaster with the nodes and updates node information.
 * - updateNodeInfo(intersection, nodesMap, positions, scene): Displays information about the selected node
 *   and updates the visual selection mesh.
 *
 * This module integrates with Three.js to provide an interactive node selection system in a 3D environment.
 * It uses custom shaders for visual effects and raycasting for precise node selection.
 *
 * @requires THREE
 * @requires ./shaders.js
 * @requires ./config.js
 */

import * as THREE from "three";
import { vertexShaderSpotlight, fragmentShaderSpotlight } from "./shaders.js";
import { CONFIG } from "./config.js";

let selectionMesh;
let selectionMaterial;
// For Visual Selection of singel nodes
let mouseDownTime = 0;
let mouseDownPosition = new THREE.Vector2();
export let raycaster = new THREE.Raycaster();
export let mouse = new THREE.Vector2();
let intersects = [];
let nodeInfoDiv = document.getElementById("nodeInfoDiv");

export function initializeSelectionMesh(scene) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  selectionMaterial = new THREE.ShaderMaterial({
    uniforms: {
      spotlightTexture: { value: null },
      color: { value: new THREE.Color(0xffd700) },
      brightness: { value: 2 },
    },
    vertexShader: vertexShaderSpotlight,
    fragmentShader: fragmentShaderSpotlight,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  });

  selectionMesh = new THREE.Mesh(geometry, selectionMaterial);
  selectionMesh.visible = false;
  selectionMesh.renderOrder = 9999;
  scene.add(selectionMesh);

  // Load texture once
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    CONFIG.spotlightTextureUrl,
    (texture) => {
      selectionMaterial.uniforms.spotlightTexture.value = texture;
      //console.log("Spotlight texture loaded successfully:", texture); // Log the loaded texture
    },
    undefined,
    (error) => {
      console.error("Error loading texture:", error); // Handle errors if any
    }
  );
}

export function determineCoordinatesAndScaleSpotlight(
  positionAttribute,
  intersectionIndex,
  height = 100,
  width = 25,
  scaleFactor = 5
) {
  const i3 = intersectionIndex * 3; // Each vertex has 3 components (x, y, z)

  // Create the node position directly from the geometry
  const nodePosition = new THREE.Vector3(
    positionAttribute.array[i3],
    positionAttribute.array[i3 + 1],
    positionAttribute.array[i3 + 2]
  );

  const x = nodePosition.x;
  const y = nodePosition.y;
  const z = nodePosition.z;

  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;

  // Update selection mesh scale and position
  selectionMesh.scale.set(scaledWidth, scaledHeight, 1);
  selectionMesh.position.set(x, y + scaledHeight / 2 - 10 * scaleFactor, z);
  selectionMesh.visible = true; // Ensure the mesh is visible
}

export function hideVisualSelection() {
  if (selectionMesh) {
    selectionMesh.visible = false;
  }
}

export function handleMouseDown(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  mouseDownTime = performance.now();
  mouseDownPosition.set(event.clientX - rect.left, event.clientY - rect.top);
  console.log("Mouse Down at:", mouseDownPosition);
}

export function handleMouseUp(
  event,
  nodesMap,
  positions,
  canvas,
  camera,
  scene
) {
  const rect = canvas.getBoundingClientRect();
  const clickDuration = performance.now() - mouseDownTime;
  const mouseUpPosition = new THREE.Vector2(
    event.clientX - rect.left,
    event.clientY - rect.top
  );
  const clickDistance = mouseUpPosition.distanceTo(mouseDownPosition);

  console.log("Mouse Up at:", mouseUpPosition);
  console.log("Click Duration:", clickDuration);
  console.log("Click Distance:", clickDistance);

  if (
    clickDuration <= CONFIG.clickDurationThreshold &&
    clickDistance < CONFIG.clickDistanceThreshold
  ) {
    console.log("Selection click detected!");
    handleLongClick(event, nodesMap, positions, canvas, camera, scene);
  } else {
    console.log("Not a selection click.");
  }
}

export function handleLongClick(
  event,
  nodesMap,
  positions,
  canvas,
  camera,
  scene
) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.params.Points.threshold = CONFIG.nodeSelectionAccuracyThreshold;
  const points = scene.getObjectByName("points");
  intersects.length = 0;
  raycaster.intersectObject(points, false, intersects);
  // console.log("Intersects:", intersects);

  // Pass nodes and positions to updateNodeInfo
  updateNodeInfo(intersects[0], nodesMap, positions, scene);
}

let lastSelectedNodeIndex = -1; // Track the last selected node index

export function updateNodeInfo(intersection, nodesMap, positions, scene) {
  // If scene is not provided but positions is a THREE.Scene, use positions as scene
  // This helps when called from searchFunctionality.js
  if (!scene && positions && positions instanceof THREE.Scene) {
    scene = positions;
    positions = null;
  }

  const points = scene.getObjectByName("points");
  if (!points) {
    console.error("Points object not found in the scene");
    return;
  }

  const brightnessAttribute =
    points.geometry.attributes.singleNodeSelectionBrightness;
  if (!brightnessAttribute) {
    console.error(
      "singleNodeSelectionBrightness attribute not found in points geometry"
    );
    return;
  }

  // Function to reset node brightness
  const resetNodeBrightness = (index) => {
    brightnessAttribute.array[index] = 0.0;
    brightnessAttribute.needsUpdate = true;
  };

  // Reset brightness for the last selected node, if applicable
  if (lastSelectedNodeIndex !== -1) {
    resetNodeBrightness(lastSelectedNodeIndex);
  }

  // If no intersection, reset everything and return
  if (!intersection || !nodesMap) {
    console.log("No intersection or missing data, hiding node info");
    nodeInfoDiv.style.display = "none";
    document.body.classList.remove("node-selected");
    brightnessAttribute.array.fill(0.0);
    brightnessAttribute.needsUpdate = true;
    hideVisualSelection();
    if (selectionMesh) selectionMesh.visible = false;
    lastSelectedNodeIndex = -1;
    return;
  }

  const nodeIds = Array.from(nodesMap.keys());
  const selectedNodeId = nodeIds[intersection.index];
  const selectedNode = nodesMap.get(selectedNodeId);

  if (!selectedNode) {
    console.error("Selected node not found", {
      selectedNodeId,
      intersectionIndex: intersection.index,
    });
    return;
  }

  console.log("Selected Node ID:", selectedNodeId);
  // Get the position directly from the points geometry
  const positionAttribute = points.geometry.attributes.position;

  // Call the function to determine coordinates and scale the spotlight
  determineCoordinatesAndScaleSpotlight(
    positionAttribute, // Pass the positionAttribute directly
    intersection.index, // Pass intersection index directly
    100, // height
    25, // width
    5 // scaleFactor
  );

  // Update brightness for the selected node
  brightnessAttribute.array[intersection.index] =
    CONFIG.singleNodeSelectionBrightness;
  brightnessAttribute.needsUpdate = true;

  // Update node info display
  const doiDisplay =
    selectedNode.doi && selectedNode.doi !== "No DOI available"
      ? `DOI: <a href="https://doi.org/${selectedNode.doi}" target="_blank" style="color: #87CEEB;">${selectedNode.doi}</a>`
      : `DOI: ${selectedNode.doi}`;

  nodeInfoDiv.innerHTML = `
    Cluster Label: ${selectedNode.clusterLabel}
    Title: ${selectedNode.title}
    Author: ${selectedNode.authors}
    Year: ${selectedNode.year}
    ${doiDisplay}
  `;
  // i could all these for more information
  // Cluster: ${selectedNode.cluster}
  // Centrality: ${selectedNode.centrality}
  // Node ID: ${selectedNodeId}

  nodeInfoDiv.style.whiteSpace = "pre-line";
  nodeInfoDiv.style.display = "block";
  document.body.classList.add("node-selected");

  // Update last selected node index
  lastSelectedNodeIndex = intersection.index;
}
