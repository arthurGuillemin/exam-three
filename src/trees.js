import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { LOD } from 'three';

export default class Tree {
    constructor(scene, terrain, water, cabin) { 
        this.scene = scene;
        this.terrain = terrain; 
        this.water = water;
        this.cabin = cabin;

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader = new GLTFLoader();
        this.loader.setDRACOLoader(dracoLoader);

        this.texLoader = new THREE.TextureLoader();

        this.colorMap = this.texLoader.load('/textures/trees/color.png');
        this.colorMap.colorSpace = THREE.SRGBColorSpace;
        this.colorMap.flipY = false;

        this.normalMap = this.texLoader.load('/textures/trees/normal-512.jpg');
        this.normalMap.flipY = false;

        this.rmaoMap = this.texLoader.load('/textures/trees/rmao.jpg');
        this.rmaoMap.flipY = false;

        this.impostorTexture1 = this.texLoader.load('/textures/trees/tree-impostor.png');
        this.impostorTexture2 = this.texLoader.load('/textures/trees/tree-impostor2.png');

        this.treeMaterial = new THREE.MeshStandardMaterial({
            map: this.colorMap,
            normalMap: this.normalMap,
            roughnessMap: this.rmaoMap,
            aoMap: this.rmaoMap,
            alphaTest: 0.2,
        });

        this.impostorMaterial1 = new THREE.MeshStandardMaterial({
            map: this.impostorTexture1,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5,
        });

        this.impostorMaterial2 = new THREE.MeshStandardMaterial({
            map: this.impostorTexture2,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5,
        });

        this.loadTree();
    }

    loadTree() {
        this.loader.load('/tree.glb', (gltf) => {
            const treeModel = gltf.scene;
            const COUNT = 600;
            const SIZE = 200;
            const placedPositions = [];
            let placed = 0;
            let attempts = 0;

            while (placed < COUNT && attempts < COUNT * 20) {
                attempts++;
                const x = (Math.random() - 0.5) * SIZE;
                const z = (Math.random() - 0.5) * SIZE;

                // eau
                const dx = x - this.water.waterX;
                const dz = z - this.water.waterZ;
                if (Math.sqrt(dx * dx + dz * dz) < this.water.waterRadius + 3) continue;

                // proximitée des arbres
                let tooClose = false;
                for (const pos of placedPositions) {
                    const ddx = x - pos.x;
                    const ddz = z - pos.z;
                    if (Math.sqrt(ddx * ddx + ddz * ddz) < 5) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                // le cabin
                const dcx = x - this.cabin.cabinX;
                const dcz = z - this.cabin.cabinZ;
                if (Math.sqrt(dcx * dcx + dcz * dcz) < this.cabin.cabinRadius) continue;

                const y = this.terrain.getHeightAt(x, z);

                const lod = new LOD();

                const highDetail = treeModel.clone(true);
                highDetail.traverse((child) => {
                    if (child.isMesh) {
                        child.material = this.treeMaterial; 
                    }
                });

                lod.addLevel(highDetail, 0);
                lod.addLevel(this.createImpostor(), 90);
                lod.addLevel(new THREE.Object3D(), 110);
                const scale = 0.8 + Math.random() * 0.4;
                lod.position.set(x, y, z);
                lod.scale.set(scale, scale, scale);
                lod.rotation.y = Math.random() * Math.PI * 2;

                this.scene.add(lod);
                placedPositions.push({ x, z });
                placed++;
            }
        });
    }

    createImpostor() {
        const geometry = new THREE.PlaneGeometry(10, 12);

        const plane1 = new THREE.Mesh(geometry, this.impostorMaterial1);
        const plane2 = new THREE.Mesh(geometry, this.impostorMaterial2);

        plane2.rotation.y = Math.PI / 2;

        const group = new THREE.Group();
        group.add(plane1);
        group.add(plane2);

        return group;
    }
}