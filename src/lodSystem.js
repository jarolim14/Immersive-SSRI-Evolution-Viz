/**
 * @file lodSystem.js
 * @description Implements a Level of Detail (LOD) system for the network visualization
 * to optimize rendering performance based on viewport size.
 */

import * as THREE from 'three';
import { CONFIG } from './config.js';

// LOD configuration
const LOD_CONFIG = {
    // Viewport size thresholds (in pixels)
    viewportSize: {
        high: 5,      // High detail when object is larger than 10px
        medium: 2,     // Medium detail when object is 5-10px
        low: 1         // Low detail when object is smaller than 5px
    },
    // Node size multipliers for each LOD level
    nodeSizeMultipliers: {
        high: 0.7,
        medium: 0.5,
        low: 0.3
    },
    // Edge detail levels - now represents the number of segments to keep
    edgeDetail: {
        high: 0.4,     // Keep all segments
        medium: 0.2,   // Keep every other segment
        low: 0.01      // Keep every fifth segment
    },
    // Transition settings
    transition: {
        duration: 500, // Transition duration in milliseconds
        steps: 10      // Number of steps in the transition
    },
    // Anti-flickering settings
    antiFlicker: {
        // Higher values (e.g., 2.0) = larger margin, more stable but less responsive
        // Lower values (e.g., 1.1) = smaller margin, more responsive but more prone to flickering
        viewportMargin: 1.5,    // Margin for viewport calculations (1.0 = no margin)

        // Higher values = more stable but less responsive updates
        // Lower values = more responsive but more prone to flickering
        minFrameTime: 16,       // Minimum time between updates in ms (16 = 60fps)
        maxFrameTime: 32,       // Maximum time between updates in ms (32 = 30fps)

        // Higher values = slower adaptation to frame rate changes
        // Lower values = faster adaptation but more prone to flickering
        frameTimeAdjustment: 2, // How quickly to adjust update frequency in ms

        // Higher values = more stable but slower transitions
        // Lower values = faster transitions but more prone to flickering
        transitionCooldown: 1000, // Minimum time between LOD transitions in ms

        // Higher values (e.g., 0.3) = more stable but less responsive
        // Lower values (e.g., 0.1) = more responsive but more prone to flickering
        hysteresis: 0.2,        // Hysteresis factor for LOD transitions (0.0 = no hysteresis)

        // Higher values = more updates per frame but more prone to flickering
        // Lower values = fewer updates but more stable
        maxUpdatesPerFrame: 1   // Maximum number of updates per frame
    }
};

class LODSystem {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.currentLOD = 'high';
        this.targetLOD = 'high';
        this.nodes = null;
        this.edges = null;
        this.lastUpdateTime = 0;
        this.updateInterval = LOD_CONFIG.antiFlicker.minFrameTime;
        this.originalEdgeGeometry = null;
        this.transitionStartTime = 0;
        this.isTransitioning = false;
        this.originalNodeSizes = null;
        this.viewportSize = new THREE.Vector2();
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();

        // Double buffering
        this.nodeBufferA = null;
        this.nodeBufferB = null;
        this.currentNodeBuffer = 'A';
        this.edgeBufferA = null;
        this.edgeBufferB = null;
        this.currentEdgeBuffer = 'A';

        // Performance monitoring
        this.lastFrameTime = 0;
        this.frameTimes = [];
        this.averageFrameTime = LOD_CONFIG.antiFlicker.minFrameTime;

        // Transition control
        this.lastTransitionTime = 0;
        this.pendingUpdates = 0;
        this.isUpdating = false;

        // Frame synchronization
        this.rafId = null;
        this.lastRafTime = 0;
    }

    setNodes(nodes) {
        this.nodes = nodes;
        if (nodes && nodes.geometry && nodes.geometry.attributes.size) {
            this.originalNodeSizes = nodes.geometry.attributes.size.array.slice();
            // Initialize double buffers with pre-allocated arrays
            this.nodeBufferA = new Float32Array(this.originalNodeSizes.length);
            this.nodeBufferB = new Float32Array(this.originalNodeSizes.length);
            this.nodeBufferA.set(this.originalNodeSizes);
            this.nodeBufferB.set(this.originalNodeSizes);
        }
    }

    setEdges(edges) {
        this.edges = edges;
        if (edges && edges.geometry) {
            this.originalEdgeGeometry = edges.geometry.clone();
            // Pre-allocate edge buffers
            this.edgeBufferA = this.createEdgeBuffer();
            this.edgeBufferB = this.createEdgeBuffer();
        }
    }

    createEdgeBuffer() {
        const buffer = this.originalEdgeGeometry.clone();
        // Pre-allocate all necessary attributes
        buffer.setAttribute('position', this.originalEdgeGeometry.attributes.position.clone());
        buffer.setAttribute('color', this.originalEdgeGeometry.attributes.color.clone());
        buffer.setAttribute('visible', this.originalEdgeGeometry.attributes.visible.clone());
        buffer.setAttribute('year', this.originalEdgeGeometry.attributes.year.clone());
        return buffer;
    }

    // Calculate the viewport size with hysteresis
    getViewportSize(worldPosition, size) {
        this.tempVector.copy(worldPosition);
        this.tempVector.project(this.camera);

        const screenX = (this.tempVector.x * 0.5 + 0.5) * this.viewportSize.x;
        const screenY = (-(this.tempVector.y * 0.5) + 0.5) * this.viewportSize.y;

        this.tempVector2.copy(worldPosition);
        this.tempVector2.x += size;
        this.tempVector2.project(this.camera);

        const screenX2 = (this.tempVector2.x * 0.5 + 0.5) * this.viewportSize.x;
        const screenY2 = (-(this.tempVector2.y * 0.5) + 0.5) * this.viewportSize.y;

        // Apply margin and hysteresis
        const baseSize = Math.sqrt(
            Math.pow(screenX2 - screenX, 2) +
            Math.pow(screenY2 - screenY, 2)
        ) * LOD_CONFIG.antiFlicker.viewportMargin;

        // Add hysteresis based on current LOD
        const hysteresis = LOD_CONFIG.antiFlicker.hysteresis;
        if (this.currentLOD === 'high') {
            return baseSize * (1 - hysteresis);
        } else if (this.currentLOD === 'low') {
            return baseSize * (1 + hysteresis);
        }
        return baseSize;
    }

    updateFrameTime() {
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > 10) {
            this.frameTimes.shift();
        }

        this.averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

        if (this.averageFrameTime > LOD_CONFIG.antiFlicker.maxFrameTime) {
            this.updateInterval = Math.min(
                this.updateInterval + LOD_CONFIG.antiFlicker.frameTimeAdjustment,
                LOD_CONFIG.antiFlicker.maxFrameTime
            );
        } else if (this.averageFrameTime < LOD_CONFIG.antiFlicker.minFrameTime) {
            this.updateInterval = Math.max(
                this.updateInterval - LOD_CONFIG.antiFlicker.frameTimeAdjustment,
                LOD_CONFIG.antiFlicker.minFrameTime
            );
        }
    }

    // Frame-synchronized update
    update() {
        if (this.isUpdating) return;

        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }

        // Check transition cooldown
        if (now - this.lastTransitionTime < LOD_CONFIG.antiFlicker.transitionCooldown) {
            return;
        }

        this.isUpdating = true;
        this.pendingUpdates++;

        // Use requestAnimationFrame for synchronized updates
        if (!this.rafId) {
            this.rafId = requestAnimationFrame(this.synchronizedUpdate.bind(this));
        }
    }

    synchronizedUpdate(timestamp) {
        this.rafId = null;

        if (this.pendingUpdates > LOD_CONFIG.antiFlicker.maxUpdatesPerFrame) {
            this.pendingUpdates = 0;
            this.isUpdating = false;
            return;
        }

        this.lastUpdateTime = performance.now();
        this.updateFrameTime();

        // Update viewport size
        this.viewportSize.set(window.innerWidth, window.innerHeight);

        if (!this.nodes || !this.nodes.geometry) {
            this.isUpdating = false;
            return;
        }

        // Sample nodes for viewport size calculation
        const positions = this.nodes.geometry.attributes.position.array;
        const sizes = this.nodes.geometry.attributes.size.array;
        let totalViewportSize = 0;
        let sampleCount = 0;

        const step = Math.max(1, Math.floor(positions.length / 300));
        for (let i = 0; i < positions.length; i += step * 3) {
            this.tempVector.set(
                positions[i],
                positions[i + 1],
                positions[i + 2]
            );
            const viewportSize = this.getViewportSize(this.tempVector, sizes[i / 3]);
            totalViewportSize += viewportSize;
            sampleCount++;
        }

        const averageViewportSize = totalViewportSize / sampleCount;
        const newLOD = this.determineLODLevel(averageViewportSize);

        if (newLOD !== this.targetLOD) {
            this.startTransition(newLOD);
        }

        if (this.isTransitioning) {
            this.updateTransition();
        }

        this.pendingUpdates--;
        this.isUpdating = false;
    }

    startTransition(targetLOD) {
        this.targetLOD = targetLOD;
        this.transitionStartTime = performance.now();
        this.isTransitioning = true;
        this.lastTransitionTime = performance.now();
    }

    updateTransition() {
        const elapsed = performance.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / LOD_CONFIG.transition.duration, 1);

        if (progress >= 1) {
            this.isTransitioning = false;
            this.currentLOD = this.targetLOD;
            this.applyLOD(this.targetLOD, 1);
            return;
        }

        // Interpolate between current and target LOD
        this.applyLOD(this.targetLOD, progress);
    }

    applyLOD(targetLevel, progress) {
        if (!this.nodes || !this.edges || !this.originalEdgeGeometry) return;

        // Get the current buffer for updates
        const nodeBuffer = this.currentNodeBuffer === 'A' ? this.nodeBufferB : this.nodeBufferA;
        const edgeBuffer = this.currentEdgeBuffer === 'A' ? this.edgeBufferB : this.edgeBufferA;

        // Update node sizes in the buffer
        if (this.nodes.geometry.attributes.size && this.originalNodeSizes) {
            const targetMultiplier = LOD_CONFIG.nodeSizeMultipliers[targetLevel];
            const currentMultiplier = LOD_CONFIG.nodeSizeMultipliers[this.currentLOD];
            const interpolatedMultiplier = currentMultiplier + (targetMultiplier - currentMultiplier) * progress;

            for (let i = 0; i < this.originalNodeSizes.length; i++) {
                nodeBuffer[i] = this.originalNodeSizes[i] * interpolatedMultiplier;
            }
        }

        // Update edge detail in the buffer
        if (this.edges.geometry) {
            const targetDetail = LOD_CONFIG.edgeDetail[targetLevel];
            const currentDetail = LOD_CONFIG.edgeDetail[this.currentLOD];
            const interpolatedDetail = currentDetail + (targetDetail - currentDetail) * progress;

            const originalPositions = this.originalEdgeGeometry.attributes.position.array;
            const originalIndices = this.originalEdgeGeometry.index.array;

            const segmentSkip = Math.max(1, Math.floor(1 / interpolatedDetail));

            const newIndices = [];
            for (let i = 0; i < originalIndices.length - 1; i += 2) {
                if (i % segmentSkip === 0) {
                    newIndices.push(originalIndices[i], originalIndices[i + 1]);
                }
            }

            edgeBuffer.setIndex(newIndices);
            edgeBuffer.computeBoundingSphere();
        }

        // Swap buffers to apply changes
        this.swapBuffers();
    }

    determineLODLevel(viewportSize) {
        if (viewportSize > LOD_CONFIG.viewportSize.high) {
            return 'high';
        } else if (viewportSize > LOD_CONFIG.viewportSize.medium) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    getCurrentLOD() {
        return this.currentLOD;
    }

    swapBuffers() {
        if (this.currentNodeBuffer === 'A') {
            this.nodes.geometry.attributes.size.array.set(this.nodeBufferB);
            this.currentNodeBuffer = 'B';
        } else {
            this.nodes.geometry.attributes.size.array.set(this.nodeBufferA);
            this.currentNodeBuffer = 'A';
        }
        this.nodes.geometry.attributes.size.needsUpdate = true;

        if (this.edges) {
            if (this.currentEdgeBuffer === 'A') {
                this.edges.geometry = this.edgeBufferB;
                this.currentEdgeBuffer = 'B';
            } else {
                this.edges.geometry = this.edgeBufferA;
                this.currentEdgeBuffer = 'A';
            }
        }
    }
}

export { LODSystem, LOD_CONFIG };