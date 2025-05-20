import { CONFIG } from "./config.js";

export const screenshotController = {
  renderer: null,
  scene: null,
  camera: null,
  canvas: null,
  button: null,

  initialize(renderer, scene, camera, canvas) {
    if (!CONFIG.screenshot.enabled) {
      return;
    }

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;

    // Only create the button if configured to do so
    if (CONFIG.screenshot.showButton) {
      this.createScreenshotButton();
    }
  },

  createScreenshotButton() {
    // Create screenshot button
    this.button = document.createElement("button");
    this.button.id = "screenshotButton";
    this.button.className = "screenshot-button";
    this.button.innerHTML = "📷";
    this.button.title = "Take Screenshot";
    document.body.appendChild(this.button);

    // Add click event listener
    this.button.addEventListener("click", () => this.takeScreenshot());
  },

  takeScreenshot() {
    if (!this.renderer || !this.scene || !this.camera) {
      console.error("Screenshot functionality not properly initialized");
      return;
    }

    // Make a copy of the current renderer size
    const currentSize = {
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
    };

    // Render at full resolution (considering device pixel ratio)
    this.renderer.setSize(
      this.canvas.clientWidth * window.devicePixelRatio,
      this.canvas.clientHeight * window.devicePixelRatio,
      false
    );

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Convert the render to an image
    let imgData;
    try {
      // Determine image format and quality
      const format =
        CONFIG.screenshot.format.toLowerCase() === "jpeg"
          ? "image/jpeg"
          : "image/png";
      const quality =
        format === "image/jpeg" ? CONFIG.screenshot.quality : undefined;

      // Get the image data
      imgData = this.renderer.domElement.toDataURL(format, quality);

      // Create download link
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `${CONFIG.screenshot.filename}-${timestamp}.${
        format === "image/jpeg" ? "jpg" : "png"
      }`;
      link.href = imgData;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Screenshot saved successfully");
    } catch (error) {
      console.error("Error taking screenshot:", error);
    }

    // Restore original renderer size
    this.renderer.setSize(currentSize.width, currentSize.height, false);
    this.renderer.render(this.scene, this.camera);
  },
};
