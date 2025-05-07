import { CONFIG } from "../config.js";

/**
 * More natural easing function for scrolling
 * Combines ease-in-out with a slight pause at the beginning and acceleration in the middle
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function naturalEasing(t) {
  // Using a simpler, smoother cubic bezier-like curve
  // This avoids the stuttering from segment transitions in the previous implementation
  return t * t * (3 - 2 * t);
}

/**
 * Animate camera movement
 * @param {Object} camera - The camera object
 * @param {Object} controls - The controls object
 * @param {Function} easingFunction - The easing function to use
 * @param {Object} position - Target position {x, y, z}
 * @param {Object} lookAt - Target look at point {x, y, z}
 * @param {number} duration - Animation duration in milliseconds
 * @returns {Promise} - Resolves when animation completes
 */
export function animateCamera(
  camera,
  controls,
  easingFunction,
  position,
  lookAt,
  duration = 2000
) {
  const startPosition = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };

  const startTime = performance.now();

  return new Promise((resolve) => {
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easing function for smooth movement
      const eased = easingFunction(progress);

      // Update camera position
      camera.position.x =
        startPosition.x + (position.x - startPosition.x) * eased;
      camera.position.y =
        startPosition.y + (position.y - startPosition.y) * eased;
      camera.position.z =
        startPosition.z + (position.z - startPosition.z) * eased;

      // Update camera target
      controls.target.set(lookAt.x, lookAt.y, lookAt.z);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    animate();
  });
}

/**
 * Cubic ease-in-out function
 * @param {number} t - Progress from 0 to 1
 * @returns {number} - Eased value
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Log the current camera position and target to the console
 * Useful for debugging and finding exact coordinates
 */
export function logCameraPosition(camera, controls, showOverlay) {
  // Only log positions if camera tools are enabled
  if (!CONFIG.development.videoRecording.showCameraTools) {
    return null;
  }

  console.log("=== Current Camera State ===");
  console.log("Camera position:", {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  });
  console.log("Camera target:", {
    x: controls.target.x,
    y: controls.target.y,
    z: controls.target.z,
  });
  console.log("===========================");

  // Create a temporary on-screen notification
  const posInfo = `Position: (${camera.position.x.toFixed(
    0
  )}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})`;
  const targetInfo = `Target: (${controls.target.x.toFixed(
    0
  )}, ${controls.target.y.toFixed(0)}, ${controls.target.z.toFixed(0)})`;
  showOverlay(`${posInfo}\n${targetInfo}`);

  return {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    target: {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    },
  };
}

/**
 * Set camera position and target to specific coordinates without animation
 * @param {Object} camera - The camera object
 * @param {Object} controls - The controls object
 * @param {Object} position - The position to set {x, y, z}
 * @param {Object} target - The target to look at {x, y, z}
 */
export function setCameraPosition(camera, controls, position, target) {
  if (position) {
    camera.position.set(
      position.x !== undefined ? position.x : camera.position.x,
      position.y !== undefined ? position.y : camera.position.y,
      position.z !== undefined ? position.z : camera.position.z
    );
  }

  if (target) {
    controls.target.set(
      target.x !== undefined ? target.x : controls.target.x,
      target.y !== undefined ? target.y : controls.target.y,
      target.z !== undefined ? target.z : controls.target.z
    );
    controls.update();
  }

  console.log("Camera position set to:", {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    target: {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    },
  });
}

/**
 * Update the list of camera presets in the dev tools
 * @param {HTMLElement} container - The container for dev tools
 * @param {Object} camera - The camera object
 * @param {Object} controls - The controls object
 * @param {Function} showOverlay - Function to show overlay messages
 */
export function updatePresetList(container, camera, controls, showOverlay) {
  // Rest of the function remains the same
  // Remove existing preset list if any
  const existingList = container.querySelector(".preset-list");
  if (existingList) {
    existingList.remove();
  }

  // Get stored presets
  let presets = localStorage.getItem("cameraPresets");
  if (!presets) return;

  presets = JSON.parse(presets);
  if (!presets.length) return;

  // Create preset list container
  const presetList = document.createElement("div");
  presetList.classList.add("preset-list");
  presetList.style.background = "rgba(30, 30, 30, 0.8)";
  presetList.style.borderRadius = "4px";
  presetList.style.padding = "10px";
  presetList.style.maxHeight = "200px";
  presetList.style.overflowY = "auto";

  // Add heading
  const heading = document.createElement("div");
  heading.textContent = "Saved Positions";
  heading.style.color = "white";
  heading.style.fontWeight = "bold";
  heading.style.marginBottom = "5px";
  heading.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
  heading.style.paddingBottom = "5px";
  presetList.appendChild(heading);

  // Add each preset as a button
  presets.forEach((preset, index) => {
    const presetBtn = document.createElement("button");
    presetBtn.textContent = preset.name;
    presetBtn.style.background = "rgba(60, 60, 60, 0.6)";
    presetBtn.style.color = "white";
    presetBtn.style.border = "none";
    presetBtn.style.padding = "5px 10px";
    presetBtn.style.borderRadius = "4px";
    presetBtn.style.margin = "5px 0";
    presetBtn.style.width = "100%";
    presetBtn.style.textAlign = "left";
    presetBtn.style.cursor = "pointer";
    presetBtn.style.display = "flex";
    presetBtn.style.justifyContent = "space-between";
    presetBtn.style.alignItems = "center";

    // Add go to position functionality
    // Just update this line to use the imported showOverlay
    presetBtn.addEventListener("click", () => {
      setCameraPosition(camera, controls, preset.position, preset.target);
      showOverlay(`Camera moved to preset "${preset.name}"`);
    });

    // Add delete button
    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "×";
    deleteBtn.style.color = "rgba(255, 100, 100, 0.8)";
    deleteBtn.style.fontWeight = "bold";
    deleteBtn.style.marginLeft = "5px";

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering the parent button

      // Remove preset from array
      presets.splice(index, 1);

      // Save updated presets
      localStorage.setItem("cameraPresets", JSON.stringify(presets));
    });

    presetBtn.appendChild(deleteBtn);
    presetList.appendChild(presetBtn);
  });

  container.appendChild(presetList);
}

/**
 * Create development tools for camera control and debugging
 */
export function createDevTools(camera, controls, showOverlay) {
  // Only create dev tools if showDevTools is enabled
  if (
    !CONFIG.development ||
    !CONFIG.development.videoRecording.showCameraTools
  ) {
    return;
  }

  // Create container for development tools
  const devToolsContainer = document.createElement("div");
  devToolsContainer.id = "camera-dev-tools";
  devToolsContainer.style.position = "fixed";
  devToolsContainer.style.bottom = "20px";
  devToolsContainer.style.right = "20px";
  devToolsContainer.style.zIndex = "1000";
  devToolsContainer.style.display = "flex";
  devToolsContainer.style.flexDirection = "column";
  devToolsContainer.style.gap = "10px";

  // Add Log Position button
  const logPositionBtn = document.createElement("button");
  logPositionBtn.textContent = "Log Camera Position";
  logPositionBtn.style.background = "rgba(37, 218, 165, 0.9)";
  logPositionBtn.style.color = "white";
  logPositionBtn.style.border = "none";
  logPositionBtn.style.padding = "8px 16px";
  logPositionBtn.style.borderRadius = "4px";
  logPositionBtn.style.fontFamily = "Arial, sans-serif";
  logPositionBtn.style.cursor = "pointer";
  logPositionBtn.style.fontSize = "14px";
  logPositionBtn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

  // Add event listener
  logPositionBtn.addEventListener("click", () => {
    const cameraData = logCameraPosition(camera, controls, showOverlay);

    if (cameraData) {
      // Copy to clipboard functionality
      const positionStr = `position: { x: ${cameraData.position.x.toFixed(
        2
      )}, y: ${cameraData.position.y.toFixed(
        2
      )}, z: ${cameraData.position.z.toFixed(2)} }`;
      const targetStr = `target: { x: ${cameraData.target.x.toFixed(
        2
      )}, y: ${cameraData.target.y.toFixed(
        2
      )}, z: ${cameraData.target.z.toFixed(2)} }`;
      const fullStr = `${positionStr}, ${targetStr}`;

      try {
        navigator.clipboard.writeText(fullStr).then(() => {
          // Show confirmation tooltip
          const tooltip = document.createElement("div");
          tooltip.textContent = "Copied to clipboard!";
          tooltip.style.position = "fixed";
          tooltip.style.bottom = "80px";
          tooltip.style.right = "20px";
          tooltip.style.background = "rgba(0,0,0,0.8)";
          tooltip.style.color = "white";
          tooltip.style.padding = "5px 10px";
          tooltip.style.borderRadius = "4px";
          tooltip.style.fontSize = "12px";
          tooltip.style.zIndex = "1001";
          document.body.appendChild(tooltip);

          // Remove after 2 seconds
          setTimeout(() => tooltip.remove(), 2000);
        });
      } catch (err) {
        console.error("Could not copy to clipboard:", err);
      }
    }
  });

  devToolsContainer.appendChild(logPositionBtn);

  // Add button to save preset positions
  const savePresetBtn = document.createElement("button");
  savePresetBtn.textContent = "Save as Preset";
  savePresetBtn.style.background = "rgba(100, 100, 255, 0.9)";
  savePresetBtn.style.color = "white";
  savePresetBtn.style.border = "none";
  savePresetBtn.style.padding = "8px 16px";
  savePresetBtn.style.borderRadius = "4px";
  savePresetBtn.style.fontFamily = "Arial, sans-serif";
  savePresetBtn.style.cursor = "pointer";
  savePresetBtn.style.fontSize = "14px";
  savePresetBtn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";

  savePresetBtn.addEventListener("click", () => {
    // Get current camera data
    const cameraData = {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z,
      },
    };

    // Get stored presets or initialize
    let presets = localStorage.getItem("cameraPresets");
    presets = presets ? JSON.parse(presets) : [];

    // Create name for preset (position_1, position_2, etc.)
    const presetName = `position_${presets.length + 1}`;

    // Add new preset
    presets.push({
      name: presetName,
      ...cameraData,
    });

    // Save to localStorage
    localStorage.setItem("cameraPresets", JSON.stringify(presets));

    // Show confirmation
    showOverlay(`Camera preset "${presetName}" saved`);
    console.log(`Camera preset saved as "${presetName}":`, cameraData);

    // Refresh preset list if it exists
    updatePresetList(devToolsContainer, camera, controls, showOverlay);
  });

  devToolsContainer.appendChild(savePresetBtn);

  // Add preset list
  updatePresetList(devToolsContainer, camera, controls, showOverlay);

  // Add to document
  document.body.appendChild(devToolsContainer);

  // Add keyboard shortcut to toggle dev tools (Alt+C)
  document.addEventListener("keydown", (event) => {
    // Check for Alt+C combination
    if (event.altKey && event.key === "c") {
      const toolsContainer = document.getElementById("camera-dev-tools");
      if (toolsContainer) {
        if (toolsContainer.style.display === "none") {
          toolsContainer.style.display = "flex";
          showOverlay("Camera tools shown (Alt+C)");
        } else {
          toolsContainer.style.display = "none";
          showOverlay("Camera tools hidden (Alt+C)");
        }
      }
    }

    // Alt+P shortcut to log camera position without clicking button
    if (event.altKey && event.key === "p") {
      logCameraPosition(this.camera, this.controls, showOverlay);
    }
  });

  // Add toggle button that stays visible even when tools are hidden
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toggle-camera-tools";
  toggleBtn.textContent = "C";
  toggleBtn.title = "Toggle Camera Tools (Alt+C)";
  toggleBtn.style.position = "fixed";
  toggleBtn.style.bottom = "20px";
  toggleBtn.style.right = "20px";
  toggleBtn.style.width = "30px";
  toggleBtn.style.height = "30px";
  toggleBtn.style.borderRadius = "50%";
  toggleBtn.style.background = "rgba(0, 0, 0, 0.5)";
  toggleBtn.style.color = "white";
  toggleBtn.style.border = "2px solid rgba(37, 218, 165, 0.7)";
  toggleBtn.style.display = "flex";
  toggleBtn.style.alignItems = "center";
  toggleBtn.style.justifyContent = "center";
  toggleBtn.style.cursor = "pointer";
  toggleBtn.style.fontSize = "14px";
  toggleBtn.style.fontWeight = "bold";
  toggleBtn.style.zIndex = "999";
  toggleBtn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";

  toggleBtn.addEventListener("click", () => {
    const toolsContainer = document.getElementById("camera-dev-tools");
    if (toolsContainer) {
      if (toolsContainer.style.display === "none") {
        toolsContainer.style.display = "flex";
        toggleBtn.style.display = "none"; // Hide toggle button when tools are shown
      } else {
        toolsContainer.style.display = "none";
        toggleBtn.style.display = "flex"; // Show toggle button when tools are hidden
      }
    }
  });

  document.body.appendChild(toggleBtn);
  toggleBtn.style.display = "none"; // Initially hidden because tools are visible
}
