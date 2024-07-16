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
  console.log("Intersects:", intersects);

  // Pass nodes and positions to updateNodeInfo
  updateNodeInfo(intersects[0], nodes, positions);
}

export function updateNodeInfo(intersection, nodes, positions) {
  if (intersection && nodes && positions) {
    const nodeIds = Array.from(nodes.keys());
    const selectedNodeId = nodeIds[intersection.index];
    const selectedNode = nodes.get(selectedNodeId);

    if (selectedNode) {
      const i3 = intersection.index * 3;
      let nodePosition = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

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
    }
  } else {
    nodeInfoDiv.style.display = "none";
    if (selectionMesh) selectionMesh.visible = false;
  }
}
