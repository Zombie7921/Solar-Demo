import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';

// Sun vertex shader
const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform float uTime;

// Simplex noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    // Apply surface perturbation
    float noise = snoise(position * 2.0 + uTime * 0.3);
    vec3 newPosition = position + normal * noise * 0.02;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

// Sun fragment shader
const sunFragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// FBM noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Add animated noise for solar activity
    vec2 noiseUv = vUv * 5.0 + uTime * 0.1;
    float solarNoise = fbm(noiseUv);
    
    // Hot spots
    float hotSpots = fbm(vUv * 10.0 + uTime * 0.2);
    hotSpots = smoothstep(0.4, 0.6, hotSpots);
    
    // Base sun color
    vec3 baseColor = texColor.rgb;
    
    // Add orange/yellow variation
    vec3 hotColor = vec3(1.0, 0.6, 0.1);
    vec3 coolerColor = vec3(1.0, 0.3, 0.05);
    
    vec3 finalColor = mix(baseColor, hotColor, solarNoise * 0.3);
    finalColor = mix(finalColor, coolerColor, hotSpots * 0.2);
    
    // Increase brightness
    finalColor *= 1.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Corona shader
const coronaVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const coronaFragmentShader = `
uniform float uTime;
uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    // View direction
    vec3 viewDir = normalize(cameraPosition - vPosition);
    
    // Fresnel effect - tighter edge glow
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 6.0);
    
    // Animated intensity (subtler)
    float pulse = sin(uTime * 0.5) * 0.05 + 0.95;
    
    // Reduced intensity
    vec3 coronaColor = uColor * fresnel * pulse * 0.8;
    
    gl_FragColor = vec4(coronaColor, fresnel * 0.4);
}
`;

/**
 * Sun celestial body with emissive glow and corona
 */
export class Sun extends CelestialBody {
    constructor(options = {}) {
        super({
            name: 'Sun',
            radius: options.radius || 10,
            rotationSpeed: options.rotationSpeed || 0.001,
            ...options
        });

        this.texture = options.texture;
    }

    createMesh() {
        // Main sun body
        const geometry = new THREE.SphereGeometry(this.radius, 128, 128);

        this.uniforms = {
            uTexture: { value: this.texture },
            uTime: { value: 0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader,
            side: THREE.FrontSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);

        // Corona glow
        this.createCorona();

        // Point light for illumination
        this.createLight();

        return this.mesh;
    }

    createCorona() {
        const coronaGeometry = new THREE.SphereGeometry(this.radius * 1.03, 64, 64);

        this.coronaUniforms = {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(1.0, 0.6, 0.2) }
        };

        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: this.coronaUniforms,
            vertexShader: coronaVertexShader,
            fragmentShader: coronaFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
        });

        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.group.add(this.corona);
    }

    createLight() {
        this.pointLight = new THREE.PointLight(0xffffff, 2, 0, 0.5);
        this.pointLight.position.set(0, 0, 0);
        this.group.add(this.pointLight);

        // Directional light for shadows (if needed)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.directionalLight.position.set(0, 0, 0);
        this.group.add(this.directionalLight);
    }

    update(deltaTime, elapsedTime) {
        super.update(deltaTime, elapsedTime);

        if (this.uniforms.uTime) {
            this.uniforms.uTime.value = elapsedTime;
        }
        if (this.coronaUniforms && this.coronaUniforms.uTime) {
            this.coronaUniforms.uTime.value = elapsedTime;
        }
    }

    dispose() {
        super.dispose();
        if (this.corona) {
            this.corona.geometry.dispose();
            this.corona.material.dispose();
        }
    }
}
