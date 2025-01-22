// loadingModal.js
export class LoadingModal {
  constructor() {
    this.modal = null;
    this.closeButton = null;
    this.isLoaded = false;
  }

  initialize() {
    console.log("LoadingModal: Initializing...");
    this.modal = document.getElementById("loadingModal");
    this.closeButton = document.getElementById("closeModalBtn");

    if (!this.modal || !this.closeButton) {
      console.error("LoadingModal: Required elements not found!");
      return false;
    }

    // Initially hide the close button
    this.closeButton.style.display = "none";

    // Add click event listener to close button
    this.closeButton.addEventListener("click", () => this.hide());

    console.log("LoadingModal: Initialized successfully");
    return true;
  }

  show() {
    if (this.modal) {
      this.modal.style.display = "block";
    }
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = "none";
    }
  }

  setLoaded() {
    console.log("LoadingModal: Loading complete");
    this.isLoaded = true;
    if (this.closeButton) {
      this.closeButton.style.display = "block";
    }
  }
}

export const loadingModal = new LoadingModal();
