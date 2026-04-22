import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


export default class OrbitControlsManager {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }
    
}
