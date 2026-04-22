import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Bush {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.createBushes();
    }

   createBushes() {
    const loader = new THREE.TextureLoader();

    const texture = loader.load('/textures/bush-BaseColor.png');
    const normal = loader.load('/textures/bush-Normal.png');
    const orm = loader.load('/textures/bush-OcclusionRoughnessMetallic.png');

    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        normalMap: normal,
        roughnessMap: orm,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide
    });

    const plane1 = new THREE.PlaneGeometry(3, 2.5);
    const plane2 = new THREE.PlaneGeometry(3, 2.5);
    plane2.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));

    const geometry = mergeGeometries([plane1, plane2]);

    const instancedMesh = new THREE.InstancedMesh(geometry, material, 30);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const SIZE = 80;

    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * SIZE;
        const z = (Math.random() - 0.5) * SIZE;

        const terrainY = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5;
        const scale = 0.6 + Math.random() * 1.2;
        const bushHalfHeight = (2.5 * scale) / 2;

        dummy.position.set(x, terrainY + bushHalfHeight, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedMesh);
}
}