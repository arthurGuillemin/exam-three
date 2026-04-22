import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export default class Fisherman {
    constructor(scene, water , cabin) {
        this.scene = scene;
        this.water = water;
        this.mixer = null;
        this.cabin = cabin;
        this.loader = new GLTFLoader();

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader.setDRACOLoader(dracoLoader);

        this.load();
    }

load() {
    this.loader.load('/fisherman_fishing.glb', (gltf) => {
        const model = gltf.scene;

        const dirX = this.water.waterX - this.cabin.cabinX;
        const dirZ = this.water.waterZ - this.cabin.cabinZ;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const normX = dirX / len;
        const normZ = dirZ / len;

        const fishX = this.cabin.cabinX + normX * 4 + normZ * 2;
        const fishZ = this.cabin.cabinZ + normZ * 4 - normX * 0.2;
        const y = (this.water.waterY ?? 0) + 0.5;

        model.position.set(fishX, y, fishZ);
        model.lookAt(new THREE.Vector3(this.water.waterX, y, this.water.waterZ));
        model.scale.set(0.01, 0.01, 0.01);

        if (gltf.animations?.length > 0) {
            this.mixer = new THREE.AnimationMixer(model);
            this.mixer.clipAction(gltf.animations[0]).play();
        }

        this.scene.add(model);
    });
}

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
    }
}