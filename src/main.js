import { Engine } from './core/Engine.js';
import { ResourceManager } from './core/ResourceManager.js';
import { SceneManager } from './core/SceneManager.js';
import { SolarSystem } from './celestial/SolarSystem.js';
import { HDREnvironment } from './environment/HDREnvironment.js';
import { CameraController } from './interaction/CameraController.js';
import { InteractionController, InteractionState } from './interaction/InteractionController.js';
import { PostProcessing } from './effects/PostProcessing.js';
import { QualityManager } from './performance/QualityManager.js';

/**
 * Solar Cinder - Main Application
 */
class SolarCinderApp {
    constructor() {
        this.container = document.getElementById('app');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        this.fpsCounter = document.getElementById('fps-counter');
        this.planetNameEl = document.getElementById('planet-name');
        this.uiOverlay = document.getElementById('ui-overlay');

        this.engine = null;
        this.resourceManager = null;
        this.sceneManager = null;
        this.solarSystem = null;
        this.hdrEnvironment = null;
        this.cameraController = null;
        this.interactionController = null;
        this.postProcessing = null;
        this.qualityManager = null;

        this.uiVisible = true;

        this.init();
    }

    async init() {
        try {
            // Create engine
            this.engine = new Engine(this.container);

            // Create resource manager
            this.resourceManager = new ResourceManager();
            this.resourceManager.onProgress((progress, itemName) => {
                this.updateLoadingProgress(progress, itemName);
            });

            // Load all assets
            this.loadingText.textContent = 'Loading assets...';
            await this.resourceManager.preloadAll(this.engine.renderer);

            // Setup scene
            this.setupScene();

            // Hide loading screen
            this.hideLoadingScreen();

            // Start render loop
            this.engine.start();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

        } catch (error) {
            console.error('Failed to initialize Solar Cinder:', error);
            this.loadingText.textContent = 'Error: ' + error.message;
        }
    }

    updateLoadingProgress(progress, itemName) {
        const percent = Math.round(progress * 100);
        this.loadingBar.style.width = percent + '%';
        this.loadingText.textContent = itemName || 'Loading...';
    }

    hideLoadingScreen() {
        this.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 800);
    }

    setupScene() {
        // Create scene manager
        this.sceneManager = new SceneManager(this.engine.scene);

        // Setup HDR environment
        this.hdrEnvironment = new HDREnvironment(this.engine.scene, this.resourceManager);
        this.hdrEnvironment.init();

        // Create solar system
        this.solarSystem = new SolarSystem(this.resourceManager);
        this.solarSystem.create();
        this.engine.scene.add(this.solarSystem.group);

        // Setup camera controller
        this.cameraController = new CameraController(
            this.engine.camera,
            this.engine.renderer.domElement
        );

        // Setup interaction controller
        this.interactionController = new InteractionController(
            this.engine.camera,
            this.engine.renderer.domElement,
            this.solarSystem,
            this.cameraController
        );

        // Setup interaction callbacks
        this.interactionController.onStateChange = (state, body) => {
            this.onStateChange(state, body);
        };

        this.interactionController.onBodyHover = (body) => {
            this.onBodyHover(body);
        };

        // Setup post-processing
        this.postProcessing = new PostProcessing(
            this.engine.renderer,
            this.engine.scene,
            this.engine.camera
        );

        // Setup quality manager
        this.qualityManager = new QualityManager(this.engine, this.postProcessing);

        // Register update callback
        this.engine.onUpdate((deltaTime, elapsedTime) => {
            this.update(deltaTime, elapsedTime);
        });

        // Override engine render with post-processing
        this.engine.animate = () => {
            if (!this.engine.isRunning) return;

            requestAnimationFrame(() => this.engine.animate());

            const deltaTime = this.engine.clock.getDelta();
            const elapsedTime = this.engine.clock.getElapsedTime();

            for (const callback of this.engine.updateCallbacks) {
                callback(deltaTime, elapsedTime);
            }

            this.postProcessing.render();
        };
    }

    update(deltaTime, elapsedTime) {
        // Update camera controller
        this.cameraController.update();

        // Update interaction controller
        this.interactionController.update(deltaTime);

        // Update solar system
        this.solarSystem.update(deltaTime, elapsedTime);

        // Update quality manager
        this.qualityManager.update();

        // Update FPS counter
        if (this.fpsCounter && this.uiVisible) {
            this.fpsCounter.textContent = this.qualityManager.getFPSString();
        }
    }

    onStateChange(state, body) {
        if (state === InteractionState.FOCUS && body) {
            // Show planet name
            this.planetNameEl.textContent = body.name.toUpperCase();
            this.planetNameEl.classList.add('visible');
        } else if (state === InteractionState.GLOBAL) {
            // Hide planet name
            this.planetNameEl.classList.remove('visible');
        }
    }

    onBodyHover(body) {
        // Update cursor or show tooltip
        if (body && this.interactionController.state === InteractionState.GLOBAL) {
            this.planetNameEl.textContent = body.name.toUpperCase();
            this.planetNameEl.classList.add('visible');
        } else if (this.interactionController.state === InteractionState.GLOBAL) {
            this.planetNameEl.classList.remove('visible');
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    const prevName = this.hdrEnvironment.previous();
                    console.log('Environment:', prevName);
                    break;

                case 'ArrowRight':
                    const nextName = this.hdrEnvironment.next();
                    console.log('Environment:', nextName);
                    break;

                case 'h':
                case 'H':
                    this.toggleUI();
                    break;
            }
        });
    }

    toggleUI() {
        this.uiVisible = !this.uiVisible;
        if (this.uiVisible) {
            this.uiOverlay.classList.remove('ui-hidden');
        } else {
            this.uiOverlay.classList.add('ui-hidden');
        }
    }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
    new SolarCinderApp();
});
