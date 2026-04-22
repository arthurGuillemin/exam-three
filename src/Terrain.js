import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.createGround();
        this.createGrass();
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
        });

        const position = geometry.attributes.position;

        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 5;
            position.setZ(i, z);
        }

        position.needsUpdate = true;
        geometry.computeVertexNormals();

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.scene.add(this.ground);
    }

    getHeightAt(x, z) {
        return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5;
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

        const COUNT = 30000;
        const instancedMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, COUNT);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();

        for (let i = 0; i < COUNT; i++) {
            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;
            const y = this.getHeightAt(x, z);

            dummy.position.set(x, y, z);
            dummy.rotation.y = Math.random() * Math.PI * 2;

            const scale = 0.4 + Math.random() * 0.4;
            dummy.scale.set(scale, scale, scale);

            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);
    }
}