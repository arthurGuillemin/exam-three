import * as THREE from 'three';


export default class CameraManager {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            75,                                   
            window.innerWidth / window.innerHeight, 
            0.1,                                   
            1000                                   
        );
        window.camera = this.camera;
        
        this.camera.position.set(-52, -0.6, 22);
        this.camera.lookAt(-55, 0, 0);        
    }
    
    //resize de le fenetre 
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
