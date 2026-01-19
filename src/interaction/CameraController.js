import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

/**
 * Camera controller with smooth transitions, focus modes, and mouse-based view
 */
export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        // OrbitControls setup
        this.controls = new OrbitControls(camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 500;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;

        // State
        this.isTransitioning = false;
        this.focusedBody = null;

        // Default position
        this.defaultPosition = new THREE.Vector3(0, 80, 200);
        this.defaultTarget = new THREE.Vector3(0, 0, 0);

        // Focus mode parameters
        this.focusBaseDistance = 0;
        this.focusPosition = new THREE.Vector3();
        this.focusTarget = new THREE.Vector3();

        // Mouse-based view control in focus mode
        this.mouseInfluence = new THREE.Vector2(0, 0);
        this.targetMouseInfluence = new THREE.Vector2(0, 0);
        this.mouseViewEnabled = false;

        // Distance range for mouse-based zoom (normalized 0-1 mouse position)
        this.minDistanceMultiplier = 0.7;  // Mouse at center
        this.maxDistanceMultiplier = 1.5;  // Mouse at edge

        // Active tweens for killing
        this.activeTweens = [];

        // Store initial state
        this.camera.position.copy(this.defaultPosition);
        this.controls.target.copy(this.defaultTarget);
    }

    /**
     * Calculate camera distance for uniform screen size
     * Target: planet occupies ~60% of screen height
     */
    calculateFocusDistance(planetRadius, targetScreenRatio = 0.6) {
        const fovRadians = THREE.MathUtils.degToRad(this.camera.fov);
        const desiredAngularSize = fovRadians * targetScreenRatio;
        const distance = planetRadius / Math.tan(desiredAngularSize / 2);

        // Add margin to prevent clipping
        return distance * 1.3;
    }

    /**
     * Kill all active tweens
     */
    killAllTweens() {
        this.activeTweens.forEach(tween => {
            if (tween) {
                tween.kill();
            }
        });
        this.activeTweens = [];
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.controls.target);
    }

    /**
     * Smoothly focus on a celestial body
     */
    focusOnBody(body, duration = 1.2) {
        // Kill any existing animations
        this.killAllTweens();

        this.isTransitioning = true;
        this.focusedBody = body;
        this.mouseViewEnabled = false;

        const targetPosition = body.getWorldPosition();
        this.focusBaseDistance = this.calculateFocusDistance(body.radius);

        // Calculate camera position (offset from planet)
        const direction = new THREE.Vector3(0.5, 0.3, 1).normalize();
        const cameraTarget = targetPosition.clone().add(
            direction.multiplyScalar(this.focusBaseDistance)
        );

        // Store focus positions
        this.focusPosition.copy(cameraTarget);
        this.focusTarget.copy(targetPosition);

        // Disable controls during transition
        this.controls.enabled = false;

        // Animate camera position with smooth updates
        const posTween = gsap.to(this.camera.position, {
            x: cameraTarget.x,
            y: cameraTarget.y,
            z: cameraTarget.z,
            duration: duration,
            ease: "power2.inOut",
            onUpdate: () => {
                // Ensure camera always looks at target during transition
                this.camera.lookAt(this.controls.target);
            }
        });
        this.activeTweens.push(posTween);

        // Animate controls target
        const targetTween = gsap.to(this.controls.target, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: duration,
            ease: "power2.inOut",
            onComplete: () => {
                this.isTransitioning = false;
                this.controls.enabled = true;
                this.mouseViewEnabled = true;

                // Adjust min/max distance for focused body
                this.controls.minDistance = body.radius * 1.5;
                this.controls.maxDistance = body.radius * 15;
            }
        });
        this.activeTweens.push(targetTween);
    }

    /**
     * Return to overview mode
     */
    returnToOverview(duration = 1.2) {
        // Kill any existing animations
        this.killAllTweens();

        this.isTransitioning = true;
        this.focusedBody = null;
        this.mouseViewEnabled = false;

        // Disable controls during transition
        this.controls.enabled = false;

        // Animate camera position with smooth updates
        const posTween = gsap.to(this.camera.position, {
            x: this.defaultPosition.x,
            y: this.defaultPosition.y,
            z: this.defaultPosition.z,
            duration: duration,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.lookAt(this.controls.target);
            }
        });
        this.activeTweens.push(posTween);

        // Animate controls target
        const targetTween = gsap.to(this.controls.target, {
            x: this.defaultTarget.x,
            y: this.defaultTarget.y,
            z: this.defaultTarget.z,
            duration: duration,
            ease: "power2.inOut",
            onComplete: () => {
                this.isTransitioning = false;
                this.controls.enabled = true;

                // Reset min/max distance
                this.controls.minDistance = 5;
                this.controls.maxDistance = 500;
            }
        });
        this.activeTweens.push(targetTween);
    }

    /**
     * Update mouse influence for focus mode view
     * @param {number} mouseX - Normalized mouse X (-1 to 1, 0 = center)
     * @param {number} mouseY - Normalized mouse Y (-1 to 1, 0 = center)
     */
    updateMouseView(mouseX, mouseY) {
        if (!this.mouseViewEnabled || !this.focusedBody || this.isTransitioning) {
            return;
        }

        // Store target values for smooth interpolation
        this.targetMouseInfluence.set(mouseX, mouseY);
    }

    /**
     * Check if currently focused
     */
    isFocused() {
        return this.focusedBody !== null;
    }

    /**
     * Update controls and mouse-based view
     */
    update() {
        if (this.controls.enabled && !this.isTransitioning) {
            this.controls.update();
        }

        // Apply mouse-based view in focus mode
        if (this.mouseViewEnabled && this.focusedBody && !this.isTransitioning) {
            // Smooth interpolation of mouse influence
            this.mouseInfluence.lerp(this.targetMouseInfluence, 0.05);

            const body = this.focusedBody;
            const bodyPos = body.getWorldPosition();

            // Calculate distance based on mouse distance from center
            const mouseDistance = Math.sqrt(
                this.mouseInfluence.x * this.mouseInfluence.x +
                this.mouseInfluence.y * this.mouseInfluence.y
            );
            const distanceMultiplier = THREE.MathUtils.lerp(
                this.minDistanceMultiplier,
                this.maxDistanceMultiplier,
                Math.min(mouseDistance, 1)
            );

            // Calculate view angle offsets based on mouse position
            const horizontalAngle = this.mouseInfluence.x * 0.5; // Radians
            const verticalAngle = this.mouseInfluence.y * 0.4;   // Radians

            // Base direction with mouse-applied rotation
            const baseDirection = new THREE.Vector3(0.5, 0.3, 1).normalize();

            // Apply horizontal rotation (around up axis)
            const horizontalAxis = new THREE.Vector3(0, 1, 0);
            baseDirection.applyAxisAngle(horizontalAxis, horizontalAngle);

            // Apply vertical rotation (around right axis)
            const rightAxis = new THREE.Vector3(1, 0, 0);
            baseDirection.applyAxisAngle(rightAxis, verticalAngle);

            // Calculate target camera position
            const targetDistance = this.focusBaseDistance * distanceMultiplier;
            const targetCameraPos = bodyPos.clone().add(
                baseDirection.multiplyScalar(targetDistance)
            );

            // 关键修正：添加屏幕空间偏移（使星球跟随鼠标位置移动）
            // 计算相机右向量和上向量
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

            // 根据鼠标位置计算偏移量 (反向移动相机以产生物体移动的错觉)
            // 当鼠标在右边(x>0)，相机向左移，物体看起来向右移
            const screenOffsetX = this.mouseInfluence.x * this.focusBaseDistance * 0.4;
            const screenOffsetY = this.mouseInfluence.y * this.focusBaseDistance * 0.3;

            targetCameraPos.add(cameraRight.multiplyScalar(-screenOffsetX));
            targetCameraPos.add(cameraUp.multiplyScalar(-screenOffsetY));

            // Smooth camera movement
            this.camera.position.lerp(targetCameraPos, 0.08);

            // Update controls target to follow body (for orbiting planets)
            // 允许 target 也有轻微偏移，增加动态感
            const targetOffset = new THREE.Vector3()
                .add(cameraRight.multiplyScalar(-screenOffsetX * 0.2))
                .add(cameraUp.multiplyScalar(-screenOffsetY * 0.2));

            this.controls.target.lerp(bodyPos.clone().add(targetOffset), 0.1);
        }
    }

    dispose() {
        this.killAllTweens();
        this.controls.dispose();
    }
}
