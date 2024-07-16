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

export function createNodes(nodeData) {
  const { nodes, positions, colors, sizes } = nodeData;

  if (!positions || positions.length === 0) {
    console.error("No position data available for creating nodes");
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("clusterColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = createNodeMaterial();
  const points = new THREE.Points(geometry, material);
  points.name = "points";

  return { points, nodes, positions, colors, sizes };
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
