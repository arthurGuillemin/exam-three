import * as THREE from 'three';


export default class RendererManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true  
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.clock = new THREE.Clock();
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
    }
    
    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
