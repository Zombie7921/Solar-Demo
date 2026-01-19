import * as THREE from 'three';
import { CelestialBody } from './CelestialBody.js';

// Planet vertex shader with perturbation support
const planetVertexShader = `
uniform float uTime;
uniform vec2 uMouseUV;
uniform float uMouseSpeed;
uniform float uPerturbStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// Simplex noise
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

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    // Mouse perturbation - ripple effect
    // 将鼠标UV转为局部坐标近似值 (假设球体半径为1进行归一化比较)
    // 注意：这里的算法假设 UV 映射是标准的球体映射
    
    // 为了避免UV接缝处的材质分离，我们不依赖 UV 计算位移方向
    // 而是基于顶点位置和鼠标冲击中心(由UV估算)的球体表面距离
    
    // 将 UV 转换为近似的球面 3D 坐标
    float theta = uMouseUV.y * 3.14159; // 0 to PI
    float phi = uMouseUV.x * 2.0 * 3.14159; // 0 to 2PI
    
    // 注意：Three.js 默认 SphereGeometry UV 映射
    // y 0->1 对应 南极->北极 (theta PI->0)
    // x 0->1 对应 0->2PI
    
    theta = (1.0 - uMouseUV.y) * 3.14159; // 修正方向
    phi = (uMouseUV.x - 0.25) * 2.0 * 3.14159; // 修正相位偏移
    
    // 计算鼠标点击点的单位向量
    vec3 mouseDir = vec3(
        sin(theta) * cos(phi),
        cos(theta),
        sin(theta) * sin(phi)
    );
    
    // 计算当前顶点单位向量
    vec3 vertexDir = normalize(position);
    
    // 计算大圆距离 (弧度)
    float angleDist = acos(clamp(dot(vertexDir, mouseDir), -1.0, 1.0));
    
    // 使用半径归一化距离
    float dist = angleDist * length(position);
    
    // 限制最大速度，避免拉伸过长
    float clampedSpeed = clamp(uMouseSpeed, 0.0, 0.8);
    
    // 更局部的扰动范围 (增大衰减系数) 和 更快的波动
    float ripple = sin(dist * 20.0 - uTime * 10.0) * exp(-dist * 15.0);
    
    // 减小整体强度
    float mouseInfluence = ripple * clampedSpeed * uPerturbStrength * 0.5;
    
    // Subtle base noise
    float noise = snoise(position * 3.0 + uTime * 0.2) * 0.005;
    
    // 关键修正：位移方向应沿法线，确保纹理不撕裂
    vec3 newPosition = position + normal * (mouseInfluence + noise);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

// Planet fragment shader with sun-based lighting
const planetFragmentShader = `
uniform sampler2D uTexture;
uniform sampler2D uNormalMap;
uniform sampler2D uSpecularMap;
uniform vec3 uSunPosition;
uniform float uRoughness;
uniform float uMetalness;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Calculate light direction from sun
    vec3 lightDir = normalize(uSunPosition - vWorldPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // Normal
    vec3 normal = normalize(vNormal);
    
    // Diffuse lighting (Lambertian)
    float NdotL = dot(normal, lightDir);
    float diffuse = max(NdotL, 0.0);
    
    // Day/night transition (terminator)
    float terminator = smoothstep(-0.15, 0.25, NdotL);
    
    // Lit side
    vec3 litColor = texColor.rgb * diffuse * 1.2;
    
    // Dark side - subtle ambient to prevent complete black
    vec3 darkColor = texColor.rgb * 0.03;
    
    // Blend based on terminator
    vec3 finalColor = mix(darkColor, litColor, terminator);
    
    // Specular highlight
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0 * (1.0 - uRoughness));
    finalColor += vec3(1.0) * specular * (1.0 - uRoughness) * 0.3 * max(NdotL, 0.0);
    
    // Rim lighting for a subtle edge glow
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 4.0) * 0.15 * max(NdotL + 0.3, 0.0);
    finalColor += texColor.rgb * rim;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Minimal atmosphere shader - very subtle edge glow only
const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmosphereFragmentShader = `
uniform vec3 uAtmosphereColor;
uniform float uAtmosphereIntensity;
uniform vec3 uSunPosition;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 lightDir = normalize(uSunPosition - vPosition);
    
    // Fresnel effect - only at the very edge
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 5.0);
    
    // Only show atmosphere on lit side
    float sunFacing = dot(vNormal, lightDir);
    float visibility = smoothstep(-0.3, 0.3, sunFacing);
    
    vec3 atmosphereGlow = uAtmosphereColor * fresnel * uAtmosphereIntensity * visibility;
    
    // Very subtle alpha
    float alpha = fresnel * 0.3 * visibility;
    
    gl_FragColor = vec4(atmosphereGlow, alpha);
}
`;

/**
 * Standard planet with shader-based lighting and perturbation
 */
export class Planet extends CelestialBody {
    constructor(options = {}) {
        super(options);

        this.texture = options.texture;
        this.normalMap = options.normalMap || null;
        this.bumpMap = options.bumpMap || null;
        this.specularMap = options.specularMap || null;

        this.hasAtmosphere = options.hasAtmosphere || false;
        this.atmosphereColor = options.atmosphereColor || new THREE.Color(0.3, 0.6, 1.0);
        this.atmosphereScale = options.atmosphereScale || 1.02; // Reduced from 1.05
        this.atmosphereIntensity = options.atmosphereIntensity || 0.5; // Reduced

        this.roughness = options.roughness !== undefined ? options.roughness : 0.8;
        this.metalness = options.metalness !== undefined ? options.metalness : 0.0;

        this.segments = options.segments || 64;

        // Sun position for lighting
        this.sunPosition = options.sunPosition || new THREE.Vector3(0, 0, 0);

        // Perturbation state
        this.mouseUV = new THREE.Vector2(0.5, 0.5);
        this.mouseSpeed = 0;
        this.perturbStrength = 0.1;
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments);

        // Create shader material with sun-based lighting
        this.uniforms = {
            uTexture: { value: this.texture },
            uNormalMap: { value: this.normalMap },
            uSpecularMap: { value: this.specularMap },
            uSunPosition: { value: this.sunPosition },
            uRoughness: { value: this.roughness },
            uMetalness: { value: this.metalness },
            uTime: { value: 0 },
            uMouseUV: { value: this.mouseUV },
            uMouseSpeed: { value: 0 },
            uPerturbStrength: { value: this.perturbStrength }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: planetVertexShader,
            fragmentShader: planetFragmentShader,
            side: THREE.FrontSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);

        // Add atmosphere if enabled
        if (this.hasAtmosphere) {
            this.createAtmosphere();
        }

        return this.mesh;
    }

    createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(
            this.radius * this.atmosphereScale,
            32,
            32
        );

        this.atmosphereUniforms = {
            uAtmosphereColor: { value: this.atmosphereColor },
            uAtmosphereIntensity: { value: this.atmosphereIntensity },
            uSunPosition: { value: this.sunPosition }
        };

        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: this.atmosphereUniforms,
            vertexShader: atmosphereVertexShader,
            fragmentShader: atmosphereFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.group.add(this.atmosphere);
    }

    /**
     * Set sun position for lighting calculation
     */
    setSunPosition(position) {
        this.sunPosition.copy(position);
        if (this.uniforms && this.uniforms.uSunPosition) {
            this.uniforms.uSunPosition.value.copy(position);
        }
        if (this.atmosphereUniforms && this.atmosphereUniforms.uSunPosition) {
            this.atmosphereUniforms.uSunPosition.value.copy(position);
        }
    }

    /**
     * Update mouse info for perturbation
     */
    setMouseInfo(uv, speed) {
        this.mouseUV.copy(uv);
        this.mouseSpeed = speed;
        if (this.uniforms) {
            this.uniforms.uMouseUV.value.copy(uv);
            this.uniforms.uMouseSpeed.value = speed;
        }
    }

    /**
     * Enable/disable perturbation
     */
    setPerturbation(enabled, strength = 0.1) {
        this.perturbStrength = enabled ? strength : 0;
        if (this.uniforms) {
            this.uniforms.uPerturbStrength.value = this.perturbStrength;
        }
    }

    update(deltaTime, elapsedTime) {
        super.update(deltaTime, elapsedTime);

        if (this.uniforms && this.uniforms.uTime) {
            this.uniforms.uTime.value = elapsedTime;
        }
    }

    dispose() {
        super.dispose();
        if (this.atmosphere) {
            this.atmosphere.geometry.dispose();
            this.atmosphere.material.dispose();
        }
    }
}
