import * as THREE from 'three';

/**
 * Base class for all celestial bodies with orbital support
 */
export class CelestialBody {
    constructor(options = {}) {
        this.name = options.name || 'Unnamed';
        this.radius = options.radius || 1;
        this.displayRadius = options.displayRadius || this.radius; // For size normalization
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        this.rotationSpeed = options.rotationSpeed || 0.01;
        this.tilt = options.tilt || 0; // Axial tilt in radians

        // Orbital parameters
        this.orbitRadius = options.orbitRadius || 0;
        this.orbitSpeed = options.orbitSpeed || 0;
        this.orbitAngle = options.orbitAngle || Math.random() * Math.PI * 2; // Random start
        this.orbitCenter = options.orbitCenter || new THREE.Vector3(0, 0, 0);
        this.orbitInclination = options.orbitInclination || 0; // Slight orbital tilt
        this.orbitEccentricity = options.orbitEccentricity || 0; // 0 = circle, >0 = ellipse

        this.group = new THREE.Group();
        this.group.name = this.name;
        this.group.position.copy(this.position);

        // Apply axial tilt
        if (this.tilt !== 0) {
            this.group.rotation.z = this.tilt;
        }

        this.mesh = null;
        this.uniforms = {};
    }

    /**
     * Create the mesh (override in subclasses)
     */
    createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0x888888
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);

        return this.mesh;
    }

    /**
     * Set position
     */
    setPosition(x, y, z) {
        if (x instanceof THREE.Vector3) {
            this.position.copy(x);
        } else {
            this.position.set(x, y, z);
        }
        this.group.position.copy(this.position);
    }

    /**
     * Set orbit parameters
     */
    setOrbit(radius, speed, inclination = 0, eccentricity = 0) {
        this.orbitRadius = radius;
        this.orbitSpeed = speed;
        this.orbitInclination = inclination;
        this.orbitEccentricity = eccentricity;
    }

    /**
     * Get world position
     */
    getWorldPosition() {
        const worldPos = new THREE.Vector3();
        this.group.getWorldPosition(worldPos);
        return worldPos;
    }

    /**
     * Update orbital position
     */
    updateOrbit(deltaTime) {
        if (this.orbitRadius > 0 && this.orbitSpeed !== 0) {
            this.orbitAngle += this.orbitSpeed * deltaTime;

            // Calculate orbital position (with eccentricity for ellipse)
            const a = this.orbitRadius; // Semi-major axis
            const b = a * (1 - this.orbitEccentricity); // Semi-minor axis

            const x = this.orbitCenter.x + a * Math.cos(this.orbitAngle);
            const z = this.orbitCenter.z + b * Math.sin(this.orbitAngle);
            const y = this.orbitCenter.y + Math.sin(this.orbitAngle) * Math.sin(this.orbitInclination) * this.orbitRadius * 0.1;

            this.setPosition(x, y, z);
        }
    }

    /**
     * Update (called each frame)
     */
    update(deltaTime, elapsedTime) {
        // Update orbital position
        this.updateOrbit(deltaTime);

        // Rotate the body
        if (this.mesh && this.rotationSpeed !== 0) {
            this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        }

        // Update uniforms
        if (this.uniforms.uTime) {
            this.uniforms.uTime.value = elapsedTime;
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            if (this.mesh.material.dispose) {
                this.mesh.material.dispose();
            }
        }
    }
}
