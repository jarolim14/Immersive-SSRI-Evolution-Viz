import { select, tree, hierarchy } from "d3";

export class TopicTree {
  constructor() {
    this.modal = document.getElementById("topicTreeModal");
    this.svgContainer = document.getElementById("topicTreeSvg");
    this.datasetSelect = document.getElementById("datasetSelect");
    this.saveButton = document.getElementById("saveTreeButton");
    this.closeButton = document.getElementById("topicTreeCloseBtn");
    this.viewButton = document.getElementById("viewTopicHierarchyBtn");

    this.margin = { top: 20, right: 200, bottom: 20, left: 150 };

    // Set initial dimensions
    this.setDimensions();

    // Listen for window resize
    window.addEventListener("resize", this.handleResize.bind(this));

    this.setupEventListeners();
    this.initializeSVG();
  }

  setDimensions() {
    // Responsive dimensions based on viewport
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1200;

    if (isMobile) {
      this.width = Math.min(window.innerWidth - 60, 800);
      this.height = 600;
      // Reduce margins for mobile to maximize visualization space
      this.margin.right = 60;
      this.margin.left = 60;
    } else if (isTablet) {
      this.width = Math.min(window.innerWidth - 60, 900);
      this.height = 700;
      this.margin.right = 120;
      this.margin.left = 100;
    } else {
      this.width = 1000;
      this.height = 800;
      this.margin.right = 200;
      this.margin.left = 150;
    }
  }

  handleResize() {
    // Only update if modal is visible
    if (this.modal.style.display === "block") {
      this.setDimensions();
      this.initializeSVG();
    }
  }

  setupEventListeners() {
    this.viewButton.addEventListener("click", () => {
      this.showModal();
      // Hide the instructions modal
      document.getElementById("instructionsModal").style.display = "none";
    });
    this.closeButton.addEventListener("click", () => this.hideModal());
    this.datasetSelect.addEventListener("change", () =>
      this.updateVisualization()
    );
    this.saveButton.addEventListener("click", () => this.saveAsSVG());
  }

  initializeSVG() {
    // Clear any existing SVG
    this.svgContainer.innerHTML = "";

    this.svg = select(this.svgContainer)
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Adjust tree size for mobile screens
    const isMobile = window.innerWidth < 768;
    const treeWidth = isMobile ? this.width - 100 : this.width - 200;

    this.tree = tree()
      .size([this.height - 50, treeWidth])
      .separation((a, b) => (a.parent === b.parent ? 1 : isMobile ? 1.2 : 1.5));

    // Load initial data or update visualization if data already loaded
    if (this.datasets) {
      this.updateVisualization();
    } else {
      this.loadData();
    }
  }

  async loadData() {
    try {
      const response = await fetch(
        "./data/D3JS_cluster_hierarchy_structure_2025.json"
      );
      if (!response.ok) throw new Error("Network response was not ok");

      this.datasets = await response.json();
      this.updateVisualization();
    } catch (error) {
      console.error("Error loading topic tree data:", error);
    }
  }

  updateVisualization() {
    if (!this.datasets) return;

    const selectedDataset = this.datasetSelect.value;
    const data = this.datasets[selectedDataset];
    const root = hierarchy(data, (d) => d.children);

    this.tree(root);

    // Clear previous elements
    this.svg.selectAll(".link").remove();
    this.svg.selectAll(".node").remove();

    // Create links
    this.svg
      .selectAll(".link")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("class", "link")
      .attr("d", this.diagonal);

    // Check if we're on a mobile device
    const isMobile = window.innerWidth < 768;
    const fontSize = isMobile ? "10px" : "11px";
    const circleRadius = isMobile ? 2 : 2.5;

    // Create nodes
    const node = this.svg
      .selectAll(".node")
      .data(root.descendants())
      .join("g")
      .attr(
        "class",
        (d) => "node" + (d.children ? " node--internal" : " node--leaf")
      )
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node.append("circle").attr("r", circleRadius);

    node
      .append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => (d.children ? -8 : 8))
      .attr("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => {
        // Truncate long text on mobile
        if (isMobile && d.data.name.length > 25) {
          return d.data.name.substring(0, 22) + "...";
        }
        return d.data.name;
      })
      .style("font-size", fontSize)
      .style("fill", "#fff");
  }

  diagonal(d) {
    return (
      "M" +
      d.y +
      "," +
      d.x +
      "C" +
      (d.parent.y + 100) +
      "," +
      d.x +
      " " +
      (d.parent.y + 100) +
      "," +
      d.parent.x +
      " " +
      d.parent.y +
      "," +
      d.parent.x
    );
  }

  showModal() {
    this.modal.style.display = "block";

    // Update dimensions and redraw for current screen size
    this.setDimensions();
    this.initializeSVG();

    // Hide or move search bar to background
    const searchContainer = document.querySelector("#search-container");
    if (searchContainer) {
      searchContainer.style.zIndex = "-1";
      searchContainer.style.opacity = "0.2";
    }
  }

  hideModal() {
    this.modal.style.display = "none";
    // Restore search bar visibility
    const searchContainer = document.querySelector("#search-container");
    if (searchContainer) {
      searchContainer.style.zIndex = "1000";
      searchContainer.style.opacity = "1";
    }
  }

  saveAsSVG() {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(
      this.svgContainer.querySelector("svg")
    );
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "topic_tree_visualization.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
