/**
 * Creates a simple visual click effect on an element
 * @param {HTMLElement} element - The element to add the click effect to
 */
export function addClickEffect(element) {
  if (!element) return;

  // Simple flash highlight effect that fits the design better
  const originalBg = element.style.backgroundColor;
  const originalBoxShadow = element.style.boxShadow;

  // Add a more visible highlight effect
  element.style.boxShadow = "0 0 12px 4px rgba(255, 61, 90, 0.8)";

  // Create a more visible click indicator
  const highlight = document.createElement("div");
  highlight.style.position = "fixed";

  // Position at the center of the element
  const rect = element.getBoundingClientRect();
  highlight.style.top = rect.top + rect.height / 2 + "px";
  highlight.style.left = rect.left + rect.width / 2 + "px";

  // Style
  highlight.style.width = "32px"; // Larger size
  highlight.style.height = "32px";
  highlight.style.borderRadius = "50%";
  highlight.style.backgroundColor = "rgba(255, 61, 90, 0.2)";
  highlight.style.border = "3px solid rgba(255, 61, 90, 0.8)";
  highlight.style.zIndex = "10000";
  highlight.style.transform = "translate(-50%, -50%)";
  highlight.style.pointerEvents = "none";
  highlight.style.opacity = "1";

  // Add a quick fade-out animation
  highlight.style.animation = "click-fade 0.4s forwards";

  // Add animation style if not already present
  if (!document.getElementById("click-effect-style")) {
    const style = document.createElement("style");
    style.id = "click-effect-style";
    style.textContent = `
        @keyframes click-fade {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          60% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `;
    document.head.appendChild(style);
  }

  // Add to document
  document.body.appendChild(highlight);

  // Clean up quickly
  setTimeout(() => {
    highlight.remove();
    element.style.boxShadow = originalBoxShadow;
  }, 400);
}

/**
 * Creates a visual representation of a dropdown menu that will appear in the recording
 * @param {HTMLSelectElement} selectElement - The select element
 * @param {string} valueToSelect - The value to select
 */
export async function createVisualDropdown(selectElement, valueToSelect) {
  if (!selectElement) return;

  try {
    // Get select element position and size
    const selectRect = selectElement.getBoundingClientRect();

    // Get all options and their values/text
    const options = [];
    for (let i = 0; i < selectElement.options.length; i++) {
      options.push({
        value: selectElement.options[i].value,
        text: selectElement.options[i].text,
        selected: selectElement.options[i].value === selectElement.value,
      });
    }

    // Find which option to select
    const selectedIndex = options.findIndex(
      (opt) => opt.value === valueToSelect
    );
    if (selectedIndex === -1) {
      console.error(`Option with value ${valueToSelect} not found`);
      return;
    }

    // Create visual dropdown container
    const dropdown = document.createElement("div");
    dropdown.style.position = "fixed";
    dropdown.style.left = selectRect.left + "px";
    dropdown.style.top = selectRect.bottom + "px";
    dropdown.style.width = Math.max(200, selectRect.width) + "px"; // Ensure minimum width
    dropdown.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
    dropdown.style.border = "2px solid #ff3d5a";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
    dropdown.style.zIndex = "10001";
    dropdown.style.overflow = "hidden";
    dropdown.style.fontFamily = "Arial, sans-serif";
    dropdown.style.animation = "dropdown-appear 0.3s ease-out forwards";

    // Add animation styles
    if (!document.getElementById("custom-dropdown-style")) {
      const style = document.createElement("style");
      style.id = "custom-dropdown-style";
      style.textContent = `
          @keyframes dropdown-appear {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes option-select {
            0% { background-color: rgba(255, 61, 90, 0.2); }
            50% { background-color: rgba(255, 61, 90, 0.5); }
            100% { background-color: rgba(255, 61, 90, 0.3); }
          }
          @keyframes option-highlight {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `;
      document.head.appendChild(style);
    }

    // Add a header to clarify that this is a dropdown
    const header = document.createElement("div");
    header.textContent = "Select an Option";
    header.style.padding = "8px 12px";
    header.style.backgroundColor = "#ff3d5a";
    header.style.color = "white";
    header.style.fontWeight = "bold";
    header.style.fontSize = "14px";
    header.style.textAlign = "center";
    dropdown.appendChild(header);

    // Add option elements to visual dropdown
    options.forEach((option, index) => {
      const optionEl = document.createElement("div");
      optionEl.textContent = option.text;
      optionEl.style.padding = "10px 12px";
      optionEl.style.cursor = "pointer";
      optionEl.style.color = "white";
      optionEl.style.fontSize = "14px";
      optionEl.style.transition = "background-color 0.2s";
      optionEl.style.borderBottom =
        index < options.length - 1
          ? "1px solid rgba(255, 255, 255, 0.1)"
          : "none";

      // Highlight the current selection
      if (option.selected) {
        optionEl.style.backgroundColor = "rgba(60, 60, 60, 0.8)";
        optionEl.style.fontWeight = "bold";
      }

      dropdown.appendChild(optionEl);
    });

    // Add to document
    document.body.appendChild(dropdown);

    // Let the dropdown be visible for a moment
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Now highlight and select the target option
    const optionElements = dropdown.querySelectorAll("div:not(:first-child)"); // Skip header
    if (selectedIndex < optionElements.length) {
      // Clear previous selection
      for (let i = 0; i < optionElements.length; i++) {
        if (i !== selectedIndex) {
          optionElements[i].style.backgroundColor = "transparent";
          optionElements[i].style.fontWeight = "normal";
        }
      }

      // Highlight the new selection with the animation first
      const targetOption = optionElements[selectedIndex];

      // First show the click animation
      addClickEffect(targetOption);

      // Brief delay before showing the selection effect
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Then show the selection effect
      targetOption.style.backgroundColor = "rgba(255, 61, 90, 0.3)";
      targetOption.style.fontWeight = "bold";
      targetOption.style.animation =
        "option-select 0.8s ease-in-out, option-highlight 0.5s ease-in-out";

      // Wait a moment to show the selection
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Animate dropdown closing
    dropdown.style.opacity = "0";
    dropdown.style.transform = "translateY(-10px)";
    dropdown.style.transition = "opacity 0.3s ease-in, transform 0.3s ease-in";

    // Remove after animation
    setTimeout(() => {
      dropdown.remove();
    }, 300);
  } catch (error) {
    console.error("Error creating visual dropdown", error);
  }
}

/**
 * Helper function to select an option from a dropdown with visual feedback
 * @param {HTMLSelectElement} selectElement - The select element
 * @param {string} value - The value to select
 */
export async function selectFromDropdown(selectElement, value) {
  if (!selectElement) return;

  // Create a visual cue where the option would be
  try {
    // Get the dropdown options
    const options = selectElement.options;
    let targetOption = null;
    let targetIndex = -1;

    // Find the target option
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === value) {
        targetOption = options[i];
        targetIndex = i;
        break;
      }
    }

    if (targetOption) {
      // Calculate where the option would appear on screen
      const selectRect = selectElement.getBoundingClientRect();
      const optionHeight = 30; // Approximate height of an option

      // Create a highlight for the option
      const highlight = document.createElement("div");
      highlight.style.position = "fixed";
      highlight.style.left = selectRect.left + "px";
      highlight.style.width = selectRect.width + "px";
      highlight.style.height = optionHeight + "px";
      highlight.style.top =
        selectRect.bottom + targetIndex * optionHeight + "px";
      highlight.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      highlight.style.border = "1px solid white";
      highlight.style.zIndex = "10001";
      highlight.style.pointerEvents = "none"; // Don't interfere with clicks
      highlight.style.animation = "option-highlight 0.8s ease-in-out";

      // Add styles for the animation
      if (!document.getElementById("dropdown-highlight-style")) {
        const style = document.createElement("style");
        style.id = "dropdown-highlight-style";
        style.textContent = `
            @keyframes option-highlight {
              0% { opacity: 0; }
              30% { opacity: 0.8; }
              70% { opacity: 0.8; }
              100% { opacity: 0; }
            }
          `;
        document.head.appendChild(style);
      }

      document.body.appendChild(highlight);

      // Click the highlighted option
      addClickEffect(highlight);

      // Wait a moment for the highlight to be visible
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Remove the highlight
      highlight.remove();
    }

    // Actually change the value
    selectElement.value = value;

    // Dispatch the change event to update the visualization
    const changeEvent = new Event("change", { bubbles: true });
    selectElement.dispatchEvent(changeEvent);
  } catch (error) {
    console.error("Error in selectFromDropdown:", error);

    // Fallback to simply changing the value
    selectElement.value = value;
    const changeEvent = new Event("change", { bubbles: true });
    selectElement.dispatchEvent(changeEvent);
  }
}
