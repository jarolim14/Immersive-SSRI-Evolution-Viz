import { select, tree, hierarchy } from 'd3';

export class TopicTree {
  constructor() {
    this.modal = document.getElementById('topicTreeModal');
    this.svgContainer = document.getElementById('topicTreeSvg');
    this.datasetSelect = document.getElementById('datasetSelect');
    this.saveButton = document.getElementById('saveTreeButton');
    this.closeButton = document.getElementById('topicTreeCloseBtn');
    this.viewButton = document.getElementById('viewTopicHierarchyBtn');

    this.margin = { top: 20, right: 200, bottom: 20, left: 150 };
    this.width = 1000;
    this.height = 800;

    this.setupEventListeners();
    this.initializeSVG();
  }

  setupEventListeners() {
    this.viewButton.addEventListener('click', () => {
      this.showModal();
      // Hide the instructions modal
      document.getElementById('instructionsModal').style.display = 'none';
    });
    this.closeButton.addEventListener('click', () => this.hideModal());
    this.datasetSelect.addEventListener('change', () => this.updateVisualization());
    this.saveButton.addEventListener('click', () => this.saveAsSVG());
  }

  initializeSVG() {
    // Clear any existing SVG
    this.svgContainer.innerHTML = '';

    this.svg = select(this.svgContainer)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.tree = tree()
      .size([this.height - 50, this.width - 200])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    // Load initial data
    this.loadData();
  }

  async loadData() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/jarolim14/Study-1-Bibliometrics/refs/heads/feature/2025-03-26-data-and-code-improvements/src/visualization/tree-hierachy/D3JS_cluster_hierarchy_structure_2025.json?token=GHSAT0AAAAAADBVDIMOFVEQXELUYH3EZDQM2AJ7OJA');
      if (!response.ok) throw new Error('Network response was not ok');

      this.datasets = await response.json();
      this.updateVisualization();
    } catch (error) {
      console.error('Error loading topic tree data:', error);
    }
  }

  updateVisualization() {
    if (!this.datasets) return;

    const selectedDataset = this.datasetSelect.value;
    const data = this.datasets[selectedDataset];
    const root = hierarchy(data, d => d.children);

    this.tree(root);

    // Clear previous elements
    this.svg.selectAll('.link').remove();
    this.svg.selectAll('.node').remove();

    // Create links
    this.svg.selectAll('.link')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('class', 'link')
      .attr('d', this.diagonal);

    // Create nodes
    const node = this.svg.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', d => 'node' + (d.children ? ' node--internal' : ' node--leaf'))
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 2.5);

    node.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -8 : 8)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name)
      .style('font-size', '11px')
      .style('fill', '#fff');
  }

  diagonal(d) {
    return 'M' + d.y + ',' + d.x
      + 'C' + (d.parent.y + 100) + ',' + d.x
      + ' ' + (d.parent.y + 100) + ',' + d.parent.x
      + ' ' + d.parent.y + ',' + d.parent.x;
  }

  showModal() {
    this.modal.style.display = 'block';
    // Hide or move search bar to background
    const searchContainer = document.querySelector('#search-container');
    if (searchContainer) {
      searchContainer.style.zIndex = '-1';
      searchContainer.style.opacity = '0.2';
    }
  }

  hideModal() {
    this.modal.style.display = 'none';
    // Restore search bar visibility
    const searchContainer = document.querySelector('#search-container');
    if (searchContainer) {
      searchContainer.style.zIndex = '1000';
      searchContainer.style.opacity = '1';
    }
  }

  saveAsSVG() {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.svgContainer.querySelector('svg'));
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topic_tree_visualization.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}