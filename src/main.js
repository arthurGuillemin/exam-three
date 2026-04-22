import * as THREE from 'three';
import SceneManager from './Scene.js';
import CameraManager from './Camera.js';
import RendererManager from './Renderer.js';
import LightsManager from './Lights.js';
import Terrain from './Terrain.js';
import OrbitControlsManager from './OrbitControls.js';

class App {
    constructor() {        
        this.sceneManager = new SceneManager();
        this.scene = this.sceneManager.scene;
        
        this.cameraManager = new CameraManager();
        this.camera = this.cameraManager.camera;
        
        this.rendererManager = new RendererManager();
        this.renderer = this.rendererManager.renderer;
        document.body.appendChild(this.renderer.domElement);
        
        this.lightsManager = new LightsManager(this.scene);
        
        this.terrain = new Terrain(this.scene);
        
        this.orbitControls = new OrbitControlsManager(this.camera, this.renderer);
        
        window.addEventListener('resize', () => this.onResize());
        
        this.animate();
    }
    
    onResize() {
        this.cameraManager.onResize();
        this.rendererManager.onResize();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.rendererManager.clock.getDelta();
        
        this.renderer.render(this.scene, this.camera);
    }
}

new App();
