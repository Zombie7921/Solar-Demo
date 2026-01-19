import * as THREE from 'three';

// Perturbation vertex shader with noise
const perturbationVertexShader = `
uniform float uTime;
uniform float uPerturbStrength;
uniform vec2 uMousePosition;
uniform float uMouseSpeed;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simplex noise functions
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
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
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

// FBM for more complex patterns
float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for(int i = 0; i < 4; i++) {
        value += amplitude * snoise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    // Base noise perturbation
    float noise = fbm(position * 2.0 + uTime * 0.3);
    
    // Mouse influence (based on UV distance to mouse)
    float mouseDist = distance(uv, uMousePosition);
    float mouseInfluence = smoothstep(0.5, 0.0, mouseDist);
    
    // Combine perturbation
    float totalPerturb = noise * uPerturbStrength;
    totalPerturb += mouseInfluence * uMouseSpeed * 0.5;
    
    vec3 newPosition = position + normal * totalPerturb;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const perturbationFragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    gl_FragColor = texColor;
}
`;

/**
 * Perturbation effect for focus mode
 */
export class PerturbationEffect {
    constructor() {
        this.enabled = false;
        this.strength = 0.02;
        this.mousePosition = new THREE.Vector2(0.5, 0.5);
        this.mouseSpeed = 0;

        this.uniforms = {
            uTime: { value: 0 },
            uPerturbStrength: { value: this.strength },
            uMousePosition: { value: this.mousePosition },
            uMouseSpeed: { value: 0 },
            uTexture: { value: null }
        };
    }

    /**
     * Create a perturbed material for a texture
     */
    createMaterial(texture) {
        const uniforms = {
            ...this.uniforms,
            uTexture: { value: texture }
        };

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: perturbationVertexShader,
            fragmentShader: perturbationFragmentShader,
            side: THREE.FrontSide
        });
    }

    /**
     * Update mouse info
     */
    setMouseInfo(position, speed) {
        this.mousePosition.copy(position);
        this.mouseSpeed = speed;
        this.uniforms.uMousePosition.value.copy(position);
        this.uniforms.uMouseSpeed.value = speed;
    }

    /**
     * Set perturbation strength
     */
    setStrength(strength) {
        this.strength = strength;
        this.uniforms.uPerturbStrength.value = strength;
    }

    /**
     * Enable/disable effect
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.uniforms.uPerturbStrength.value = enabled ? this.strength : 0;
    }

    /**
     * Update time uniform
     */
    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;
    }
}
