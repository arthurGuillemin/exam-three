import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Bush {
    constructor(scene, terrain, water) {
        this.scene = scene;
        this.terrain = terrain;
        this.water = water;
        this.createBushes();
    }

    isTooClose(x, z, positions, minDist) {
        for (const pos of positions) {
            const dx = x - pos.x;
            const dz = z - pos.z;
            if (Math.sqrt(dx * dx + dz * dz) < minDist) return true;
        }
        return false;
    }

    isInWater(x, z) {
        const dx = x - this.water.waterX;
        const dz = z - this.water.waterZ;
        return Math.sqrt(dx * dx + dz * dz) < this.water.waterRadius + 2;
    }

    createBushes() {
        const loader = new THREE.TextureLoader();
        const texture = loader.load('/textures/bush/bush-BaseColor.png');
        const normal = loader.load('/textures/bush/bush-Normal.png');
        const orm = loader.load('/textures/bush/bush-OcclusionRoughnessMetallic.png');
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            normalMap: normal,
            roughnessMap: orm,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            color: new THREE.Color(0x4a5c3a), 
        });

        const plane1 = new THREE.PlaneGeometry(1.5, 1.2); 
        const plane2 = new THREE.PlaneGeometry(1.5, 1.2);
        plane2.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
        const geometry = mergeGeometries([plane1, plane2]);

        const COUNT = 300;
        const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();
        const SIZE = 180;
        const placedPositions = [];
        let placed = 0;
        let attempts = 0;

        while (placed < COUNT && attempts < COUNT * 20) {
            attempts++;
            const x = (Math.random() - 0.5) * SIZE;
            const z = (Math.random() - 0.5) * SIZE;

            if (this.isInWater(x, z)) continue;

            if (this.isTooClose(x, z, placedPositions, 3)) continue;

            const terrainY = this.terrain.getHeightAt(x, z);
            const scale = 0.4 + Math.random() * 0.6; 
            const bushHalfHeight = (1.2 * scale) / 2;

            dummy.position.set(x, terrainY + bushHalfHeight, z);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(placed, dummy.matrix);

            placedPositions.push({ x, z });
            placed++;
        }

        instancedMesh.count = placed;
        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);
    }
}