import * as THREE from 'three';
import { Sun } from './Sun.js';
import { Planet } from './Planet.js';
import { Earth } from './Earth.js';
import { Saturn } from './Saturn.js';

/**
 * Solar system configuration and assembly
 */
export class SolarSystem {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.bodies = new Map();
        this.group = new THREE.Group();

        // Distance scale (logarithmic compression for visibility)
        this.distanceScale = 15;

        // Size scale with minimum size for visibility
        this.sizeScale = 1;
        this.minDisplaySize = 1.2; // Minimum visible size
        this.maxDisplaySize = 8; // Cap for large planets

        // Sun position (origin)
        this.sunPosition = new THREE.Vector3(0, 0, 0);
    }

    /**
     * Normalize planet size for visibility
     * Uses logarithmic scaling to make small planets visible while keeping large ones reasonable
     */
    normalizeSize(originalRadius) {
        // Apply logarithmic scaling for better visibility
        const logScaled = Math.log(originalRadius + 1) * 2;

        // Clamp between min and max
        return Math.max(this.minDisplaySize, Math.min(this.maxDisplaySize, logScaled));
    }

    /**
     * Create all celestial bodies
     */
    create() {
        this.createSun();
        this.createMercury();
        this.createVenus();
        this.createEarth();
        this.createMoon();
        this.createMars();
        this.createJupiter();
        this.createSaturn();
        this.createUranus();
        this.createNeptune();
    }

    createSun() {
        const sun = new Sun({
            radius: 12 * this.sizeScale,
            texture: this.resourceManager.getTexture('sun'),
            rotationSpeed: 0.001
        });
        sun.createMesh();
        this.addBody(sun);
    }

    createMercury() {
        const orbitRadius = 25 * this.distanceScale / 15;
        const mercury = new Planet({
            name: 'Mercury',
            radius: this.normalizeSize(0.8),
            texture: this.resourceManager.getTexture('mercury'),
            rotationSpeed: 0.005,
            roughness: 0.95,
            hasAtmosphere: false,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.15, // Fastest orbit
            orbitInclination: 0.12
        });
        mercury.createMesh();
        this.addBody(mercury);
    }

    createVenus() {
        const orbitRadius = 35 * this.distanceScale / 15;
        const venus = new Planet({
            name: 'Venus',
            radius: this.normalizeSize(1.5),
            texture: this.resourceManager.getTexture('venus'),
            rotationSpeed: -0.002, // Retrograde rotation
            roughness: 0.9,
            hasAtmosphere: true,
            atmosphereColor: new THREE.Color(1.0, 0.9, 0.7),
            atmosphereScale: 1.02,
            atmosphereIntensity: 0.4,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.12,
            orbitInclination: 0.06
        });
        venus.createMesh();
        this.addBody(venus);
    }

    createEarth() {
        const orbitRadius = 50 * this.distanceScale / 15;
        const earth = new Earth({
            radius: this.normalizeSize(1.6),
            dayTexture: this.resourceManager.getTexture('earth_day'),
            nightTexture: this.resourceManager.getTexture('earth_night'),
            cloudsTexture: this.resourceManager.getTexture('earth_clouds'),
            normalMap: this.resourceManager.getTexture('earth_normal'),
            specularMap: this.resourceManager.getTexture('earth_specular'),
            rotationSpeed: 0.01,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.1,
            orbitInclination: 0.04
        });
        earth.createMesh();
        this.addBody(earth);
    }

    createMoon() {
        // Moon orbits Earth, so we handle it differently
        const earth = this.getBody('Earth');
        const moonOrbitRadius = 5;
        const moon = new Planet({
            name: 'Moon',
            radius: this.normalizeSize(0.4),
            texture: this.resourceManager.getTexture('moon'),
            rotationSpeed: 0.005,
            roughness: 0.95,
            hasAtmosphere: false,
            sunPosition: this.sunPosition,
            orbitRadius: moonOrbitRadius,
            orbitSpeed: 0.3,
            orbitCenter: earth ? earth.getWorldPosition() : new THREE.Vector3(50, 0, 0)
        });
        moon.createMesh();
        moon.isMoon = true; // Mark as moon for special handling
        moon.parentBody = earth;
        this.addBody(moon);
    }

    createMars() {
        const orbitRadius = 65 * this.distanceScale / 15;
        const mars = new Planet({
            name: 'Mars',
            radius: this.normalizeSize(1.0),
            texture: this.resourceManager.getTexture('mars'),
            rotationSpeed: 0.009,
            roughness: 0.9,
            hasAtmosphere: true,
            atmosphereColor: new THREE.Color(1.0, 0.6, 0.4),
            atmosphereScale: 1.01,
            atmosphereIntensity: 0.15,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.08,
            orbitInclination: 0.03
        });
        mars.createMesh();
        this.addBody(mars);
    }

    createJupiter() {
        const orbitRadius = 95 * this.distanceScale / 15;
        const jupiter = new Planet({
            name: 'Jupiter',
            radius: this.normalizeSize(6.0),
            texture: this.resourceManager.getTexture('jupiter'),
            rotationSpeed: 0.02,
            roughness: 0.7,
            hasAtmosphere: true,
            atmosphereColor: new THREE.Color(0.9, 0.8, 0.7),
            atmosphereScale: 1.01,
            atmosphereIntensity: 0.2,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.04,
            orbitInclination: 0.02
        });
        jupiter.createMesh();
        this.addBody(jupiter);
    }

    createSaturn() {
        const orbitRadius = 130 * this.distanceScale / 15;
        const saturn = new Saturn({
            radius: this.normalizeSize(5.0),
            texture: this.resourceManager.getTexture('saturn'),
            ringTexture: this.resourceManager.getTexture('saturn_ring'),
            rotationSpeed: 0.018,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.03,
            orbitInclination: 0.04
        });
        saturn.createMesh();
        this.addBody(saturn);
    }

    createUranus() {
        const orbitRadius = 170 * this.distanceScale / 15;
        const uranus = new Planet({
            name: 'Uranus',
            radius: this.normalizeSize(2.5),
            texture: this.resourceManager.getTexture('uranus'),
            rotationSpeed: -0.012, // Retrograde
            tilt: 1.7065, // 97.8 degrees - almost sideways!
            roughness: 0.6,
            hasAtmosphere: true,
            atmosphereColor: new THREE.Color(0.5, 0.8, 0.9),
            atmosphereScale: 1.02,
            atmosphereIntensity: 0.3,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.02,
            orbitInclination: 0.01
        });
        uranus.createMesh();
        this.addBody(uranus);
    }

    createNeptune() {
        const orbitRadius = 210 * this.distanceScale / 15;
        const neptune = new Planet({
            name: 'Neptune',
            radius: this.normalizeSize(2.4),
            texture: this.resourceManager.getTexture('neptune'),
            rotationSpeed: 0.011,
            roughness: 0.6,
            hasAtmosphere: true,
            atmosphereColor: new THREE.Color(0.3, 0.5, 1.0),
            atmosphereScale: 1.02,
            atmosphereIntensity: 0.35,
            sunPosition: this.sunPosition,
            orbitRadius: orbitRadius,
            orbitSpeed: 0.015,
            orbitInclination: 0.03
        });
        neptune.createMesh();
        this.addBody(neptune);
    }

    addBody(body) {
        this.bodies.set(body.name, body);
        this.group.add(body.group);
    }

    getBody(name) {
        return this.bodies.get(name);
    }

    getAllBodies() {
        return Array.from(this.bodies.values());
    }

    getClickableObjects() {
        const clickable = [];
        for (const body of this.bodies.values()) {
            if (body.mesh) {
                clickable.push(body.mesh);
            }
        }
        return clickable;
    }

    update(deltaTime, elapsedTime) {
        for (const body of this.bodies.values()) {
            // Update moon's orbit center to follow Earth
            if (body.isMoon && body.parentBody) {
                body.orbitCenter.copy(body.parentBody.getWorldPosition());
            }

            // Update sun position for lighting (sun is at origin)
            if (body.setSunPosition) {
                body.setSunPosition(this.sunPosition);
            }

            body.update(deltaTime, elapsedTime);
        }
    }

    dispose() {
        for (const body of this.bodies.values()) {
            body.dispose();
        }
        this.bodies.clear();
    }
}
