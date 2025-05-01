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
  uniform float saturation;
  uniform float specularPower;
  uniform float specularIntensity;
  uniform float brightnessMultiplier;
  uniform float highlightBrightness;

  void main() {
    if (vVisible < 0.5) discard; // Discard fragment if not visible

    // Get the color from the texture
    vec4 outColor = texture2D(nodeTexture, gl_PointCoord);
    if (outColor.a < 0.5) discard; // Discard transparent parts

    // Use vertex color directly with minimal modification
    vec3 baseColor = vColor.xyz;

    // Only apply minimal saturation adjustment
    float luminance = dot(baseColor, vec3(0.299, 0.587, 0.114));
    vec3 saturatedColor = mix(vec3(luminance), baseColor, max(saturation, 0.8));

    // Apply selection highlight
    vec3 finalColor = mix(saturatedColor,
                         saturatedColor + vec3(highlightBrightness),
                         vSingleNodeSelectionBrightness);

    // Apply minimal fog effect
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    vec3 foggedColor = mix(finalColor, fogColor, fogFactor * 0.2);

    // Add subtle specular highlight
    vec2 center = vec2(0.5, 0.5);
    float dist = length(gl_PointCoord - center);
    float specular = 1.0 - smoothstep(0.0, 0.5, dist);
    specular = pow(specular, specularPower) * specularIntensity * 0.5;
    foggedColor += vec3(specular);

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
  uniform float saturation;
  uniform float glowIntensity;
  varying vec3 vColor;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard;

    // Increase color saturation for edges
    float luminance = dot(vColor, vec3(0.299, 0.587, 0.114));
    vec3 saturatedColor = mix(vec3(luminance), vColor, saturation);

    // Apply brightness while preserving saturation
    vec3 color = saturatedColor * brightness;
    color = color + vec3(glowIntensity);

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
