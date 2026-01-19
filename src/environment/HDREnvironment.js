/**
 * HDR Environment manager for loading and switching nebulae
 */
export class HDREnvironment {
    constructor(scene, resourceManager) {
        this.scene = scene;
        this.resourceManager = resourceManager;

        this.environments = [];
        this.currentIndex = 0;
        this.currentEnvMap = null;

        // Environment names for display
        this.environmentNames = [
            'Blue Nebula',
            'Multi-Color Nebula',
            'Silver & Gold Nebula'
        ];
    }

    /**
     * Initialize with loaded HDR textures
     */
    init() {
        const hdrNames = ['nebula_blue', 'nebula_multi', 'nebula_gold'];

        for (const name of hdrNames) {
            const hdr = this.resourceManager.getHDR(name);
            if (hdr) {
                this.environments.push({
                    name: name,
                    envMap: hdr.envMap,
                    original: hdr.original
                });
            }
        }

        // Set initial environment
        if (this.environments.length > 0) {
            this.setEnvironment(0);
        }
    }

    /**
     * Set environment by index
     */
    setEnvironment(index) {
        if (index < 0 || index >= this.environments.length) return;

        this.currentIndex = index;
        const env = this.environments[index];

        this.scene.environment = env.envMap;
        this.scene.background = env.envMap;
        this.currentEnvMap = env.envMap;
    }

    /**
     * Switch to next environment
     */
    next() {
        const nextIndex = (this.currentIndex + 1) % this.environments.length;
        this.setEnvironment(nextIndex);
        return this.getCurrentName();
    }

    /**
     * Switch to previous environment
     */
    previous() {
        const prevIndex = (this.currentIndex - 1 + this.environments.length) % this.environments.length;
        this.setEnvironment(prevIndex);
        return this.getCurrentName();
    }

    /**
     * Get current environment name
     */
    getCurrentName() {
        return this.environmentNames[this.currentIndex] || 'Unknown';
    }

    /**
     * Get current environment map
     */
    getEnvMap() {
        return this.currentEnvMap;
    }

    dispose() {
        // Textures are managed by ResourceManager
    }
}
