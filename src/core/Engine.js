import * as THREE from 'three';

/**
 * Core rendering engine with HDR support and adaptive quality
 */
export class Engine {
    constructor(container) {
        this.container = container;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.qualityScale = 1.0;

        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.setupResize();

        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.updateCallbacks = [];
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(this.pixelRatio);

        // HDR support
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Enable shadow mapping (optional, can be toggled for performance)
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);
    }

    initScene() {
        this.scene = new THREE.Scene();
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV
            this.width / this.height,
            0.1,
            10000
        );
        this.camera.position.set(0, 50, 150);
        this.camera.lookAt(0, 0, 0);
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(
                this.width * this.qualityScale,
                this.height * this.qualityScale
            );
            this.renderer.domElement.style.width = this.width + 'px';
            this.renderer.domElement.style.height = this.height + 'px';
        });
    }

    /**
     * Set rendering quality scale (0.5 - 1.0)
     */
    setQualityScale(scale) {
        this.qualityScale = Math.max(0.5, Math.min(1.0, scale));
        this.renderer.setSize(
            this.width * this.qualityScale,
            this.height * this.qualityScale
        );
        this.renderer.domElement.style.width = this.width + 'px';
        this.renderer.domElement.style.height = this.height + 'px';
    }

    /**
     * Set tone mapping exposure
     */
    setExposure(exposure) {
        this.renderer.toneMappingExposure = exposure;
    }

    /**
     * Register update callback
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Remove update callback
     */
    offUpdate(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    /**
     * Main render loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // Call all update callbacks
        for (const callback of this.updateCallbacks) {
            callback(deltaTime, elapsedTime);
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Render with custom composer (for post-processing)
     */
    setComposer(composer) {
        this.composer = composer;

        // Override animate to use composer
        this.animate = () => {
            if (!this.isRunning) return;

            requestAnimationFrame(() => this.animate());

            const deltaTime = this.clock.getDelta();
            const elapsedTime = this.clock.getElapsedTime();

            for (const callback of this.updateCallbacks) {
                callback(deltaTime, elapsedTime);
            }

            if (this.composer) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        };
    }

    dispose() {
        this.stop();
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
