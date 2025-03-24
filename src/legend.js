/**
 * Legend Creation Module
 *
 * This module handles the creation and management of an interactive legend tree.
 * It provides functions to initialize the legend, create the tree structure,
 * and manage selections. The legend is built dynamically based on input data,
 * allowing for hierarchical organization with checkboxes for selection.
 *
 * Key features:
 * - Asynchronous legend initialization from a URL
 * - Dynamic creation of a tree-like structure for the legend
 * - Management of selections and leaf keys
 * - Interactive folding/unfolding of legend sections
 * - Export of selected leaf keys for use in other parts of the application
 */

import { loadJSONData } from "./dataUtils.js";

export let legendSelections = {};
export let legendSelectedLeafKeys = [];

// Legend Functions

export async function initializeLegend(url) {
  try {
    const data = await loadJSONData(url);
    const legendResult = createLegendTree(data);
    legendSelections = legendResult.legendSelections;
    legendSelectedLeafKeys = legendResult.legendSelectedLeafKeys;
    //console.log("Initial legendSelections:", legendSelections);
    // console.log("Initial selected leaf keys:", legendSelectedLeafKeys);

    // Add reset button functionality
    const resetButton = document.getElementById("resetLegend");
    if (resetButton) {
      resetButton.addEventListener("click", resetLegendState);
    }
  } catch (error) {
    console.error("Error initializing legend:", error);
  }
}

export function createLegendTree(data) {
  const treeContainer = document.getElementById("legendDiv");
  if (!treeContainer) {
    console.error("Legend container not found");
    return { legendSelections: {}, legendSelectedLeafKeys: [] };
  }
  treeContainer.className = "legend-tree";
  const legendSelections = {};
  const legendSelectedLeafKeys = [];

  function updateLegendSelectedLeafKeys(key, isChecked) {
    const leafKey = parseInt(key, 10);
    if (isChecked && !isNaN(leafKey)) {
      if (!legendSelectedLeafKeys.includes(leafKey)) {
        legendSelectedLeafKeys.push(leafKey);
      }
    } else {
      const index = legendSelectedLeafKeys.indexOf(leafKey);
      if (index > -1) {
        legendSelectedLeafKeys.splice(index, 1);
      }
    }
  }

  function setCheckboxState(checkbox, isChecked) {
    checkbox.checked = isChecked;
    legendSelections[checkbox.id] = isChecked;
    if (checkbox.classList.contains("leaf-checkbox")) {
      updateLegendSelectedLeafKeys(checkbox.dataset.key, isChecked);
    }
  }

  function toggleChildren(parentCheckbox, isChecked) {
    const parentNode = parentCheckbox.closest(".legend-item");
    const childCheckboxes = parentNode.querySelectorAll(
      'input[type="checkbox"]'
    );
    childCheckboxes.forEach((childCheckbox) => {
      setCheckboxState(childCheckbox, isChecked);
    });
  }

  function buildTree(obj, parent, path = []) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const item = obj[key];
        const node = document.createElement("div");
        node.className = "legend-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = path.concat(key).join("-");

        const title = document.createElement("span");
        title.className = "legend-toggle";
        title.textContent = key;

        const container = document.createElement("div");
        container.className = "legend-item-container";
        container.appendChild(checkbox);
        container.appendChild(title);
        node.appendChild(container);

        checkbox.addEventListener("change", (e) => {
          const isChecked = e.target.checked;
          setCheckboxState(checkbox, isChecked);
          toggleChildren(checkbox, isChecked);
          console.log("legendSelections:", legendSelections);
          console.log("Selected Leaf Keys:", legendSelectedLeafKeys);
        });

        if (Array.isArray(item) || typeof item === "object") {
          const subtree = document.createElement("div");
          subtree.className = "legend-subtree";

          if (Array.isArray(item)) {
            item.forEach((subItem, index) => {
              for (const subKey in subItem) {
                if (subItem.hasOwnProperty(subKey)) {
                  const listItem = document.createElement("div");
                  listItem.className = "legend-item";

                  const leafCheckbox = document.createElement("input");
                  leafCheckbox.type = "checkbox";
                  leafCheckbox.id = `${checkbox.id}-${index}-${subKey}`;
                  leafCheckbox.classList.add("leaf-checkbox");
                  leafCheckbox.dataset.key = subKey;

                  const leafLabel = document.createElement("label");
                  leafLabel.htmlFor = leafCheckbox.id;
                  leafLabel.textContent = subItem[subKey];

                  leafCheckbox.addEventListener("change", (e) => {
                    const isChecked = e.target.checked;
                    setCheckboxState(leafCheckbox, isChecked);
                    console.log("legendSelections:", legendSelections);
                    console.log("Selected Leaf Keys:", legendSelectedLeafKeys);
                  });

                  listItem.appendChild(leafCheckbox);
                  listItem.appendChild(leafLabel);
                  subtree.appendChild(listItem);
                }
              }
            });
          } else if (typeof item === "object") {
            buildTree(item, subtree, path.concat(key));
          }

          node.appendChild(subtree);

          title.addEventListener("click", (e) => {
            subtree.style.display =
              subtree.style.display === "none" ? "block" : "none";
          });

          // Add folding indicator
          const foldIndicator = document.createElement("span");
          foldIndicator.className = "fold-indicator";
          foldIndicator.textContent = "▶";
          container.insertBefore(foldIndicator, title);

          foldIndicator.addEventListener("click", (e) => {
            subtree.style.display =
              subtree.style.display === "none" ? "block" : "none";
            foldIndicator.textContent =
              subtree.style.display === "none" ? "▶" : "▼";
          });
        }

        parent.appendChild(node);
      }
    }
  }

  buildTree(data, treeContainer);
  return { legendSelections, legendSelectedLeafKeys };
}

export function getLegendSelectedLeafKeys() {
  return legendSelectedLeafKeys;
}

function resetLegendState() {
  // Get all checkboxes in the legend
  const checkboxes = document.querySelectorAll(
    '#legendDiv input[type="checkbox"]'
  );

  // Uncheck all checkboxes
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
    // Update the internal state
    if (checkbox.classList.contains("leaf-checkbox")) {
      legendSelections[checkbox.id] = false;
      const leafKey = parseInt(checkbox.dataset.key, 10);
      const index = legendSelectedLeafKeys.indexOf(leafKey);
      if (index > -1) {
        legendSelectedLeafKeys.splice(index, 1);
      }
    }
  });

  // Clear the selected leaf keys array
  legendSelectedLeafKeys.length = 0;

  // Show all nodes and edges by triggering the visibility update
  // with an empty selection (which means show all)
  document.getElementById("updateVisibility").click();
}
