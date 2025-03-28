/**
 * @file shaders.js
 * @description This file contains various GLSL shader codes used in a Three.js-based 3D visualization project.
 * It includes vertex and fragment shaders for nodes, edges, and a spotlight effect.
 *
 * @author [Your Name or Organization]
 * @version 1.0.0
 * @date 2023-10-18
 *
 * Shaders included:
 *
 * 1. Node Shaders:
 *    - vertexShaderNode: Handles node positioning, size, color, visibility, and selection highlighting.
 *    - fragmentShaderNode: Manages node color, texture, fog effect, and selection brightness.
 *
 * 2. Edge Shaders:
 *    - VertexShaderEdge: Manages edge positioning and visibility.
 *    - FragmentShaderEdge: Handles edge color, opacity, and brightness.
 *
 * 3. Spotlight Shaders:
 *    - vertexShaderSpotlight: Sets up UV coordinates for the spotlight effect.
 *    - fragmentShaderSpotlight: Applies the spotlight texture and color.
 *
 * Key Features:
 * - Dynamic node size based on selection state
 * - Fog effect for depth perception
 * - Texture support for nodes
 * - Visibility control for nodes and edges
 * - Custom spotlight effect
 *
 * These shaders are designed to work together to create a rich, interactive 3D graph visualization,
 * with support for node selection, edge rendering, and visual effects.
 *
 * @exports {string} vertexShaderNode
 * @exports {string} fragmentShaderNode
 * @exports {string} VertexShaderEdge
 * @exports {string} FragmentShaderEdge
 * @exports {string} vertexShaderSpotlight
 * @exports {string} fragmentShaderSpotlight
 */

// Vertex Shader
export const vertexShaderNode = `
  // Custom attributes
  attribute float size;
  attribute vec3 color;
  attribute float visible;
  attribute float singleNodeSelectionBrightness;
  
  varying vec4 vColor;
  varying float vVisible;
  varying float vSingleNodeSelectionBrightness;
  
  void main() {
    vColor = vec4(color, 1.0); 
    vVisible = visible;
    vSingleNodeSelectionBrightness = singleNodeSelectionBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Calculate size factor based on brightness
    float sizeFactor = (singleNodeSelectionBrightness > 0.0) ? 2.0 : 1.0;
    
    // Apply size factor to gl_PointSize
    gl_PointSize = size * sizeFactor * (300.0 / -mvPosition.z) * vVisible;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShaderNode = `
  varying vec4 vColor;
  varying float vVisible;
  varying float vSingleNodeSelectionBrightness;
  
  uniform vec3 color;
  uniform sampler2D nodeTexture;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;

  void main() {
    if (vVisible < 0.5) discard; // Discard fragment if not visible

    // Get the color from the texture
    vec4 outColor = texture2D(nodeTexture, gl_PointCoord);
    if (outColor.a < 0.5) discard; // Discard transparent parts

    // Adjust brightness based on vSingleNodeSelectionBrightness
    vec3 finalColor = mix(color * vColor.xyz, vec3(1.0), vSingleNodeSelectionBrightness);

    // Apply fog
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    vec3 foggedColor = mix(finalColor, fogColor, fogFactor);

    // Output the final color
    gl_FragColor = vec4(foggedColor, outColor.a);
  }
`;

export const VertexShaderEdge = `
  attribute float visible;
  varying vec3 vColor;
  varying float vVisible;
  
  void main() {
    vColor = color;
    vVisible = visible;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FragmentShaderEdge = `
  uniform float opacity;
  uniform float brightness;
  varying vec3 vColor;
  varying float vVisible;
  
  void main() {
    if (vVisible < 0.5) discard;
    vec3 color = vColor * brightness;
    gl_FragColor = vec4(color, opacity);
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
