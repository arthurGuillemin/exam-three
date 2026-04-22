import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export default class Cabin {
    constructor(scene, water, terrain) {
        this.scene = scene;
        this.water = water;
        this.terrain = terrain;
        this.loader = new GLTFLoader();

        const angle = Math.PI * 0.04;
       this.cabinX = this.water.waterX + Math.cos(angle) * (this.water.waterRadius * 0.5); 
this.cabinZ = this.water.waterZ + Math.sin(angle) * (this.water.waterRadius * 0.5);
        this.cabinRadius = 6; 

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader.setDRACOLoader(dracoLoader);

        this.load();
    }

    load() {
        this.loader.load('/cabin_in_the_forest.glb', (gltf) => {
            const model = gltf.scene;
            const y = this.water.waterY -0.7;

            model.position.set(this.cabinX, y, this.cabinZ);
            model.lookAt(new THREE.Vector3(this.water.waterX, y, this.water.waterZ));
            model.scale.set(1, 1, 1);

            this.scene.add(model);
        });
    }
}