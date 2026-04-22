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
        this.waterX = x;
        this.waterZ = z;
        this.waterRadius = lakeSize / 2;
        this.waterY = waterLevel;


        const geometry = new THREE.CircleGeometry(lakeSize / 2, 128);

        const vertexShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;

            void main() {
                vUv = uv;
                vec3 pos = position;

                // Vagues multi-couches
                float wave1 = sin(pos.x * 0.4 + uTime * 0.8) * cos(pos.y * 0.3 + uTime * 0.6) * 0.12;
                float wave2 = sin(pos.x * 0.9 - uTime * 1.1) * cos(pos.y * 0.8 + uTime * 0.9) * 0.07;
                float wave3 = sin((pos.x + pos.y) * 0.5 + uTime * 0.5) * 0.05;
                float wave4 = cos(pos.x * 1.5 - pos.y * 0.7 + uTime * 1.4) * 0.03;

                pos.z += wave1 + wave2 + wave3 + wave4;
                vElevation = pos.z;

                // Normale approximée pour Fresnel
                float dx = cos(pos.x * 0.4 + uTime * 0.8) * 0.4 * 0.12;
                float dy = -sin(pos.y * 0.3 + uTime * 0.6) * 0.3 * 0.12;
                vNormal = normalize(vec3(-dx, -dy, 1.0));

                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPos.xyz;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec3 uCameraPos;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;

            // Noise simple pour caustics
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i), hash(i + vec2(1,0)), f.x),
                    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
                    f.y
                );
            }

            void main() {
                // Couleurs profondeur
                vec3 deepColor    = vec3(0.02, 0.08, 0.25);
                vec3 midColor     = vec3(0.05, 0.20, 0.45);
                vec3 shallowColor = vec3(0.10, 0.38, 0.60);
                vec3 foamColor    = vec3(0.75, 0.88, 0.95);

                // Mix couleur selon élévation
                float depth = clamp((vElevation + 0.3) * 2.5, 0.0, 1.0);
                vec3 color = mix(deepColor, mix(midColor, shallowColor, depth), depth);

                // Fresnel — bords plus clairs
                vec3 viewDir = normalize(uCameraPos - vWorldPosition);
                float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
                color = mix(color, vec3(0.55, 0.75, 0.90), fresnel * 0.5);

                // Caustics animés
                vec2 causticUv = vUv * 6.0;
                float c1 = noise(causticUv + uTime * 0.3);
                float c2 = noise(causticUv * 1.3 - uTime * 0.2);
                float caustics = pow(c1 * c2, 2.0) * 0.25;
                color += vec3(caustics * 0.4, caustics * 0.6, caustics);

                // Reflet soleil spéculaire
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                vec3 halfVec = normalize(lightDir + viewDir);
                float spec = pow(max(dot(vNormal, halfVec), 0.0), 80.0);
                color += vec3(1.0, 0.98, 0.95) * spec * 0.9;

                // Écume sur les crêtes
                float foam = smoothstep(0.15, 0.25, vElevation);
                color = mix(color, foamColor, foam * 0.4);

                // Ondulations de surface
                float ripple = sin(length(vUv - 0.5) * 25.0 - uTime * 2.5) * 0.5 + 0.5;
                color += vec3(ripple * 0.03);

                // Opacité Fresnel — bords transparents
                float alpha = mix(0.82, 0.96, depth) + fresnel * 0.1;

                gl_FragColor = vec4(color, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uCameraPos: { value: new THREE.Vector3() },
            },
            transparent: true,
            side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(x, waterLevel, z);
        this.scene.add(this.mesh);
    }

    update(camera) {
        const t = this.clock.getElapsedTime();
        this.material.uniforms.uTime.value = t;
        this.material.uniforms.uCameraPos.value.copy(camera.position); // ✅ pour Fresnel
    }
}