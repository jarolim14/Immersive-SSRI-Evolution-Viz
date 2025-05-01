/**
 * @file nodesCreation.js
 * @description This module handles the creation and management of node objects in a 3D graph visualization using Three.js.
 * It provides functionality for creating node materials, generating Three.js Points objects, and accessing node data.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Key Functions:
 * - createNodeMaterial(): Creates a custom ShaderMaterial for nodes with specific uniforms and shaders.
 * - createNodes(nodesGeometry): Generates a Three.js Points object using the provided geometry and custom material.
 * - getFullNodeData(requestedKeys): Retrieves specified node data, including the Points object and raw node information.
 *
 * Features:
 * - WebGL2 optimized rendering with instanced arrays
 * - Custom shader material creation with support for textures, fog, and selection highlighting.
 * - Flexible node data retrieval system allowing for selective data access.
 * - Integration with pre-defined shaders and configuration settings.
 * - Error handling for cases where node creation prerequisites are not met.
 *
 * This module is essential for rendering nodes in the 3D graph visualization, providing the visual representation
 * of data points and allowing for efficient data access and manipulation.
 *
 * @requires THREE
 * @requires ./config.js
 * @requires ./shaders.js
 *
 * @exports {Function} createNodes
 * @exports {Function} getFullNodeData
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { vertexShaderNode, fragmentShaderNode } from "./shaders.js";

let points = null; // Declare points at the module level

function createNodeMaterial() {
  const uniforms = {
    color: { value: new THREE.Color(0xffffff) },
    nodeTexture: {
      value: new THREE.TextureLoader().load(CONFIG.nodeTextureUrl),
    },
    singleNodeSelectionBrightness: {
      value: 0, // 0 for original color. 1 equals white
    },
    fogColor: {
      value: new THREE.Color(
        CONFIG.fog.color.r,
        CONFIG.fog.color.g,
        CONFIG.fog.color.b
      ),
    },
    fogNear: { value: CONFIG.fog.near },
    fogFar: { value: CONFIG.fog.far },
    saturation: { value: CONFIG.shaderEffects.nodes.saturation },
    specularPower: { value: CONFIG.shaderEffects.nodes.specularPower },
    specularIntensity: { value: CONFIG.shaderEffects.nodes.specularIntensity },
    brightnessMultiplier: { value: CONFIG.shaderEffects.nodes.brightnessMultiplier },
    highlightBrightness: { value: CONFIG.shaderEffects.nodes.highlightBrightness },
  };

  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShaderNode,
    fragmentShader: fragmentShaderNode,
    alphaTest: 1,
    transparent: true,
    depthWrite: false, // Prevent flickering
    // Enable WebGL2 features
    extensions: {
      derivatives: true,
      fragDepth: true,
      drawBuffers: true,
      shaderTextureLOD: true
    }
  });
}

export function createNodes(nodesGeometry) {
  if (!nodesGeometry || !nodesGeometry.attributes.position) {
    console.error("No position data available for creating nodes");
    return null;
  }

  // Enable WebGL2 features in the geometry
  nodesGeometry.attributes.position.usage = THREE.DynamicDrawUsage;
  nodesGeometry.attributes.color.usage = THREE.DynamicDrawUsage;
  nodesGeometry.attributes.size.usage = THREE.DynamicDrawUsage;
  nodesGeometry.attributes.visible.usage = THREE.DynamicDrawUsage;
  nodesGeometry.attributes.singleNodeSelectionBrightness.usage = THREE.DynamicDrawUsage;

  // Optimize buffer updates
  nodesGeometry.attributes.position.needsUpdate = false;
  nodesGeometry.attributes.color.needsUpdate = false;
  nodesGeometry.attributes.size.needsUpdate = false;
  nodesGeometry.attributes.visible.needsUpdate = false;
  nodesGeometry.attributes.singleNodeSelectionBrightness.needsUpdate = false;

  const material = createNodeMaterial();

  points = new THREE.Points(nodesGeometry, material);
  points.name = "points";

  // Enable frustum culling for better performance
  points.frustumCulled = true;

  console.log("Nodes geometry created:", points);

  return { points }; // Return both nodes and points
}

// Directly export points for access in other files
export { points };
