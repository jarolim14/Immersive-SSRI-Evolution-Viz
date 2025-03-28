/**
 * @file spatialPartitioning.js
 * @description Implements spatial partitioning using an octree for efficient node management and querying.
 * This system helps optimize node visibility updates, selection, and rendering.
 */

import * as THREE from 'three';

class OctreeNode {
  constructor(bounds, depth = 0, maxDepth = 8) {
    this.bounds = bounds;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.children = null;
    this.nodes = new Set();
    this.center = new THREE.Vector3();
    this.bounds.getCenter(this.center);
  }

  subdivide() {
    if (this.depth >= this.maxDepth) return;

    const halfSize = this.bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    this.children = [];

    for (let i = 0; i < 8; i++) {
      const childBounds = new THREE.Box3();
      const childCenter = new THREE.Vector3();
      
      // Calculate child center based on octant
      childCenter.x = this.center.x + (i & 1 ? halfSize.x : -halfSize.x);
      childCenter.y = this.center.y + (i & 2 ? halfSize.y : -halfSize.y);
      childCenter.z = this.center.z + (i & 4 ? halfSize.z : -halfSize.z);
      
      // Set child bounds
      childBounds.setFromCenterAndSize(childCenter, halfSize);
      
      this.children.push(new OctreeNode(childBounds, this.depth + 1, this.maxDepth));
    }

    // Redistribute existing nodes to children
    const nodesToRedistribute = Array.from(this.nodes);
    this.nodes.clear();
    
    for (const node of nodesToRedistribute) {
      this.insert(node);
    }
  }

  insert(node) {
    if (!this.bounds.containsPoint(node.position)) return false;

    if (this.children) {
      for (const child of this.children) {
        if (child.insert(node)) return true;
      }
      return false;
    }

    this.nodes.add(node);
    
    // Subdivide if too many nodes
    if (this.nodes.size > 8 && this.depth < this.maxDepth) {
      this.subdivide();
    }

    return true;
  }

  remove(node) {
    if (!this.bounds.containsPoint(node.position)) return false;

    if (this.children) {
      for (const child of this.children) {
        if (child.remove(node)) return true;
      }
      return false;
    }

    return this.nodes.delete(node);
  }

  queryFrustum(frustum) {
    const visibleNodes = new Set();

    if (!frustum.intersectsBox(this.bounds)) return visibleNodes;

    if (this.children) {
      for (const child of this.children) {
        const childNodes = child.queryFrustum(frustum);
        childNodes.forEach(node => visibleNodes.add(node));
      }
    } else {
      for (const node of this.nodes) {
        if (frustum.containsPoint(node.position)) {
          visibleNodes.add(node);
        }
      }
    }

    return visibleNodes;
  }

  querySphere(center, radius) {
    const sphere = new THREE.Sphere(center, radius);
    const nodes = new Set();

    if (!sphere.intersectsBox(this.bounds)) return nodes;

    if (this.children) {
      for (const child of this.children) {
        const childNodes = child.querySphere(center, radius);
        childNodes.forEach(node => nodes.add(node));
      }
    } else {
      for (const node of this.nodes) {
        if (sphere.containsPoint(node.position)) {
          nodes.add(node);
        }
      }
    }

    return nodes;
  }

  updateNodeVisibility(yearRange, selectedClusters) {
    const visibleNodes = new Set();

    if (this.children) {
      for (const child of this.children) {
        const childNodes = child.updateNodeVisibility(yearRange, selectedClusters);
        childNodes.forEach(node => visibleNodes.add(node));
      }
    } else {
      for (const node of this.nodes) {
        const isInYearRange = node.year >= yearRange.min && node.year <= yearRange.max;
        const isInSelectedCluster = !selectedClusters || selectedClusters.includes(node.cluster);
        
        if (isInYearRange && isInSelectedCluster) {
          visibleNodes.add(node);
        }
      }
    }

    return visibleNodes;
  }
}

export class SpatialPartitioning {
  constructor() {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-1000, -1000, -1000),
      new THREE.Vector3(1000, 1000, 1000)
    );
    this.root = new OctreeNode(bounds);
  }

  insert(node) {
    return this.root.insert(node);
  }

  remove(node) {
    return this.root.remove(node);
  }

  getVisibleNodes(frustum) {
    return this.root.queryFrustum(frustum);
  }

  getNodesInSphere(center, radius) {
    return this.root.querySphere(center, radius);
  }

  updateVisibility(yearRange, selectedClusters) {
    return this.root.updateNodeVisibility(yearRange, selectedClusters);
  }
} 