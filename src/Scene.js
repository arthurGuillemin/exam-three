import * as THREE from 'three';


export default class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);        
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
        }
}
