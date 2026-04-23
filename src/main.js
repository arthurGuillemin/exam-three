import * as THREE from 'three';
import SceneManager from './Scene.js';
import CameraManager from './Camera.js';
import RendererManager from './Renderer.js';
import LightsManager from './Lights.js';
import Terrain from './Terrain.js';
import OrbitControlsManager from './OrbitControls.js';
import Bush from './bush.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import Tree from './trees.js';
import Water from './water.js';
import Snow from './snow.js';
import Fisherman from './fishermen.js';
import Cabin from './Cabin.js';
import Stats from 'stats.js';

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
        this.snow = new Snow(this.scene);
        this.orbitControls = new OrbitControlsManager(this.camera, this.renderer);

        // stats
        this.stats = new Stats();
        this.stats.showPanel(0);
        document.body.appendChild(this.stats.dom);
        this.setupPostProcessing();
        this.frameCount = 0;
        setInterval(() => {
            console.log('GPU INFO:', {
                drawCalls: this.renderer.info.render.calls,
                triangles: this.renderer.info.render.triangles,
                geometries: this.renderer.info.memory.geometries,
                textures: this.renderer.info.memory.textures,
            });
        }, 2000);

        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // bloom 
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.08,  
            0.3,   
            0.88   
        );
        this.composer.addPass(bloomPass);

        const colorGradePass = new ShaderPass({
            uniforms: {
                tDiffuse:          { value: null },
                uTime:             { value: 0 },
                uExposure:         { value: 1.20 },   
                uContrast:         { value: 0.8},  
                uSaturation:       { value: 1.8 },   
                uVignetteStrength: { value: 0.10 },
                uVignetteRadius:   { value: 0.75 },
                uGrainStrength:    { value: 0.025 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform float uExposure;
                uniform float uContrast;
                uniform float uSaturation;
                uniform float uVignetteStrength;
                uniform float uVignetteRadius;
                uniform float uGrainStrength;
                varying vec2 vUv;

                float rand(vec2 co) {
                    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453 + uTime * 0.1);
                }

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    vec3 col = texel.rgb;

                    // Exposition
                    col *= uExposure;

                    // Contraste léger
                    col = (col - 0.5) * uContrast + 0.5;
                    col = clamp(col, 0.0, 1.0);

                    // Saturation
                    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
                    col = mix(vec3(lum), col, uSaturation);
                    col = clamp(col, 0.0, 1.0);

                    // Légère teinte froide dans les ombres uniquement
                    float shadow = 1.0 - smoothstep(0.0, 0.4, lum);
                    col += vec3(0.0, 0.01, 0.03) * shadow;

                    // Vignette
                    vec2 uv2 = vUv * 2.0 - 1.0;
                    float vig = 1.0 - smoothstep(uVignetteRadius, uVignetteRadius + 0.4, length(uv2));
                    col *= mix(1.0 - uVignetteStrength, 1.0, vig);

                    // Film grain animé
                    float grain = rand(vUv + fract(uTime)) * 2.0 - 1.0;
                    col += grain * uGrainStrength;
                    col = clamp(col, 0.0, 1.0);

                    gl_FragColor = vec4(col, texel.a);
                }
            `
        });
        this.composer.addPass(colorGradePass);
        this.colorGradePass = colorGradePass;

        const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
        this.composer.addPass(smaaPass);
    }

    onResize() {
        this.cameraManager.onResize();
        this.rendererManager.onResize();
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.stats.begin(); 
        const start = performance.now();
        const delta = this.rendererManager.clock.getDelta();
        const t1 = performance.now();
        this.water.update(this.camera);
        const t2 = performance.now();
        this.snow.update();
        const t3 = performance.now();
        this.fisherman.update(delta);
        const t4 = performance.now();
        if (this.colorGradePass) {
            this.colorGradePass.uniforms.uTime.value += delta;
        }
        const t5 = performance.now();
        this.composer.render();
        const end = performance.now();
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            console.log('PERF:', {
                water: (t2 - t1).toFixed(2),
                snow: (t3 - t2).toFixed(2),
                fisherman: (t4 - t3).toFixed(2),
                post: (t5 - t4).toFixed(2),
                render: (end - t5).toFixed(2),
                total: (end - start).toFixed(2),
            });
        }

        this.stats.end();
    }
}

new App();