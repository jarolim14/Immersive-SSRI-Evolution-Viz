import * as THREE from "three";
// get configs
import { CONFIG } from "./config";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { vertexShaderNode, fragmentShaderNode } from "./shaders";

// Global Variables
const windowSizes = { width: window.innerWidth, height: window.innerHeight };
const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
const controls = createControls();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersects = [];
const nodeInfoDiv = document.getElementById("nodeInfoDiv");
let positions, colors, sizes;
const clusterColorMap = {};
const clusterLabelMap = {};

// Legend Variables
let selections = {};
let selectedLeafKeys = [];
// For Visual Selection of singel nodes
let selectionMesh;
let selectionMaterial;
let mouseDownTime = 0;
let mouseDownPosition = new THREE.Vector2();

// Node Data
let nodes = new Map();

// Main Execution
async function initializeScene() {
  // At the start of your initializeScene function
  const startTime = performance.now();
  initScene();
  initializeBuffers();
  initializeSelectionMesh(); // Add this line here
  await Promise.all([
    loadClusterColorMap(CONFIG.clusterColorMapUrl),
    loadClusterLabelMap(CONFIG.clusterLabelMapUrl),
    loadNodeData(CONFIG.nodeDataUrl, CONFIG.percentageOfDataToLoad),
    initializeLegend(CONFIG.legendDataUrl),
  ]);
  createNodes();
  addEventListeners();
  // At the end of your initializeScene function, just before calling tick()
  const endTime = performance.now();
  const loadTime = (endTime - startTime) / 1000; // Convert to seconds
  console.log(`Total load time: ${loadTime.toFixed(2)} seconds`);
  tick();
}

initializeScene();

function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CONFIG.cameraFOV,
    windowSizes.width / windowSizes.height,
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
  renderer.setSize(windowSizes.width, windowSizes.height);
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

async function loadJSONData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

async function loadClusterColorMap(url) {
  try {
    const data = await loadJSONData(url);
    for (const [key, value] of Object.entries(data)) {
      clusterColorMap[key] = new THREE.Color(value);
    }
  } catch (error) {
    console.error("Error loading cluster color map:", error);
  }
}

async function loadClusterLabelMap(url) {
  try {
    const data = await loadJSONData(url);
    Object.assign(clusterLabelMap, data);
  } catch (error) {
    console.error("Error loading cluster label map:", error);
  }
}

function initializeBuffers() {
  positions = new Float32Array(CONFIG.maxNodes * 3);
  colors = new Float32Array(CONFIG.maxNodes * 3);
  sizes = new Float32Array(CONFIG.maxNodes);
  nodes = new Map();
}

function parseJSONData(data, percentage) {
  const totalNodes = data.length;
  const nodesToLoad = Math.floor(totalNodes * percentage);
  console.log(`Loading ${nodesToLoad} out of ${totalNodes} nodes`);
  for (let i = 0; i < nodesToLoad; i++) {
    const node = data[i];
    if (
      CONFIG.loadClusterSubset &&
      !CONFIG.clustersToLoad.includes(node.cluster)
    ) {
      continue;
    }
    const nodeId = node.node_id;
    const centrality = parseFloat(node.centrality.toFixed(5));
    let x = node.x * CONFIG.coordinateMultiplier;
    let y = node.y * CONFIG.coordinateMultiplier;
    let z = centrality * CONFIG.zCoordinateShift;

    // Apply rotation
    const rotatedPosition = new THREE.Vector3(x, y, z).applyAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );

    const size = Math.max(50, 200 * Math.log(centrality + 1));
    const color = clusterColorMap[node.cluster];
    nodes.set(nodeId, {
      index: i,
      cluster: node.cluster,
      clusterLabel: clusterLabelMap[node.cluster],
      year: node.year,
      title: node.title,
      centrality: centrality,
    });
    updateNodeData(
      i,
      rotatedPosition.x,
      rotatedPosition.y,
      rotatedPosition.z,
      color.r,
      color.g,
      color.b,
      size
    );
  }
  console.log(`Number of nodes loaded: ${nodes.size}`);
}
async function loadNodeData(url, percentage = 1) {
  try {
    const data = await loadJSONData(url);
    parseJSONData(data, percentage);
  } catch (error) {
    console.error("Error loading node data:", error);
  }
}
function updateNodeData(index, x, y, z, r, g, b, size) {
  const i3 = index * 3;
  positions[i3] = x;
  positions[i3 + 1] = y;
  positions[i3 + 2] = z;
  colors[i3] = r;
  colors[i3 + 1] = g;
  colors[i3 + 2] = b;
  sizes[index] = size;
}

function createNodes() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("clusterColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const material = createNodeMaterial();
  const points = new THREE.Points(geometry, material);
  points.name = "points";
  scene.add(points);
}

function createNodeMaterial() {
  const uniforms = {
    color: { value: new THREE.Color(0xffffff) },
    nodeTexture: {
      value: new THREE.TextureLoader().load(CONFIG.nodeTextureUrl),
    },
  };

  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShaderNode,
    fragmentShader: fragmentShaderNode,
    alphaTest: 1,
    transparent: true,
    depthWrite: false, // Prevent flickering
  });
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
      spotlight2: { value: null },
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
      uniform sampler2D spotlight2;
      uniform vec3 color;
      uniform float brightness;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D(spotlight2, vUv);
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
    selectionMaterial.uniforms.spotlight2.value = texture;
  });
}

function handleMouseDown(event) {
  const rect = canvas.getBoundingClientRect();
  mouseDownTime = performance.now();
  mouseDownPosition.set(event.clientX - rect.left, event.clientY - rect.top);
  console.log("Mouse Down at:", mouseDownPosition);
}

function handleMouseUp(event) {
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
    clickDuration >= CONFIG.clickDurationThreshold &&
    clickDistance < CONFIG.clickDistanceThreshold
  ) {
    console.log("Long click detected!");
    handleLongClick(event);
  } else {
    console.log("Not a long click.");
  }
}

function handleLongClick(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.params.Points.threshold = CONFIG.nodeSelectionAccuracyThreshold;
  const points = scene.getObjectByName("points");
  intersects.length = 0;
  raycaster.intersectObject(points, false, intersects);
  console.log("Intersects:", intersects);
  updateNodeInfo(intersects[0]);
}

function updateNodeInfo(intersection) {
  if (intersection) {
    const selectedNodeId = Array.from(nodes.keys())[intersection.index];
    const selectedNode = nodes.get(selectedNodeId);

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
  windowSizes.width = window.innerWidth;
  windowSizes.height = window.innerHeight;
  camera.aspect = windowSizes.width / windowSizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(windowSizes.width, windowSizes.height);
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

function addEventListeners() {
  window.addEventListener("resize", handleResize);
  canvas.addEventListener("wheel", handleScroll, { passive: false });
  // canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mouseup", handleMouseUp);
}

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
