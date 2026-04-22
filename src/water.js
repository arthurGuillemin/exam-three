import * as THREE from 'three';

export default class Water {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.clock = new THREE.Clock();
        this.createWater();
    }

    findLowestPoint() {
        let lowestY = Infinity;
        let lowestX = 0;
        let lowestZ = 0;

        for (let x = -80; x < 80; x += 2) {
            for (let z = -80; z < 80; z += 2) {
                const y = this.terrain.getHeightAt(x, z);
                if (y < lowestY) {
                    lowestY = y;
                    lowestX = x;
                    lowestZ = z;
                }
            }
        }

        return { x: lowestX, y: lowestY, z: lowestZ };
    }

    getLakeSize(cx, cz, waterLevel) {
        let size = 0;
        for (let r = 1; r < 40; r++) {
            let allUnder = true;
            for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
                const x = cx + Math.cos(angle) * r;
                const z = cz + Math.sin(angle) * r;
                if (this.terrain.getHeightAt(x, z) > waterLevel + 0.5) {
                    allUnder = false;
                    break;
                }
            }
            if (!allUnder) break;
            size = r;
        }
        return Math.max(size * 2, 8);
    }

    createWater() {
        const { x, y, z } = this.findLowestPoint();
        const waterLevel = y + 1.5; 
        const lakeSize = this.getLakeSize(x, z, waterLevel);

        console.log(`Lac placé en (${x}, ${waterLevel.toFixed(2)}, ${z}), taille: ${lakeSize}`);

        const geometry = new THREE.CircleGeometry(lakeSize / 2, 64); 

        const vertexShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;

            void main() {
                vUv = uv;
                vec3 pos = position;

                float wave1 = sin(pos.x * 0.8 + uTime * 1.2) * cos(pos.y * 0.6 + uTime * 0.8) * 0.15;
                float wave2 = sin(pos.x * 1.2 - uTime * 0.9) * cos(pos.y * 1.0 + uTime * 1.1) * 0.1;
                pos.z += wave1 + wave2;
                vElevation = pos.z;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;

            void main() {
                vec3 deepColor = vec3(0.05, 0.15, 0.35);
                vec3 shallowColor = vec3(0.15, 0.4, 0.6);

                float mixStrength = clamp((vElevation + 0.2) * 2.0, 0.0, 1.0);
                vec3 color = mix(deepColor, shallowColor, mixStrength);

                float ripple = sin(length(vUv - 0.5) * 20.0 - uTime * 2.0) * 0.5 + 0.5;
                color += vec3(ripple * 0.08);

                gl_FragColor = vec4(color, 0.88);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
            },
            transparent: true,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, waterLevel, z);

        this.scene.add(mesh);
    }

    update() {
        this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    }
}