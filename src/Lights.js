import * as THREE from 'three';

export default class LightsManager {
    constructor(scene) {
        this.scene = scene;

        this.ambientLight = new THREE.AmbientLight(0xc8d8f0, 0.5);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
        this.directionalLight.position.set(30, 25, 20);
        this.directionalLight.castShadow = true;

        this.directionalLight.shadow.camera.left   = -50;
        this.directionalLight.shadow.camera.right  =  50;
        this.directionalLight.shadow.camera.top    =  50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.directionalLight.shadow.camera.near   = 0.5;
        this.directionalLight.shadow.camera.far    = 200;

        this.directionalLight.shadow.mapSize.width  = 4096; 
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.bias           = -0.0003;
        this.directionalLight.shadow.normalBias     = 0.02;

        this.scene.add(this.directionalLight);

        this.fillLight = new THREE.DirectionalLight(0x8ab4d4, 0.3);
        this.fillLight.position.set(-20, 30, -20);
        this.scene.add(this.fillLight);

        this.hemiLight = new THREE.HemisphereLight(
            0xc9dff5, 
            0x8a9e7a,  
            0.4
        );
        this.scene.add(this.hemiLight);
    }
}