import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';

// Earth day/night shader
const earthVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const earthFragmentShader = `
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uNormalMap;
uniform sampler2D uSpecularMap;
uniform vec3 uSunPosition;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    // Calculate light direction from sun
    vec3 lightDir = normalize(uSunPosition - vWorldPosition);
    
    // Get textures
    vec4 dayColor = texture2D(uDayMap, vUv);
    vec4 nightColor = texture2D(uNightMap, vUv);
    
    // Normal mapping
    vec3 normal = vNormal;
    
    // Calculate diffuse lighting
    float NdotL = dot(normal, lightDir);
    
    // Terminator (day/night transition)
    float terminator = smoothstep(-0.1, 0.3, NdotL);
    
    // Day side
    float diffuse = max(NdotL, 0.0);
    vec3 dayLit = dayColor.rgb * diffuse;
    
    // Night side (city lights)
    float nightIntensity = smoothstep(0.0, -0.2, NdotL);
    vec3 nightLit = nightColor.rgb * nightIntensity * 1.5;
    
    // Combine day and night
    vec3 finalColor = mix(nightLit, dayLit, terminator);
    
    // Add subtle ambient
    finalColor += dayColor.rgb * 0.02;
    
    // Specular highlight on oceans
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);
    float specularMask = texture2D(uSpecularMap, vUv).r;
    finalColor += vec3(1.0) * specular * specularMask * 0.5 * max(NdotL, 0.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Earth atmosphere shader
const earthAtmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const earthAtmosphereFragmentShader = `
uniform vec3 uSunPosition;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 lightDir = normalize(uSunPosition - vPosition);
    
    // Fresnel for atmosphere rim - reduced intensity
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 5.0);
    
    // Atmospheric scattering color based on sun position
    float sunAngle = dot(vNormal, lightDir);
    
    // Blue for day side, orange/red for twilight
    vec3 dayAtmosphere = vec3(0.3, 0.6, 1.0);
    vec3 twilightAtmosphere = vec3(1.0, 0.4, 0.2);
    
    float twilightFactor = smoothstep(-0.2, 0.1, sunAngle);
    vec3 atmosphereColor = mix(twilightAtmosphere, dayAtmosphere, twilightFactor);
    
    // Only show atmosphere on sun-facing side
    float visibility = smoothstep(-0.3, 0.2, sunAngle);
    
    vec3 finalColor = atmosphereColor * fresnel * (0.5 + visibility * 0.3);
    
    // Reduced alpha for subtler effect
    gl_FragColor = vec4(finalColor, fresnel * 0.35 * visibility);
}
`;

/**
 * Earth with multi-layer rendering (surface, night lights, clouds, atmosphere)
 */
export class Earth extends CelestialBody {
    constructor(options = {}) {
        super({
            name: 'Earth',
            radius: options.radius || 1,
            rotationSpeed: options.rotationSpeed || 0.01,
            tilt: options.tilt || 0.4101, // 23.5 degrees
            ...options
        });

        this.dayTexture = options.dayTexture;
        this.nightTexture = options.nightTexture;
        this.cloudsTexture = options.cloudsTexture;
        this.normalMap = options.normalMap;
        this.specularMap = options.specularMap;

        this.sunPosition = options.sunPosition || new THREE.Vector3(0, 0, 0);
        this.cloudRotationSpeed = 0.002;
    }

    createMesh() {
        // Main Earth surface with day/night shader
        const geometry = new THREE.SphereGeometry(this.radius, 128, 128);

        this.uniforms = {
            uDayMap: { value: this.dayTexture },
            uNightMap: { value: this.nightTexture },
            uNormalMap: { value: this.normalMap },
            uSpecularMap: { value: this.specularMap },
            uSunPosition: { value: this.sunPosition },
            uTime: { value: 0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: earthVertexShader,
            fragmentShader: earthFragmentShader,
            side: THREE.FrontSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);

        // Clouds layer
        this.createClouds();

        // Atmosphere layer
        this.createAtmosphere();

        return this.mesh;
    }

    createClouds() {
        if (!this.cloudsTexture) return;

        const cloudsGeometry = new THREE.SphereGeometry(this.radius * 1.01, 64, 64);
        const cloudsMaterial = new THREE.MeshStandardMaterial({
            map: this.cloudsTexture,
            alphaMap: this.cloudsTexture,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });

        this.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        this.group.add(this.clouds);
    }

    createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(this.radius * 1.03, 64, 64);

        this.atmosphereUniforms = {
            uSunPosition: { value: this.sunPosition }
        };

        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: this.atmosphereUniforms,
            vertexShader: earthAtmosphereVertexShader,
            fragmentShader: earthAtmosphereFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.group.add(this.atmosphere);
    }

    setSunPosition(position) {
        this.sunPosition.copy(position);
        if (this.uniforms.uSunPosition) {
            this.uniforms.uSunPosition.value.copy(position);
        }
        if (this.atmosphereUniforms && this.atmosphereUniforms.uSunPosition) {
            this.atmosphereUniforms.uSunPosition.value.copy(position);
        }
    }

    update(deltaTime, elapsedTime) {
        super.update(deltaTime, elapsedTime);

        // Rotate clouds at different speed
        if (this.clouds) {
            this.clouds.rotation.y += this.cloudRotationSpeed * deltaTime;
        }
    }

    dispose() {
        super.dispose();
        if (this.clouds) {
            this.clouds.geometry.dispose();
            this.clouds.material.dispose();
        }
        if (this.atmosphere) {
            this.atmosphere.geometry.dispose();
            this.atmosphere.material.dispose();
        }
    }
}
