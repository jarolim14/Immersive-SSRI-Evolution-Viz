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
