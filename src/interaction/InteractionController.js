import * as THREE from 'three';

/**
 * Interaction states
 */
export const InteractionState = {
    GLOBAL: 'GLOBAL',       // S0: Overview of solar system
    TRANSITION: 'TRANSITION', // T1/T2: Animating between states
    FOCUS: 'FOCUS'           // S1: Focused on a planet
};

/**
 * Interaction controller with state machine and mouse perturbation
 */
export class InteractionController {
    constructor(camera, domElement, solarSystem, cameraController) {
        this.camera = camera;
        this.domElement = domElement;
        this.solarSystem = solarSystem;
        this.cameraController = cameraController;

        // State
        this.state = InteractionState.GLOBAL;
        this.selectedBody = null;
        this.hoveredBody = null;

        // Raycaster for picking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Mouse tracking for perturbation and view control
        this.mousePosition = new THREE.Vector2();
        this.mouseVelocity = new THREE.Vector2();
        this.prevMousePosition = new THREE.Vector2();
        this.mouseNormalized = new THREE.Vector2(); // -1 to 1 range for view control

        // For UV coordinate calculation on planet surface
        this.lastHitUV = new THREE.Vector2(0.5, 0.5);
        this.mouseSpeed = 0;

        // Callbacks
        this.onStateChange = null;
        this.onBodySelect = null;
        this.onBodyHover = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse move
        this.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Click
        this.domElement.addEventListener('click', (e) => this.onClick(e));

        // Right click
        this.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.state === InteractionState.FOCUS) {
                this.returnToGlobal();
            }
        });

        // Keyboard
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onMouseMove(event) {
        // Update normalized mouse position
        this.prevMousePosition.copy(this.mousePosition);

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.mousePosition.x = event.clientX / window.innerWidth;
        this.mousePosition.y = event.clientY / window.innerHeight;

        // Normalized -1 to 1 for view control (0 = center)
        this.mouseNormalized.x = this.mouse.x;
        this.mouseNormalized.y = this.mouse.y;

        // Calculate velocity
        this.mouseVelocity.x = this.mousePosition.x - this.prevMousePosition.x;
        this.mouseVelocity.y = this.mousePosition.y - this.prevMousePosition.y;
        this.mouseSpeed = this.mouseVelocity.length() * 10; // Scale for visibility

        // Update camera view based on mouse position in focus mode
        if (this.state === InteractionState.FOCUS) {
            this.cameraController.updateMouseView(
                this.mouseNormalized.x,
                this.mouseNormalized.y
            );

            // Update perturbation on focused planet
            this.updatePerturbation();
        }

        // Raycast for hover
        if (this.state === InteractionState.GLOBAL) {
            this.updateHover();
        }
    }

    onClick(event) {
        // Allow click even during transition - will interrupt current animation
        if (this.state === InteractionState.GLOBAL) {
            // Try to select a planet
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const clickables = this.solarSystem.getClickableObjects();
            const intersects = this.raycaster.intersectObjects(clickables);

            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                const body = mesh.userData.celestialBody;

                if (body) {
                    this.focusOnBody(body);
                }
            }
        }
    }

    onKeyDown(event) {
        switch (event.key) {
            case 'Escape':
                if (this.state === InteractionState.FOCUS || this.state === InteractionState.TRANSITION) {
                    this.returnToGlobal();
                }
                break;
        }
    }

    updateHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const clickables = this.solarSystem.getClickableObjects();
        const intersects = this.raycaster.intersectObjects(clickables);

        const prevHovered = this.hoveredBody;

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const body = mesh.userData.celestialBody;
            this.hoveredBody = body;
            this.domElement.style.cursor = 'pointer';
        } else {
            this.hoveredBody = null;
            this.domElement.style.cursor = 'default';
        }

        if (prevHovered !== this.hoveredBody && this.onBodyHover) {
            this.onBodyHover(this.hoveredBody);
        }
    }

    /**
     * Update perturbation effect on focused/hovered planet
     */
    updatePerturbation() {
        if (!this.selectedBody) return;

        // Raycast to get UV coordinates on planet surface
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.selectedBody.mesh);

        if (intersects.length > 0) {
            const hit = intersects[0];

            if (hit.uv) {
                this.lastHitUV.copy(hit.uv);
            }

            // Update planet's perturbation based on mouse movement
            if (this.selectedBody.setMouseInfo) {
                this.selectedBody.setMouseInfo(this.lastHitUV, this.mouseSpeed);
            }

            // Enable perturbation
            if (this.selectedBody.setPerturbation) {
                this.selectedBody.setPerturbation(true, 0.15);
            }
        }
    }

    focusOnBody(body) {
        // Immediately update state
        this.state = InteractionState.TRANSITION;
        this.selectedBody = body;

        // Enable perturbation on the focused body
        if (body.setPerturbation) {
            body.setPerturbation(true, 0.15);
        }

        if (this.onStateChange) {
            this.onStateChange(InteractionState.TRANSITION, body);
        }

        this.cameraController.focusOnBody(body, 1.2);

        // Transition to focus after animation
        setTimeout(() => {
            if (this.selectedBody === body) { // Check if still the same body
                this.state = InteractionState.FOCUS;
                if (this.onStateChange) {
                    this.onStateChange(InteractionState.FOCUS, body);
                }
                if (this.onBodySelect) {
                    this.onBodySelect(body);
                }
            }
        }, 1200);
    }

    returnToGlobal() {
        // Disable perturbation on previously focused body
        if (this.selectedBody && this.selectedBody.setPerturbation) {
            this.selectedBody.setPerturbation(false);
        }

        this.state = InteractionState.TRANSITION;

        if (this.onStateChange) {
            this.onStateChange(InteractionState.TRANSITION, null);
        }

        this.cameraController.returnToOverview(1.2);

        // Transition to global after animation
        setTimeout(() => {
            this.state = InteractionState.GLOBAL;
            this.selectedBody = null;
            if (this.onStateChange) {
                this.onStateChange(InteractionState.GLOBAL, null);
            }
        }, 1200);
    }

    /**
     * Get current mouse info for perturbation effects
     */
    getMouseInfo() {
        return {
            position: this.mousePosition.clone(),
            velocity: this.mouseVelocity.clone(),
            speed: this.mouseSpeed,
            uv: this.lastHitUV.clone()
        };
    }

    update(deltaTime) {
        // Decay mouse velocity/speed
        this.mouseVelocity.multiplyScalar(0.9);
        this.mouseSpeed *= 0.75; // Faster decay for quicker rebound
    }

    dispose() {
        // Remove event listeners
    }
}
