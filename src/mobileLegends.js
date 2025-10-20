/**
 * Mobile Legends Module
 *
 * This module adds mobile-specific enhancements to the legends,
 * making them collapsible to save screen space on small devices.
 */

// Function to make legends collapsible on mobile
export function initializeMobileLegends() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    setupCollapsibleLegend("legendDiv", "Main Legend");
    setupCollapsibleLegend("colorLegendDiv", "Colors");
  }

  // Also handle resize events to add/remove collapsible behavior
  window.addEventListener("resize", handleResize);
}

// Set up a collapsible legend with a toggle button
function setupCollapsibleLegend(legendId, title) {
  const legendDiv = document.getElementById(legendId);
  if (!legendDiv) return;

  // Check if already has mobile wrapper
  if (legendDiv.querySelector(".legend-toggle-button")) return;

  // Create toggle button
  const toggleButton = document.createElement("button");
  toggleButton.className = "legend-toggle-button";
  toggleButton.innerHTML = `${title} ▼`;
  toggleButton.style.width = "100%";
  toggleButton.style.padding = "4px";
  toggleButton.style.marginBottom = "6px";
  toggleButton.style.backgroundColor = "rgba(225, 200, 116, 0.3)";
  toggleButton.style.border = "none";
  toggleButton.style.borderRadius = "4px";
  toggleButton.style.color = "#fff";
  toggleButton.style.cursor = "pointer";
  toggleButton.style.fontSize = "11px";
  toggleButton.style.textAlign = "center";

  // Wrap existing content in a container
  const contentContainer = document.createElement("div");
  contentContainer.className = "legend-content";

  // Move all existing children to the content container
  while (legendDiv.firstChild) {
    contentContainer.appendChild(legendDiv.firstChild);
  }

  // Add toggle button and content container to the legend div
  legendDiv.appendChild(toggleButton);
  legendDiv.appendChild(contentContainer);

  // Set initial state (collapsed on mobile)
  contentContainer.style.display = "none";
  toggleButton.innerHTML = `${title} ▶`;

  // Add toggle functionality
  toggleButton.addEventListener("click", () => {
    const isVisible = contentContainer.style.display !== "none";
    contentContainer.style.display = isVisible ? "none" : "block";
    toggleButton.innerHTML = `${title} ${isVisible ? "▶" : "▼"}`;
  });
}

// Handle window resize events
function handleResize() {
  const isMobile = window.innerWidth <= 768;
  const legendDiv = document.getElementById("legendDiv");
  const colorLegendDiv = document.getElementById("colorLegendDiv");

  // If we're now on mobile and legends don't have toggle buttons
  if (isMobile) {
    if (legendDiv && !legendDiv.querySelector(".legend-toggle-button")) {
      setupCollapsibleLegend("legendDiv", "Main Legend");
    }
    if (
      colorLegendDiv &&
      !colorLegendDiv.querySelector(".legend-toggle-button")
    ) {
      setupCollapsibleLegend("colorLegendDiv", "Colors");
    }
  }
  // If we're now on desktop but have toggle buttons
  else {
    if (legendDiv && legendDiv.querySelector(".legend-toggle-button")) {
      // Restore original content by removing mobile wrapper
      const contentContainer = legendDiv.querySelector(".legend-content");
      if (contentContainer) {
        // Move all content back to the main div
        while (contentContainer.firstChild) {
          legendDiv.appendChild(contentContainer.firstChild);
        }
        // Remove the mobile wrapper elements
        legendDiv.querySelector(".legend-toggle-button").remove();
        contentContainer.remove();
      }
    }
    if (
      colorLegendDiv &&
      colorLegendDiv.querySelector(".legend-toggle-button")
    ) {
      // Restore original content by removing mobile wrapper
      const contentContainer = colorLegendDiv.querySelector(".legend-content");
      if (contentContainer) {
        // Move all content back to the main div
        while (contentContainer.firstChild) {
          colorLegendDiv.appendChild(contentContainer.firstChild);
        }
        // Remove the mobile wrapper elements
        colorLegendDiv.querySelector(".legend-toggle-button").remove();
        contentContainer.remove();
      }
    }
  }
}
