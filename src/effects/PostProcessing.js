import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Custom tone mapping shader
const ToneMappingShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'exposure': { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float exposure;
        varying vec2 vUv;
        
        // ACES filmic tone mapping
        vec3 ACESFilm(vec3 x) {
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;
            return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }
        
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 mapped = ACESFilm(color.rgb * exposure);
            
            // Gamma correction
            mapped = pow(mapped, vec3(1.0 / 2.2));
            
            gl_FragColor = vec4(mapped, color.a);
        }
    `
};

/**
 * Post-processing effects manager
 */
export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.composer = null;
        this.bloomPass = null;
        this.toneMappingPass = null;

        this.enabled = true;
        this.bloomStrength = 0.5;
        this.bloomRadius = 0.4;
        this.bloomThreshold = 0.85;
        this.exposure = 1.0;

        this.init();
    }

    init() {
        const size = this.renderer.getSize(new THREE.Vector2());

        // Create composer
        this.composer = new EffectComposer(this.renderer);

        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(size.x, size.y),
            this.bloomStrength,
            this.bloomRadius,
            this.bloomThreshold
        );
        this.composer.addPass(this.bloomPass);

        // Tone mapping pass
        this.toneMappingPass = new ShaderPass(ToneMappingShader);
        this.toneMappingPass.uniforms.exposure.value = this.exposure;
        this.composer.addPass(this.toneMappingPass);
    }

    /**
     * Set bloom parameters
     */
    setBloom(strength, radius, threshold) {
        this.bloomStrength = strength;
        this.bloomRadius = radius;
        this.bloomThreshold = threshold;

        if (this.bloomPass) {
            this.bloomPass.strength = strength;
            this.bloomPass.radius = radius;
            this.bloomPass.threshold = threshold;
        }
    }

    /**
     * Set exposure
     */
    setExposure(exposure) {
        this.exposure = exposure;
        if (this.toneMappingPass) {
            this.toneMappingPass.uniforms.exposure.value = exposure;
        }
    }

    /**
     * Enable/disable bloom
     */
    setBloomEnabled(enabled) {
        if (this.bloomPass) {
            this.bloomPass.enabled = enabled;
        }
    }

    /**
     * Update on resize
     */
    resize(width, height) {
        this.composer.setSize(width, height);
        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height);
        }
    }

    /**
     * Render
     */
    render() {
        if (this.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        // Dispose passes
    }
}
