// instructionsModal.js
export class InstructionsModal {
  constructor() {
    this.modal = null;
    this.closeButton = null;
    this.helpButton = null;
    this.loadingContent = null;
    this.instructionsContent = null;
    this.errorContent = null;
    this.loadingStatus = null;
    this.errorMessage = null;
    this.isLoading = false;
  }

  initialize() {
    console.log("Modal: Initializing...");
    this.modal = document.getElementById("instructionsModal");
    this.closeButton = document.getElementById("instructionsCloseBtn");
    this.helpButton = document.getElementById("helpButton");
    this.loadingContent = document.getElementById("loadingContent");
    this.instructionsContent = document.getElementById("instructionsContent");
    this.errorContent = document.getElementById("errorContent");
    this.loadingStatus = document.getElementById("loadingStatus");
    this.errorMessage = document.getElementById("errorMessage");

    if (!this.modal || !this.closeButton) {
      console.error("Modal: Required elements not found!");
      return false;
    }

    // Add click event listeners
    this.closeButton.addEventListener("click", () => this.hide());
    if (this.helpButton) {
      this.helpButton.addEventListener("click", () => this.show());
    }

    // Show instructions on initialization
    this.show();

    console.log("Modal: Initialized successfully");
    return true;
  }

  /**
   * Show a specific section of the modal
   */
  showSection(sectionId) {
    // Hide all sections
    this.loadingContent?.classList.remove("active");
    this.instructionsContent?.classList.remove("active");
    this.errorContent?.classList.remove("active");

    // Show the requested section
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add("active");
    }
  }

  show() {
    if (this.modal) {
      this.modal.style.display = "block";
      this.showSection("instructionsContent");
      this.closeButton.style.display = "block";

      // Make sure the instructions content is visible
      if (this.instructionsContent) {
        this.instructionsContent.style.display = "block";
        this.instructionsContent.classList.add("active");
      }

      // Hide other sections
      if (this.loadingContent) {
        this.loadingContent.style.display = "none";
        this.loadingContent.classList.remove("active");
      }
      if (this.errorContent) {
        this.errorContent.style.display = "none";
        this.errorContent.classList.remove("active");
      }
    }
  }

  showLoading(message = "Loading visualization data...") {
    if (this.modal && this.loadingStatus) {
      this.modal.style.display = "block";
      this.loadingStatus.textContent = message;
      this.showSection("loadingContent");
      this.closeButton.style.display = "none";
      this.isLoading = true;
    }
  }

  showError(message) {
    if (this.modal && this.errorMessage) {
      this.modal.style.display = "block";
      this.errorMessage.textContent = message;
      this.showSection("errorContent");
      this.closeButton.style.display = "block";
    }
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = "none";
    }
  }

  setLoaded() {
    this.isLoading = false;
    this.hide();
  }
}

export const instructionsModal = new InstructionsModal();
