import * as THREE from 'three';
import { Planet } from './Planet.js';

/**
 * Saturn with ring system
 */
export class Saturn extends Planet {
    constructor(options = {}) {
        super({
            name: 'Saturn',
            radius: options.radius || 9.4,
            rotationSpeed: options.rotationSpeed || 0.02,
            tilt: options.tilt || 0.4667, // 26.7 degrees
            hasAtmosphere: true,
            atmosphereColor: new THREE.Color(0.9, 0.8, 0.6),
            atmosphereScale: 1.03,
            atmosphereIntensity: 0.25,
            ...options
        });

        this.ringTexture = options.ringTexture;
        this.ringInnerRadius = options.ringInnerRadius || this.radius * 1.2;
        this.ringOuterRadius = options.ringOuterRadius || this.radius * 2.3;
    }

    createMesh() {
        // Create the main planet
        super.createMesh();

        // Create rings
        this.createRings();

        return this.mesh;
    }

    createRings() {
        // Create ring geometry with corrected UV mapping
        const ringGeometry = new THREE.RingGeometry(
            this.ringInnerRadius,
            this.ringOuterRadius,
            128,
            1
        );

        // Fix UV mapping for rings (radial mapping)
        const pos = ringGeometry.attributes.position;
        const uv = ringGeometry.attributes.uv;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const distance = Math.sqrt(x * x + y * y);

            // Map UV based on distance from center
            const u = (distance - this.ringInnerRadius) / (this.ringOuterRadius - this.ringInnerRadius);
            uv.setXY(i, u, 0.5);
        }

        // Ring material
        const ringMaterial = new THREE.MeshStandardMaterial({
            map: this.ringTexture,
            alphaMap: this.ringTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            roughness: 0.8,
            metalness: 0.1
        });

        this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
        this.rings.rotation.x = -Math.PI / 2; // Rotate to horizontal
        this.group.add(this.rings);
    }

    update(deltaTime, elapsedTime) {
        super.update(deltaTime, elapsedTime);

        // Rings don't rotate with the planet
    }

    dispose() {
        super.dispose();
        if (this.rings) {
            this.rings.geometry.dispose();
            this.rings.material.dispose();
        }
    }
}
