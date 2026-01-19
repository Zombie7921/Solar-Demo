import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * Resource manager for loading and caching textures
 */
export class ResourceManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.rgbeLoader = new RGBELoader();

        this.textures = new Map();
        this.hdrTextures = new Map();

        this.loadingProgress = 0;
        this.totalItems = 0;
        this.loadedItems = 0;

        this.onProgressCallback = null;
    }

    /**
     * Set progress callback
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * Update loading progress
     */
    updateProgress(itemName) {
        this.loadedItems++;
        this.loadingProgress = this.loadedItems / this.totalItems;

        if (this.onProgressCallback) {
            this.onProgressCallback(this.loadingProgress, itemName);
        }
    }

    /**
     * Load a standard texture
     */
    async loadTexture(path, name) {
        if (this.textures.has(name)) {
            return this.textures.get(name);
        }

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.textures.set(name, texture);
                    this.updateProgress(name);
                    resolve(texture);
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Load an HDR texture
     */
    async loadHDR(path, name, renderer) {
        if (this.hdrTextures.has(name)) {
            return this.hdrTextures.get(name);
        }

        return new Promise((resolve, reject) => {
            this.rgbeLoader.load(
                path,
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;

                    // Generate PMREM for IBL
                    const pmremGenerator = new THREE.PMREMGenerator(renderer);
                    pmremGenerator.compileEquirectangularShader();

                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;

                    this.hdrTextures.set(name, {
                        original: texture,
                        envMap: envMap
                    });

                    pmremGenerator.dispose();
                    this.updateProgress(name);

                    resolve({ original: texture, envMap: envMap });
                },
                (progress) => {
                    // HDR files are large, show loading progress
                    if (progress.lengthComputable) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(0);
                        if (this.onProgressCallback) {
                            this.onProgressCallback(
                                this.loadingProgress + (percent / 100) / this.totalItems,
                                `${name}: ${percent}%`
                            );
                        }
                    }
                },
                (error) => reject(error)
            );
        });
    }

    /**
     * Preload all required assets
     */
    async preloadAll(renderer) {
        const planetTextures = [
            { path: 'planet_texuture/8k_sun.jpg', name: 'sun' },
            { path: 'planet_texuture/8k_mercury.jpg', name: 'mercury' },
            { path: 'planet_texuture/8k_venus_surface.jpg', name: 'venus' },
            { path: 'planet_texuture/4k_venus_atmosphere.jpg', name: 'venus_atmosphere' },
            { path: 'planet_texuture/8k_earth_daymap.jpg', name: 'earth_day' },
            { path: 'planet_texuture/8k_earth_nightmap.jpg', name: 'earth_night' },
            { path: 'planet_texuture/8k_earth_clouds.jpg', name: 'earth_clouds' },
            { path: 'planet_texuture/8k_earth_normal_map.tif', name: 'earth_normal' },
            { path: 'planet_texuture/8k_earth_specular_map.tif', name: 'earth_specular' },
            { path: 'planet_texuture/8k_moon.jpg', name: 'moon' },
            { path: 'planet_texuture/8k_mars.jpg', name: 'mars' },
            { path: 'planet_texuture/8k_jupiter.jpg', name: 'jupiter' },
            { path: 'planet_texuture/8k_saturn.jpg', name: 'saturn' },
            { path: 'planet_texuture/8k_saturn_ring_alpha.png', name: 'saturn_ring' },
            { path: 'planet_texuture/2k_uranus.jpg', name: 'uranus' },
            { path: 'planet_texuture/2k_neptune.jpg', name: 'neptune' },
            { path: 'planet_texuture/8k_stars_milky_way.jpg', name: 'milkyway' }
        ];

        const hdrTextures = [
            { path: 'cosmos/HDR_rich_blue_nebulae_2.hdr', name: 'nebula_blue' },
            { path: 'cosmos/HDR_rich_multi_nebulae_2.hdr', name: 'nebula_multi' },
            { path: 'cosmos/HDR_silver_and_gold_nebulae.hdr', name: 'nebula_gold' }
        ];

        this.totalItems = planetTextures.length + hdrTextures.length;
        this.loadedItems = 0;

        // Load planet textures
        const texturePromises = planetTextures.map(tex =>
            this.loadTexture(tex.path, tex.name).catch(err => {
                console.warn(`Failed to load texture: ${tex.name}`, err);
                this.updateProgress(tex.name);
                return null;
            })
        );

        // Load HDR textures
        const hdrPromises = hdrTextures.map(hdr =>
            this.loadHDR(hdr.path, hdr.name, renderer).catch(err => {
                console.warn(`Failed to load HDR: ${hdr.name}`, err);
                this.updateProgress(hdr.name);
                return null;
            })
        );

        await Promise.all([...texturePromises, ...hdrPromises]);

        return {
            textures: this.textures,
            hdrTextures: this.hdrTextures
        };
    }

    /**
     * Get a loaded texture
     */
    getTexture(name) {
        return this.textures.get(name);
    }

    /**
     * Get a loaded HDR texture
     */
    getHDR(name) {
        return this.hdrTextures.get(name);
    }

    /**
     * Dispose all textures
     */
    dispose() {
        for (const texture of this.textures.values()) {
            texture.dispose();
        }
        for (const hdr of this.hdrTextures.values()) {
            hdr.original.dispose();
            hdr.envMap.dispose();
        }
        this.textures.clear();
        this.hdrTextures.clear();
    }
}
