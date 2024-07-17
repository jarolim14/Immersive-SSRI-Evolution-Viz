/**
 * Node Creation Module
 *
 * This module is responsible for creating and managing the 3D visualization of nodes.
 * Key functionalities include:
 * - Creating THREE.js Points object from node data
 * - Setting up buffer geometry with positions, colors, and sizes
 * - Creating custom shader material for node rendering
 * - Handling texture loading for node appearance
 *
 * The module uses Three.js for 3D graphics and custom shaders for advanced visual effects.
 * It relies on configuration settings from CONFIG and shader code from an external module.
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { vertexShaderNode, fragmentShaderNode } from "./shaders.js";

function createNodeMaterial() {
  const uniforms = {
    color: { value: new THREE.Color(0xffffff) },
    nodeTexture: {
      value: new THREE.TextureLoader().load(CONFIG.nodeTextureUrl),
    },
    singleNodeSelectionBrightness: {
      value: CONFIG.singleNodeSelectionBrightness,
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

let points = null;
let nodes = null;
let positions = null;
let colors = null;
let sizes = null;
let brightness = null;
let selected = null;

export function createNodes(nodeData) {
  const {
    nodes: newNodes,
    positions: newPositions,
    colors: newColors,
    sizes: newSizes,
  } = nodeData;

  if (!newPositions || newPositions.length === 0) {
    console.error("No position data available for creating nodes");
    return null;
  }
  const nodeCount = newPositions.length / 3;
  console.log(`Creating geometry for ${nodeCount} nodes`);

  const geometry = new THREE.BufferGeometry();
  brightness = new Float32Array(nodeCount).fill(CONFIG.brightness.default);
  selected = new Float32Array(nodeCount).fill(0);
  geometry.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
  geometry.setAttribute(
    "clusterColor",
    new THREE.BufferAttribute(newColors, 3)
  );
  geometry.setAttribute("size", new THREE.BufferAttribute(newSizes, 1));
  geometry.setAttribute("brightness", new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute("selected", new THREE.BufferAttribute(selected, 1));

  const material = createNodeMaterial();
  points = new THREE.Points(geometry, material);
  points.name = "points";

  nodes = newNodes;
  positions = newPositions;
  colors = newColors;
  sizes = newSizes;

  return { points, nodes, positions, colors, sizes, brightness, selected };
}

export function getFullNodeData(requestedKeys = []) {
  if (!points) {
    console.error("Nodes have not been created yet");
    return null;
  }

  const availableData = {
    points,
    nodes,
    positions,
    colors,
    sizes,
    brightness,
    selected,
  };
  const result = {};

  if (requestedKeys.length === 0) {
    return availableData;
  }

  requestedKeys.forEach((key) => {
    if (key in availableData) {
      result[key] = availableData[key];
    } else {
      console.warn(`Requested key "${key}" is not available in the node data`);
    }
  });

  return result;
}
