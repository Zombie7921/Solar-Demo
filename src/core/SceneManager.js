import * as THREE from 'three';

/**
 * Scene manager for organizing scene objects
 */
export class SceneManager {
    constructor(scene) {
        this.scene = scene;

        // Object groups
        this.solarSystemGroup = new THREE.Group();
        this.solarSystemGroup.name = 'SolarSystem';

        this.effectsGroup = new THREE.Group();
        this.effectsGroup.name = 'Effects';

        this.scene.add(this.solarSystemGroup);
        this.scene.add(this.effectsGroup);

        // Track celestial bodies
        this.celestialBodies = new Map();

        // Current environment
        this.currentEnvironment = null;
    }

    /**
     * Add a celestial body to the scene
     */
    addCelestialBody(body) {
        this.celestialBodies.set(body.name, body);
        this.solarSystemGroup.add(body.group);
    }

    /**
     * Get a celestial body by name
     */
    getCelestialBody(name) {
        return this.celestialBodies.get(name);
    }

    /**
     * Get all celestial bodies
     */
    getAllCelestialBodies() {
        return Array.from(this.celestialBodies.values());
    }

    /**
     * Get all clickable objects for raycasting
     */
    getClickableObjects() {
        const clickable = [];
        for (const body of this.celestialBodies.values()) {
            if (body.mesh) {
                clickable.push(body.mesh);
            }
        }
        return clickable;
    }

    /**
     * Set the HDR environment
     */
    setEnvironment(envMap, background = true) {
        this.scene.environment = envMap;
        if (background) {
            this.scene.background = envMap;
        }
        this.currentEnvironment = envMap;
    }

    /**
     * Update all celestial bodies
     */
    update(deltaTime, elapsedTime) {
        for (const body of this.celestialBodies.values()) {
            if (body.update) {
                body.update(deltaTime, elapsedTime);
            }
        }
    }

    /**
     * Dispose all objects
     */
    dispose() {
        for (const body of this.celestialBodies.values()) {
            if (body.dispose) {
                body.dispose();
            }
        }
        this.celestialBodies.clear();
    }
}
