import * as THREE from 'three';
import SceneManager from './Scene.js';
import CameraManager from './Camera.js';
import RendererManager from './Renderer.js';
import LightsManager from './Lights.js';
import Terrain from './Terrain.js';
import OrbitControlsManager from './OrbitControls.js';
import Bush from './bush';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import Tree from './trees.js';
import Water from './water.js';
import Snow from './snow.js';
import Fisherman from './fishermen.js';
import Cabin from './Cabin.js';

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
        this.water = new Water(this.scene, this.terrain);
        this.terrain.water = this.water; 
        this.terrain.createGrass();            
        this.cabin = new Cabin(this.scene, this.water, this.terrain);        
        this.fisherman = new Fisherman(this.scene, this.water, this.cabin);   
        this.bush = new Bush(this.scene, this.terrain, this.water, this.cabin);
        this.tree = new Tree(this.scene, this.terrain, this.water, this.cabin);
        this.snow= new Snow(this.scene)
        this.orbitControls = new OrbitControlsManager(this.camera, this.renderer);
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.08,  
            0.2,    
            0.9    
        ));
        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }
    
    onResize() {
        this.cameraManager.onResize();
        this.rendererManager.onResize();
        this.composer.setSize(window.innerWidth, window.innerHeight); 
    }
    
animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.rendererManager.clock.getDelta();
    this.water.update(this.camera);
    this.snow.update();
    this.fisherman.update(delta); 
    this.composer.render();
}
}

new App();