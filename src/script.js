import * as THREE from "three";
// get configs
import { CONFIG } from "./config";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  loadJSONData,
  initializeBuffers,
  loadClusterColorMap,
  loadClusterLabelMap,
  loadNodeData,
  getNodeData,
} from "./dataLoader.js";
import { createNodes } from "./nodeCreation.js";

// Global Variables
const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
const controls = createControls();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersects = [];
const nodeInfoDiv = document.getElementById("nodeInfoDiv");

// Legend Variables
let selections = {};
let selectedLeafKeys = [];
// For Visual Selection of singel nodes
let selectionMesh;
let selectionMaterial;
let mouseDownTime = 0;
let mouseDownPosition = new THREE.Vector2();

// Main Execution
async function initializeScene() {
  try {
    const startTime = performance.now();

    initializeBuffers(CONFIG.maxNodes);

    const [clusterColorMap, clusterLabelMap] = await Promise.all([
      loadClusterColorMap(CONFIG.clusterColorMapUrl),
      loadClusterLabelMap(CONFIG.clusterLabelMapUrl),
    ]);

    await loadNodeData(CONFIG.nodeDataUrl, CONFIG.percentageOfDataToLoad);
    const nodeData = getNodeData();
    const { points, nodes, positions, colors, sizes } = createNodes(nodeData);
    if (points) {
      scene.add(points);
    } else {
      console.error("Failed to create nodes");
    }

    initScene();
    initializeSelectionMesh();

    await Promise.all([initializeLegend(CONFIG.legendDataUrl)]);

    addEventListeners(nodes, positions);

    const endTime = performance.now();
    const loadTime = (endTime - startTime) / 1000;
    console.log(`Total load time: ${loadTime.toFixed(2)} seconds`);

    tick();
  } catch (error) {
    console.error("Error in initializeScene:", error);
  }
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

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: CONFIG.rendererAntialias,
  });
  renderer.setSize(CONFIG.windowSizes.width, CONFIG.windowSizes.height);
  renderer.setPixelRatio(CONFIG.devicePixelRatio);
  renderer.autoClearColor = CONFIG.rendererAutoClearColor;
  return renderer;
}

function createControls() {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = CONFIG.controlsMinDistance;
  controls.maxDistance = CONFIG.controlsMaxDistance;
  controls.maxPolarAngle = Math.PI / 2;
  return controls;
}

function addHelpers() {
  const axesHelper = new THREE.AxesHelper(CONFIG.axesHelperSize);
  scene.add(axesHelper);
  const gridHelper = new THREE.GridHelper(
    CONFIG.gridHelperSize,
    CONFIG.gridHelperDivisions
  );
  scene.add(gridHelper);
}
function initScene() {
  scene.background = new THREE.Color(CONFIG.backgroundColor);
  if (CONFIG.addAxesHelper) addHelpers();
}

// Legend Functions
async function initializeLegend(url) {
  try {
    const data = await loadJSONData(url);
    const legendResult = createLegendTree(data);
    selections = legendResult.selections;
    selectedLeafKeys = legendResult.selectedLeafKeys;
    console.log("Initial selections:", selections);
    console.log("Initial selected leaf keys:", selectedLeafKeys);
  } catch (error) {
    console.error("Error initializing legend:", error);
  }
}

function createLegendTree(data) {
  const treeContainer = document.getElementById("legendDiv");
  treeContainer.className = "legend-tree";
  const selections = {};
  const selectedLeafKeys = [];

  function updateSelectedLeafKeys(key, isChecked) {
    const leafKey = parseInt(key, 10);
    if (isChecked && !isNaN(leafKey)) {
      if (!selectedLeafKeys.includes(leafKey)) {
        selectedLeafKeys.push(leafKey);
      }
    } else {
      const index = selectedLeafKeys.indexOf(leafKey);
      if (index > -1) {
        selectedLeafKeys.splice(index, 1);
      }
    }
  }

  function setCheckboxState(checkbox, isChecked) {
    checkbox.checked = isChecked;
    selections[checkbox.id] = isChecked;
    if (checkbox.classList.contains("leaf-checkbox")) {
      updateSelectedLeafKeys(checkbox.dataset.key, isChecked);
    }
  }

  function toggleChildren(parentCheckbox, isChecked) {
    const parentNode = parentCheckbox.closest(".legend-item");
    const childCheckboxes = parentNode.querySelectorAll(
      'input[type="checkbox"]'
    );
    childCheckboxes.forEach((childCheckbox) => {
      setCheckboxState(childCheckbox, isChecked);
    });
  }

  function buildTree(obj, parent, path = []) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const item = obj[key];
        const node = document.createElement("div");
        node.className = "legend-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = path.concat(key).join("-");

        const title = document.createElement("span");
        title.className = "legend-toggle";
        title.textContent = key;

        const container = document.createElement("div");
        container.className = "legend-item-container";
        container.appendChild(checkbox);
        container.appendChild(title);
        node.appendChild(container);

        checkbox.addEventListener("change", (e) => {
          const isChecked = e.target.checked;
          setCheckboxState(checkbox, isChecked);
          toggleChildren(checkbox, isChecked);
          console.log("Selections:", selections);
          console.log("Selected Leaf Keys:", selectedLeafKeys);
        });

        if (Array.isArray(item) || typeof item === "object") {
          const subtree = document.createElement("div");
          subtree.className = "legend-subtree";

          if (Array.isArray(item)) {
            item.forEach((subItem, index) => {
              for (const subKey in subItem) {
                if (subItem.hasOwnProperty(subKey)) {
                  const listItem = document.createElement("div");
                  listItem.className = "legend-item";

                  const leafCheckbox = document.createElement("input");
                  leafCheckbox.type = "checkbox";
                  leafCheckbox.id = `${checkbox.id}-${index}-${subKey}`;
                  leafCheckbox.classList.add("leaf-checkbox");
                  leafCheckbox.dataset.key = subKey;

                  const leafLabel = document.createElement("label");
                  leafLabel.htmlFor = leafCheckbox.id;
                  leafLabel.textContent = subItem[subKey];

                  leafCheckbox.addEventListener("change", (e) => {
                    const isChecked = e.target.checked;
                    setCheckboxState(leafCheckbox, isChecked);
                    console.log("Selections:", selections);
                    console.log("Selected Leaf Keys:", selectedLeafKeys);
                  });

                  listItem.appendChild(leafCheckbox);
                  listItem.appendChild(leafLabel);
                  subtree.appendChild(listItem);
                }
              }
            });
          } else if (typeof item === "object") {
            buildTree(item, subtree, path.concat(key));
          }

          node.appendChild(subtree);

          title.addEventListener("click", (e) => {
            subtree.style.display =
              subtree.style.display === "none" ? "block" : "none";
          });

          // Add folding indicator
          const foldIndicator = document.createElement("span");
          foldIndicator.className = "fold-indicator";
          foldIndicator.textContent = "▶";
          container.insertBefore(foldIndicator, title);

          foldIndicator.addEventListener("click", (e) => {
            subtree.style.display =
              subtree.style.display === "none" ? "block" : "none";
            foldIndicator.textContent =
              subtree.style.display === "none" ? "▶" : "▼";
          });
        }

        parent.appendChild(node);
      }
    }
  }

  buildTree(data, treeContainer);
  return { selections, selectedLeafKeys };
}

function initializeSelectionMesh() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  selectionMaterial = new THREE.ShaderMaterial({
    uniforms: {
      spotlightTexture: { value: null },
      color: { value: new THREE.Color(0xffd700) },
      brightness: { value: 2 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D spotlightTexture;
      uniform vec3 color;
      uniform float brightness;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D(spotlightTexture, vUv);
        gl_FragColor = vec4(texColor.rgb * color * brightness, texColor.a);
      }
    `,
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

function handleMouseDown(event) {
  const rect = canvas.getBoundingClientRect();
  mouseDownTime = performance.now();
  mouseDownPosition.set(event.clientX - rect.left, event.clientY - rect.top);
  console.log("Mouse Down at:", mouseDownPosition);
}

function handleMouseUp(event, nodes, positions) {
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
    handleLongClick(event, nodes, positions);
  } else {
    console.log("Not a selection click.");
  }
}

function handleLongClick(event, nodes, positions) {
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

function updateNodeInfo(intersection, nodes, positions) {
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

function updateVisualSelection(x, y, z, height, width, scaleFactor = 4) {
  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;

  selectionMesh.scale.set(scaledWidth, scaledHeight, 1);
  selectionMesh.position.set(x, y + scaledHeight / 2 - 10 * scaleFactor, z);
  selectionMesh.visible = true;
}

function handleResize() {
  CONFIG.windowSizes.width = window.innerWidth;
  CONFIG.windowSizes.height = window.innerHeight;
  camera.aspect = CONFIG.windowSizes.width / CONFIG.windowSizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(CONFIG.windowSizes.width, CONFIG.windowSizes.height);
}

function handleScroll(event) {
  event.preventDefault();

  const zoomAmount = event.deltaY * CONFIG.zoomSpeed;
  const currentDistance = camera.position.length();

  // Calculate new distance using logarithmic scaling
  let newDistance = currentDistance * Math.pow(1.1, zoomAmount);

  // Clamp the new distance within the defined bounds
  newDistance = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newDistance));

  // Calculate zoom direction vector
  const zoomDirection = camera.position.clone().normalize();

  // Set new camera position
  camera.position.copy(zoomDirection.multiplyScalar(newDistance));

  // Update the orbit controls target if needed
  // Uncomment the next line if you want to zoom towards the point under the cursor
  updateOrbitControlsTarget(event);

  // Update the camera
  camera.updateProjectionMatrix();
  controls.update();
}

// Optional: Zoom towards cursor point
function updateOrbitControlsTarget(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    controls.target.copy(intersects[0].point);
  }
}

function addEventListeners(nodes, positions) {
  window.addEventListener("resize", handleResize);
  canvas.addEventListener("wheel", handleScroll, { passive: false });
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mouseup", (event) =>
    handleMouseUp(event, nodes, positions)
  );
}

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", function () {
  initializeScene().catch((error) => {
    console.error("Error initializing scene:", error);
  });
});
