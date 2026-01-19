/**
 * FPS Monitor with sliding window average
 */
export class FPSMonitor {
    constructor(sampleSize = 60) {
        this.sampleSize = sampleSize;
        this.samples = [];
        this.lastTime = performance.now();

        this.fps = 60;
        this.avgFps = 60;
        this.frameTime = 16.67;

        // Quality thresholds
        this.highQualityThreshold = 55;
        this.lowQualityThreshold = 30;

        // Callbacks
        this.onQualityChange = null;
        this.currentQuality = 'high';

        // Hysteresis to prevent rapid switching
        this.qualityChangeDelay = 60; // frames
        this.framesSinceQualityChange = 0;
    }

    /**
     * Update FPS measurement
     */
    update() {
        const currentTime = performance.now();
        this.frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.fps = 1000 / this.frameTime;

        // Add to samples
        this.samples.push(this.fps);
        if (this.samples.length > this.sampleSize) {
            this.samples.shift();
        }

        // Calculate average
        this.avgFps = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;

        this.framesSinceQualityChange++;

        // Check quality level
        this.checkQuality();

        return this.avgFps;
    }

    checkQuality() {
        if (this.framesSinceQualityChange < this.qualityChangeDelay) return;

        let newQuality = this.currentQuality;

        if (this.avgFps >= this.highQualityThreshold && this.currentQuality !== 'high') {
            newQuality = 'high';
        } else if (this.avgFps < this.lowQualityThreshold && this.currentQuality !== 'low') {
            newQuality = 'low';
        } else if (this.avgFps >= this.lowQualityThreshold &&
            this.avgFps < this.highQualityThreshold &&
            this.currentQuality !== 'medium') {
            newQuality = 'medium';
        }

        if (newQuality !== this.currentQuality) {
            this.currentQuality = newQuality;
            this.framesSinceQualityChange = 0;

            if (this.onQualityChange) {
                this.onQualityChange(newQuality);
            }
        }
    }

    /**
     * Get formatted FPS string
     */
    getFPSString() {
        return `${Math.round(this.avgFps)} FPS`;
    }

    /**
     * Get current quality level
     */
    getQuality() {
        return this.currentQuality;
    }
}

/**
 * Quality manager for adaptive rendering
 */
export class QualityManager {
    constructor(engine, postProcessing) {
        this.engine = engine;
        this.postProcessing = postProcessing;
        this.fpsMonitor = new FPSMonitor();

        // Quality presets
        this.presets = {
            high: {
                resolutionScale: 1.0,
                bloomEnabled: true,
                bloomStrength: 0.5,
                sphereSegments: 128
            },
            medium: {
                resolutionScale: 0.75,
                bloomEnabled: true,
                bloomStrength: 0.3,
                sphereSegments: 64
            },
            low: {
                resolutionScale: 0.5,
                bloomEnabled: false,
                bloomStrength: 0,
                sphereSegments: 32
            }
        };

        this.currentPreset = 'high';
        this.autoQuality = true;

        // Setup callback
        this.fpsMonitor.onQualityChange = (quality) => this.applyQuality(quality);
    }

    /**
     * Apply quality preset
     */
    applyQuality(quality) {
        const preset = this.presets[quality];
        if (!preset) return;

        this.currentPreset = quality;

        // Apply resolution scale
        this.engine.setQualityScale(preset.resolutionScale);

        // Apply bloom settings
        if (this.postProcessing) {
            this.postProcessing.setBloomEnabled(preset.bloomEnabled);
            if (preset.bloomEnabled) {
                this.postProcessing.setBloom(preset.bloomStrength, 0.4, 0.85);
            }
        }

        console.log(`Quality changed to: ${quality}`);
    }

    /**
     * Force a specific quality level
     */
    setQuality(quality) {
        this.autoQuality = false;
        this.applyQuality(quality);
    }

    /**
     * Enable auto quality
     */
    enableAutoQuality() {
        this.autoQuality = true;
    }

    /**
     * Update (call each frame)
     */
    update() {
        this.fpsMonitor.update();
    }

    /**
     * Get FPS string for display
     */
    getFPSString() {
        return this.fpsMonitor.getFPSString();
    }
}
