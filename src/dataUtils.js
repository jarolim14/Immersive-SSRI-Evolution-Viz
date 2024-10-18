import * as THREE from "three";

// Private variables (not exported)
let clusterLabelMap = {};
let clusterColorMap = {};

/**
 * Loads JSON data from a given URL.
 * @param {string} url - The URL to fetch JSON data from.
 * @returns {Promise<Object>} The parsed JSON data.
 * @throws Will throw an error if the fetch fails or if the response is not OK.
 */
export async function loadJSONData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

/**
 * Loads and processes the cluster color map.
 * @param {string} url - The URL of the cluster color map JSON.
 * @returns {Promise<Object>} An object mapping cluster IDs to THREE.Color objects.
 */
export async function loadClusterColorMap(url) {
  try {
    const data = await loadJSONData(url);
    clusterColorMap = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, new THREE.Color(value)])
    );
    console.log("Cluster Color Map Successfully Loaded");
    return clusterColorMap;
  } catch (error) {
    console.error("Error loading cluster color map:", error);
    throw error;
  }
}

/**
 * Loads and processes the cluster label map.
 * @param {string} url - The URL of the cluster label map JSON.
 * @returns {Promise<Object>} The cluster label map object.
 */
export async function loadClusterLabelMap(url) {
  try {
    clusterLabelMap = await loadJSONData(url);
    console.log("Cluster Label Map Successfully Loaded");
    return clusterLabelMap;
  } catch (error) {
    console.error("Error loading cluster label map:", error);
    throw error;
  }
}

/**
 * Retrieves the current cluster color map.
 * @returns {Object} The current cluster color map.
 */
export function getClusterColorMap() {
  return clusterColorMap;
}

/**
 * Retrieves the current cluster label map.
 * @returns {Object} The current cluster label map.
 */
export function getClusterLabelMap() {
  return clusterLabelMap;
}
