/**
 * @file searchFunctionality.js
 * @description Implements real-time search functionality for the visualization
 * allowing users to search for nodes by title and DOI
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";

let nodesMap = null;
let camera = null;
let controls = null;
let scene = null;
let searchDebounceTimer = null;
let searchResultsLimit = CONFIG.search.resultsLimit;

// DOM elements
let searchContainer = null;
let searchInput = null;
let searchResults = null;

/**
 * Initialize the search functionality
 * @param {Map} nodes - The nodes map containing all node data
 * @param {THREE.Camera} cam - The camera object
 * @param {OrbitControls} orbitControls - The orbit controls
 * @param {THREE.Scene} sceneObj - The scene object
 */
export function initializeSearch(nodes, cam, orbitControls, sceneObj) {
  nodesMap = nodes;
  camera = cam;
  controls = orbitControls;
  scene = sceneObj;
  
  createSearchUI();
  addEventListeners();
}

/**
 * Create the search UI elements
 */
function createSearchUI() {
  // Create search container
  searchContainer = document.createElement('div');
  searchContainer.id = 'search-container';
  
  // Create search input
  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'search-input';
  searchInput.placeholder = 'Search by title or DOI...';
  
  // Create search results container
  searchResults = document.createElement('div');
  searchResults.id = 'search-results';
  
  // Append elements
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchResults);
  document.body.appendChild(searchContainer);
}

/**
 * Add event listeners for search functionality
 */
function addEventListeners() {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    // Clear results if query is empty
    if (query === '') {
      searchResults.innerHTML = '';
      searchResults.style.display = 'none';
      return;
    }
    
    // Debounce search to avoid performance issues while typing
    searchDebounceTimer = setTimeout(() => {
      performSearch(query);
    }, CONFIG.search.debounceTime);
  });
  
  // Close search results when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });
}

/**
 * Perform search on nodes by title and DOI
 * @param {string} query - The search query
 */
function performSearch(query) {
  if (!nodesMap || nodesMap.size === 0) return;
  
  query = query.toLowerCase();
  const results = [];
  
  // Search through all nodes
  nodesMap.forEach((node, index) => {
    const title = node.title ? node.title.toLowerCase() : '';
    const doi = node.doi ? node.doi.toLowerCase() : '';
    
    // Check for matches
    const titleMatch = title.includes(query);
    const doiMatch = doi.includes(query);
    
    if (titleMatch || doiMatch) {
      // Calculate relevance score (exact matches score higher)
      let score = 0;
      
      // Title exact match scores highest
      if (title === query) score += 100;
      // DOI exact match scores high
      else if (doi === query) score += 90;
      // Title starts with query scores high
      else if (title.startsWith(query)) score += 80;
      // DOI starts with query scores medium-high
      else if (doi.startsWith(query)) score += 70;
      // Title contains query scores medium
      else if (titleMatch) score += 50;
      // DOI contains query scores lower
      else if (doiMatch) score += 40;
      
      results.push({
        index,
        node,
        score,
        titleMatch,
        doiMatch
      });
    }
  });
  
  // Sort results by relevance score
  results.sort((a, b) => b.score - a.score);
  
  // Display results (limited to prevent UI clutter)
  displaySearchResults(results.slice(0, searchResultsLimit));
}

/**
 * Display search results in the UI
 * @param {Array} results - The search results to display
 */
function displaySearchResults(results) {
  // Clear previous results
  searchResults.innerHTML = '';
  
  if (results.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'search-no-results';
    noResults.textContent = 'No matching results found';
    searchResults.appendChild(noResults);
  } else {
    // Create result items
    results.forEach(result => {
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      
      // Highlight if both title and DOI match
      if (result.titleMatch && result.doiMatch) {
        resultItem.classList.add('double-match');
      }
      
      // Create result content
      const title = document.createElement('div');
      title.className = 'result-title';
      title.textContent = result.node.title || 'Untitled';
      
      const metadata = document.createElement('div');
      metadata.className = 'result-metadata';
      
      // Add year if available
      if (result.node.year) {
        metadata.textContent = `Year: ${result.node.year}`;
      }
      
      // Add DOI if available
      if (result.node.doi) {
        const doiSpan = document.createElement('span');
        doiSpan.className = 'result-doi';
        doiSpan.textContent = result.node.doi;
        metadata.appendChild(doiSpan);
      }
      
      // Append elements
      resultItem.appendChild(title);
      resultItem.appendChild(metadata);
      
      // Add click handler to navigate to node
      resultItem.addEventListener('click', (e) => {
        console.log('Search result clicked:', result.index, result.node.title);
        e.stopPropagation(); // Prevent event bubbling
        navigateToNode(result.index, result.node);
      });
      
      searchResults.appendChild(resultItem);
    });
  }
  
  // Show results
  searchResults.style.display = 'block';
}

/**
 * Navigate camera to a selected node
 * @param {number} index - The index of the node
 * @param {Object} node - The node data
 */
function navigateToNode(index, node) {
  // Use the stored scene reference instead of camera.parent
  if (!scene) {
    console.error("Scene object not available");
    return;
  }
  
  const points = scene.getObjectByName("points");
  if (!points) {
    console.error("Points object not found in the scene");
    return;
  }
  
  // Get position from points geometry
  const positionAttribute = points.geometry.attributes.position;
  const i3 = index * 3;
  
  // Create target position
  const targetPosition = {
    x: positionAttribute.array[i3],
    y: positionAttribute.array[i3 + 1],
    z: positionAttribute.array[i3 + 2]
  };
  
  // Import singleNodeSelection for node highlighting
  import('./singleNodeSelection.js').then(selectionModule => {
    // Important: Account for the same coordinate transformations as in the nodes
    // The scene uses a coordinate system that's rotated around the X-axis by 90 degrees
    
    // Find the center of the scene (origin)
    const centerPoint = new THREE.Vector3(0, 0, 0);
    
    // Create a position vector for the target
    const targetVector = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y,
      targetPosition.z
    );
    
    // Account for the coordinate system rotation - the "up" direction in the rotated system
    // Since the system is rotated 90° around X-axis, the world "up" (Y) is now pointing in Z direction
    const worldUp = new THREE.Vector3(0, 0, 1);
    
    // Calculate view distance using config parameters
    const baseDistance = CONFIG.search.camera.baseDistance;
    const centralityMultiplier = CONFIG.search.camera.centralityDistanceMultiplier;
    const distance = node.centrality ? baseDistance + node.centrality * centralityMultiplier : baseDistance + 30;
    
    // Find direction from target to center
    const toCenter = new THREE.Vector3().subVectors(centerPoint, targetVector).normalize();
    
    // Create a view direction that looks both toward center and from above using config parameters
    const viewDirection = new THREE.Vector3()
      .copy(toCenter)
      .multiplyScalar(CONFIG.search.camera.viewOffsetCenter) // Center direction component from config
      .add(worldUp.clone().multiplyScalar(CONFIG.search.camera.viewOffsetUpward)); // Upward component from config
    
    viewDirection.normalize();
    
    // Calculate camera position - move opposite to view direction
    const cameraPosition = new THREE.Vector3()
      .copy(targetVector)
      .sub(viewDirection.clone().multiplyScalar(distance));
    
    // Add extra height in the world's up direction (Z in rotated system) from config
    cameraPosition.z += CONFIG.search.camera.extraHeight;
    
    // Set control's target to the node position for proper orbiting
    controls.target.copy(targetVector);
    
    // Animate camera movement
    animateCameraMove(cameraPosition, targetVector);
    
    // Hide search results
    searchResults.style.display = 'none';
    searchInput.value = '';
    
    // Use the existing selection mechanism to highlight the node
    const intersectionMock = { index };
    selectionModule.updateNodeInfo(intersectionMock, nodesMap, scene);
    
    console.log("Navigating to node:", index, "at position:", targetPosition);
    console.log("Camera position:", cameraPosition);
  });
}

/**
 * Animate camera movement to target position
 * @param {Object} newPosition - Target camera position
 * @param {Object} lookTarget - Position to look at
 */
function animateCameraMove(newPosition, lookTarget) {
  // Get animation duration from config
  const duration = CONFIG.search.camera.transitionDuration;
  
  // Import GSAP if available, otherwise use simple transition
  if (window.gsap) {
    gsap.to(camera.position, {
      duration: duration / 1000, // Convert ms to seconds for GSAP
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
        controls.update();
      },
      onComplete: () => {
        // Final update to ensure proper orientation
        camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
        controls.update();
      }
    });
  } else {
    // Simple animation without GSAP
    const startPos = { ...camera.position };
    const startTime = Date.now();
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Use cubic ease-in-out for smoother motion
      const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      camera.position.x = startPos.x + (newPosition.x - startPos.x) * easeProgress;
      camera.position.y = startPos.y + (newPosition.y - startPos.y) * easeProgress;
      camera.position.z = startPos.z + (newPosition.z - startPos.z) * easeProgress;
      
      camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final update to ensure proper orientation
        camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
        controls.update();
      }
    }
    
    animate();
  }
}

export { searchContainer }; 