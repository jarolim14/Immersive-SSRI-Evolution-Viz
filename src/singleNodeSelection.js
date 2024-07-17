/**
 * @file singleNodeSelection.js
 *
 * This module handles the selection and highlighting of individual nodes within a Three.js scene.
 * It provides functionality for initializing selection meshes, handling mouse events for node selection,
 * and displaying information about the selected node.
 *
 * The key components of this module are:
 *
 * - Global Variables:
 *   - `selectionMesh`: A mesh used to visually highlight selected nodes.
 *   - `selectionMaterial`: The material applied to the selection mesh, using custom shaders.
 *   - `mouseDownTime` and `mouseDownPosition`: Track the time and position of mouse down events.
 *   - `raycaster` and `mouse`: Three.js objects used for detecting intersections between the mouse and scene objects.
 *   - `intersects`: An array to store intersection results from the raycaster.
 *   - `nodeInfoDiv`: A DOM element to display information about the selected node.
 *
 * - Functions:
 *   - `initializeSelectionMesh(scene)`: Sets up the selection mesh and loads the spotlight texture.
 *   - `updateVisualSelection(x, y, z, height, width, scaleFactor)`: Updates the visual representation of the selection mesh.
 *   - `handleMouseDown(event, canvas)`: Records the mouse down event position and time.
 *   - `handleMouseUp(event, nodes, positions, canvas, camera, scene)`: Detects a click event, checks for a valid selection, and invokes `handleLongClick` if a selection is made.
 *   - `handleLongClick(event, nodes, positions, canvas, camera, scene)`: Processes the intersection of the raycaster with the nodes and updates node information.
 *   - `updateNodeInfo(intersection, nodes, positions)`: Displays the information of the selected node and updates the visual selection mesh.
 *
 * Configuration:
 * The module uses settings from the `CONFIG` object imported from `config.js`, including:
 *   - `CONFIG.spotlightTextureUrl`: URL of the texture used for the selection spotlight.
 *   - `CONFIG.clickDurationThreshold`: Maximum duration (in milliseconds) for a mouse click to be considered a selection click.
 *   - `CONFIG.clickDistanceThreshold`: Maximum distance (in pixels) for mouse movement to be considered a selection click.
 *   - `CONFIG.nodeSelectionAccuracyThreshold`: Accuracy threshold for the raycaster when detecting node intersections.
 *
 * This modular approach allows for easy integration and reuse of the node selection logic across different parts of the application.
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
    vertexShader: vertexShaderSpotlight, // Corrected here
    fragmentShader: fragmentShaderSpotlight, // And here
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
  textureLoader.load(CONFIG.spotlightTextureUrl, (texture) => {
    selectionMaterial.uniforms.spotlightTexture.value = texture;
  });
}

export function updateVisualSelection(x, y, z, height, width, scaleFactor = 4) {
  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;

  selectionMesh.scale.set(scaledWidth, scaledHeight, 1);
  selectionMesh.position.set(x, y + scaledHeight / 2 - 10 * scaleFactor, z);
  selectionMesh.visible = true;
}

export function handleMouseDown(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  mouseDownTime = performance.now();
  mouseDownPosition.set(event.clientX - rect.left, event.clientY - rect.top);
  console.log("Mouse Down at:", mouseDownPosition);
}

export function handleMouseUp(event, nodes, positions, canvas, camera, scene) {
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
    handleLongClick(event, nodes, positions, canvas, camera, scene);
  } else {
    console.log("Not a selection click.");
  }
}

export function handleLongClick(
  event,
  nodes,
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
  updateNodeInfo(intersects[0], nodes, positions, scene);
}

export function updateNodeInfo(intersection, nodes, positions, scene) {
  // console.log("updateNodeInfo called", {
  //  intersection,
  //  nodesSize: nodes.size,
  //  positionsLength: positions.length,
  //});

  if (intersection && nodes && positions) {
    const nodeIds = Array.from(nodes.keys());
    const selectedNodeId = nodeIds[intersection.index];
    const selectedNode = nodes.get(selectedNodeId);
    const points = scene.getObjectByName("points");

    if (!points) {
      console.error("Points object not found in the scene");
      return;
    }

    if (selectedNode) {
      const i3 = intersection.index * 3;
      let nodePosition = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      if (points.geometry.attributes.selected) {
        const selectedAttribute = points.geometry.attributes.selected;
        // console.log("Before update:", selectedAttribute.array);

        selectedAttribute.array.fill(0); // Reset all
        selectedAttribute.array[intersection.index] = 1; // Set selected node
        selectedAttribute.needsUpdate = true;

        // console.log("After update:", selectedAttribute.array);
      } else {
        console.error("Selected attribute not found in points geometry");
      }

      nodeInfoDiv.textContent = `
        Cluster Label: ${selectedNode.clusterLabel}
        Title: ${selectedNode.title}
        Year: ${selectedNode.year}
        Cluster: ${selectedNode.cluster}
        Centrality: ${selectedNode.centrality}
        Node ID: ${selectedNodeId}
      `;
      nodeInfoDiv.style.whiteSpace = "pre-line";
      nodeInfoDiv.style.display = "block";

      updateVisualSelection(
        nodePosition.x,
        nodePosition.y,
        nodePosition.z,
        150,
        5
      );
    } else {
      console.error("Selected node not found", {
        selectedNodeId,
        intersectionIndex: intersection.index,
      });
    }
  } else {
    console.log("No intersection or missing data, hiding node info");
    nodeInfoDiv.style.display = "none";
    if (selectionMesh) selectionMesh.visible = false;
  }
}
