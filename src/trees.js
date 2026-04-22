import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { LOD } from 'three';

export default class Tree {
    constructor(scene, terrain) { 
        this.scene = scene;
        this.terrain = terrain; 
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader = new GLTFLoader();
        this.loader.setDRACOLoader(dracoLoader);
        this.loadTree();
    }

    loadTree() {
        this.loader.load('/tree.glb', (gltf) => {
            const treeModel = gltf.scene;

            const COUNT = 400;
            const SIZE = 200;

            for (let i = 0; i < COUNT; i++) {
                const x = (Math.random() - 0.5) * SIZE;
                const z = (Math.random() - 0.5) * SIZE;
                const y = this.terrain.getHeightAt(x, z) - 0.06; 

                const lod = new LOD();

                const highDetail = treeModel.clone(true);
                highDetail.position.y = -0.5;
                highDetail.traverse((child) => {
                    if (child.isMesh) {
                        child.material.color.set(0x2d5a1b);
                    }
                });

                lod.addLevel(highDetail, 0);
                lod.addLevel(this.createImpostor(), 80);
                lod.addLevel(new THREE.Object3D(), 90);

                const scale = 0.8 + Math.random() * 0.4;
                lod.position.set(x, y, z);
                lod.scale.set(scale, scale, scale);
                lod.rotation.y = Math.random() * Math.PI * 2;

                this.scene.add(lod);
            }
        });
    }

    createImpostor() {
        const loader = new THREE.TextureLoader();
        const geometry = new THREE.PlaneGeometry(10, 12);

        const mat1 = new THREE.MeshStandardMaterial({
            map: loader.load('/textures/trees/tree-impostor.png'),
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5,
        });

        const mat2 = new THREE.MeshStandardMaterial({
            map: loader.load('/textures/trees/tree-impostor2.png'),
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5,
        });

        const plane1 = new THREE.Mesh(geometry, mat1);
        const plane2 = new THREE.Mesh(geometry, mat2);
        plane2.rotation.y = Math.PI / 2;

        const group = new THREE.Group();
        group.add(plane1);
        group.add(plane2);
        return group;
    }
}