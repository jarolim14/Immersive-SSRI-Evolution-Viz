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
    sequencer.actions = [];

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

    // 1. Start with ensuring instructions modal is closed
    sequencer.addAction(
      async () => {
        console.log("Action: Ensuring clean starting state");

        // First make sure all modals are closed
        const modals = document.querySelectorAll(
          ".modal, #instructionsModal, #topicTreeModal"
        );
        for (const modal of modals) {
          if (
            modal &&
            (modal.style.display === "block" || modal.style.display === "flex")
          ) {
            console.log(`Closing modal: ${modal.id || "unnamed modal"}`);

            // Try to find and click the close button
            const closeBtn = modal.querySelector(
              '.close-btn, .close, [id$="CloseBtn"]'
            );
            if (closeBtn) {
              await performAnimatedClick(
                closeBtn,
                `Close ${modal.id || "modal"}`
              );
            } else {
              // Manually hide if button not found
              modal.style.display = "none";
              if (modal.classList.contains("show")) {
                modal.classList.remove("show");
              }
            }

            // Brief pause to let animation complete
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }

        // Ensure we start with a clean view
        this.controls.reset();

        // Brief pause before starting the sequence
        await new Promise((resolve) => setTimeout(resolve, 300));
      },
      300,
      "intro"
    );

    // NEW: Initial camera movement - slow zoom out for overview
    sequencer.addAction(
      async () => {
        console.log("Action: Initial camera movement - overview zoom out");
        showOverlay("Immersive Network of SSRI Papers");

        // Get current camera position and target
        const currentPosition = {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z,
        };
        const currentTarget = this.controls.target.clone();

        // Zoom out to show the full network

        await animateCamera(
          this.camera, // Pass your camera object
          this.controls, // Pass your controls object
          easeInOutCubic, // Use the imported easing function
          {
            x: currentPosition.x * 1.5,
            y: currentPosition.y * 1.5,
            z: currentPosition.z * 1.5,
          },
          {
            x: currentTarget.x,
            y: currentTarget.y,
            z: currentTarget.z,
          },
          4000 // Slower movement for dramatic effect
        );
      },
      1000,
      "intro"
    );

    // 2. Open the instructions modal
    sequencer.addAction(async () => {
      console.log("Action: Opening instructions modal");
      showOverlay("Opening Instructions");

      // Find and open the instructions modal
      const helpButton = document.getElementById("helpButton");
      await performAnimatedClick(helpButton, "Open instructions");

      // Wait for modal to animate in
      await new Promise((resolve) => setTimeout(resolve, 400));
    }, 600);

    // NEW: Camera movement - circular orbit around the network scene
    sequencer.addAction(
      async () => {
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
      1500,
      "orbitalView"
    );

    // Add interaction to click the Safety cluster fold indicator
    sequencer.addAction(
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
      1000,
      "safetyCluster"
    );

    // Add interaction to click the Perinatal Exposure fold indicator
    sequencer.addAction(
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
      1000,
      "perinatalExposure"
    );

    // 3. Start with showing the beginning of instructions
    sequencer.addAction(async () => {
      console.log("Action: Reset scroll position to top");
      showOverlay("Reading Instructions");

      const instructionsContainer = document.querySelector(
        ".instructions-container"
      );
      if (instructionsContainer) {
        // Make sure we start at the top of the instructions
        instructionsContainer.scrollTop = 0;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }, 400);

    // 4. Scroll down in the instructions modal to show all content
    sequencer.addAction(async () => {
      console.log("Action: Scrolling in instructions modal");

      const instructionsContainer = document.querySelector(
        ".instructions-container"
      );
      if (instructionsContainer) {
        // Scroll to the bottom of the instructions more slowly
        const scrollHeight = instructionsContainer.scrollHeight;
        const duration = 4000; // 4 seconds for slower, more natural scrolling
        const startTime = performance.now();

        return new Promise((resolve) => {
          const scrollStep = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use custom easing for more natural scroll
            const eased = naturalEasing(progress);
            const scrollPosition = scrollHeight * eased;

            instructionsContainer.scrollTop = scrollPosition;

            if (progress < 1) {
              requestAnimationFrame(scrollStep);
            } else {
              resolve();
            }
          };

          requestAnimationFrame(scrollStep);
        });
      }
    }, 1000);

    // 5. Click on the "View Topic Hierarchy" button
    sequencer.addAction(async () => {
      console.log("Action: Clicking View Topic Hierarchy button");
      showOverlay("Opening Topic Hierarchy");

      const viewHierarchyBtn = document.getElementById("viewTopicHierarchyBtn");
      await performAnimatedClick(viewHierarchyBtn, "Open topic hierarchy");

      // Wait for the topic tree modal to open
      await new Promise((resolve) => setTimeout(resolve, 400));
    }, 800);

    // 6. Change dropdown from "Overview" to "Safety"
    sequencer.addAction(async () => {
      console.log("Action: Changing topic selection from Overview to Safety");
      showOverlay("Selecting Safety Topic");

      const datasetSelect = document.getElementById("datasetSelect");
      if (datasetSelect) {
        // Add visual effect to the dropdown
        addClickEffect(datasetSelect);

        // Brief pause before showing the dropdown
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Create a custom visual representation of the dropdown
        await createVisualDropdown(datasetSelect, "safety");

        // After visual representation, actually change the value
        datasetSelect.value = "safety";

        // Trigger change event to update the visualization
        const changeEvent = new Event("change", { bubbles: true });
        datasetSelect.dispatchEvent(changeEvent);

        // Wait for the visualization to update
        await new Promise((resolve) => setTimeout(resolve, 800));
      } else {
        console.error("Dataset select dropdown not found");
      }
    }, 800);

    // New action: Scroll in the topic hierarchy visualization
    sequencer.addAction(async () => {
      console.log("Action: Scrolling in topic hierarchy visualization");
      showOverlay("Exploring Safety Cluster");

      const topicTreeSvg = document.getElementById("topicTreeSvg");
      if (topicTreeSvg) {
        // Find the container that might be scrollable
        let scrollableContainer = topicTreeSvg.parentElement;

        // Try to find a scrollable container
        while (
          scrollableContainer &&
          scrollableContainer.scrollHeight <=
            scrollableContainer.clientHeight &&
          scrollableContainer !== document.body
        ) {
          scrollableContainer = scrollableContainer.parentElement;
        }

        if (
          scrollableContainer &&
          scrollableContainer.scrollHeight > scrollableContainer.clientHeight
        ) {
          console.log("Found scrollable container for topic hierarchy");

          // Scroll down gradually to show all content - slower now
          const scrollHeight = scrollableContainer.scrollHeight;
          const duration = 3500; // 3.5 seconds for a more gradual scroll
          const startTime = performance.now();

          return new Promise((resolve) => {
            const scrollStep = (timestamp) => {
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // Use natural easing for smooth scroll
              const eased = naturalEasing(progress);
              const scrollPosition = scrollHeight * eased;

              scrollableContainer.scrollTop = scrollPosition;

              if (progress < 1) {
                requestAnimationFrame(scrollStep);
              } else {
                resolve();
              }
            };

            requestAnimationFrame(scrollStep);
          });
        } else {
          console.log(
            "No scrollable container found for topic hierarchy or no scroll needed"
          );
        }
      } else {
        console.error("Topic tree SVG not found");
      }
    }, 600);

    // 7. Press close button to exit the topic hierarchy modal
    sequencer.addAction(async () => {
      console.log("Action: Closing topic hierarchy modal");
      showOverlay("Fold the Legend");

      const closeBtn = document.getElementById("topicTreeCloseBtn");
      await performAnimatedClick(closeBtn, "Close topic hierarchy");

      // Wait for the modal to close
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, 1000);

    // Add interaction to click the Perinatal Exposure checkbox
    sequencer.addAction(async () => {
      console.log("Action: Selecting Perinatal Exposure subcluster");
      showOverlay("Selecting Perinatal Exposure Studies");

      // Find the Perinatal Exposure checkbox
      const perinatalCheckbox = document.getElementById(
        "Safety-Perinatal Exposure"
      );
      if (perinatalCheckbox) {
        // Click the checkbox with animation
        await performAnimatedClick(
          perinatalCheckbox,
          "Select Perinatal Exposure checkbox"
        );

        // Brief pause after selection
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } else {
        console.error("Perinatal Exposure checkbox not found");
      }
    }, 1000);

    // Add interaction to click the Update Selection button
    sequencer.addAction(async () => {
      console.log("Action: Updating visibility based on selection");
      showOverlay("Updating Network Visibility");

      const updateButton = document.getElementById("updateVisibility");
      if (updateButton) {
        await performAnimatedClick(
          updateButton,
          "Click Update Selection button"
        );

        // Wait longer for the visibility update to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error("Update Selection button not found");
      }

      // Final overlay after filtering is complete
      showOverlay("Perinatal Exposure Research Network");

      // Longer pause to appreciate the filtered view
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }, 1500);

    // Move camera to focus on specific node area
    sequencer.addAction(async () => {
      console.log("Action: Moving camera to focus on specific node area");
      showOverlay("Focusing on Key Research Node");

      // Move camera to the specified position and target
      await animateCamera(
        this.camera, // Pass your camera object
        this.controls, // Pass your controls object
        easeInOutCubic, // Use the imported easing function
        { x: 3853.83, y: 4340.58, z: -4342.09 },
        { x: 550.88, y: 735.93, z: 156.5 },
        3000 // Smooth transition
      );

      // Brief pause to stabilize view
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }, 1000);

    // Select specific node (prenatal exposure)
    sequencer.addAction(async () => {
      console.log("Action: Selecting specific node");
      showOverlay("Highlighting Key Research Paper");

      try {
        // Get required scene objects
        const scene = this.scene;
        const camera = this.camera;
        const points = scene.getObjectByName("points");

        if (!points) {
          console.error("Points object not found in scene");
          return;
        }

        // Use the imported nodesMap (instead of this.nodesMap)
        // First, verify we have access to it
        if (!nodesMap) {
          console.error("nodesMap not available from nodesLoader.js");
          return;
        }

        // Get target node ID and verify it exists
        const targetNodeId = 8214;
        const targetNode = nodesMap.get(targetNodeId);

        if (!targetNode) {
          console.error(`Node with ID ${targetNodeId} not found in nodesMap`);
          return;
        }

        // Log node info for verification
        console.log(`Found node ${targetNodeId}:`, targetNode);

        // Find the index of the node in the nodeIds array
        const nodeIds = Array.from(nodesMap.keys());
        const targetNodeIndex = nodeIds.indexOf(targetNodeId);

        if (targetNodeIndex === -1) {
          console.error(`Node ID ${targetNodeId} not found in nodesMap keys`);
          return;
        }

        console.log(
          `Node ID ${targetNodeId} found at index ${targetNodeIndex}`
        );

        // Create a fake intersection object to pass to updateNodeInfo
        const fakeIntersection = {
          index: targetNodeIndex,
          object: points,
        };

        // Use the updateNodeInfo function to select and highlight the node
        updateNodeInfo(fakeIntersection, nodesMap, points, scene);

        console.log(
          `Successfully selected node ID: ${targetNodeId} at index: ${targetNodeIndex}`
        );

        // Longer pause to appreciate the selected node
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error("Error selecting node:", error);
      }
    }, 1500);

    // move camera

    // move camera to prenatel exposure RODENTS
    sequencer.addAction(async () => {
      console.log("Action: Moving camera to prenatel exposure RODENTS");
      showOverlay("Moving camera to prenatel exposure RODENTS");

      await animateCamera(
        this.camera, // Pass your camera object
        this.controls, // Pass your controls object
        easeInOutCubic, // Use the imported easing function
        { x: 5958.632362729798, y: 3988.7886125553723, z: -5293.824484343763 },
        // camera target as before
        { x: 550.88, y: 735.93, z: 156.5 },
        3000 // Smooth transition
      );

      // Brief pause to stabilize view
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }, 500);

    // Select specific node (prenatal exposure RODENTS)
    sequencer.addAction(async () => {
      console.log("Action: Selecting specific node");
      showOverlay("Highlighting Key Research Paper");

      try {
        // Get required scene objects
        const scene = this.scene;
        const camera = this.camera;
        const points = scene.getObjectByName("points");

        if (!points) {
          console.error("Points object not found in scene");
          return;
        }

        // Use the imported nodesMap (instead of this.nodesMap)
        // First, verify we have access to it
        if (!nodesMap) {
          console.error("nodesMap not available from nodesLoader.js");
          return;
        }

        // Get target node ID and verify it exists
        const targetNodeId = 31059;
        const targetNode = nodesMap.get(targetNodeId);

        if (!targetNode) {
          console.error(`Node with ID ${targetNodeId} not found in nodesMap`);
          return;
        }

        // Log node info for verification
        console.log(`Found node ${targetNodeId}:`, targetNode);

        // Find the index of the node in the nodeIds array
        const nodeIds = Array.from(nodesMap.keys());
        const targetNodeIndex = nodeIds.indexOf(targetNodeId);

        if (targetNodeIndex === -1) {
          console.error(`Node ID ${targetNodeId} not found in nodesMap keys`);
          return;
        }

        console.log(
          `Node ID ${targetNodeId} found at index ${targetNodeIndex}`
        );

        // Create a fake intersection object to pass to updateNodeInfo
        const fakeIntersection = {
          index: targetNodeIndex,
          object: points,
        };

        // Use the updateNodeInfo function to select and highlight the node
        updateNodeInfo(fakeIntersection, nodesMap, points, scene);

        console.log(
          `Successfully selected node ID: ${targetNodeId} at index: ${targetNodeIndex}`
        );

        // Longer pause to appreciate the selected node
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error("Error selecting node:", error);
      }
    }, 1500);

    // click elsewhere to deselect the node
    sequencer.addAction(async () => {
      console.log("Action: Clicking elsewhere to deselect the node");
      showOverlay("Deselecting Node");

      // Try to find the main canvas
      const canvas = document.querySelector("canvas");

      if (canvas) {
        const rect = canvas.getBoundingClientRect();

        // Click in a corner where there's likely no node
        const clientX = rect.left + 5;
        const clientY = rect.top + 5;

        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY,
        });

        canvas.dispatchEvent(clickEvent);
        console.log(`Simulated canvas click at (${clientX}, ${clientY})`);
      } else {
        console.warn("Canvas not found, falling back to manual deselection");
      }

      // Fallback: try calling deselection function directly
      try {
        const { nodesMap } = await import("../nodesLoader.js");

        // First approach: Use the updateNodeInfo function with null parameters
        // This is the proper way to deselect based on the singleNodeSelection.js implementation
        if (typeof updateNodeInfo === "function") {
          updateNodeInfo(null, nodesMap, null, this.scene);
          console.log("Deselected node through updateNodeInfo() API");
        }

        // Second approach: Directly hide the visual selection
        if (typeof hideVisualSelection === "function") {
          hideVisualSelection();
          console.log(
            "Called hideVisualSelection() to remove visual indicators"
          );
        }

        // Third approach: Reset node selection styling
        const nodeInfoDiv = document.getElementById("nodeInfoDiv");
        if (nodeInfoDiv) {
          nodeInfoDiv.style.display = "none";
          console.log("Hid node info panel");
        }
        document.body.classList.remove("node-selected");

        // Fourth approach: Try to reset any selection state in scene objects
        if (this.scene) {
          const points = this.scene.getObjectByName("points");
          if (
            points &&
            points.geometry.attributes.singleNodeSelectionBrightness
          ) {
            points.geometry.attributes.singleNodeSelectionBrightness.array.fill(
              0.0
            );
            points.geometry.attributes.singleNodeSelectionBrightness.needsUpdate = true;
            console.log("Reset all node brightness values in the scene");
          }
        }
      } catch (error) {
        console.warn("Could not complete node deselection:", error);
      }

      // Give more time for the deselection to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Action: Deselecting node done");
    }, 2000);

    // Move the year slider to 2010 and control time travel animation in a single sequence
    sequencer.addAction(async () => {
      console.log(
        "Action: Starting year range adjustment and time travel sequence"
      );
      showOverlay("Filtering by Year: 2010+");

      // ---- PART 1: Adjust the year slider ----
      // Find the year slider
      const fromSlider = document.getElementById("fromSlider");
      if (!fromSlider) {
        console.error("Year slider (fromSlider) not found");
        return;
      }

      // First, highlight the slider
      addClickEffect(fromSlider);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Set the value to 2010
      const originalValue = fromSlider.value;
      fromSlider.value = 2010;
      console.log(`Changed year slider from ${originalValue} to 2010`);

      // Trigger input and change events to ensure the UI updates
      const inputEvent = new Event("input", { bubbles: true });
      const changeEvent = new Event("change", { bubbles: true });
      fromSlider.dispatchEvent(inputEvent);
      fromSlider.dispatchEvent(changeEvent);

      // Allow time for the visualization to update after slider change
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // ---- PART 2: Start time travel animation ----
      console.log("Starting time travel animation");
      showOverlay("Time Evolution: 2010 → 2025");

      // Find the play button
      const playButton = Array.from(
        document.querySelectorAll(".time-travel-button")
      ).find((button) => button.title && button.title.includes("Play/pause"));

      if (!playButton) {
        console.error("Time travel play button not found");
        return;
      }

      // Click the play button with animation
      await performAnimatedClick(playButton, "Start time travel animation");

      // Show duration of time travel
      showOverlay("Watching Network Evolution Through Time");

      // ---- PART 3: Wait for animation to reach 2025 ----
      // Find the toSlider to monitor its value
      const toSlider = document.getElementById("toSlider");

      if (toSlider) {
        console.log(`Initial toSlider value: ${toSlider.value}`);

        // Create a promise that resolves when the slider reaches 2025 or after a timeout
        const waitForTimeTravel = new Promise((resolve) => {
          // Maximum wait time (15 seconds as failsafe to ensure we don't get stuck)
          const maxWaitTime = 15000;
          let startTime = Date.now();
          let lastReportedValue = parseInt(toSlider.value);

          console.log("Starting to monitor year slider progress...");

          // Check the slider value periodically
          const checkInterval = setInterval(() => {
            const currentValue = parseInt(toSlider.value);

            // Report progress if the value has changed
            if (currentValue !== lastReportedValue) {
              console.log(`Time travel progress: Year ${currentValue}`);
              lastReportedValue = currentValue;
            }

            // Check if we've reached the target year or exceeded max wait time
            if (currentValue >= 2025 || Date.now() - startTime > maxWaitTime) {
              clearInterval(checkInterval);
              console.log(`Time travel finished at year: ${currentValue}`);
              resolve();
            }
          }, 200); // Check every 200ms
        });

        // Wait for the time travel to complete
        await waitForTimeTravel;
      } else {
        // Fallback if we can't find the slider - just wait a reasonable amount of time
        console.warn("Could not find toSlider, using fixed wait time");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // ---- PART 4: Pause the animation ----
      try {
        // Check if the button now shows as playing (might have different styling)
        if (
          playButton &&
          playButton.style.backgroundColor === "rgb(230, 100, 100)"
        ) {
          await performAnimatedClick(playButton, "Pause time travel animation");
          showOverlay("Time Evolution Complete");
        }
      } catch (error) {
        console.log("Note: Could not pause animation", error);
      }

      console.log("Year range adjustment and time travel sequence completed");
    }, 4000);

    // Click the Reset button to show entire scene again
    sequencer.addAction(async () => {
      console.log("Action: Clicking Reset button to show entire scene again");

      // move the from slider back to 1982
      const fromSlider = document.getElementById("fromSlider");
      if (!fromSlider) {
        console.error("Year slider (fromSlider) not found");
        return;
      }
      fromSlider.value = 1982;
      const inputEvent = new Event("input", { bubbles: true });
      const changeEvent = new Event("change", { bubbles: true });
      fromSlider.dispatchEvent(inputEvent);
      fromSlider.dispatchEvent(changeEvent);

      // Allow time for the visualization to update after slider change
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Allow time for the scene to reset
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // move camera to original position Position: (12426, 6937, -8994) Target: (539, 599, -4955)
      await animateCamera(
        this.camera, // Pass your camera object
        this.controls, // Pass your controls object
        easeInOutCubic, // Use the imported easing function
        { x: 12426, y: 6937, z: -8994 },
        { x: 550.88, y: 735.93, z: 156.5 },
        4000 // Smooth transition
      );

      // allow time for the scene to reset
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find the reset button
      const resetButton = document.getElementById("resetLegend");
      if (!resetButton) {
        console.error("Reset button not found");
        return;
      }

      // Click the reset button with animation
      await performAnimatedClick(
        resetButton,
        "Resetting view to show entire scene"
      );

      console.log("Action: Resetting view to show entire scene done");
    }, 2500);

    // Show search bar functionality
    sequencer.addAction(async () => {
      console.log("Action: Click in the search bar");

      // Find the search bar
      const searchBar = document.getElementById("search-input");
      if (!searchBar) {
        console.error("Search bar not found");
        return;
      }

      // Click the search bar with animation
      await performAnimatedClick(searchBar, "Clicking in the search bar");

      // Focus the search bar
      searchBar.focus();

      // Allow a moment before typing to simulate user behavior
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Clear any existing value
      searchBar.value = "";

      // Type in the search bar with a realistic typing effect
      const searchQuery = "The rat forced swimming test mo";
      for (let i = 0; i < searchQuery.length; i++) {
        // Add one character at a time
        searchBar.value += searchQuery[i];

        // Trigger input event to update search results as we type
        searchBar.dispatchEvent(new Event("input", { bubbles: true }));

        // Random delay between keypresses (30-120ms) to simulate human typing
        await new Promise((resolve) =>
          setTimeout(resolve, 80 + Math.random() * 150)
        );
      }

      // Wait for search results to appear
      console.log("Waiting for search results to appear...");

      // More generous wait time for search results to populate
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if results container exists and has results
      const resultsContainer = document.querySelector(".search-results");
      if (resultsContainer) {
        console.log(
          `Search results container found, contains ${resultsContainer.children.length} results`
        );
      } else {
        console.warn("Search results container not found");
      }

      // Try to find the specific search result
      let maxAttempts = 5;
      let searchResult = null;

      // Poll for the result to appear, with multiple attempts
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        searchResult = document.querySelector(".result-title");

        if (searchResult) {
          console.log("Search result found on attempt", attempt + 1);
          break;
        } else {
          console.log(
            `Search result not found yet, attempt ${attempt + 1}/${maxAttempts}`
          );
          // Wait before trying again
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // If we found the result, click it
      if (searchResult) {
        // Highlight the result first
        showOverlay(
          'Found Research Paper: "Acute and chronic antidepressant..."'
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Click the result
        await performAnimatedClick(searchResult, "Clicking on search result");

        // Allow time for the camera to move to the selected node
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        console.error("Search result not found after multiple attempts");
      }

      console.log("Action: Moving to selected paper and finishing animation");
    }, 3500);

    // Click the Reset button to show entire scene again
    sequencer.addAction(async () => {
      // move camera very slowly further away Camera position
      await animateCamera(
        this.camera, // Pass your camera object
        this.controls, // Pass your controls object
        easeInOutCubic, // Use the imported easing function
        { x: -1866, y: 7287, z: -10918 },
        {
          x: -1238.9637451171875,
          y: 2362.824462890625,
          z: -3621.242919921875,
        },
        5000 // Smooth transition
      );

      // allow time for the scene to reset
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Action: Resetting view to show entire scene done");
    }, 1500);

    // click elsewhere to deselect the node
    // click elsewhere to deselect the node
    sequencer.addAction(async () => {
      console.log("Action: Clicking elsewhere to deselect the node");
      showOverlay("Deselecting Node");

      // Try to find the main canvas
      const canvas = document.querySelector("canvas");

      if (canvas) {
        const rect = canvas.getBoundingClientRect();

        // Click in a corner where there's likely no node
        const clientX = rect.left + 5;
        const clientY = rect.top + 5;

        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY,
        });

        canvas.dispatchEvent(clickEvent);
        console.log(`Simulated canvas click at (${clientX}, ${clientY})`);
      } else {
        console.warn("Canvas not found, falling back to manual deselection");
      }

      // Fallback: try calling deselection function directly
      try {
        // First approach: Use the updateNodeInfo function with null parameters
        // This is the proper way to deselect based on the singleNodeSelection.js implementation
        if (typeof updateNodeInfo === "function") {
          updateNodeInfo(null, nodesMap, null, this.scene);
          console.log("Deselected node through updateNodeInfo() API");
        }

        // Second approach: Directly hide the visual selection
        if (typeof hideVisualSelection === "function") {
          hideVisualSelection();
          console.log(
            "Called hideVisualSelection() to remove visual indicators"
          );
        }

        // Third approach: Reset node selection styling
        const nodeInfoDiv = document.getElementById("nodeInfoDiv");
        if (nodeInfoDiv) {
          nodeInfoDiv.style.display = "none";
          console.log("Hid node info panel");
        }
        document.body.classList.remove("node-selected");

        // Fourth approach: Try to reset any selection state in scene objects
        if (this.scene) {
          const points = this.scene.getObjectByName("points");
          if (
            points &&
            points.geometry.attributes.singleNodeSelectionBrightness
          ) {
            points.geometry.attributes.singleNodeSelectionBrightness.array.fill(
              0.0
            );
            points.geometry.attributes.singleNodeSelectionBrightness.needsUpdate = true;
            console.log("Reset all node brightness values in the scene");
          }
        }
      } catch (error) {
        console.warn("Could not complete node deselection:", error);
      }

      // Give more time for the deselection to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Action: Deselecting node done");
    }, 2000);

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
    this.actions = [];
    this.currentStep = 0;
    this.isPlaying = false;
  }

  /**
   * Add an action to the sequence
   * @param {Function} callback - Async function to execute
   * @param {number} duration - Duration in milliseconds
   * @param {string} [narrationId] - Optional ID of narration to play during this action
   * @returns {InteractionSequencer} - This instance for chaining
   */
  addAction(callback, duration, narrationId) {
    this.actions.push({ callback, duration, narrationId });
    return this;
  }

  /**
   * Start the sequence
   * @returns {Promise} - Resolves when sequence completes
   */
  async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;

    // Execute all actions in sequence
    for (let i = 0; i < this.actions.length && this.isPlaying; i++) {
      this.currentStep = i;
      const { callback, duration, narrationId } = this.actions[i];

      // Execute the action
      let narrationPromise = Promise.resolve();

      // Play narration if specified and enabled
      if (
        narrationId &&
        CONFIG.development?.videoRecording?.narration?.enabled
      ) {
        console.log(`Playing narration for step ${i}: ${narrationId}`);
        // Start narration but don't wait for it to complete (non-blocking)
        narrationPromise = audioNarration.play(narrationId);
      }

      // Execute the action callback
      await callback();

      // Wait for specified duration
      await new Promise((resolve) => setTimeout(resolve, duration));

      // Optionally wait for narration to complete if it's still playing
      if (CONFIG.development?.videoRecording?.narration?.waitForNarration) {
        await narrationPromise;
      }
    }

    // Ensure any playing audio is stopped when sequence completes
    if (CONFIG.development?.videoRecording?.narration?.enabled) {
      audioNarration.stop();
    }

    this.isPlaying = false;
  }

  /**
   * Stop the sequence
   */
  stop() {
    this.isPlaying = false;

    // Stop any playing audio when sequence is manually stopped
    if (CONFIG.development?.videoRecording?.narration?.enabled) {
      audioNarration.stop();
    }
  }
}

export { VideoRecorder };
