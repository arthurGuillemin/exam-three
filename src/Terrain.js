import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Terrain {
    constructor(scene, water) { 
        this.scene = scene;
        this.water = water; 
        this.createGround();
    }
    
    createGround() {
        const geometry = new THREE.PlaneGeometry(200, 200, 200, 200);
        const loader = new THREE.TextureLoader();
        const colorMap = loader.load('/textures/terrain/snow_02_diff_4k.jpg');
        const normalMap = loader.load('/textures/terrain/snow_02_nor_gl_4k.jpg');
        const roughnessMap = loader.load('/textures/terrain/snow_02_rough_4k.jpg');

        [colorMap, normalMap, roughnessMap].forEach(tex => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(10, 10);
        });

        const material = new THREE.MeshStandardMaterial({
            map: colorMap,
            normalMap: normalMap,
            roughnessMap: roughnessMap,
            color: new THREE.Color(2.2, 2.3, 2.5), // la texture de neige fait trop gris cendre je trouve 
        });

        const position = geometry.attributes.position;
        this.positionArray = position.array;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 8;
            position.setZ(i, z);
        }

        position.needsUpdate = true;
        geometry.computeVertexNormals();

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.scene.add(this.ground);
        this.groundGeometry = geometry;
    }

    getHeightAt(x, z) {
        return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 8;
    }

    createGrass() {
        const loader = new THREE.TextureLoader();
        const grassTexture = loader.load('/textures/grass/grass.png');
        grassTexture.colorSpace = THREE.SRGBColorSpace;

        const grassMaterial = new THREE.MeshStandardMaterial({
            map: grassTexture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5
        });

        const plane1 = new THREE.PlaneGeometry(0.5, 1);
        const plane2 = new THREE.PlaneGeometry(0.5, 1);
        const plane3 = new THREE.PlaneGeometry(0.5, 1);
        plane2.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 3));
        plane3.applyMatrix4(new THREE.Matrix4().makeRotationY((Math.PI * 2) / 3));

        const grassGeometry = mergeGeometries([plane1, plane2, plane3]);

        const COUNT = 50000;
        const instancedMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, COUNT);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();
        let placed = 0;
        let attempts = 0;

        while (placed < COUNT && attempts < COUNT * 3) {
            attempts++;
            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;

            if (this.water) {
                const dx = x - this.water.waterX;
                const dz = z - this.water.waterZ;
                if (Math.sqrt(dx * dx + dz * dz) < this.water.waterRadius + 1) continue;
            }

            const y = this.getHeightAt(x, z);
            dummy.position.set(x, y, z);
            dummy.rotation.y = Math.random() * Math.PI * 2;

            const scale = 0.4 + Math.random() * 0.4;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(placed, dummy.matrix);
            placed++;
        }

        instancedMesh.count = placed;
        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);
    }
}