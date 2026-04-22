import * as THREE from 'three';


export default class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.createGround();
    }
    
    createGround() {
        const geometry = new THREE.PlaneGeometry(100, 100, 50, 50);
        
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3a7d44,      
            roughness: 0.8,       
            metalness: 0.2
        });
        
        this.ground = new THREE.Mesh(geometry, material);        
        this.ground.rotation.x = -Math.PI / 2;        
        this.ground.receiveShadow = true;
        
        this.scene.add(this.ground);
    }
}
