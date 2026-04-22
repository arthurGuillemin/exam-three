import * as THREE from 'three';

export default class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        loader.load('/textures/sky/sky.png', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = texture;
        });
        this.scene.fog = new THREE.Fog(0xe6f2ff, 50, 80);
    }
}
