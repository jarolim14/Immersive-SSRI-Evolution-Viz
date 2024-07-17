/**
 * Shader Definitions for Pharmaceutical Network Visualization
 *
 * This file contains the vertex and fragment shaders used in our Three.js application
 *
 * Vertex Shader: Handles the size and color of each node (point) in the network.
 * It calculates the point size based on the camera distance and passes the cluster color to the fragment shader.
 *
 * Fragment Shader: Determines the final color of each pixel in the nodes.
 * It applies the node texture, handles transparency, and implements a depth-based fog effect.
 *
 * Note: These shaders are designed to work with Three.js and assume certain attributes and uniforms are provided.
 */

import { CONFIG } from "./config.js";

export const vertexShaderNode = `
  attribute float size;
  attribute vec3 clusterColor;
  attribute float brightness;
  attribute float selected;
  varying vec4 vColor;
  varying float vBrightness;
  varying float vSelected;

  void main() {
    vColor = vec4(clusterColor, 1.0);
    vBrightness = brightness;
    vSelected = selected;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShaderNode = `
  uniform vec3 color;
  uniform sampler2D nodeTexture;
  varying vec4 vColor;
  varying float vBrightness;
  varying float vSelected;  // New varying for selection
  uniform float singleNodeSelectionBrightness;  // New uniform

  void main() {
    vec4 outColor = texture2D(nodeTexture, gl_PointCoord);
    if (outColor.a < 0.5) discard;

    vec3 brightColor = color * vColor.xyz * vBrightness;

    // Adjust color based on selection
    vec3 finalColor = mix(brightColor, vec3(1.0, 1.0, 1.0), vSelected * singleNodeSelectionBrightness);
    
    // Increase base alpha to make nodes less transparent
    float baseAlpha = 0.8;  // Adjust this value to make nodes less transparent (range: 0.0 to 1.0)
    float finalAlpha = mix(outColor.a * baseAlpha, 1.0, vSelected * 0.99); 

    gl_FragColor = vec4(finalColor, finalAlpha);

    float depth = gl_FragCoord.z / gl_FragCoord.w;
    const vec3 fogColor = vec3(0.0);
    float fogFactor = smoothstep(2000.0, 60000000.0, depth);
    // float fogFactor = 0;
    // gl_FragColor = mix(gl_FragColor, vec4(fogColor, gl_FragColor.w), fogFactor);
  }
`;

export const vertexShaderSpotlight = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

export const fragmentShaderSpotlight = `
      uniform sampler2D spotlightTexture;
      uniform vec3 color;
      uniform float brightness;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D(spotlightTexture, vUv);
        gl_FragColor = vec4(texColor.rgb * color * brightness, texColor.a);
      }
    `;
