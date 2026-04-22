import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export default class Fisherman {
    constructor(scene, water) {
        this.scene = scene;
        this.water = water;
        this.mixer = null;
        this.loader = new GLTFLoader();

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader.setDRACOLoader(dracoLoader);

        this.load();
    }

    load() {
        this.loader.load('/fisherman_fishing.glb', (gltf) => {
            const model = gltf.scene;

            const angle = Math.PI * 0.25; // bord du lac
            const edgeX = this.water.waterX + Math.cos(angle) * (this.water.waterRadius * 0.85);
            const edgeZ = this.water.waterZ + Math.sin(angle) * (this.water.waterRadius * 0.85);

            model.position.set(edgeX, this.water.waterY ?? 0, edgeZ);

            model.lookAt(new THREE.Vector3(this.water.waterX, model.position.y, this.water.waterZ));

            model.scale.set(0.02, 0.02, 0.02);

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                const action = this.mixer.clipAction(gltf.animations[0]);
                action.play();
            }

            this.scene.add(model);
        });
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
    }
}