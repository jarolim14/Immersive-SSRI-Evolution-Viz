// creditsModal.js
export class CreditsModal {
  constructor() {
    this.modal = null;
    this.closeButton = null;
    this.creditsButton = null;
  }

  initialize() {
    console.log("CreditsModal: Initializing...");
    this.modal = document.getElementById("creditsModal");
    this.closeButton = document.getElementById("creditsCloseBtn");
    this.creditsButton = document.getElementById("creditsButton");

    if (!this.modal || !this.closeButton || !this.creditsButton) {
      console.error("CreditsModal: Required elements not found!");
      return false;
    }

    // Add click event listeners
    this.closeButton.addEventListener("click", () => this.hide());
    this.creditsButton.addEventListener("click", () => this.show());

    console.log("CreditsModal: Initialized successfully");
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
}

// Create and export an instance of the CreditsModal class
export const creditsModal = new CreditsModal(); 