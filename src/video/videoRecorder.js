import { CONFIG } from "../config.js";
import { nodesMap } from "../nodesLoader.js";
import { updateNodeInfo, hideVisualSelection } from "../singleNodeSelection.js";
import { audioNarration } from "./sound/audioNarration.js";

//////////////
import {
  addClickEffect,
  createVisualDropdown,
  selectFromDropdown,
} from "./videoStyles.js";
import {
  naturalEasing,
  animateCamera,
  easeInOutCubic,
  logCameraPosition,
  createDevTools,
} from "./cameraUtils.js"; // Adjust the path as needed
import {
  showOverlay,
  showRecordingIndicator,
  showRecordingSuccessMessage,
  showRecordingErrorMessage,
  showRecordingWarningMessage,
} from "./messagesUtils.js";

// Import recording setup functions
import {
  getSupportedMimeTypes,
  getPreferredMimeType,
  setupRecorder,
  downloadVideo,
} from "./recordingSetup.js";

class VideoRecorder {
  constructor(canvas, scene, camera, controls) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.recorder = null;
    this.sequencer = new InteractionSequencer(scene, camera, controls);
    this.fps = 30;
    this.isRecording = false;
    this.frames = [];
    this.frameInterval = null;
    this.recordingStartTime = null;
    this.recordingUI = null; // To store UI elements
    this.screenCaptureStream = null; // Added to store the stream reference

    // Check browser compatibility
    this.hasMediaRecorderSupport = typeof MediaRecorder !== "undefined";
    this.supportedMimeTypes = this.hasMediaRecorderSupport
      ? getSupportedMimeTypes()
      : [];

    // Add development tools if enabled
    if (CONFIG.development && CONFIG.development.showDevTools) {
      createDevTools(this.camera, this.controls, showOverlay);
    }
  }

  /**
   * Start recording video
   * @param {number} duration - Recording duration in milliseconds
   */
  async startRecording(duration) {
    // Get values from config if not provided
    const recordingDuration =
      duration || CONFIG.development.videoRecording.defaultDuration || 60000;
    const fps = CONFIG.development.videoRecording.defaultFps || 30;

    if (this.isRecording) {
      console.warn("Already recording");
      return;
    }

    // Check narration readiness if enabled
    if (CONFIG.development?.videoRecording?.narration?.enabled) {
      this.checkNarrationReadiness();
    }

    // Log camera position and target for reference
    console.log("=== Current Camera State ===");
    console.log("Camera position:", {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    });
    console.log("Camera target:", {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z,
    });
    console.log("===========================");

    try {
      // Check if we're running in a user gesture handler
      const isInUserGesture =
        document.hasStorageAccess &&
        (await document.hasStorageAccess().catch(() => true));

      if (!isInUserGesture) {
        console.warn("Recording must be started from a user gesture.");
        // Only create a button if UI elements are enabled
        if (CONFIG.development.videoRecording.showAllUI) {
          console.log("Adding a record button...");
          this.createRecordButton(recordingDuration, fps);
        }
        return;
      }

      // Preload audio narration if enabled
      if (CONFIG.development?.videoRecording?.narration?.enabled) {
        console.log("Preloading audio narration files...");
        try {
          await audioNarration.loadAudioFiles();
        } catch (error) {
          console.warn(
            "Failed to load audio narration, continuing without audio:",
            error
          );
        }
      }

      // Setup UI and recorder
      const recorder = await setupRecorder(this.canvas, recordingDuration, fps);
      if (!recorder) {
        throw new Error("Failed to set up recorder");
      }

      // Store the recorder instance
      this.recorder = recorder;

      // Show recording UI and store the returned UI elements
      this.recordingUI = showRecordingIndicator(
        this.camera,
        this.controls,
        showOverlay
      );

      // Create demo sequence
      const sequencer = this.createDemoSequence();

      // Wait 2 seconds before starting to avoid initial camera jumps
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Start recording
      this.isRecording = true;
      this.recorder.start();
      console.log("Recording started...");

      // Wait a bit more for stability before starting the sequence
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start the demo sequence
      await sequencer.start();

      // Wait for a bit before stopping
      if (this.recorder && this.recorder.state === "recording") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.recorder.stop();
      }
    } catch (error) {
      console.error("Error during recording:", error);
      this.isRecording = false;

      // Clean up
      if (this.recorder && this.recorder.state === "recording") {
        try {
          this.recorder.stop();
        } catch (stopError) {
          console.error("Error stopping recorder:", stopError);
        }
      }

      // Stop any playing audio
      if (CONFIG.development?.videoRecording?.narration?.enabled) {
        audioNarration.stop();
      }

      // Clean up UI elements
      if (this.recordingUI) {
        this.recordingUI.cleanup();
        this.recordingUI = null;
      }
    }
  }

  /**
   * Stop the current recording and clean up resources
   */
  stopRecording() {
    if (this.recorder && this.isRecording) {
      console.log("Stopping recording...");
      this.isRecording = false;
      this.recorder.stop();

      // Stop any playing audio
      if (CONFIG.development?.videoRecording?.narration?.enabled) {
        audioNarration.stop();
      }

      // Clean up UI elements
      if (this.recordingUI) {
        this.recordingUI.cleanup();
        this.recordingUI = null;
      }

      // Clean up any additional resources
      if (this.screenCaptureStream) {
        this.screenCaptureStream.getTracks().forEach((track) => track.stop());
        this.screenCaptureStream = null;
      }

      return true;
    }
    return false;
  }

  /**
   * Create a demo interaction sequence
   * @returns {InteractionSequencer} - The configured sequencer
   */
  createDemoSequence() {
    const sequencer = this.sequencer;

    // Clear any previous actions
    sequencer.actions = new Map();

    // Helper to perform click with animation first
    const performAnimatedClick = async (element, description) => {
      if (!element) {
        console.error(`Element for "${description}" not found`);
        return;
      }

      // First show the animation
      addClickEffect(element);

      // Wait a moment for the animation to be visible
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Then perform the actual click
      element.click();

      console.log(`Performed animated click: ${description}`);
    };

    // Helper function for smooth scrolling
    const smoothScroll = async (container, duration = 4000) => {
      if (!container) {
        console.error("Scroll container not found");
        return;
      }

      console.log("Starting smooth scroll with container:", container);
      console.log("Container scroll height:", container.scrollHeight);
      console.log("Container client height:", container.clientHeight);

      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollDistance = scrollHeight - clientHeight;

      // If there's nothing to scroll, return early
      if (scrollDistance <= 0) {
        console.warn("Container doesn't need scrolling (not enough content)");
        return;
      }

      // Ensure the container is scrollable
      container.style.overflow = "auto";

      // Reset to top before starting
      container.scrollTop = 0;

      // Give the browser a moment to process the scroll reset
      await new Promise((resolve) => setTimeout(resolve, 100));

      const startTime = performance.now();

      return new Promise((resolve) => {
        const scrollStep = (timestamp) => {
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Use custom easing for more natural scroll
          const eased = naturalEasing(progress);
          const scrollPosition = scrollDistance * eased;

          // Update scroll position
          container.scrollTop = scrollPosition;

          // Force layout recalculation
          container.getBoundingClientRect();

          if (progress < 1) {
            requestAnimationFrame(scrollStep);
          } else {
            console.log("Smooth scroll completed");
            resolve();
          }
        };

        requestAnimationFrame(scrollStep);
      });
    };

    // Enhanced helper for finding a scrollable container
    const findScrollableContainer = (element) => {
      if (!element) {
        console.error("No element provided to findScrollableContainer");
        return null;
      }

      console.log("Finding scrollable container for:", element);

      // First, try the element itself
      if (element.scrollHeight > element.clientHeight) {
        console.log("Element itself is scrollable");
        return element;
      }

      // Then look for parent elements
      let container = element.parentElement;
      let depth = 0;
      const maxDepth = 10; // Prevent infinite loops

      while (container && depth < maxDepth) {
        if (container === document.body) {
          console.log("Reached document.body");
          break;
        }

        // Check if this container is scrollable
        const style = window.getComputedStyle(container);
        const overflowY = style.getPropertyValue("overflow-y");

        if (
          container.scrollHeight > container.clientHeight &&
          (overflowY === "auto" || overflowY === "scroll")
        ) {
          console.log("Found scrollable parent:", container);
          return container;
        }

        // Move up to parent
        container = container.parentElement;
        depth++;
      }

      // If we reach here, try some common containers by ID or class
      const commonScrollContainers = [
        document.querySelector(".modal-body"),
        document.querySelector(".topic-tree-container"),
        document.getElementById("topicTreeModal")?.querySelector(".modal-body"),
        document
          .getElementById("instructionsModal")
          ?.querySelector(".modal-body"),
      ];

      for (const container of commonScrollContainers) {
        if (container && container.scrollHeight > container.clientHeight) {
          console.log("Found common scrollable container:", container);
          return container;
        }
      }

      console.warn("No scrollable container found");
      return null;
    };

    // Helper for selecting a specific node
    const selectNode = async (nodeId, scene) => {
      try {
        // Get required scene objects
        const points = scene.getObjectByName("points");
        if (!points) {
          console.error("Points object not found in scene");
          return;
        }

        // Verify we have access to nodesMap
        if (!nodesMap) {
          console.error("nodesMap not available from nodesLoader.js");
          return;
        }

        // Get target node and verify it exists
        const targetNode = nodesMap.get(nodeId);
        if (!targetNode) {
          console.error(`Node with ID ${nodeId} not found in nodesMap`);
          return;
        }

        // Find the index of the node in the nodeIds array
        const nodeIds = Array.from(nodesMap.keys());
        const targetNodeIndex = nodeIds.indexOf(nodeId);
        if (targetNodeIndex === -1) {
          console.error(`Node ID ${nodeId} not found in nodesMap keys`);
          return;
        }

        // Create a fake intersection object to pass to updateNodeInfo
        const fakeIntersection = {
          index: targetNodeIndex,
          object: points,
        };

        // Select and highlight the node
        updateNodeInfo(fakeIntersection, nodesMap, points, scene);
        console.log(
          `Successfully selected node ID: ${nodeId} at index: ${targetNodeIndex}`
        );

        // Pause to appreciate the selected node
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Error selecting node ${nodeId}:`, error);
      }
    };

    // Helper for deselecting a node
    const deselectNode = async (scene) => {
      console.log("Action: Deselecting node");
      showOverlay("Deselecting Node");

      // Try to find the main canvas
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        // Click in a corner where there's likely no node
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + 5,
          clientY: rect.top + 5,
        });
        canvas.dispatchEvent(clickEvent);
      }

      // Multiple fallback approaches to ensure deselection
      try {
        // Approach 1: Use the updateNodeInfo function with null parameters
        if (typeof updateNodeInfo === "function") {
          updateNodeInfo(null, nodesMap, null, scene);
        }

        // Approach 2: Directly hide the visual selection
        if (typeof hideVisualSelection === "function") {
          hideVisualSelection();
        }

        // Approach 3: Reset node selection styling
        const nodeInfoDiv = document.getElementById("nodeInfoDiv");
        if (nodeInfoDiv) {
          nodeInfoDiv.style.display = "none";
        }
        document.body.classList.remove("node-selected");

        // Approach 4: Reset any selection state in scene objects
        if (scene) {
          const points = scene.getObjectByName("points");
          if (
            points &&
            points.geometry.attributes.singleNodeSelectionBrightness
          ) {
            points.geometry.attributes.singleNodeSelectionBrightness.array.fill(
              0.0
            );
            points.geometry.attributes.singleNodeSelectionBrightness.needsUpdate = true;
          }
        }
      } catch (error) {
        console.warn("Could not complete node deselection:", error);
      }

      // Give time for the deselection to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // 1. Start with an initial orbit around the network
    sequencer.addAction(
      "orbiting_network_1",
      async () => {
        console.log("Action: Starting with initial orbit around the network");

        // First ensure any existing modals are closed
        const modals = document.querySelectorAll(
          ".modal, #instructionsModal, #topicTreeModal"
        );
        for (const modal of modals) {
          if (
            modal &&
            (modal.style.display === "block" || modal.style.display === "flex")
          ) {
            const closeBtn = modal.querySelector(
              '.close-btn, .close, [id$="CloseBtn"]'
            );
            if (closeBtn) {
              await performAnimatedClick(
                closeBtn,
                `Close ${modal.id || "modal"}`
              );
            } else {
              modal.style.display = "none";
              if (modal.classList.contains("show")) {
                modal.classList.remove("show");
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }

        // Reset controls for clean state
        this.controls.reset();
        await new Promise((resolve) => setTimeout(resolve, 300));

        console.log("Action: Camera orbital movement around network center");
        showOverlay("Orbital Network Perspective");

        // Starting position - First quadrant (X+, Z+)
        animateCamera(
          this.camera, // Pass your camera object
          this.controls, // Pass your controls object
          easeInOutCubic, // Use the imported easing function
          { x: 6177, y: 7310, z: 12122 },
          { x: 0, y: 0, z: 0 }, // Keeping camera focused on center
          1000 // Quick initial positioning
        );

        // Brief pause to establish the starting view
        await new Promise((resolve) => setTimeout(resolve, 1500));

        showOverlay("Exploring Network Structure");

        // Moving to second quadrant (X-, Z+)
        await animateCamera(
          this.camera, // Pass your camera object
          this.controls, // Pass your controls object
          easeInOutCubic, // Use the imported easing function
          { x: -9091, y: 8314, z: 9315 },
          { x: 0, y: 0, z: 0 },
          8000 // Slow, cinematic movement
        );

        // Brief pause to appreciate this angle
        await new Promise((resolve) => setTimeout(resolve, 1000));

        showOverlay("Discovering Network Connections");

        // Moving to third quadrant (X-, Z-)
        await animateCamera(
          this.camera, // Pass your camera object
          this.controls, // Pass your controls object
          easeInOutCubic, // Use the imported easing function
          { x: -10000, y: 8398, z: -8247 },
          { x: 0, y: 0, z: 0 },
          8000 // Consistent slow pace
        );

        // Brief pause at this unique perspective
        await new Promise((resolve) => setTimeout(resolve, 1000));

        showOverlay("Complete Network Overview");

        // Moving to fourth quadrant (X+, Z-) completing the circle
        await animateCamera(
          this.camera, // Pass your camera object
          this.controls, // Pass your controls object
          easeInOutCubic, // Use the imported easing function
          { x: 10318, y: 7508, z: -8700 },
          { x: 0, y: 0, z: 0 },
          8000 // Maintaining the slow, deliberate pace
        );

        // Longer pause at final position to appreciate the full circular journey
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Note: Additional camera movements would continue from here
      },
      1500
    );

    // 2. Open the instructions modal
    sequencer.addAction(
      "instructions_modal_1",
      async () => {
        console.log("Action: Opening instructions modal");
        showOverlay("Showing Instructions Modal");
        const helpButton = document.getElementById("helpButton");
        await performAnimatedClick(helpButton, "Open instructions");

        // Wait for modal to appear
        await new Promise((resolve) => setTimeout(resolve, 400));
      },
      300
    );
    // 3. Scroll down in instructions modal
    sequencer.addAction(
      "instructions_modal_2",
      async () => {
        console.log("Action: Scrolling in instructions modal");
        showOverlay("Reading Instructions");

        const instructionsContainer = document.querySelector(
          ".instructions-container"
        );
        await smoothScroll(instructionsContainer);

        // Wait for narration to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      1000
    );

    // 3. Click on "View Topic Hierarchy" button
    sequencer.addAction(
      "topic_hierarchy_1",
      async () => {
        console.log("Action: Opening topic hierarchy");
        showOverlay("Opening Topic Hierarchy");

        const viewHierarchyBtn = document.getElementById(
          "viewTopicHierarchyBtn"
        );
        await performAnimatedClick(viewHierarchyBtn, "Open topic hierarchy");

        // Wait for topic tree modal to open
        await new Promise((resolve) => setTimeout(resolve, 400));
      },
      800
    );

    // 4. Scroll down in topic hierarchy
    sequencer.addAction(
      "topic_hierarchy_2",
      async () => {
        console.log("Action: Scrolling in topic hierarchy");
        showOverlay("Exploring Topic Structure");

        const topicTreeSvg = document.getElementById("topicTreeSvg");
        console.log("Found topic tree SVG:", topicTreeSvg);

        // Try multiple approaches to find the scrollable container
        let scrollableContainer = null;

        // Approach 1: Use the helper function
        scrollableContainer = findScrollableContainer(topicTreeSvg);

        // Approach 2: Try modal-specific selectors
        if (!scrollableContainer) {
          const modalBody = document.querySelector(
            "#topicTreeModal .modal-body"
          );
          if (modalBody) {
            console.log("Using modal body as scroll container");
            scrollableContainer = modalBody;
          }
        }

        // Approach 3: Force the container to be scrollable
        if (!scrollableContainer && topicTreeSvg) {
          const parent = topicTreeSvg.parentElement;
          if (parent) {
            console.log("Forcing parent to be scrollable");
            parent.style.height = "80vh";
            parent.style.overflow = "auto";
            scrollableContainer = parent;
          }
        }

        if (scrollableContainer) {
          console.log("Found scrollable container for topic hierarchy");

          // Make one single smooth scroll
          await smoothScroll(scrollableContainer, 3500);
        } else {
          console.log("No scrollable container found for topic hierarchy");

          // Fallback: Try to scroll the document body
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;

          await new Promise((resolve) => setTimeout(resolve, 100));

          await smoothScroll(document.body, 3500);
        }
      },
      800
    );

    // 5. Change dropdown from "Overview" to "Safety"
    sequencer.addAction(
      "topic_hierarchy_3",
      async () => {
        console.log("Action: Changing to Safety topic");
        showOverlay("Selecting Safety Topic");

        const datasetSelect = document.getElementById("datasetSelect");
        if (datasetSelect) {
          // Add visual effect to the dropdown
          addClickEffect(datasetSelect);
          await new Promise((resolve) => setTimeout(resolve, 150));

          // Create custom visual representation
          await createVisualDropdown(datasetSelect, "safety");

          // Change the value and trigger update
          datasetSelect.value = "safety";
          datasetSelect.dispatchEvent(new Event("change", { bubbles: true }));

          // Wait for visualization to update
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      },
      800
    );

    // 6. Scroll down in the updated topic hierarchy
    sequencer.addAction(
      "topic_hierarchy_4",
      async () => {
        console.log("Action: Scrolling in safety topic hierarchy");
        showOverlay("Exploring Safety Cluster");

        const topicTreeSvg = document.getElementById("topicTreeSvg");
        let scrollableContainer = null;

        // Try multiple approaches to find the scrollable container
        // Approach 1: Use the helper function
        scrollableContainer = findScrollableContainer(topicTreeSvg);

        // Approach 2: Try modal-specific selectors
        if (!scrollableContainer) {
          const modalBody = document.querySelector(
            "#topicTreeModal .modal-body"
          );
          if (modalBody) {
            console.log("Using modal body as scroll container");
            scrollableContainer = modalBody;
          }
        }

        // Approach 3: Try to find by content
        if (!scrollableContainer) {
          const containers = Array.from(document.querySelectorAll("div"));
          scrollableContainer = containers.find(
            (el) =>
              el.scrollHeight > el.clientHeight &&
              (el.textContent.includes("Safety") ||
                el.innerHTML.includes("topic-tree"))
          );

          if (scrollableContainer) {
            console.log("Found container by content search");
          }
        }

        if (scrollableContainer) {
          // Reset scroll position first
          scrollableContainer.scrollTop = 0;
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Make one single smooth scroll
          console.log("Scrolling safety topic hierarchy");
          await smoothScroll(scrollableContainer, 4000);
        } else {
          console.warn(
            "No scrollable container found for safety topic hierarchy"
          );
        }

        // Wait after scrolling
        await new Promise((resolve) => setTimeout(resolve, 500));
      },
      600
    );

    // 7. Close the topic hierarchy modal
    sequencer.addAction(
      "topic_hierarchy_5",
      async () => {
        console.log("Action: Closing topic hierarchy modal");
        showOverlay("Returning to Main View");

        const closeBtn = document.getElementById("topicTreeCloseBtn");
        await performAnimatedClick(closeBtn, "Close topic hierarchy");

        // Wait for modal to close
        await new Promise((resolve) => setTimeout(resolve, 500));
      },
      1000
    );

    // Add interaction to click the Safety cluster fold indicator in the legend.
    sequencer.addAction(
      "legend_safety_1",
      async () => {
        console.log("Action: Expanding Safety cluster");
        showOverlay("Exploring Safety Research");

        // Find the Safety cluster fold indicator element
        const safetyContainer = Array.from(
          document.querySelectorAll(".legend-item-container")
        ).find((container) => container.textContent.includes("Safety"));

        if (safetyContainer) {
          const foldIndicator =
            safetyContainer.querySelector(".fold-indicator");
          if (foldIndicator) {
            // First, add visual highlight
            addClickEffect(foldIndicator);
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Try multiple approaches to ensure the fold actually happens

            // 1. Direct click - the standard way
            foldIndicator.click();

            // 2. Dispatch multiple event types
            ["mousedown", "mouseup", "click"].forEach((eventType) => {
              const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
              });
              foldIndicator.dispatchEvent(event);
            });

            // 3. If there's a specific toggle function in the parent scope
            try {
              if (typeof window.toggleFold === "function") {
                window.toggleFold("Safety");
              }
            } catch (e) {
              console.log("No toggleFold function available");
            }

            // 4. If all else fails, manually toggle the class or style
            const childContainer = document.querySelector(
              ".legend-children-Safety"
            );
            if (childContainer) {
              // Toggle display style directly
              if (childContainer.style.display === "none") {
                childContainer.style.display = "block";
              }

              // Or toggle a class that controls visibility
              childContainer.classList.remove("hidden");
              childContainer.classList.add("visible");
            }

            console.log("Multiple methods used to expand Safety cluster");

            // Longer pause to allow for the animation and make it clearly visible
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else {
            console.error("Safety fold indicator not found");
          }
        } else {
          console.error("Safety container not found");
        }
      },
      1000
    );

    // Add interaction to click the Perinatal Exposure fold indicator
    sequencer.addAction(
      "legend_perinatal_exposure",
      async () => {
        console.log("Action: Expanding Perinatal Exposure subcluster");
        showOverlay("Focusing on Perinatal Exposure Research");

        // Find the Perinatal Exposure subcluster fold indicator
        const perinatalContainer = Array.from(
          document.querySelectorAll(".legend-item-container")
        ).find((container) =>
          container.textContent.includes("Perinatal Exposure")
        );

        if (perinatalContainer) {
          const foldIndicator =
            perinatalContainer.querySelector(".fold-indicator");
          if (foldIndicator) {
            // First, add visual highlight
            addClickEffect(foldIndicator);
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Try multiple approaches to ensure the fold actually happens

            // 1. Direct click - the standard way
            foldIndicator.click();

            // 2. Dispatch multiple event types
            ["mousedown", "mouseup", "click"].forEach((eventType) => {
              const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
              });
              foldIndicator.dispatchEvent(event);
            });

            // 3. If all else fails, manually toggle the class or style
            const childContainer = document.querySelector(
              ".legend-children-Safety-Perinatal\\ Exposure"
            );
            if (childContainer) {
              // Toggle display style directly
              if (childContainer.style.display === "none") {
                childContainer.style.display = "block";
              }

              // Or toggle a class that controls visibility
              childContainer.classList.remove("hidden");
              childContainer.classList.add("visible");
            }

            console.log(
              "Multiple methods used to expand Perinatal Exposure subcluster"
            );

            // Longer pause to show the expansion
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else {
            console.error("Perinatal Exposure fold indicator not found");
          }
        } else {
          console.error("Perinatal Exposure container not found");
        }
      },
      1000
    );

    // Add interaction to select the checkbox and update visibility
    sequencer.addAction(
      "legend_select_perinatal_checkbox",
      async () => {
        console.log("Action: Selecting Perinatal Exposure checkbox");
        showOverlay("Selecting Perinatal Exposure Papers");

        // Find and click the checkbox
        const perinatalCheckbox = document.getElementById(
          "Safety-Perinatal Exposure"
        );
        if (perinatalCheckbox) {
          // Visual effect before clicking
          addClickEffect(perinatalCheckbox);
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Click the checkbox
          perinatalCheckbox.click();

          // Ensure it's checked
          if (!perinatalCheckbox.checked) {
            perinatalCheckbox.checked = true;
            perinatalCheckbox.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Click the update button
          const updateButton = document.getElementById("updateVisibility");
          if (updateButton) {
            addClickEffect(updateButton);
            await new Promise((resolve) => setTimeout(resolve, 300));

            updateButton.click();
            console.log("Clicked update visibility button");

            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else {
            console.error("Update visibility button not found");
          }
        } else {
          console.error("Perinatal Exposure checkbox not found");
        }
      },
      1000
    );

    // Move camera to focus on specific node area
    sequencer.addAction(
      "camera_focus_safety_1",
      async () => {
        console.log("Action: Moving camera to focus on specific node area");
        showOverlay("Focusing on Key Research Node");

        await animateCamera(
          this.camera,
          this.controls,
          easeInOutCubic,
          { x: 3853.83, y: 4340.58, z: -4342.09 },
          { x: 550.88, y: 735.93, z: 156.5 },
          3000
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      1000
    );

    // Select specific node (prenatal exposure)
    sequencer.addAction(
      "single_node_selection_1",
      async () => {
        console.log("Action: Selecting research paper node");
        showOverlay("Highlighting Key Research Paper");

        await selectNode(8214, this.scene);
      },
      1500
    );

    // Move camera to prenatal exposure RODENTS
    sequencer.addAction(
      "single_node_selection_2",
      async () => {
        console.log("Action: Moving to prenatal exposure RODENTS view");
        showOverlay("Moving to Prenatal Exposure in Rodents");

        await animateCamera(
          this.camera,
          this.controls,
          easeInOutCubic,
          {
            x: 5958.632362729798,
            y: 3988.7886125553723,
            z: -5293.824484343763,
          },
          { x: 550.88, y: 735.93, z: 156.5 },
          3000
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      500
    );

    // Select specific node (prenatal exposure RODENTS)
    sequencer.addAction(
      "single_node_selection_3",
      async () => {
        console.log("Action: Selecting rodent studies node");
        showOverlay("Highlighting Rodent Studies");

        await selectNode(31059, this.scene);
      },
      1500
    );

    // Deselect node
    sequencer.addAction(
      "single_node_selection_4",
      async () => {
        await deselectNode(this.scene);
      },
      2000
    );

    // Move the year slider to 2010 and control time travel animation
    sequencer.addAction(
      "time_travel_1",
      async () => {
        console.log("Action: Year filtering and time travel");
        showOverlay("Filtering by Year: 2010+");

        // Adjust the year slider
        const fromSlider = document.getElementById("fromSlider");
        if (fromSlider) {
          addClickEffect(fromSlider);
          await new Promise((resolve) => setTimeout(resolve, 500));

          fromSlider.value = 2010;
          fromSlider.dispatchEvent(new Event("input", { bubbles: true }));
          fromSlider.dispatchEvent(new Event("change", { bubbles: true }));

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // Start time travel animation
        console.log("Starting time travel animation");
        showOverlay("Time Evolution: 2010 → 2025");

        const playButton = Array.from(
          document.querySelectorAll(".time-travel-button")
        ).find((button) => button.title && button.title.includes("Play/pause"));

        if (playButton) {
          await performAnimatedClick(playButton, "Start time travel animation");
          showOverlay("Watching Network Evolution Through Time");

          // Wait for animation to reach 2025
          const toSlider = document.getElementById("toSlider");
          if (toSlider) {
            const waitForTimeTravel = new Promise((resolve) => {
              const maxWaitTime = 15000;
              let startTime = Date.now();
              let lastReportedValue = parseInt(toSlider.value);

              const checkInterval = setInterval(() => {
                const currentValue = parseInt(toSlider.value);

                if (currentValue !== lastReportedValue) {
                  console.log(`Time travel progress: Year ${currentValue}`);
                  lastReportedValue = currentValue;
                }

                if (
                  currentValue >= 2025 ||
                  Date.now() - startTime > maxWaitTime
                ) {
                  clearInterval(checkInterval);
                  console.log(`Time travel finished at year: ${currentValue}`);
                  resolve();
                }
              }, 200);
            });

            await waitForTimeTravel;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 10000));
          }

          // Pause the animation
          try {
            if (
              playButton &&
              playButton.style.backgroundColor === "rgb(230, 100, 100)"
            ) {
              await performAnimatedClick(
                playButton,
                "Pause time travel animation"
              );
              showOverlay("Time Evolution Complete");
            }
          } catch (error) {
            console.log("Note: Could not pause animation", error);
          }
        }
      },
      4000
    );

    // Reset to show entire scene again
    sequencer.addAction(
      "time_travel_2",
      async () => {
        console.log("Action: Resetting view");

        // Reset year slider to 1982
        const fromSlider = document.getElementById("fromSlider");
        if (fromSlider) {
          fromSlider.value = 1982;
          fromSlider.dispatchEvent(new Event("input", { bubbles: true }));
          fromSlider.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // Move camera to original position
        await animateCamera(
          this.camera,
          this.controls,
          easeInOutCubic,
          { x: 12426, y: 6937, z: -8994 },
          { x: 550.88, y: 735.93, z: 156.5 },
          4000
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Click reset button
        const resetButton = document.getElementById("resetLegend");
        if (resetButton) {
          await performAnimatedClick(resetButton, "Reset view");
        }
      },
      2500
    );

    // Show search bar functionality
    sequencer.addAction(
      "search_1",
      async () => {
        console.log("Action: Demonstrating search functionality");
        showOverlay("Using Search Functionality");

        const searchBar = document.getElementById("search-input");
        if (searchBar) {
          await performAnimatedClick(searchBar, "Click search bar");
          searchBar.focus();
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Clear existing value and type search query
          searchBar.value = "";
          const searchQuery = "The rat forced swimming test mo";

          for (let i = 0; i < searchQuery.length; i++) {
            searchBar.value += searchQuery[i];
            searchBar.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise((resolve) =>
              setTimeout(resolve, 80 + Math.random() * 150)
            );
          }

          // Wait for search results
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Find and click a search result
          let maxAttempts = 5;
          let attempt = 0;
          let searchResult = null;

          while (!searchResult && attempt < maxAttempts) {
            searchResult = document.querySelector(".result-title");
            if (!searchResult) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              attempt++;
            }
          }

          if (searchResult) {
            showOverlay(
              'Found Research Paper: "Acute and chronic antidepressant..."'
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await performAnimatedClick(searchResult, "Click search result");
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      },
      3500
    );

    // Final camera movement
    sequencer.addAction(
      "search_2",
      async () => {
        console.log("Action: Final camera movement");
        showOverlay("Overview of Research Network");

        await animateCamera(
          this.camera,
          this.controls,
          easeInOutCubic,
          { x: -1866, y: 7287, z: -10918 },
          {
            x: -1238.9637451171875,
            y: 2362.824462890625,
            z: -3621.242919921875,
          },
          5000
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      1500
    );

    // Final deselection
    sequencer.addAction(
      "closing_1",
      async () => {
        await deselectNode(this.scene);
      },
      2000
    );

    // Define execution order (if different from addition order)
    sequencer.setExecutionOrder([
      "orbiting_network_1",
      "instructions_modal_1",
      "instructions_modal_2",
      "topic_hierarchy_1",
      "topic_hierarchy_2",
      "topic_hierarchy_3",
      "topic_hierarchy_4",
      "topic_hierarchy_5",
      "legend_safety_1",
      "legend_perinatal_exposure",
      "legend_select_perinatal_checkbox",
      "camera_focus_safety_1",
      "single_node_selection_1",
      "single_node_selection_2",
      "single_node_selection_3",
      "single_node_selection_4",
      "time_travel_1",
      "time_travel_2",
      "search_1",
      "search_2",
      "closing_1",
    ]);

    // Add long narration spanning multiple actions
    sequencer.addLongNarration(
      "intro_audio", // Narration ID
      "orbiting_network_1", // Start action
      "topic_hierarchy_5", // End action (wait for completion)
      { volume: 0.8 } // Optional parameters
    );

    // Add narrations for individual actions
    sequencer.addNarrationForAction("legend_safety_1", "safetyCluster_audio");
    // Add narrations for individual actions
    sequencer.addNarrationForAction("time_travel_1", "intro_audio");

    return sequencer;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////// DONE WITH DEMO SEQUENCE //////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////

  /**
   * Create a record button that will handle user gesture requirements
   * @param {number} duration - Recording duration in milliseconds
   * @param {number} fps - Frames per second for recording
   */
  createRecordButton(duration, fps) {
    // Only create button if UI elements are enabled
    if (!CONFIG.development.videoRecording.showAllUI) {
      console.log("UI elements are disabled - skipping record button creation");
      return null;
    }

    // Remove any existing button
    const existingButton = document.getElementById("start-recording-button");
    if (existingButton) existingButton.remove();

    // Create a new button
    const recordButton = document.createElement("button");
    recordButton.id = "start-recording-button";
    recordButton.textContent = "Start Recording";
    recordButton.style.position = "fixed";
    recordButton.style.bottom = "80px";
    recordButton.style.left = "20px";
    recordButton.style.padding = "12px 20px";
    recordButton.style.backgroundColor = "#ff3d5a";
    recordButton.style.color = "white";
    recordButton.style.border = "none";
    recordButton.style.borderRadius = "4px";
    recordButton.style.fontFamily = "Arial, sans-serif";
    recordButton.style.fontSize = "16px";
    recordButton.style.fontWeight = "bold";
    recordButton.style.cursor = "pointer";
    recordButton.style.zIndex = "10000";
    recordButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

    // Add hover effects
    recordButton.style.transition = "background-color 0.2s, transform 0.1s";
    recordButton.addEventListener("mouseover", () => {
      recordButton.style.backgroundColor = "#ff2040";
    });
    recordButton.addEventListener("mouseout", () => {
      recordButton.style.backgroundColor = "#ff3d5a";
    });
    recordButton.addEventListener("mousedown", () => {
      recordButton.style.transform = "scale(0.98)";
    });
    recordButton.addEventListener("mouseup", () => {
      recordButton.style.transform = "scale(1)";
    });

    // Add a recording icon
    const recordIcon = document.createElement("span");
    recordIcon.style.display = "inline-block";
    recordIcon.style.width = "12px";
    recordIcon.style.height = "12px";
    recordIcon.style.backgroundColor = "white";
    recordIcon.style.borderRadius = "50%";
    recordIcon.style.marginRight = "8px";

    recordButton.prepend(recordIcon);

    // Add the important click handler - this will satisfy the user gesture requirement
    recordButton.addEventListener("click", async () => {
      // This is now guaranteed to be a user gesture context
      console.log("Recording button clicked - this is a valid user gesture");

      // Remove the button first
      recordButton.remove();

      try {
        // Setup UI and recorder directly in the click handler
        const recorder = await setupRecorder(this.canvas, duration, fps);
        if (!recorder) {
          throw new Error("Failed to set up recorder");
        }

        // Store the recorder instance
        this.recorder = recorder;

        // Show recording UI and store the returned UI elements
        this.recordingUI = showRecordingIndicator(
          this.camera,
          this.controls,
          showOverlay
        );

        // Create demo sequence
        const sequencer = this.createDemoSequence();

        // Wait a bit before starting to avoid initial camera jumps
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Start recording
        this.isRecording = true;
        this.recorder.start();
        console.log("Recording started from user gesture...");

        // Wait a bit more for stability before starting the sequence
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Start the demo sequence
        await sequencer.start();

        // Wait for a bit before stopping
        if (this.recorder && this.recorder.state === "recording") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          this.recorder.stop();
        }
      } catch (error) {
        console.error("Error during recording from button click:", error);
        alert("Recording failed: " + error.message);

        // Clean up UI elements
        if (this.recordingUI) {
          this.recordingUI.cleanup();
          this.recordingUI = null;
        }
      }
    });

    // Add button to the document
    document.body.appendChild(recordButton);

    // Show a notification to user
    if (CONFIG.development.videoRecording.showAllUI) {
      showRecordingWarningMessage(
        'Please click the "Start Recording" button to begin.'
      );
    }

    return recordButton;
  }

  /**
   * Check if narration is ready and display helpful messages if not
   * This helps guide users through the process of generating audio files
   */
  checkNarrationReadiness() {
    // Check if any audio files exist in the expected directory
    const narrationSequences =
      CONFIG.development?.videoRecording?.narration?.sequences || {};
    const hasAnyNarrationConfig = Object.keys(narrationSequences).length > 0;

    if (!hasAnyNarrationConfig) {
      console.warn(
        "Narration is enabled but no sequences are configured in CONFIG.development.videoRecording.narration.sequences"
      );
      showRecordingWarningMessage(
        "Narration is enabled but not configured properly. Check the console for details."
      );
      return;
    }

    // Only display a guide message on first run when UI is enabled
    if (CONFIG.development.videoRecording.showAllUI) {
      console.log(
        "Narration is enabled. Audio for sequences will play if available."
      );
      console.log(
        "If you get audio loading errors, you may need to generate the audio files:"
      );
      console.log("1. cd src/video/sound");
      console.log("2. npm install");
      console.log("3. node generate-narration.js");

      // Check specifically for intro.mp3 since you have this file
      if (!audioNarration.hasNarration("intro")) {
        showRecordingWarningMessage(
          "You have narration enabled but some audio files may be missing. " +
            "See console for instructions to generate them, or disable narration in config.js"
        );
      }
    }
  }
}

/**
 * Class to sequence programmatic interactions
 */

class InteractionSequencer {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.actions = new Map(); // Map of actions by ID
    this.executionOrder = []; // Ordered list of action IDs to execute
    this.narrations = new Map(); // Map of narration configurations
    this.isPlaying = false;
    this.activeNarrationPromise = null;
  }

  /**
   * Add an action with a unique ID
   * @param {string} id - Unique identifier for this action
   * @param {Function} callback - Async function to execute
   * @param {number} duration - Duration in milliseconds
   * @returns {InteractionSequencer} - This instance for chaining
   */
  addAction(id, callback, duration) {
    if (this.actions.has(id)) {
      console.warn(`Action with ID "${id}" already exists. Overwriting.`);
    }

    this.actions.set(id, { callback, duration });

    // Add to execution order if not already present
    if (!this.executionOrder.includes(id)) {
      this.executionOrder.push(id);
    }

    return this;
  }

  /**
   * Set the order of action execution
   * @param {string[]} orderIds - Array of action IDs in execution order
   * @returns {InteractionSequencer} - This instance for chaining
   */
  setExecutionOrder(orderIds) {
    // Validate that all IDs exist
    const missingIds = orderIds.filter((id) => !this.actions.has(id));
    if (missingIds.length > 0) {
      console.error(
        `Cannot set execution order: Missing action IDs: ${missingIds.join(
          ", "
        )}`
      );
      return this;
    }

    this.executionOrder = [...orderIds];
    return this;
  }

  /**
   * Add a narration that plays during a single action
   * @param {string} actionId - ID of the action to narrate
   * @param {string} narrationId - ID of narration audio to play
   * @param {Object} options - Additional options
   * @returns {InteractionSequencer} - This instance for chaining
   */
  addNarrationForAction(actionId, narrationId, options = {}) {
    if (!this.actions.has(actionId)) {
      console.error(
        `Cannot add narration: Action "${actionId}" does not exist`
      );
      return this;
    }

    this.narrations.set(actionId, {
      type: "single",
      narrationId,
      waitForCompletion: options.waitForCompletion || false,
      ...options,
    });

    return this;
  }

  /**
   * Add a narration that spans multiple actions
   * @param {string} narrationId - ID of narration audio to play
   * @param {string} startActionId - ID of action to start narration
   * @param {string} endActionId - ID of action to end narration (wait for completion)
   * @param {Object} options - Additional options
   * @returns {InteractionSequencer} - This instance for chaining
   */
  addLongNarration(narrationId, startActionId, endActionId, options = {}) {
    if (!this.actions.has(startActionId)) {
      console.error(
        `Cannot add narration: Start action "${startActionId}" does not exist`
      );
      return this;
    }

    if (!this.actions.has(endActionId)) {
      console.error(
        `Cannot add narration: End action "${endActionId}" does not exist`
      );
      return this;
    }

    // Find indices in execution order
    const startIndex = this.executionOrder.indexOf(startActionId);
    const endIndex = this.executionOrder.indexOf(endActionId);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
      console.error(
        `Invalid start/end actions for long narration: ${startActionId} -> ${endActionId}`
      );
      return this;
    }

    // Mark start action to begin narration
    this.narrations.set(startActionId, {
      type: "start_long",
      narrationId,
      ...options,
    });

    // Mark end action to wait for narration
    this.narrations.set(endActionId, {
      type: "end_long",
      waitForCompletion: true,
      ...options,
    });

    return this;
  }

  /**
   * Start the sequence
   * @returns {Promise} - Resolves when sequence completes
   */
  async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      // Execute actions in the defined order
      for (let i = 0; i < this.executionOrder.length && this.isPlaying; i++) {
        const actionId = this.executionOrder[i];
        const action = this.actions.get(actionId);

        if (!action) {
          console.warn(`Action "${actionId}" not found, skipping.`);
          continue;
        }

        console.log(`Executing action: ${actionId}`);

        // Handle narration for this action
        let narrationPromise = Promise.resolve();
        const narrationConfig = this.narrations.get(actionId);

        if (
          narrationConfig &&
          CONFIG.development?.videoRecording?.narration?.enabled
        ) {
          if (
            narrationConfig.type === "single" ||
            narrationConfig.type === "start_long"
          ) {
            // Start new narration
            console.log(
              `Starting narration: ${narrationConfig.narrationId} for action: ${actionId}`
            );
            this.activeNarrationPromise = audioNarration.play(
              narrationConfig.narrationId
            );
            narrationPromise = this.activeNarrationPromise;
          }
        }

        // Execute the action
        await action.callback();

        // Wait for specified duration
        await new Promise((resolve) => setTimeout(resolve, action.duration));

        // Wait for narration to complete if needed
        const shouldWaitForNarration =
          narrationConfig &&
          (narrationConfig.waitForCompletion ||
            narrationConfig.type === "end_long");

        if (shouldWaitForNarration && this.activeNarrationPromise) {
          console.log(
            `Waiting for narration to complete at action: ${actionId}`
          );
          await this.activeNarrationPromise;
          this.activeNarrationPromise = null;
        }
      }
    } finally {
      // Clean up at the end
      if (CONFIG.development?.videoRecording?.narration?.enabled) {
        audioNarration.stop();
      }
      this.activeNarrationPromise = null;
      this.isPlaying = false;
    }
  }

  /**
   * Stop the sequence
   */
  stop() {
    this.isPlaying = false;

    // Stop any playing audio
    if (CONFIG.development?.videoRecording?.narration?.enabled) {
      audioNarration.stop();
    }
    this.activeNarrationPromise = null;
  }

  /**
   * Get a section of the sequence (subset of actions)
   * @param {string} startId - First action ID in section
   * @param {string} endId - Last action ID in section
   * @returns {string[]} - Array of action IDs in section
   */
  getSection(startId, endId) {
    const startIndex = this.executionOrder.indexOf(startId);
    const endIndex = this.executionOrder.indexOf(endId);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
      console.error(`Invalid section range: ${startId} -> ${endId}`);
      return [];
    }

    return this.executionOrder.slice(startIndex, endIndex + 1);
  }
}

export { VideoRecorder };
